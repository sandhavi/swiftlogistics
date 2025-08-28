import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';

export async function GET() {
    try {
        const qSnap = await getDocs(collection(db, 'stock'));
        const stock = qSnap.docs.map(d => {
            const data = d.data() as any;
            let updatedAt: string | undefined;
            if (data.updatedAt instanceof Timestamp) updatedAt = data.updatedAt.toDate().toISOString();
            else if (typeof data.updatedAt === 'string') updatedAt = data.updatedAt;
            return {
                id: d.id,
                name: data.name || 'Unnamed',
                category: data.category || 'Uncategorized',
                quantity: typeof data.quantity === 'number' ? data.quantity : 0,
                unit: data.unit || '',
                price: typeof data.price === 'number' ? data.price : 0,
                updatedAt,
            };
        });
        return NextResponse.json({ stock });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to list stock' }, { status: 500 });
    }
}
