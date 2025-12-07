import { cookies } from 'next/headers';

function base64url(input: Buffer) {
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecodeToBuffer(input: string) {
  // pad
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad === 2) str += '==';
  else if (pad === 3) str += '=';
  else if (pad !== 0) str += '';
  return Buffer.from(str, 'base64');
}

export type SessionPayload = { sub: string; email?: string; iat?: number; exp?: number };

export function getSession(): SessionPayload | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) {
      console.log('No session cookie found');
      return null;
    }
    const secret = process.env.SESSION_SECRET || 'dev-secret';
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const data = `${h}.${p}`;
    const crypto = require('node:crypto');
    const sig = crypto.createHmac('sha256', secret).update(data).digest();
    const expected = base64url(sig);
    if (expected !== s) return null;
    const payloadJson = base64urlDecodeToBuffer(p).toString('utf8');
    const payload = JSON.parse(payloadJson) as SessionPayload;
    if (typeof payload?.exp === 'number' && Math.floor(Date.now() / 1000) > payload.exp) {
      console.log('Session expired');
      return null;
    }
    if (typeof payload?.sub !== 'string') {
      console.log('Invalid session payload - missing sub');
      return null;
    }
    console.log('Session validated:', { sub: payload.sub, email: payload.email });
    return payload;
  } catch (err) {
    console.error('Session validation error:', err);
    return null;
  }
}
