import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { bus } from '@/app/lib/bus';
import { now } from '@/app/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import type { Package } from '@/app/lib/types';

export async function POST(req: Request) {
    const { packageId, signatureDataUrl, photoUrl } = await req.json();

    const order = store.findOrderByPackageId(packageId);
    if (!order) return NextResponse.json({ error: 'Order not found for package' }, { status: 404 });

    const pkg = order.packages.find(p => p.id === packageId)!;
    pkg.status = 'DELIVERED';
    const proof: Package['proof'] = { timestamp: now() };
    if (typeof signatureDataUrl === 'string' && signatureDataUrl.length > 0) {
        proof.signatureDataUrl = signatureDataUrl;
    }
    if (typeof photoUrl === 'string' && photoUrl.length > 0) {
        proof.photoUrl = photoUrl;
    }
    pkg.proof = proof;

    // If all delivered, mark order
    const allDelivered = order.packages.every(p => p.status === 'DELIVERED');
    if (allDelivered) {
        order.status = 'DELIVERED';
    }

    // Update in-memory store
    store.upsertOrder(order);

    try {
        // Update in Firestore (sanitize undefined fields)
        const orderRef = doc(db, 'orders', order.id);
        const sanitizedPackages = order.packages.map(p => {
            const base: any = {
                id: p.id,
                description: p.description,
                address: p.address ?? '',
                status: p.status,
            };
            if (p.proof && Object.keys(p.proof).length > 0) {
                const sp: any = {};
                if (p.proof.signatureDataUrl) sp.signatureDataUrl = p.proof.signatureDataUrl;
                if (p.proof.photoUrl) sp.photoUrl = p.proof.photoUrl;
                if (typeof p.proof.reason === 'string') sp.reason = p.proof.reason;
                if (typeof p.proof.timestamp === 'number') sp.timestamp = p.proof.timestamp;
                if (Object.keys(sp).length > 0) base.proof = sp;
            }
            return base;
        });
        await updateDoc(orderRef, {
            packages: sanitizedPackages,
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
