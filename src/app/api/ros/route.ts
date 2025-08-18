import { NextResponse } from 'next/server';
import { generateId } from '@/app/lib/utils';

export async function POST(req: Request) {
  const { packages, driverId }: { packages: { id?: string; address?: string }[]; driverId: string } = await req.json();
  const routeId = generateId('RT');
  const waypoints = (packages || []).map((p) => p.address ?? `Address for ${p.id}`);
  return NextResponse.json({
    routeId,
    driverId,
    waypoints,
    status: 'ASSIGNED',
    packageIds: (packages || []).map((p) => p.id).filter(Boolean)
  });
}
