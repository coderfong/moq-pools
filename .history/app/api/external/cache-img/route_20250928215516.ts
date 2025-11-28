import { NextRequest } from 'next/server';
import { cacheExternalImage } from '@/lib/imageCache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const src = searchParams.get('src') || '';
    const force = /^(1|true|yes)$/i.test(searchParams.get('force') || '');
    if (!src) return new Response('Missing src', { status: 400 });
    const { localPath } = await cacheExternalImage(src, { force });
    // Redirect to the static file under /public/cache
    return Response.redirect(new URL(localPath, req.url), 302);
  } catch (e: any) {
    return new Response(e?.message || 'Error', { status: 500 });
  }
}
