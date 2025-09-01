import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { generateId } from '@/app/lib/utils';
import { bus } from '@/app/lib/bus';
import { Order, Package } from '@/app/lib/types';
import { OrderCreateSchema, validate, ValidationError, checkAndStoreIdempotency } from '@/app/lib/validation';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, updateDoc, increment, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

const base = process.env.NEXT_PUBLIC_BASE_URL || '';

export async function POST(req: Request) {
    try {
        const idempotencyKey = req.headers.get('idempotency-key') || undefined;
        checkAndStoreIdempotency(idempotencyKey);

        const payload = await req.json();
        const body = validate<typeof OrderCreateSchema._type>(OrderCreateSchema, payload);

        const orderId = generateId('ORD');
        const order: Order = {
            id: orderId,
            clientId: body.clientId,
            packages: body.packages.map((p: { description: string; address: string; stockItemId?: string; quantity?: number }): Package => ({
                id: generateId('PKG'),
                description: p.description,
                address: p.address,
                status: 'WAITING'
            })),
            status: 'PENDING'
        };
        await ensureStockAvailable(body.packages);
        await decrementStock(body.packages);
        store.upsertOrder(order);
        bus.publish({ type: 'ORDER_UPDATED', order });

        await registerInCMS(req, body.clientId, order, orderId);

        await registerInWMS(req, order, orderId);
        store.upsertOrder(order);
        bus.publish({ type: 'ORDER_UPDATED', order });

        await planRoute(req, order, body.driverId, orderId);

        // Persist final order state to Firestore
        try {
            await setDoc(doc(db, 'orders', order.id), {
                id: order.id,
                clientId: order.clientId,
                driverId: body.driverId,
                status: order.status,
                routeId: order.routeId || null,
                cmsOrderId: order.cmsOrderId || null,
                createdAt: serverTimestamp(),
                packages: order.packages.map(p => ({
                    id: p.id,
                    description: p.description,
                    address: p.address,
                    status: p.status
                }))
            }, { merge: true });
        } catch (e) {
            // Non-fatal: still return success; log to server console
            console.error('Failed to persist order to Firestore', e);
        }

        return NextResponse.json({ orderId: order.id, status: order.status, routeId: order.routeId });
    } catch (err) {
        if (err instanceof ValidationError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');
        const driverId = searchParams.get('driverId');

        if (clientId) {
            // Fetch from Firestore scoped to this client
            const q = query(collection(db, 'orders'), where('clientId', '==', clientId));
            const snap = await getDocs(q);
            const orders = snap.docs.map(d => {
                const data = d.data() as any;
                const order = {
                    id: data.id || d.id,
                    clientId: data.clientId,
                    status: data.status,
                    routeId: data.routeId || undefined,
                    packages: (data.packages || []).map((p: any) => ({
                        id: p.id,
                        description: p.description,
                        status: p.status,
                        address: p.address || '',
                        proof: p.proof || undefined
                    }))
                } as any;

                // Sync with in-memory store to keep it updated
                store.upsertOrder(order);

                return order;
            });
            return NextResponse.json({ orders });
        }

        if (driverId) {
            // Fetch from Firestore scoped to this driver
            const q = query(collection(db, 'orders'), where('driverId', '==', driverId));
            const snap = await getDocs(q);
            const orders = snap.docs.map(d => {
                const data = d.data() as any;
                const order = {
                    id: data.id || d.id,
                    clientId: data.clientId,
                    status: data.status,
                    routeId: data.routeId || undefined,
                    createdAt: (data.createdAt && typeof data.createdAt.toMillis === 'function') ? data.createdAt.toMillis() : 0,
                    packages: (data.packages || []).map((p: any) => ({
                        id: p.id,
                        description: p.description,
                        status: p.status,
                        address: p.address,
                        proof: p.proof || undefined
                    }))
                } as any;

                // Sync with in-memory store to keep it updated
                store.upsertOrder(order);

                return order;
            });
            return NextResponse.json({ orders });
        }

        // Fallback to in-memory store for non-filtered requests
        const orders = store.listOrders();
        return NextResponse.json({ orders });
    } catch (e) {
        console.error('Failed to query orders', e);
        return NextResponse.json({ orders: [] });
    }
}

// Helpers to reduce cognitive complexity
async function ensureStockAvailable(packages: Array<{ stockItemId?: string; quantity?: number }>) {
    for (const p of packages) {
        if (p.stockItemId && p.quantity) {
            const ref = doc(db, 'stock', p.stockItemId);
            const snap = await getDoc(ref);
            if (!snap.exists()) throw new ValidationError('Stock item not found');
            const data = snap.data() as { quantity?: number };
            const currentQty = typeof data.quantity === 'number' ? data.quantity : 0;
            if (currentQty < p.quantity) throw new ValidationError('Insufficient stock for selected item');
        }
    }
}

async function decrementStock(packages: Array<{ stockItemId?: string; quantity?: number }>) {
    for (const p of packages) {
        if (p.stockItemId && p.quantity) {
            await updateDoc(doc(db, 'stock', p.stockItemId), { quantity: increment(-p.quantity) });
        }
    }
}

async function registerInCMS(req: Request, clientId: string, order: Order, orderId: string) {
    try {
        const cmsRes = await fetch(`${base}/api/cms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers.get('x-api-key') || '' },
            body: JSON.stringify({ clientId, orderId: order.id })
        });
        if (cmsRes.ok) {
            const cmsData = await cmsRes.json();
            order.cmsOrderId = cmsData.cmsOrderId;
        } else {
            store.enqueueOutbox({ kind: 'CMS_REGISTER', orderId });
        }
    } catch {
        store.enqueueOutbox({ kind: 'CMS_REGISTER', orderId });
    }
}

async function registerInWMS(req: Request, order: Order, orderId: string) {
    try {
        const wmsRes = await fetch(`${base}/api/wms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers.get('x-api-key') || '' },
            body: JSON.stringify({ packages: order.packages })
        });
        if (wmsRes.ok) {
            const wmsData = await wmsRes.json();
            order.packages = wmsData.packages;
            order.status = 'IN_WMS';
        } else {
            store.enqueueOutbox({ kind: 'WMS_REGISTER', orderId });
        }
    } catch {
        store.enqueueOutbox({ kind: 'WMS_REGISTER', orderId });
    }
}

async function planRoute(req: Request, order: Order, driverId: string, orderId: string) {
    try {
        const rosRes = await fetch(`${base}/api/ros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers.get('x-api-key') || '' },
            body: JSON.stringify({ packages: order.packages, driverId })
        });
        if (rosRes.ok) {
            const rosData = await rosRes.json();
            order.routeId = rosData.routeId;
            order.status = 'ROUTED';
            store.upsertOrder(order);
            const route = {
                id: rosData.routeId,
                driverId: rosData.driverId,
                waypoints: rosData.waypoints,
                status: 'ASSIGNED' as const,
                packageIds: rosData.packageIds
            };
            store.upsertRoute(route);
            bus.publish({ type: 'ORDER_UPDATED', order });
            bus.publish({ type: 'ROUTE_UPDATED', orderId: order.id, route });
            bus.publish({ type: 'ROUTE_ASSIGNED', routeId: route.id, driverId: route.driverId });
        } else {
            store.enqueueOutbox({ kind: 'ROS_PLAN', orderId });
        }
    } catch {
        store.enqueueOutbox({ kind: 'ROS_PLAN', orderId });
    }
}
