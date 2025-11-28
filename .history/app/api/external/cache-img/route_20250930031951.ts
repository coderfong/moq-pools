import { NextRequest } from 'next/server';
import { cacheExternalImage } from '@/lib/imageCache';
import { getAlibabaDetailFirstJpg, isAlibabaBadImageUrl } from '@/lib/providers/alibaba';
import path from 'node:path';
import fs from 'node:fs/promises';

export const dynamic = 'force-dynamic';

// Direct image endpoint that returns the cached file bytes.
// Usage: /api/external/cache-img?src=<externalUrl>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const src = (searchParams.get('src') || '').trim();
    const preferDetail = /^(1|true|yes)$/i.test(String(searchParams.get('detail') || ''));
    if (!src) return new Response('Missing src', { status: 400 });
    // If src is an Alibaba product detail URL, resolve its primary product image first
    let effectiveSrc = src;
    try {
      const u = new URL(src.startsWith('http') ? src : (src.startsWith('//') ? `https:${src}` : src));
      const host = u.hostname.toLowerCase();
      const path = u.pathname.toLowerCase();
      const isAlibabaDetail = (host.endsWith('alibaba.com') && (/\/product-detail\//.test(path) || /\/offer\//.test(path) || /\/product\//.test(path)));
      if (isAlibabaDetail || preferDetail) {
        const best = await getAlibabaDetailFirstJpg(u.toString());
        if (best) effectiveSrc = best;
      }
    } catch {}

    // Reject obvious placeholder/logo images from Alibaba even if requested directly
    try {
      const testUrl = new URL(effectiveSrc.startsWith('http') ? effectiveSrc : (effectiveSrc.startsWith('//') ? `https:${effectiveSrc}` : effectiveSrc));
      const h = testUrl.hostname.toLowerCase();
      if ((h.includes('alibaba') || h.includes('alicdn')) && isAlibabaBadImageUrl(testUrl.toString())) {
        return new Response('Bad image', { status: 415 });
      }
    } catch {}

    const { absPath } = await cacheExternalImage(effectiveSrc);
    const data = await fs.readFile(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      }
    });
  } catch (e: any) {
    return new Response('Image fetch failed', { status: 400 });
  }
}
