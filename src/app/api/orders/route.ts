import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { generateId } from '@/app/lib/utils';
import { bus } from '@/app/lib/bus';
import { Order, Package } from '@/app/lib/types';
import { OrderCreateSchema, validate, ValidationError, checkAndStoreIdempotency } from '@/app/lib/validation';

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
            packages: body.packages.map((p: { description: string; address: string }): Package => ({
                id: generateId('PKG'),
                description: p.description,
                address: p.address,
                status: 'WAITING'
            })),
            status: 'PENDING'
        };
        store.upsertOrder(order);
        bus.publish({ type: 'ORDER_UPDATED', order });

        // CMS
        try {
            const cmsRes = await fetch(`${base}/api/cms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers.get('x-api-key') || '' },
                body: JSON.stringify({ clientId: body.clientId, orderId: order.id })
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

        // WMS
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
        store.upsertOrder(order);
        bus.publish({ type: 'ORDER_UPDATED', order });

        // ROS
        try {
            const rosRes = await fetch(`${base}/api/ros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers.get('x-api-key') || '' },
                body: JSON.stringify({ packages: order.packages, driverId: body.driverId })
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

        return NextResponse.json({ orderId: order.id, status: order.status, routeId: order.routeId });
    } catch (err) {
        if (err instanceof ValidationError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function GET() {
    const orders = store.listOrders();
    return NextResponse.json({ orders });
}
