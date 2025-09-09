import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';

// Simple API key check (prototype). In production use OAuth2/JWT or mTLS for system-to-system.
// Accept either SWIFT_API_KEY or API_KEY to reduce env naming confusion; fallback to dev-key for local.
const API_KEY = process.env.SWIFT_API_KEY || process.env.API_KEY || 'dev-key';

// Debug mode from environment
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

// Simple in-memory rate limiter (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

// Helper validation functions with enhanced checks
function isValidOrderId(orderId: unknown): boolean {
    if (typeof orderId !== 'string') return false;
    // Check for valid format and prevent injection attempts
    if (!/^[a-zA-Z0-9]{6,20}$/.test(orderId)) return false;
    // Check for common SQL injection patterns
    const suspiciousPatterns = /('|--|;|\*|union|select|drop|insert|update|delete)/i;
    return !suspiciousPatterns.test(orderId);
}

function isValidItems(items: unknown): boolean {
    if (!Array.isArray(items) || items.length === 0) return false;
    if (items.length > 100) return false; // Prevent excessive items
    
    return items.every(item => {
        if (!item || typeof item !== 'object') return false;
        if (typeof item.id !== 'string' || item.id.length < 2 || item.id.length > 100) return false;
        if (typeof item.quantity !== 'number' || item.quantity <= 0 || item.quantity > 10000) return false;
        if (!Number.isInteger(item.quantity)) return false;
        return true;
    });
}

function isValidCustomer(customer: unknown): boolean {
    if (!customer) return true; // Optional field
    if (typeof customer !== 'object' || customer === null) return false;
    
    const cust = customer as Record<string, unknown>;
    
    // Validate name
    if (typeof cust.name !== 'string' || cust.name.length < 2 || cust.name.length > 100) return false;
    if (!/^[a-zA-Z\s'-]+$/.test(cust.name)) return false; // Only letters, spaces, hyphens, apostrophes
    
    // Validate email
    if (typeof cust.email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cust.email) || cust.email.length > 254) return false;
    
    return true;
}

// Rate limiting check
function checkRateLimit(clientIdentifier: string, requestId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const clientData = rateLimitStore.get(clientIdentifier);
    
    if (!clientData || now > clientData.resetTime) {
        // New window
        rateLimitStore.set(clientIdentifier, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW
        });
        return { allowed: true };
    }
    
    if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
        const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
        console.warn(`[${requestId}] Rate limit exceeded for ${clientIdentifier}`);
        return { allowed: false, retryAfter };
    }
    
    clientData.count++;
    return { allowed: true };
}

// Clean up old rate limit entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetTime + RATE_LIMIT_WINDOW) {
            rateLimitStore.delete(key);
        }
    }
}, RATE_LIMIT_WINDOW * 2);

