// Shared IndiaMART detail fetch helper with UA rotation, basic anti-burst jitter, and minimal caching hook.
import { sharedCache } from './cache';

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

export interface DetailFetchResult {
  url: string;
  status: number;
  fromCache: boolean;
  fetchedAt: string;
  htmlSnippet?: string; // truncated for lightweight payload
  retries?: number;      // number of upstream attempts
  // Optional extracted meta in future (price, title, image)
}

export interface DetailFetchOptions {
  cacheTtlMs?: number;       // default 15 min
  snippetLen?: number;       // default 4000 chars
  force?: boolean;           // bypass cache
}

const DEFAULT_TTL = 15 * 60 * 1000;

function canonicalDetailUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (!/\.indiamart\.com$/i.test(u.hostname)) throw new Error('host');
    // If /products/ keep only id + kwd
    if (u.pathname.startsWith('/products')) {
      const id = u.searchParams.get('id');
      const kwd = u.searchParams.get('kwd');
      u.search = '';
      if (id) u.searchParams.set('id', id);
      if (kwd) u.searchParams.set('kwd', kwd);
    } else {
      const keep = new Set(['id','kwd']);
      const kept: [string,string][] = [];
      u.searchParams.forEach((v,k)=>{ if (keep.has(k)) kept.push([k,v]); });
      u.search = '';
      for (const [k,v] of kept) u.searchParams.append(k,v);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export async function fetchIndiaMartDetail(rawUrl: string, opts: DetailFetchOptions = {}): Promise<DetailFetchResult> {
  const url = canonicalDetailUrl(rawUrl);
  const key = `im:detail:${url}`;
  const ttl = opts.cacheTtlMs ?? DEFAULT_TTL;
  const snippetLen = opts.snippetLen ?? 4000;
  if (!opts.force) {
    const cached = sharedCache.get(key) as DetailFetchResult | undefined;
    if (cached) return { ...cached, fromCache: true };
  }
  // Light jitter to avoid synchronized bursts
  await new Promise(r => setTimeout(r, Math.random() * 150 + 25));
  let status = 0;
  let html = '';
  let attempts = 0;
  const attemptFetch = async (alt: boolean) => {
    const ua = UA_POOL[(Math.floor(Math.random() * UA_POOL.length) + (alt ? 1 : 0)) % UA_POOL.length];
    const referers = alt
      ? ['https://www.google.com/', 'https://www.bing.com/search?q=indiamart']
      : ['https://dir.indiamart.com/'];
    const ref = referers[Math.floor(Math.random() * referers.length)];
    const acceptLang = alt ? 'en-US,en;q=0.8' : 'en-US,en;q=0.9';
    attempts++;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': acceptLang,
          'Referer': ref,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      status = res.status;
      if (res.ok) html = await res.text();
    } catch {
      status = 0;
    }
  };
  await attemptFetch(false);
  // Retry once if 403/429 with alternate headers
  if ((status === 403 || status === 429) && !opts.force) {
    await new Promise(r => setTimeout(r, 120 + Math.random() * 250));
    await attemptFetch(true);
  }
  const result: DetailFetchResult = {
    url,
    status,
    fromCache: false,
    fetchedAt: new Date().toISOString(),
    htmlSnippet: html ? html.slice(0, snippetLen) : undefined,
    retries: attempts - 1,
  };
  // Negative cache 404/410/403 for shorter time to dampen repeated hits
  const negStatuses = new Set([403,404,410,429]);
  const ttlToUse = negStatuses.has(status) ? Math.min(ttl, 5 * 60 * 1000) : ttl;
  sharedCache.set(key, result, ttlToUse);
  return result;
}
