import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { bus } from '@/app/lib/bus';
import { now } from '@/app/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

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
    const anyFailed = order.packages.some(p => p.status === 'FAILED');
    if (anyFailed) {
        order.status = 'FAILED';
    }
    
    // Update in-memory store
    store.upsertOrder(order);

    try {
        // Update in Firestore
        const orderRef = doc(db, 'orders', order.id);
        await updateDoc(orderRef, {
            packages: order.packages,
            status: order.status,
            updatedAt: now()
        });
    } catch (firestoreError) {
        console.error('Failed to update order in Firestore:', firestoreError);
        // Continue with in-memory update even if Firestore fails
    }

    bus.publish({ type: 'PACKAGE_UPDATED', orderId: order.id, package: pkg });
    bus.publish({ type: 'ORDER_UPDATED', order });

    return NextResponse.json({ ok: true, orderId: order.id, package: pkg });
}
