import { NextRequest } from 'next/server';

// Allowlist of remote image hosts (suffix match)
const ALLOWED_HOST_SUFFIXES = [
  '.alibaba.com',
  '.alicdn.com',
  '.1688.com',
  '.aliexpress.com',
  '.aliexpress-media.com',
];

function isAllowedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(suf => h === suf.slice(1) || h.endsWith(suf));
}

function refererForHost(host: string) {
  if (host.includes('aliexpress')) return 'https://www.aliexpress.com/';
  if (host.includes('1688')) return 'https://s.1688.com/';
  if (host.includes('alicdn') || host.includes('alibaba')) return 'https://www.alibaba.com/';
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const src = searchParams.get('src') || '';
    if (!src) return new Response('Missing src', { status: 400 });
    let url: URL;
    try {
      // Support protocol-less URLs that may slip through
      const full = src.startsWith('http') ? src : (src.startsWith('//') ? `https:${src}` : src);
      url = new URL(full);
    } catch {
      return new Response('Invalid URL', { status: 400 });
    }
    if (!/^https?:$/.test(url.protocol)) return new Response('Protocol not allowed', { status: 400 });
    if (!isAllowedHost(url.hostname)) return new Response('Host not allowed', { status: 403 });

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };
    const ref = refererForHost(url.hostname);
    if (ref) headers['Referer'] = ref;

    const upstream = await fetch(url.toString(), { headers });
    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream error', { status: upstream.status || 502 });
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const resHeaders = new Headers();
    resHeaders.set('Content-Type', contentType);
    // Cache for 1 day at edge/browser; adjust as needed
    resHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
    // Allow embedding in <img> tags cross-origin
    resHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(upstream.body, { status: 200, headers: resHeaders });
  } catch (e) {
    return new Response('Internal error', { status: 500 });
  }
}
