import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SessionPayload = {
  sub: string; // user id
  email: string;
  iat: number;
  exp: number;
};

function base64urlToBuffer(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBuffer(sigB64),
      enc.encode(data)
    );
    if (!ok) return null;
    const payloadJson = base64urlToBuffer(payloadB64).toString("utf8");
    const payload = JSON.parse(payloadJson) as SessionPayload;
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value || "";
    const secret = process.env.SESSION_SECRET || "dev-secret";
    const session = await verifySession(sessionToken, secret);
    if (!session) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    // Return firstName heuristic (split by space) for display
    const firstName = (user.name || "").trim().split(/\s+/)[0] || null;
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, firstName } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
