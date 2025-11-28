import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { signPayload } from "@/src/lib/tokens";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, reason: "missing_email" }, { status: 400 });
    }

    const code = ("0000" + Math.floor(Math.random() * 10000)).slice(-4);
    const exp = Date.now() + 10 * 60 * 1000; // 10 minutes

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      return NextResponse.json({ ok: false, reason: "missing_secret" }, { status: 500 });
    }

    const token = await signPayload({ email, code, exp }, sessionSecret);

    // Configure transport via SMTP environment variables
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env as Record<string, string | undefined>;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      // If SMTP missing, return the code for dev to allow manual testing
      return NextResponse.json({ ok: true, dev: true, code, token });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: "Your verification code",
      text: `Your MOQ Pools verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your MOQ Pools verification code is <b style="font-size:18px">${code}</b>.</p><p>It expires in 10 minutes.</p>`,
    });

    return NextResponse.json({ ok: true, token });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}