import { NextResponse } from 'next/server';
import { generateId } from '@/app/lib/utils';

export async function POST(req: Request) {
    // In a real adapter, parse SOAP XML; here we accept JSON and respond like CMS
    const body = await req.json();
    const cmsOrderId = generateId('CMS');
    return NextResponse.json({
        cmsOrderId,
        message: `CMS registered order for client ${body.clientId}`
    });
}
