import { NextRequest, NextResponse } from 'next/server';
// Ensure we use the '@/*' alias directly pointing to 'src/*'.
// (Removed any legacy '@/src/lib/*' forms that caused TS resolution errors.)
import { fetchIndiaMartDetail } from '@/lib/detailProxy';
import { getRateLimiter } from '@/lib/rateLimiter';

// Configure a moderate bucket: 30 tokens capacity, 0.5 tokens/sec (~30 req burst then 1 every 2s)
const limiter = getRateLimiter('indiamart-detail', { capacity: 30, refillRate: 0.5 });

export const revalidate = 0; // always dynamic

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url');
  const force = searchParams.get('force') === '1';
  const snippetLen = parseInt(searchParams.get('snippet') || '0', 10) || undefined;
  if (!rawUrl) return bad('Missing url');
  if (!/^https?:\/\//i.test(rawUrl)) return bad('Invalid protocol');
  if (!/\.indiamart\.com/i.test(rawUrl)) return bad('Host must be indiamart.com');

  if (!limiter.tryRemoveTokens(1)) {
    return NextResponse.json({ error: 'Rate limited', retryMs: limiter.estimatedWaitMs }, { status: 429 });
  }
  try {
    const data = await fetchIndiaMartDetail(rawUrl, { force, snippetLen });
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Upstream fetch failed', detail: String(e?.message || e) }, { status: 502 });
  }
}
