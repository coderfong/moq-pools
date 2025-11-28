import { NextResponse, NextRequest } from 'next/server';
import { cacheExternalImage } from '@/lib/imageCache';
import { getAlibabaDetailFirstJpg } from '@/lib/providers/alibaba';
import { getMadeInChinaDetailSecondImage } from '@/lib/providers/madeinchina';
import { getIndiaMartDetailMainImage } from '@/lib/providers/indiamart';
import { getC1688DetailMainImage } from '@/lib/providers/c1688';
import { isBadImageHashFromPath } from '@/lib/badImages';

export const dynamic = 'force-dynamic';

// Resolve an external image URL to a local cached path under /public/cache
// Usage: /api/external/resolve-img?src=<externalUrl>
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const src = (searchParams.get('src') || '').trim();
  if (!src) return NextResponse.json({ ok: false, error: 'missing src' }, { status: 400 });
  try {
    // If src is a product detail page (Alibaba), extract the first JPG from HTML and cache that.
    try {
      const u = new URL(src.startsWith('http') ? src : (src.startsWith('//') ? `https:${src}` : src));
      const host = u.hostname.toLowerCase();
      const path = u.pathname.toLowerCase();
    const isAlibabaDetail = (host.endsWith('alibaba.com') && (/\/product-detail\//.test(path) || /\/offer\//.test(path) || /\/product\//.test(path)));
    const isMicDetail = (host.endsWith('made-in-china.com') && (/\/product\//.test(path) || /\/showroom\//.test(path)));
    const isImDetail = (host.endsWith('indiamart.com') && (/product|proddetail|pdp|buy/.test(path)));
    const is1688Detail = ((host.endsWith('1688.com') || host.endsWith('alibaba.com.cn')) && (/\/offer\//.test(path) || /\/product\//.test(path) || /\/detail\//.test(path)));
      if (isAlibabaDetail) {
        const best = await getAlibabaDetailFirstJpg(u.toString());
        if (!best) return new NextResponse(null, { status: 204 });
        const { localPath } = await cacheExternalImage(best);
        if (!localPath || isBadImageHashFromPath(localPath)) return new NextResponse(null, { status: 204 });
        return NextResponse.json({ ok: true, path: localPath, localPath }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } });
      }
      if (isMicDetail) {
        const best = await getMadeInChinaDetailSecondImage(u.toString());
        if (!best) return new NextResponse(null, { status: 204 });
        const { localPath } = await cacheExternalImage(best);
        if (!localPath || isBadImageHashFromPath(localPath)) return new NextResponse(null, { status: 204 });
        return NextResponse.json({ ok: true, path: localPath, localPath }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } });
      }
      if (isImDetail) {
        const best = await getIndiaMartDetailMainImage(u.toString());
        if (!best) return new NextResponse(null, { status: 204 });
        const { localPath } = await cacheExternalImage(best);
        if (!localPath || isBadImageHashFromPath(localPath)) return new NextResponse(null, { status: 204 });
        return NextResponse.json({ ok: true, path: localPath, localPath }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } });
      }
      if (is1688Detail) {
        const best = await getC1688DetailMainImage(u.toString());
        if (!best) return new NextResponse(null, { status: 204 });
        const { localPath } = await cacheExternalImage(best);
        if (!localPath || isBadImageHashFromPath(localPath)) return new NextResponse(null, { status: 204 });
        return NextResponse.json({ ok: true, path: localPath, localPath }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } });
      }
    } catch {
      // Swallow and avoid falling through to treat detail page as a direct image
      return new NextResponse(null, { status: 204 });
    }

    // Otherwise treat src as a direct image URL to cache
    const { localPath } = await cacheExternalImage(src);
    if (!localPath || isBadImageHashFromPath(localPath)) return new NextResponse(null, { status: 204 });
    return NextResponse.json({ ok: true, path: localPath, localPath }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  }
}

