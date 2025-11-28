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

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value || "";
    const secret = process.env.SESSION_SECRET || "dev-secret";
    const session = await verifySession(sessionToken, secret);
    if (!session) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ ok: false, reason: "database_unavailable" }, { status: 503 });
    }

    const body = await req.json();
    const fullName = String(body?.fullName ?? "").trim();
    const mobile = String(body?.mobile ?? "").trim();
    const companyName = body?.companyName ? String(body.companyName).trim() : "";
    const countryCode = body?.countryCode ? String(body.countryCode).trim() : "";
    const individualBuyer = Boolean(body?.individualBuyer ?? false);

    if (!fullName) {
      return NextResponse.json({ ok: false, reason: "missing_full_name" }, { status: 400 });
    }
    if (!mobile) {
      return NextResponse.json({ ok: false, reason: "missing_mobile" }, { status: 400 });
    }
    // Basic E.164-like validation: starts with + and 8-16 digits in total
    const mobileOk = /^\+[1-9]\d{7,15}$/.test(mobile);
    if (!mobileOk) {
      return NextResponse.json({ ok: false, reason: "invalid_mobile" }, { status: 400 });
    }

    // Parse full name into firstName and lastName
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // Update fields on User, including company and country details (typed client).
    await prisma.user.update({
      where: { id: session.sub },
      data: {
        name: fullName,
        firstName,
        lastName: lastName || null,
        phone: mobile,
        companyName: companyName || null,
        countryCode: countryCode || null,
        isIndividualBuyer: individualBuyer,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("/api/register/information failed", err);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