// Enhanced request validation with multiple route support
async function validateRequest(req: NextRequest, requestId: string): Promise<{ valid: boolean; error?: string }> {
    const path = req.nextUrl.pathname;
    const method = req.method;
    
    // Check request size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
        console.error(`[${requestId}] Request too large: ${contentLength} bytes`);
        return { valid: false, error: 'Request body too large' };
    }
    
    // Validate specific routes
    if (path === '/api/orders' && method === 'POST') {
        try {
            const bodyText = await req.text();
            if (DEBUG_MODE) {
                console.log(`[${requestId}] Validating request body for /api/orders`);
            }
            
            if (!bodyText || bodyText.trim().length === 0) {
                console.error(`[${requestId}] Empty request body`);
                return { valid: false, error: 'Empty request body' };
            }
            
            // Check for reasonable body size
            if (bodyText.length > 1024 * 1024) { // 1MB max for order
                console.error(`[${requestId}] Request body too large for order`);
                return { valid: false, error: 'Order data too large' };
            }
            
            let body;
            try {
                body = JSON.parse(bodyText);
            } catch (e) {
                console.error(`[${requestId}] JSON parsing error:`, e);
                return { valid: false, error: 'Invalid JSON format' };
            }
            
            // Check for required fields
            if (!body.orderId) {
                return { valid: false, error: 'Missing required field: orderId' };
            }
            if (!body.items) {
                return { valid: false, error: 'Missing required field: items' };
            }
            
            if (!isValidOrderId(body.orderId)) {
                console.error(`[${requestId}] Invalid orderId: ${body.orderId}`);
                return { valid: false, error: 'Invalid order ID format or potentially malicious content' };
            }
            
            if (!isValidItems(body.items)) {
                console.error(`[${requestId}] Invalid items structure`);
                return { valid: false, error: 'Invalid items: must be array with valid products and quantities' };
            }
            
            if (body.customer && !isValidCustomer(body.customer)) {
                console.error(`[${requestId}] Invalid customer data`);
                return { valid: false, error: 'Invalid customer data format' };
            }
            
            if (DEBUG_MODE) {
                console.log(`[${requestId}] Request validation passed`);
            }
        } catch (error) {
            console.error(`[${requestId}] Validation error:`, error);
            return { valid: false, error: 'Request validation failed' };
        }
    }
    
    // Validate driver routes
    if (path.startsWith('/api/driver/') && method === 'POST') {
        try {
            const bodyText = await req.text();
            
            if (!bodyText || bodyText.trim().length === 0) {
                console.error(`[${requestId}] Empty request body for driver API`);
                return { valid: false, error: 'Empty request body' };
            }
            
            let body;
            try {
                body = JSON.parse(bodyText);
            } catch (e) {
                console.error(`[${requestId}] JSON parsing error for driver API:`, e);
                return { valid: false, error: 'Invalid JSON format' };
            }
            
            // Validate packageId for driver operations
            if (path.includes('/deliver') || path.includes('/fail')) {
                if (!body.packageId || typeof body.packageId !== 'string') {
                    return { valid: false, error: 'Missing or invalid packageId' };
                }
                
                // Validate package ID format
                if (!/^PKG[a-zA-Z0-9]{6,}$/.test(body.packageId)) {
                    return { valid: false, error: 'Invalid package ID format' };
                }
            }
            
            if (DEBUG_MODE) {
                console.log(`[${requestId}] Driver API validation passed`);
            }
        } catch (error) {
            console.error(`[${requestId}] Driver API validation error:`, error);
            return { valid: false, error: 'Request validation failed' };
        }
    }
    
    return { valid: true };
}


