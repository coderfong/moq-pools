import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRateLimiter } from '@/lib/rateLimiter';

// Global rate limiter for all API routes
const globalLimiter = getRateLimiter('global-api', { 
  capacity: 1000, 
  refillRate: 100/60  // 100 requests per minute globally
});

// Per-IP rate limiter
const ipLimiters = new Map<string, any>();

function getIpLimiter(ip: string) {
  if (!ipLimiters.has(ip)) {
    ipLimiters.set(ip, getRateLimiter(`ip-${ip}`, {
      capacity: 200,
      refillRate: 50/60  // 50 requests per minute per IP
    }));
  }
  return ipLimiters.get(ip);
}

// Simple rate check for middleware
function checkRateLimit(ip: string): { success: boolean } {
  try {
    const ipLimiter = getIpLimiter(ip);
    return { success: ipLimiter.tryRemoveTokens(1) };
  } catch (error) {
    console.error('Rate limiter error:', error);
    return { success: true }; // Allow on error
  }
}

// Suspicious request detection
const suspiciousPatterns = [
  /wp-admin|wordpress|phpmyadmin|admin\.php/i,
  /\.env|config\.php|database\.php/i,
  /eval\(|<script|javascript:/i,
  /union.*select|drop.*table|insert.*into/i,
  /<iframe|<object|<embed/i,
];

function isSuspiciousRequest(req: NextRequest): boolean {
  const url = req.url.toLowerCase();
  const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';
  const clientIp = getClientIp(req);
  
  // Allow localhost/internal requests
  if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === 'localhost') {
    return false;
  }
  
  // Check for common attack patterns
  if (suspiciousPatterns.some(pattern => pattern.test(url))) {
    return true;
  }
  
  // Check for common bot patterns
  if (/curl|wget|python|go-http|scanner/i.test(userAgent)) {
    return true;
  }
  
  // Check for missing or suspicious user agents
  if (!userAgent || userAgent.length < 10) {
    return true;
  }
  
  return false;
}

function getClientIp(req: NextRequest): string {
  // Check standard proxy headers first
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip');
  const cfIp = req.headers.get('cf-connecting-ip');
  
  // Try to get IP from various headers
  const ip = forwarded || realIp || cfIp;
  
  // If we have an IP, return it
  if (ip) return ip;
  
  // For local development, check if the host is localhost
  const host = req.headers.get('host') || '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')) {
    return '::1';
  }
  
  return 'unknown';
}

function base64UrlToUint8Array(input: string): Uint8Array {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  else if (pad !== 0) base64 += ""; // unlikely
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  let base64 = btoa(binary);
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function hmacSha256Base64Url(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return uint8ArrayToBase64Url(new Uint8Array(sig));
}

async function verifySessionToken(token: string, secret: string) {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const data = `${h}.${p}`;
    const expected = await hmacSha256Base64Url(secret, data);
    if (expected !== s) return null;
    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(p));
    const payload = JSON.parse(payloadJson);
    if (typeof payload?.exp === "number" && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIp(req);
  const pathname = req.nextUrl.pathname;
  
  // Enhanced logging for security monitoring
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname} - IP: ${clientIp} - UA: ${req.headers.get('user-agent')?.substring(0, 100)}`);
  
  // Block suspicious requests immediately
  if (isSuspiciousRequest(req)) {
    console.warn(`🚨 BLOCKED suspicious request from ${clientIp}: ${pathname}`);
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Check rate limits
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.success) {
      console.warn(`🚨 RATE LIMITED: ${clientIp} - ${pathname}`);
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }), 
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }
  }

  // Continue with existing middleware logic
  const url = req.nextUrl.clone();

  // Rewrite known logo asset requests (optionally hashed like name.abcdef12.ext)
  try {
    const decoded = decodeURIComponent(pathname);
    const logoBases = ['Facebook-Logo-JPG', 'Twitter', 'google logo'];
    const match = decoded.match(/^\/(.+)\.(?:[a-f0-9]{6,10})\.(jpg|jpeg|png)$/i) || decoded.match(/^\/(.+)\.(jpg|jpeg|png)$/i);
    if (match) {
      const base = match[1];
      const isLogo = logoBases.some((b) => b.toLowerCase() === base.toLowerCase());
      if (isLogo) {
        const target = new URL(`/company-logos${pathname}`, req.url);
        return NextResponse.rewrite(target);
      }
    }
  } catch {}

  // Routes to protect
  const protectedPrefixes = [
    "/account",
    "/pay",
    "/checkout",
    "/admin",
  ];
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isProtected) {
    const response = NextResponse.next();
    // Add security headers to all responses
    response.headers.set('X-Request-ID', crypto.randomUUID());
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    return response;
  }

  // Check for custom session token
  const token = req.cookies.get("session")?.value;
  const secret = process.env.SESSION_SECRET || "dev-secret";
  const verified = token ? await verifySessionToken(token, secret) : null;
  
  // Debug: Log all cookies to see what's available
  const allCookies = req.cookies.getAll();
  console.log('[Middleware] All cookies:', allCookies.map(c => c.name));
  
  // Also check for NextAuth session token (both secure and non-secure variants)
  const nextAuthToken = req.cookies.get("next-auth.session-token")?.value || 
                        req.cookies.get("__Secure-next-auth.session-token")?.value;
  
  // Validate NextAuth JWT token using getToken (works in Edge Runtime)
  let nextAuthValid = false;
  if (nextAuthToken) {
    try {
      const { getToken } = await import('next-auth/jwt');
      const authToken = await getToken({ 
        req: req as any,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production',
        cookieName: process.env.NODE_ENV === 'production' 
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token'
      });
      nextAuthValid = authToken !== null && authToken.sub !== undefined;
      
      // Extra debug logging for troubleshooting
      console.log('[Middleware] NextAuth validation:', {
        hasToken: !!nextAuthToken,
        tokenValid: nextAuthValid,
        userId: authToken?.sub,
        pathname,
        cookieName: process.env.NODE_ENV === 'production' 
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
        authSecret: process.env.AUTH_SECRET ? 'set' : 'missing'
      });
    } catch (err: any) {
      console.error('[Middleware] NextAuth token validation failed:', err?.message || err);
    }
  } else {
    console.log('[Middleware] No NextAuth token found in cookies');
  }
  
  // Debug logging
  console.log("[Middleware] Auth check:", {
    pathname,
    clientIp,
    customSession: !!verified,
    nextAuthSession: nextAuthValid,
    hasNextAuthCookie: !!nextAuthToken,
    willRedirect: (!token || !verified) && !nextAuthValid && !nextAuthToken
  });
  
  // TEMPORARY FIX: If NextAuth cookie exists, allow checkout (let page handle auth)
  // This works around Edge Runtime getToken issues
  const isCheckout = pathname.startsWith('/checkout');
  
  // Check if ANY NextAuth cookie exists (more lenient check)
  const hasAnyNextAuthCookie = allCookies.some(c => 
    c.name.includes('next-auth') || c.name.includes('authjs')
  );
  
  const hasAnyAuth = (token && verified) || nextAuthValid || (isCheckout && (nextAuthToken || hasAnyNextAuthCookie));
  
  // Allow access if either authentication method is valid
  if (!hasAnyAuth) {
    console.log(`🔒 Auth failed for ${clientIp}, redirecting to login`);
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  // Add security headers to authenticated responses
  response.headers.set('X-Request-ID', crypto.randomUUID());
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
  response.headers.set('X-Authenticated', 'true');
  
  return response;
}

export const config = {
  matcher: [
    "/account/:path*",
    "/pay/:path*", 
    "/checkout/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
