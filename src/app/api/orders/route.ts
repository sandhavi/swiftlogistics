import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { generateId } from '@/app/lib/utils';
import { bus } from '@/app/lib/bus';
import { Order, Package } from '@/app/lib/types';
import { OrderCreateSchema, validate, ValidationError, checkAndStoreIdempotency } from '@/app/lib/validation';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, updateDoc, increment, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

const base = process.env.NEXT_PUBLIC_BASE_URL || '';
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export async function POST(req: Request) {
    const requestId = req.headers.get('x-request-id') || 'unknown';
    
    if (DEBUG_MODE) {
        console.log(`[${requestId}] POST /api/orders - Starting order creation`);
    }
    
    try {
        const idempotencyKey = req.headers.get('idempotency-key') || undefined;
        
        if (DEBUG_MODE && idempotencyKey) {
            console.log(`[${requestId}] Idempotency key provided: ${idempotencyKey}`);
        }
        
        checkAndStoreIdempotency(idempotencyKey);

        const payload = await req.json();
        
        if (DEBUG_MODE) {
            console.log(`[${requestId}] Request payload:`, JSON.stringify(payload));
        }
        
        const body = validate<typeof OrderCreateSchema._type>(OrderCreateSchema, payload);
        
        console.log(`[${requestId}] Validation passed for client: ${body.clientId}`);

        const orderId = generateId('ORD');
        console.log(`[${requestId}] Generated order ID: ${orderId}`);
        
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
        console.log(`[${requestId}] Checking stock availability for ${body.packages.length} packages`);
        await ensureStockAvailable(body.packages);
        
        console.log(`[${requestId}] Stock check passed, decrementing stock quantities`);
        await decrementStock(body.packages);
        store.upsertOrder(order);
        bus.publish({ type: 'ORDER_UPDATED', order });

        console.log(`[${requestId}] Registering order with CMS`);
        await registerInCMS(req, body.clientId, order, orderId, requestId);

        console.log(`[${requestId}] Registering packages with WMS`);
        await registerInWMS(req, order, orderId, requestId);
        store.upsertOrder(order);
        bus.publish({ type: 'ORDER_UPDATED', order });

        console.log(`[${requestId}] Planning route with ROS for driver: ${body.driverId}`);
        await planRoute(req, order, body.driverId, orderId, requestId);

        // Persist final order state to Firestore
        console.log(`[${requestId}] Persisting order to Firestore`);
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
            console.log(`[${requestId}] Order persisted successfully to Firestore`);
        } catch (e) {
            // Non-fatal: still return success; log to server console
            console.error(`[${requestId}] Failed to persist order to Firestore:`, e);
        }

        console.log(`[${requestId}] Order created successfully - ID: ${order.id}, Status: ${order.status}`);
        return NextResponse.json({ orderId: order.id, status: order.status, routeId: order.routeId });
    } catch (err) {
        if (err instanceof ValidationError) {
            console.error(`[${requestId}] Validation error:`, err.message);
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        console.error(`[${requestId}] Internal error during order creation:`, err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const requestId = req.headers.get('x-request-id') || 'unknown';
    
    try {
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');
        const driverId = searchParams.get('driverId');

        if (clientId) {
            console.log(`[${requestId}] GET /api/orders - Fetching orders for client: ${clientId}`);
            // Fetch from Firestore scoped to this client
            const q = query(collection(db, 'orders'), where('clientId', '==', clientId));
            const snap = await getDocs(q);
            const orders = snap.docs.map(d => {
                const data = d.data() as Record<string, unknown>;
                const order: Order = {
                    id: (data.id as string) || d.id,
                    clientId: data.clientId as string,
                    status: data.status as 'PENDING' | 'IN_WMS' | 'ROUTED' | 'DELIVERED' | 'FAILED',
                    routeId: (data.routeId as string) || undefined,
                    packages: ((data.packages as Array<Record<string, unknown>>) || []).map((p: Record<string, unknown>) => ({
                        id: p.id as string,
                        description: p.description as string,
                        status: p.status as 'WAITING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED',
                        address: (p.address as string) || '',
                        proof: p.proof ? {
                            signatureDataUrl: (p.proof as Record<string, unknown>).signatureDataUrl as string | undefined,
                            photoUrl: (p.proof as Record<string, unknown>).photoUrl as string | undefined,
                            reason: (p.proof as Record<string, unknown>).reason as string | undefined,
                            timestamp: (p.proof as Record<string, unknown>).timestamp as number | undefined
                        } : undefined
                    }))
                };

                // Sync with in-memory store to keep it updated
                store.upsertOrder(order);

                return order;
            });
            console.log(`[${requestId}] Found ${orders.length} orders for client: ${clientId}`);
            return NextResponse.json({ orders });
        }

        if (driverId) {
            console.log(`[${requestId}] GET /api/orders - Fetching orders for driver: ${driverId}`);
            // Fetch from Firestore scoped to this driver
            const q = query(collection(db, 'orders'), where('driverId', '==', driverId));
            const snap = await getDocs(q);
            const orders = snap.docs.map(d => {
                const data = d.data() as Record<string, unknown>;
                const order: Order = {
                    id: (data.id as string) || d.id,
                    clientId: data.clientId as string,
                    status: data.status as 'PENDING' | 'IN_WMS' | 'ROUTED' | 'DELIVERED' | 'FAILED',
                    routeId: (data.routeId as string) || undefined,
                    packages: ((data.packages as Array<Record<string, unknown>>) || []).map((p: Record<string, unknown>) => ({
                        id: p.id as string,
                        description: p.description as string,
                        status: p.status as 'WAITING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED',
                        address: (p.address as string) || '',
                        proof: p.proof ? {
                            signatureDataUrl: (p.proof as Record<string, unknown>).signatureDataUrl as string | undefined,
                            photoUrl: (p.proof as Record<string, unknown>).photoUrl as string | undefined,
                            reason: (p.proof as Record<string, unknown>).reason as string | undefined,
                            timestamp: (p.proof as Record<string, unknown>).timestamp as number | undefined
                        } : undefined
                    }))
                };

                // Sync with in-memory store to keep it updated
                store.upsertOrder(order);

                return order;
            });
            console.log(`[${requestId}] Found ${orders.length} orders for driver: ${driverId}`);
            return NextResponse.json({ orders });
        }

        // Fallback to in-memory store for non-filtered requests
        console.log(`[${requestId}] GET /api/orders - Fetching all orders from store`);
        const orders = store.listOrders();
        console.log(`[${requestId}] Returning ${orders.length} orders`);
        return NextResponse.json({ orders });
    } catch (e) {
        console.error(`[${requestId}] Failed to query orders:`, e);
        return NextResponse.json({ orders: [] });
    }
}

// Helpers to reduce cognitive complexity
async function ensureStockAvailable(packages: Array<{ stockItemId?: string; quantity?: number }>) {
    if (DEBUG_MODE) {
        console.log(`[STOCK] Checking availability for ${packages.length} items`);
    }
    
    for (const p of packages) {
        if (p.stockItemId && p.quantity) {
            const ref = doc(db, 'stock', p.stockItemId);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                console.error(`[STOCK] Stock item not found: ${p.stockItemId}`);
                throw new ValidationError('Stock item not found');
            }
            const data = snap.data() as { quantity?: number };
            const currentQty = typeof data.quantity === 'number' ? data.quantity : 0;
            
            if (DEBUG_MODE) {
                console.log(`[STOCK] Item ${p.stockItemId}: Available=${currentQty}, Requested=${p.quantity}`);
            }
            
            if (currentQty < p.quantity) {
                console.error(`[STOCK] Insufficient stock for item ${p.stockItemId}: Available=${currentQty}, Requested=${p.quantity}`);
                throw new ValidationError('Insufficient stock for selected item');
            }
        }
    }
}

async function decrementStock(packages: Array<{ stockItemId?: string; quantity?: number }>) {
    for (const p of packages) {
        if (p.stockItemId && p.quantity) {
            if (DEBUG_MODE) {
                console.log(`[STOCK] Decrementing stock for item ${p.stockItemId} by ${p.quantity}`);
            }
            await updateDoc(doc(db, 'stock', p.stockItemId), { quantity: increment(-p.quantity) });
        }
    }
}

async function registerInCMS(req: Request, clientId: string, order: Order, orderId: string, requestId: string) {
    try {
        if (DEBUG_MODE) {
            console.log(`[${requestId}] Calling CMS API for order ${orderId}`);
        }
        const cmsRes = await fetch(`${base}/api/cms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers.get('x-api-key') || '' },
            body: JSON.stringify({ clientId, orderId: order.id })
        });
        if (cmsRes.ok) {
            const cmsData = await cmsRes.json();
            order.cmsOrderId = cmsData.cmsOrderId;
            console.log(`[${requestId}] CMS registration successful - CMS Order ID: ${cmsData.cmsOrderId}`);
        } else {
            console.warn(`[${requestId}] CMS registration failed with status ${cmsRes.status}, adding to outbox`);
            store.enqueueOutbox({ kind: 'CMS_REGISTER', orderId });
        }
    } catch (error) {
        console.error(`[${requestId}] CMS registration error:`, error);
        store.enqueueOutbox({ kind: 'CMS_REGISTER', orderId });
    }
}

async function registerInWMS(req: Request, order: Order, orderId: string, requestId: string) {
    try {
        if (DEBUG_MODE) {
            console.log(`[${requestId}] Calling WMS API for ${order.packages.length} packages`);
        }
        const wmsRes = await fetch(`${base}/api/wms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers.get('x-api-key') || '' },
            body: JSON.stringify({ packages: order.packages })
        });
        if (wmsRes.ok) {
            const wmsData = await wmsRes.json();
            order.packages = wmsData.packages;
            order.status = 'IN_WMS';
            console.log(`[${requestId}] WMS registration successful - Status updated to IN_WMS`);
        } else {
            console.warn(`[${requestId}] WMS registration failed with status ${wmsRes.status}, adding to outbox`);
            store.enqueueOutbox({ kind: 'WMS_REGISTER', orderId });
        }
    } catch (error) {
        console.error(`[${requestId}] WMS registration error:`, error);
        store.enqueueOutbox({ kind: 'WMS_REGISTER', orderId });
    }
}

async function planRoute(req: Request, order: Order, driverId: string, orderId: string, requestId: string) {
    try {
        if (DEBUG_MODE) {
            console.log(`[${requestId}] Calling ROS API for route planning - Driver: ${driverId}`);
        }
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
            
            console.log(`[${requestId}] Route planning successful - Route ID: ${rosData.routeId}`);
            
            bus.publish({ type: 'ORDER_UPDATED', order });
            bus.publish({ type: 'ROUTE_UPDATED', orderId: order.id, route });
            bus.publish({ type: 'ROUTE_ASSIGNED', routeId: route.id, driverId: route.driverId });
            
            if (DEBUG_MODE) {
                console.log(`[${requestId}] Published 3 events to message bus`);
            }
        } else {
            console.warn(`[${requestId}] ROS planning failed with status ${rosRes.status}, adding to outbox`);
            store.enqueueOutbox({ kind: 'ROS_PLAN', orderId });
        }
    } catch (error) {
        console.error(`[${requestId}] ROS planning error:`, error);
        store.enqueueOutbox({ kind: 'ROS_PLAN', orderId });
    }
}