// Generate unique request ID for tracking
function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
    const url = request.nextUrl;
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Enhanced Request Logging
    const logData = {
        requestId,
        timestamp: new Date().toISOString(),
        method: request.method,
        path: url.pathname,
        query: url.search,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        origin: request.headers.get('origin'),
    };

    console.log(`[MIDDLEWARE] Request started:`, JSON.stringify(logData));
    
    // Rate limiting for API routes
    if (url.pathname.startsWith('/api/')) {
        const clientIdentifier = logData.ip || 'unknown';
        const rateLimitResult = checkRateLimit(clientIdentifier, requestId);
        
        if (!rateLimitResult.allowed) {
            console.warn(`[${requestId}] Rate limit exceeded for IP: ${clientIdentifier}`);
            return new NextResponse(JSON.stringify({ 
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please try again later.',
                requestId 
            }), { 
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Id': requestId,
                    'Retry-After': String(rateLimitResult.retryAfter || 60)
                }
            });
        }
    }

    // Maintenance Mode with debug logging
    if (MAINTENANCE_MODE && !url.pathname.startsWith('/admin')) {
        console.log(`[${requestId}] Maintenance mode active - blocking request`);
        return new NextResponse('Site under maintenance. Please check back later.', { 
            status: 503,
            headers: {
                'X-Request-Id': requestId,
                'Retry-After': '3600'
            }
        });
    }

    // SEO-Friendly Redirects with logging
    const redirectTo = seoRedirects[url.pathname];
    if (redirectTo) {
        console.log(`[${requestId}] SEO redirect: ${url.pathname} -> ${redirectTo}`);
        return NextResponse.redirect(new URL(redirectTo, request.url), {
            status: 301,
            headers: {
                'X-Request-Id': requestId
            }
        });
    }

    // API Key Check with enhanced logging
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/updates') {
        const key = request.headers.get('x-api-key');
        
        if (DEBUG_MODE) {
            console.log(`[${requestId}] API key check for ${url.pathname}`);
        }
        
        if (!key) {
            console.error(`[${requestId}] Missing API key for ${url.pathname} from IP: ${logData.ip}`);
            return new NextResponse(JSON.stringify({ 
                error: 'Unauthorized',
                message: 'API key required',
                requestId 
            }), {
                status: 401,
                headers: { 
                    'Content-Type': 'application/json', 
                    'WWW-Authenticate': 'ApiKey realm="swift" header="x-api-key"',
                    'X-Request-Id': requestId
                }
            });
        }
        
        if (key !== API_KEY) {
            console.error(`[${requestId}] Invalid API key attempt from IP: ${logData.ip}`);
            return new NextResponse(JSON.stringify({ 
                error: 'Unauthorized',
                message: 'Invalid API key',
                requestId 
            }), {
                status: 401,
                headers: { 
                    'Content-Type': 'application/json', 
                    'WWW-Authenticate': 'ApiKey realm="swift" header="x-api-key"',
                    'X-Request-Id': requestId
                }
            });
        }
        
        if (DEBUG_MODE) {
            console.log(`[${requestId}] API key validation successful`);
        }
    }

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
        const origin = request.headers.get('origin');
        
        if (DEBUG_MODE) {
            console.log(`[${requestId}] Handling OPTIONS preflight from origin: ${origin}`);
        }
        
        if (origin && allowedOrigins.includes(origin)) {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
                    'Access-Control-Max-Age': '86400',
                    'X-Request-Id': requestId
                }
            });
        }
    }

    // CORS Handling for API routes
    if (url.pathname.startsWith('/api/')) {
        const origin = request.headers.get('origin');
        
        if (origin) {
            if (allowedOrigins.includes(origin)) {
                if (DEBUG_MODE) {
                    console.log(`[${requestId}] CORS: Allowing origin ${origin}`);
                }
                const res = NextResponse.next();
                res.headers.set('Access-Control-Allow-Origin', origin);
                res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
                res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
                res.headers.set('Access-Control-Allow-Credentials', 'true');
                res.headers.set('X-Frame-Options', 'DENY');
                res.headers.set('X-Content-Type-Options', 'nosniff');
                res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
                res.headers.set('X-Request-Id', requestId);
                return res;
            } else {
                console.error(`[${requestId}] CORS: Blocked origin ${origin}`);
                return new NextResponse(JSON.stringify({ 
                    error: 'CORS Error',
                    message: 'Origin not allowed',
                    requestId 
                }), { 
                    status: 403,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-Id': requestId
                    }
                });
            }
        }
    }

    // Data Validation for API routes
    const validation = await validateRequest(request, requestId);
    if (!validation.valid) {
        console.error(`[${requestId}] Request validation failed: ${validation.error}`);
        return new NextResponse(JSON.stringify({ 
            error: 'Bad Request',
            message: validation.error,
            requestId 
        }), { 
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Id': requestId
            }
        });
    }

    // Continue with the request
    const res = NextResponse.next();
    
    // Add security headers
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-Request-Id', requestId);
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Log response time asynchronously
    event.waitUntil(
        Promise.resolve().then(() => {
            const duration = Date.now() - startTime;
            console.log(`[MIDDLEWARE] Request completed:`, JSON.stringify({
                requestId,
                path: url.pathname,
                method: request.method,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            }));
        })
    );
    
    return res;
}

export const config = {
    matcher: [
        '/api/:path*',
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ]
};
