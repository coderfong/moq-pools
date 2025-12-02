import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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

    // Update fields on User, including company and country details (typed client).
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: fullName,
        phone: mobile,
        companyName: companyName || null,
        countryCode: countryCode || null,
        isIndividualBuyer: individualBuyer,
        profileComplete: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("/api/register/information failed", err);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
