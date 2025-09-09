import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
    try {
        const qSnap = await getDocs(collection(db, 'users'));
        const drivers = qSnap.docs
            .map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
            .filter((u): u is { id: string; accountType?: unknown; fullName?: unknown; email?: unknown } => 
                ((u as Record<string, unknown>).accountType as string || '').toLowerCase() === 'driver')
            .map(u => ({ 
                id: u.id, 
                name: (u.fullName as string) || (u.email as string) || u.id 
            }));
        return NextResponse.json({ drivers });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to list drivers' }, { status: 500 });
    }
}
