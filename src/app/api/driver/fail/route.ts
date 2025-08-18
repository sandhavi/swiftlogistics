import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { bus } from '@/app/lib/bus';
import { now } from '@/app/lib/utils';

export async function POST(req: Request) {
    const { packageId, reason } = await req.json();

    const order = store.findOrderByPackageId(packageId);
    if (!order) return NextResponse.json({ error: 'Order not found for package' }, { status: 404 });

    const pkg = order.packages.find(p => p.id === packageId)!;
    pkg.status = 'FAILED';
    pkg.proof = {
        reason,
        timestamp: now()
    };
    // If any failed, reflect on order level (prototype behavior)
    if (order.packages.some(p => p.status === 'FAILED')) {
        order.status = 'FAILED';
    }
    store.upsertOrder(order);

    bus.publish({ type: 'PACKAGE_UPDATED', orderId: order.id, package: pkg });
    bus.publish({ type: 'ORDER_UPDATED', order });

    return NextResponse.json({ ok: true, orderId: order.id, package: pkg });
}
