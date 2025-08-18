import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { bus } from '@/app/lib/bus';
import { now } from '@/app/lib/utils';

export async function POST(req: Request) {
    const { packageId, signatureDataUrl, photoUrl } = await req.json();

    const order = store.findOrderByPackageId(packageId);
    if (!order) return NextResponse.json({ error: 'Order not found for package' }, { status: 404 });

    const pkg = order.packages.find(p => p.id === packageId)!;
    pkg.status = 'DELIVERED';
    pkg.proof = {
        signatureDataUrl,
        photoUrl,
        timestamp: now()
    };
    // If all delivered, mark order
    if (order.packages.every(p => p.status === 'DELIVERED')) {
        order.status = 'DELIVERED';
    }
    store.upsertOrder(order);

    bus.publish({ type: 'PACKAGE_UPDATED', orderId: order.id, package: pkg });
    bus.publish({ type: 'ORDER_UPDATED', order });

    return NextResponse.json({ ok: true, orderId: order.id, package: pkg });
}
