import { NextRequest } from 'next/server';
import { cacheExternalImage } from '@/lib/imageCache';
import path from 'node:path';
import fs from 'node:fs/promises';

export const dynamic = 'force-dynamic';

// Direct image endpoint that returns the cached file bytes.
// Usage: /api/external/cache-img?src=<externalUrl>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const src = (searchParams.get('src') || '').trim();
    if (!src) return new Response('Missing src', { status: 400 });
    const { localPath, absPath } = await cacheExternalImage(src);
    const data = await fs.readFile(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return new Response(data, {
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
import { NextRequest } from 'next/server';
import { cacheExternalImage } from '@/lib/imageCache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const src = searchParams.get('src') || '';
    if (!src) return new Response('Missing src', { status: 400 });
    const { localPath } = await cacheExternalImage(src);
    // Redirect to the static file under /public/cache
    return Response.redirect(new URL(localPath, req.url), 302);
  } catch (e: any) {
    return new Response(e?.message || 'Error', { status: 500 });
  }
}
