import { NextResponse } from 'next/server';

// Simple API key check (prototype). In production use OAuth2/JWT or mTLS for system-to-system.
// Accept either SWIFT_API_KEY or API_KEY to reduce env naming confusion; fallback to dev-key for local.
const API_KEY = process.env.SWIFT_API_KEY || process.env.API_KEY || 'dev-key';

export function middleware(request: Request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/updates') {
        const key = request.headers.get('x-api-key');
        if (!key || key !== API_KEY) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'ApiKey realm="swift" header="x-api-key"' }
            });
        }
    }
    const res = NextResponse.next();
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'no-referrer');
    return res;
}

export const config = {
    matcher: ['/api/:path*']
};
