import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { bus } from '@/app/lib/bus';
import { now } from '@/app/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import type { Package } from '@/app/lib/types';

const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export async function POST(req: Request) {
    const requestId = req.headers.get('x-request-id') || 'unknown';
    
    console.log(`[${requestId}] POST /api/driver/deliver - Processing delivery confirmation`);
    
    const { packageId, signatureDataUrl, photoUrl } = await req.json();
    
    if (DEBUG_MODE) {
        console.log(`[${requestId}] Package ID: ${packageId}, Has signature: ${!!signatureDataUrl}, Has photo: ${!!photoUrl}`);
    }

    const order = store.findOrderByPackageId(packageId);
    if (!order) {
        console.error(`[${requestId}] Order not found for package: ${packageId}`);
        return NextResponse.json({ error: 'Order not found for package' }, { status: 404 });
    }
    
    console.log(`[${requestId}] Found order ${order.id} for package ${packageId}`);

    const pkg = order.packages.find(p => p.id === packageId)!;
    const previousStatus = pkg.status;
    pkg.status = 'DELIVERED';
    
    console.log(`[${requestId}] Updating package status from ${previousStatus} to DELIVERED`);
    
    const proof: Package['proof'] = { timestamp: now() };
    if (typeof signatureDataUrl === 'string' && signatureDataUrl.length > 0) {
        proof.signatureDataUrl = signatureDataUrl;
        if (DEBUG_MODE) {
            console.log(`[${requestId}] Added signature proof (${signatureDataUrl.length} chars)`);
        }
    }
    if (typeof photoUrl === 'string' && photoUrl.length > 0) {
        proof.photoUrl = photoUrl;
        if (DEBUG_MODE) {
            console.log(`[${requestId}] Added photo proof: ${photoUrl}`);
        }
    }
    pkg.proof = proof;

    // If all delivered, mark order
    const allDelivered = order.packages.every(p => p.status === 'DELIVERED');
    if (allDelivered) {
        order.status = 'DELIVERED';
        console.log(`[${requestId}] All packages delivered - marking order ${order.id} as DELIVERED`);
    } else {
        const remaining = order.packages.filter(p => p.status !== 'DELIVERED').length;
        console.log(`[${requestId}] ${remaining} packages remaining for order ${order.id}`);
    }

    // Update in-memory store
    store.upsertOrder(order);
    
    if (DEBUG_MODE) {
        console.log(`[${requestId}] Updated order in memory store`);
    }

    try {
        // Update in Firestore (sanitize undefined fields)
        console.log(`[${requestId}] Updating order in Firestore`);
        const orderRef = doc(db, 'orders', order.id);
        const sanitizedPackages = order.packages.map(p => {
            const base: Record<string, unknown> = {
                id: p.id,
                description: p.description,
                address: p.address ?? '',
                status: p.status,
            };
            if (p.proof && Object.keys(p.proof).length > 0) {
                const sp: Record<string, unknown> = {};
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
        console.log(`[${requestId}] Successfully updated order in Firestore`);
    } catch (firestoreError) {
        console.error(`[${requestId}] Failed to update order in Firestore:`, firestoreError);
        // Continue with in-memory update even if Firestore fails
    }

    bus.publish({ type: 'PACKAGE_UPDATED', orderId: order.id, package: pkg });
    bus.publish({ type: 'ORDER_UPDATED', order });
    
    if (DEBUG_MODE) {
        console.log(`[${requestId}] Published 2 events to message bus`);
    }
    
    console.log(`[${requestId}] Delivery confirmation successful for package ${packageId}`);
    return NextResponse.json({ ok: true, orderId: order.id, package: pkg });
}
