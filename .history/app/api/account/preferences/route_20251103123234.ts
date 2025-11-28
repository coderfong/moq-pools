import { NextResponse } from 'next/server';
import { getSession } from '../../_lib/session';

export const runtime = 'nodejs';

// Simple in-memory storage for preferences (replace with database in production)
const prefsStore = new Map<string, any>();

export async function GET() {
  const session = getSession();
  if (!session?.sub) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  
  const prefs = prefsStore.get(session.sub) || {
    emailAlerts: true,
    smsAlerts: false,
    pushAlerts: true,
  };
  
  return NextResponse.json({ ok: true, prefs });
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session?.sub) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  
  try {
    const data = await req.json();
    prefsStore.set(session.sub, data);
    return NextResponse.json({ ok: true, prefs: data });
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'invalid_payload' }, { status: 400 });
  }
}
