import { NextRequest } from "next/server";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { token, ip } = (await req.json()) as { token?: string; ip?: string };
    if (!token) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_token" }), { status: 400 });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_server_secret" }), { status: 500 });
    }

    const form = new URLSearchParams();
    form.append("secret", secret);
    form.append("response", token);
    if (ip) form.append("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
    });
    const data = (await res.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      return new Response(
        JSON.stringify({ ok: false, reason: "verification_failed", errors: data["error-codes"] ?? [] }),
        { status: 400 }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, reason: "exception" }), { status: 500 });
  }
}
