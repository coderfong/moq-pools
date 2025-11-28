import { NextResponse } from 'next/server';
import { indiaMartMetrics } from '@/lib/providers/indiamart';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Basic safeguards: only expose in non-production unless explicitly allowed
  if (process.env.NODE_ENV === 'production' && process.env.EXPOSE_METRICS !== '1') {
    return NextResponse.json({ error: 'disabled' }, { status: 403 });
  }
  return NextResponse.json({ metrics: indiaMartMetrics, ts: Date.now() });
}
