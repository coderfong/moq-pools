// Lightweight signed token using Web Crypto HMAC (HS256-like)
// Format: base64url(JSON payload).base64url(signature)

export type VerifyPayload = {
  email: string;
  code: string; // 4-digit
  exp: number; // epoch ms
};

function toUtf8Bytes(s: string) {
  return new TextEncoder().encode(s);
}

function base64url(bytes: ArrayBuffer | Uint8Array) {
  const b64 = Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString("base64");
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function importHmacKey(secret: string) {
  return await crypto.subtle.importKey(
    "raw",
    toUtf8Bytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signPayload(payload: VerifyPayload, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const header = base64url(toUtf8Bytes(json));
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, toUtf8Bytes(header));
  const signature = base64url(sig);
  return `${header}.${signature}`;
}

export async function verifyPayload(token: string, secret: string): Promise<VerifyPayload | null> {
  const [header, signature] = token.split(".");
  if (!header || !signature) return null;
  const key = await importHmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64"), toUtf8Bytes(header));
  if (!ok) return null;
  try {
    const json = Buffer.from(header.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(json) as VerifyPayload;
    return payload;
  } catch {
    return null;
  }
}