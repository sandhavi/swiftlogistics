import { NextResponse } from 'next/server';
import { store } from '@/app/lib/store';
import { bus } from '@/app/lib/bus';

// Prototype endpoint to process queued integration tasks (would be a cron/worker in production)
export async function POST() {
    const items = store.drainOutbox();
    for (const task of items) {
        const order = store.getOrder(task.orderId);
        if (order) {
            store.upsertOrder(order);
            bus.publish({ type: 'ORDER_UPDATED', order });
        }
    }
    return NextResponse.json({ processed: items.length });
}
