import { NextRequest } from 'next/server';

// Allowlist of remote image hosts (suffix match)
const ALLOWED_HOST_SUFFIXES = [
  '.alibaba.com',
  '.alicdn.com',
  '.1688.com',
  // AliExpress removed
  '.made-in-china.com',
  '.micstatic.com',
  // IndiaMART image/CDN domains
  '.indiamart.com',
  '.imimg.com',
];

function isAllowedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(suf => h === suf.slice(1) || h.endsWith(suf));
}

function refererForHost(host: string) {
  if (host.includes('1688')) return 'https://s.1688.com/';
  if (host.includes('alicdn') || host.includes('alibaba')) return 'https://www.alibaba.com/';
  if (host.includes('made-in-china')) return 'https://www.made-in-china.com/';
  if (host.includes('indiamart') || host.includes('imimg')) return 'https://dir.indiamart.com/';
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSrc = searchParams.get('src') || '';
    if (!rawSrc) return new Response('Missing src', { status: 400 });
    // Decode percent-encoded URLs passed in src (handle double-encoded just in case)
    const tryDecode = (s: string) => {
      try { return decodeURIComponent(s); } catch { return s; }
    };
    let src = tryDecode(rawSrc);
    // Some callers may double-encode; decode twice if needed
    if (/^https?%3A/i.test(src) || src.includes('%2F')) src = tryDecode(src);
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

    // Helper to fetch with fallbacks on size-suffixed URLs
    const tryFetch = async (u: URL): Promise<Response> => {
      const res = await fetch(u.toString(), { headers });
      if (res.ok && res.body) return res;
      const status = res.status || 0;
      if (![400, 401, 403, 404].includes(status)) return res; // non-recoverable or unknown
      // Attempt fallback variants by stripping size suffixes that some CDN paths don't support
      const orig = u.toString();
      const variants: string[] = [];
      // Strip trailing _960x960q80.jpg
      variants.push(orig.replace(/_960x960q80\.jpg(?=($|\?))/i, ''));
      // Strip trailing _960x960.png
      variants.push(orig.replace(/_960x960\.png(?=($|\?))/i, ''));
      // General: replace any _WxH[qN].ext with .ext
      variants.push(orig.replace(/_(\d{2,4})x(\d{2,4})(?:[a-z0-9]+)?\.(png|jpe?g)(?=($|\?))/i, '.$3'));
      for (const v of variants) {
        if (v === orig) continue;
        try {
          const r = await fetch(v, { headers });
          if (r.ok && r.body) return r;
        } catch {}
      }
      return res;
    };

    const upstream = await tryFetch(url);
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
