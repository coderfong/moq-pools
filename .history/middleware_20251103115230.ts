import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

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
  ];
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for custom session token
  const token = req.cookies.get("session")?.value;
  const secret = process.env.SESSION_SECRET || "dev-secret";
  const verified = token ? await verifySessionToken(token, secret) : null;
  
  // Also check for NextAuth session token
  const nextAuthToken = req.cookies.get("next-auth.session-token")?.value || 
                        req.cookies.get("__Secure-next-auth.session-token")?.value;
  
  // Allow access if either authentication method is valid
  if ((!token || !verified) && !nextAuthToken) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/pay/:path*",
    "/checkout/:path*",
  ],
};
