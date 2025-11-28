import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getRateLimiter } from "@/lib/rateLimiter";

function base64url(input: Buffer) {
  return input.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function createSessionToken(payload: Record<string, unknown>, secret: string) {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const h = base64url(Buffer.from(JSON.stringify(header)));
  const p = base64url(Buffer.from(JSON.stringify(payload)));
  const data = `${h}.${p}`;
  const crypto = require("node:crypto");
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const s = base64url(sig);
  return `${data}.${s}`;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 5 minutes per IP
    const limiter = getRateLimiter('login', { capacity: 5, refillRate: 1/300 });
    if (!await limiter.take()) {
      return NextResponse.json({ ok: false, reason: "rate_limit_exceeded" }, { status: 429 });
    }

    if (!prisma) return NextResponse.json({ ok: false, reason: 'db_unavailable' }, { status: 503 });
    const db = prisma;
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, reason: "missing_credentials" }, { status: 400 });
    }

  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ ok: false, reason: "invalid_credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ ok: false, reason: "invalid_credentials" }, { status: 401 });
    }

    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      console.error('[Login] SESSION_SECRET not configured');
      return NextResponse.json({ ok: false, reason: "server_config_error" }, { status: 500 });
    }
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 7; // 7 days
    const token = createSessionToken({ sub: user.id, email: user.email, iat: now, exp }, secret);

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set("session", token, {
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
