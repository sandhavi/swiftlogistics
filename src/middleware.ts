import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple API key check (prototype). In production use OAuth2/JWT or mTLS for system-to-system.
// Accept either SWIFT_API_KEY or API_KEY to reduce env naming confusion; fallback to dev-key for local.
const API_KEY = process.env.SWIFT_API_KEY || process.env.API_KEY || 'dev-key';

// Maintenance mode toggle via env variable
const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

// SEO redirects map (add more as needed)
const seoRedirects: Record<string, string> = {
    '/old-route': '/new-seo-route',
    '/home': '/',
};

// CORS allowed origins
const allowedOrigins = [
    'http://localhost:3000',
];

// Helper validation functions
function isValidOrderId(orderId: any): boolean {
    return typeof orderId === 'string' && /^[a-zA-Z0-9]{6,20}$/.test(orderId);
}

function isValidItems(items: any): boolean {
    if (!Array.isArray(items) || items.length === 0) return false;
    return items.every(item =>
        typeof item.id === 'string' && item.id.length >= 2 &&
        typeof item.quantity === 'number' && item.quantity > 0
    );
}

function isValidCustomer(customer: any): boolean {
    if (!customer) return true;
    return (
        typeof customer.name === 'string' && customer.name.length >= 2 &&
        typeof customer.email === 'string' && customer.email.includes('@')
    );
}

// Basic data validation for API routes (example: POST /api/orders)
async function validateRequest(req: NextRequest) {
    if (req.nextUrl.pathname === '/api/orders' && req.method === 'POST') {
        try {
            const body = req.body ? JSON.parse(await req.text()) : null;
            if (!body) return false;
            if (!isValidOrderId(body.orderId)) return false;
            if (!isValidItems(body.items)) return false;
            if (!isValidCustomer(body.customer)) return false;
        } catch {
            return false;
        }
    }
    return true;
}


export async function middleware(request: NextRequest) {
    const url = request.nextUrl;

    // Request Logging
    console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`);

    // Maintenance Mode
    if (MAINTENANCE_MODE && !url.pathname.startsWith('/admin')) {
        return new NextResponse('Site under maintenance. Please check back later.', { status: 503 });
    }

    // SEO-Friendly Redirects
    const redirectTo = seoRedirects[url.pathname];
    if (redirectTo) {
        return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // API Key Check (preserve existing logic)
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/updates') {
        const key = request.headers.get('x-api-key');
        if (!key || key !== API_KEY) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'ApiKey realm="swift" header="x-api-key"' }
            });
        }
    }

    // CORS Handling for API routes
    if (url.pathname.startsWith('/api/')) {
        const origin = request.headers.get('origin');
        if (origin && allowedOrigins.includes(origin)) {
            const res = NextResponse.next();
            res.headers.set('Access-Control-Allow-Origin', origin);
            res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
            res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.headers.set('X-Frame-Options', 'DENY');
            res.headers.set('X-Content-Type-Options', 'nosniff');
            res.headers.set('Referrer-Policy', 'no-referrer');
            return res;
        } else if (origin) {
            return new NextResponse('CORS Error: Origin not allowed', { status: 403 });
        }
    }

    // Data Validation for API routes
    if (!(await validateRequest(request))) {
        return new NextResponse('Invalid request data', { status: 400 });
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
