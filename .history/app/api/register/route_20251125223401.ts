import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyPayload } from "@/lib/tokens";
import { getRateLimiter } from "@/lib/rateLimiter";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 3 registrations per 10 minutes per IP
    const limiter = getRateLimiter('register', { capacity: 3, refillRate: 1/200 });
    if (!limiter.tryRemoveTokens(1)) {
      return NextResponse.json({ ok: false, reason: "rate_limit_exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const turnstileToken = String(body?.token ?? "");
    const verificationCode = String(body?.verificationCode ?? "");
    const verifyToken = String(body?.verifyToken ?? "");

    if (!email) {
      return NextResponse.json({ ok: false, reason: "missing_email" }, { status: 400 });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ ok: false, reason: "missing_password" }, { status: 400 });
    }

    // Verify the email verification code
    if (!verificationCode) {
      return NextResponse.json({ ok: false, reason: "missing_verification_code" }, { status: 400 });
    }
    if (!verifyToken) {
      return NextResponse.json({ ok: false, reason: "missing_verification_code" }, { status: 400 });
    }

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      return NextResponse.json({ ok: false, reason: "missing_secret" }, { status: 500 });
    }

    const payload = await verifyPayload(verifyToken, sessionSecret);
    if (!payload) {
      return NextResponse.json({ ok: false, reason: "invalid_verification_code" }, { status: 400 });
    }

    // Check if code matches
    if (payload.code !== verificationCode) {
      return NextResponse.json({ ok: false, reason: "invalid_verification_code" }, { status: 400 });
    }

    // Check if email matches
    if (payload.email.toLowerCase() !== email) {
      return NextResponse.json({ ok: false, reason: "invalid_verification_code" }, { status: 400 });
    }

    // Check if token expired
    if (Date.now() > payload.exp) {
      return NextResponse.json({ ok: false, reason: "invalid_verification_code" }, { status: 400 });
    }

    // Optional Turnstile verification if configured
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!turnstileToken) {
        return NextResponse.json({ ok: false, reason: "missing_token" }, { status: 400 });
      }
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const form = new URLSearchParams();
      form.append("secret", turnstileSecret);
      form.append("response", turnstileToken);
      if (ip) form.append("remoteip", ip);
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form,
        cache: "no-store",
      });
      const verifyJson = (await verifyRes.json()) as TurnstileVerifyResponse;
      if (!verifyJson.success) {
        return NextResponse.json(
          { ok: false, reason: "verification_failed", errors: verifyJson["error-codes"] ?? [] },
          { status: 400 }
        );
      }
    }

    if (!prisma) {
      return NextResponse.json({ ok: false, reason: "database_unavailable" }, { status: 503 });
    }

    // If user exists, reject (simple flow); else create with hashed password
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ ok: false, reason: "email_in_use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true },
    });

    // Set session cookie (same logic as login), using Web Crypto HMAC
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 7; // 7 days
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .toString("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const sessionPayload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, iat: now, exp }))
      .toString("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const data = `${header}.${sessionPayload}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(sessionSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    const sigB64 = Buffer.from(new Uint8Array(sigBuf)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const sessionToken = `${data}.${sigB64}`;

    const res = NextResponse.json({ ok: true, user }, { status: 200 });
  res.cookies.set("session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    return NextResponse.json({ ok: false, reason: "exception" }, { status: 500 });
  }
}
