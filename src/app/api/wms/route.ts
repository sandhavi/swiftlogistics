import { NextResponse } from 'next/server';
import { generateId } from '@/app/lib/utils';

export async function POST(req: Request) {
  const body: { packages?: { description?: string; address?: string }[] } = await req.json();
  const packages = (body.packages || []).map((p) => ({
    id: generateId('PKG'),
    description: p.description ?? 'Item',
    address: p.address ?? 'Address TBD',
    status: 'WAITING'
  }));
  // Return package ids and initial statuses
  return NextResponse.json({
    packages
  });
}
