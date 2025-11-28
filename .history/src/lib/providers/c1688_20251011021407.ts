import * as cheerio from 'cheerio';
import type { ExternalListing } from './types';

type FetchOptions = { headless?: boolean };

// Parse MOQ from mixed Chinese/English snippets. Returns a number if confidently parsed.
function parseMoqFromText(s?: string): number | null {
  if (!s) return null;
  const str = String(s).replace(/\s+/g, ' ').trim();
  // English tokens like: MOQ 100, Min. Order 200, ≥ 50
  let m = str.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order|≥|>=)\s*([\d,]+)/i);
  if (m) {
    const n = Number((m[1] || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  // Chinese tokens: 起订 / 起订量 / 最小起订量 100
  m = str.match(/(?:起订量?|最小起订量)\s*[:：]?\s*([\d,]+)/);
  if (m) {
    const n = Number((m[1] || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  // Symbols ≥ 100
  m = str.match(/(?:≥|>=)\s*([\d,]+)/);
  if (m) {
    const n = Number((m[1] || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  // Bare number + unit (Chinese units or common English units)
  m = str.match(/(^|\b)([\d,]{1,6})\s*(件|箱|套|个|pcs|pieces|units|bags|lots)\b/i);
  if (m) {
    const n = Number((m[2] || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  // Last resort: standalone number not adjacent to currency
  if (!/(US\$|\$|USD|RMB|CNY|¥|￥)/i.test(str)) {
    m = str.match(/(^|\b)([\d,]{1,6})(?![\d,])/);
    if (m) {
      const n = Number((m[2] || '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function parseC1688SearchHTML(html: string, base = 'https://s.1688.com', requireMoq = true): ExternalListing[] {
  const $ = cheerio.load(html);
  const items: ExternalListing[] = [];
  const normalizeImageUrl = (src = '') => {
    if (!src) return '';
    let u = src.trim();
    if (u.includes(',')) {
      const first = u.split(',')[0]?.trim().split(' ')[0];
      if (first) u = first;
    }
    if (u.startsWith('data:')) return '';
    if (u.startsWith('http')) return u.replace(/^http:\/\//i, 'https://');
    if (u.startsWith('//')) return `https:${u}`;
    return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
  };
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const isItem = /(?:detail|offer)\.1688\.com|\/offer\//.test(href);
    if (!isItem) return;
    const title = ($(el).attr('title') || $(el).text()).trim();
    if (!title) return;
    const imgEl = $(el).find('img').first();
    let img = imgEl.attr('src') || imgEl.attr('data-src') || '';
    if (!img) {
      const srcset = imgEl.attr('srcset') || '';
      if (srcset) img = srcset.split(',').map(s => s.trim().split(' ')[0]).find(Boolean) || '';
    }
    const image = normalizeImageUrl(img);
    const txt = $(el).text();
    const block = [$(el).closest('li').text(), $(el).closest('div').text(), txt].filter(Boolean).join(' ');
    const price = txt.match(/\d+[\d,.]*\s*(?:USD|RMB|CNY|¥|￥)?/)?.[0] || '';
    const moqRaw = (block.match(/(?:(?:MOQ|Min\.?\s*Order|Minimum\s*Order|起订量?|最小起订量|≥|>=)\s*[\d,]+)|(?:[\d,]+\s*(?:件|箱|套|个|pcs|pieces|units|bags|lots)\b)/i) || [])[0] || '';
    const moqNum = parseMoqFromText(moqRaw || block);
    if (requireMoq) {
      if (!moqNum || moqNum <= 0) return;
    }
    const moq = (moqRaw || (moqNum ? `≥ ${moqNum}` : ''));
    const absolute = href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `${base}${href}`);
    items.push({ platform: 'C1688', title, image, price, url: absolute, moq });
  });
  return items;
}

export async function fetchC1688(q: string, limit = 10, opts?: FetchOptions): Promise<ExternalListing[]> {
  // Env toggle to require explicit MOQ when parsing (default: require). Set C1688_REQUIRE_MOQ=0 to relax for seeding.
  const REQUIRE_MOQ = !/^(0|false|no)$/i.test(String(process.env.C1688_REQUIRE_MOQ || '1'));
  if (opts?.headless) {
    const headlessItems = await fetchC1688Headless(q, limit).catch(() => []);
    // Accept any number of headless results rather than enforcing a minimum threshold
    if (headlessItems.length > 0) return headlessItems.slice(0, limit);
  }
  // 1688 uses Chinese markup and dynamic content; try mobile and desktop endpoints with basic paging
  const enc = encodeURIComponent(q);
  const desktop = (p: number) => `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y&beginPage=${p}`;
  const mobile = (p: number) => `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y&viewtype=mini&beginPage=${p}`;
  const cookieStr = process.env.C1688_COOKIES || '';
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP1A.210812.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Cache-Control': 'no-cache',
  };
  if (cookieStr) headers['Cookie'] = cookieStr;

  // Use shared parser

  const acc: ExternalListing[] = [];
  const maxPages = Math.min(20, Math.max(1, Math.ceil(limit / 40)));
  for (let p = 1; p <= maxPages && acc.length < limit; p++) {
    try {
      const res = await fetch(mobile(p), { headers });
      if (res.ok) {
        const html = await res.text();
        if (/login\.1688\.com|x5secdata/.test(html)) {
          // blocked
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[C1688] Mobile search blocked (login/x5sec). Consider setting C1688_COOKIES.');
          }
        } else {
          acc.push(...parseC1688SearchHTML(html, 'https://s.1688.com', REQUIRE_MOQ));
        }
      }
    } catch {}
    if (acc.length >= limit) break;
    try {
      const res = await fetch(desktop(p), { headers });
      if (res.ok) {
        const html = await res.text();
        if (/login\.1688\.com|x5secdata/.test(html)) {
          // blocked
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[C1688] Desktop search blocked (login/x5sec). Consider setting C1688_COOKIES.');
          }
        } else {
          acc.push(...parseC1688SearchHTML(html, 'https://s.1688.com', REQUIRE_MOQ));
        }
      }
    } catch {}
  }
  // If we failed to parse any items non-headless, try a headless fallback once
  if (acc.length === 0 && !opts?.headless) {
    try {
      const headlessItems = await fetchC1688Headless(q, Math.min(60, Math.max(20, limit)));
      if (headlessItems?.length) return headlessItems.slice(0, limit);
    } catch {}
  }
  return acc.slice(0, limit);
}

async function fetchC1688Headless(q: string, limit = 60): Promise<ExternalListing[]> {
  const REQUIRE_MOQ = !/^(0|false|no)$/i.test(String(process.env.C1688_REQUIRE_MOQ || '1'));
  let chromium: any;
  try {
    const req: any = (0, eval)('require');
    try { chromium = req('playwright').chromium; } catch { chromium = req('playwright-core').chromium; }
  } catch {
    return [];
  }
  const cookieStr = process.env.C1688_COOKIES || '';
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
  });
  if (cookieStr) {
    const cookies = cookieStr.split(';').map(s => s.trim()).filter(Boolean).map(kv => {
      const [name, ...rest] = kv.split('=');
      const value = rest.join('=');
      return { name, value, domain: '.1688.com', path: '/', httpOnly: false, secure: true } as any;
    });
    try { await ctx.addCookies(cookies as any); } catch {}
  }
  const page = await ctx.newPage();
  // Basic stealth: mask webdriver and language hints
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'] });
      // minimal chrome runtime object
      // @ts-ignore
      window.chrome = (window as any).chrome || { runtime: {} };
    });
  } catch {}
  const enc = encodeURIComponent(q);
  const url = `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y`;
  const items: ExternalListing[] = [];
  const seen = new Set<string>();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Allow anti-bot to set x5sec cookie
    await page.waitForTimeout(1500);
    try {
      await page.waitForFunction(() => document.cookie.includes('x5sec') || document.querySelectorAll('a[href*="offer"]').length > 10, { timeout: 15000 });
    } catch {}
    // If still on a challenge page with few anchors, try mobile search as fallback
    const fewAnchors = await page.evaluate(() => (document.querySelectorAll('a[href*="offer"]').length || 0) < 3);
    if (fewAnchors) {
      try {
        await page.goto(`https://m.1688.com/offer_search/-${enc}.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1200);
      } catch {}
    }
    let idleRounds = 0;
    for (let round = 0; round < 20 && items.length < limit; round++) {
      const batch = await page.evaluate(() => {
        const toAbs = (href: string) => href.startsWith('http') ? href : (href.startsWith('//') ? `https:${href}` : `https://s.1688.com${href.startsWith('/') ? '' : '/'}${href}`);
        const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
        function parseMoqFromTextLocal(s?: string): number | null {
          if (!s) return null;
          const str = String(s).replace(/\s+/g, ' ').trim();
          let m = str.match(/(?:MOQ|Min\.?\s*Order|Minimum\s*Order|≥|>=)\s*([\d,]+)/i);
          if (m) { const n = Number((m[1] || '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; }
          m = str.match(/(?:起订量?|最小起订量)\s*[:：]?\s*([\d,]+)/);
          if (m) { const n = Number((m[1] || '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; }
          m = str.match(/(?:≥|>=)\s*([\d,]+)/);
          if (m) { const n = Number((m[1] || '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; }
          m = str.match(/(^|\b)([\d,]{1,6})\s*(件|箱|套|个|pcs|pieces|units|bags|lots)\b/i);
          if (m) { const n = Number((m[2] || '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; }
          if (!/(US\$|\$|USD|RMB|CNY|¥|￥)/i.test(str)) {
            m = str.match(/(^|\b)([\d,]{1,6})(?![\d,])/);
            if (m) { const n = Number((m[2] || '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; }
          }
          return null;
        }
        const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        const out: any[] = [];
        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          if (!/(?:detail|offer)\.1688\.com|\/offer\//.test(href)) continue;
          const url = toAbs(href);
          const title = clean(a.getAttribute('title') || a.textContent || '');
          if (!url || !title) continue;
          const imgEl = a.querySelector('img') as HTMLImageElement | null;
          let image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
          if (!image) {
            const srcset = imgEl?.getAttribute('srcset') || '';
            if (srcset) image = srcset.split(',').map(s => s.trim().split(' ')[0]).find(Boolean) || '';
          }
          const txt = clean(a.innerText || '');
          // Search across parent containers to capture MOQ that may be outside the link
          let parentText = txt;
          let node: HTMLElement | null = a;
          for (let i = 0; i < 4 && node; i++) {
            const t = clean(node.innerText || '');
            if (t) parentText += ' ' + t;
            node = node.parentElement as HTMLElement | null;
          }
          const price = (txt.match(/\d+[\d,.]*\s*(?:USD|RMB|CNY|¥|￥)?/) || [])[0] || '';
          const moqRaw = (parentText.match(/(?:(?:MOQ|Min\.?\s*Order|Minimum\s*Order|起订量?|最小起订量|≥|>=)\s*[\d,]+)|(?:[\d,]+\s*(?:件|箱|套|个|pcs|pieces|units|bags|lots)\b)/i) || [])[0] || '';
          const moqNum = parseMoqFromTextLocal(moqRaw || parentText);
          if (REQUIRE_MOQ) {
            if (!moqNum || moqNum <= 0) continue; // Enforce MOQ when required
          }
          const moq = moqRaw || (moqNum ? `≥ ${moqNum}` : '');
          out.push({ platform: 'C1688', title, image, price, url, moq });
        }
        return out;
      });
      for (const it of batch as any[]) {
        try {
          const key = it.url ? new URL(it.url).origin + new URL(it.url).pathname : '';
          if (key && !seen.has(key)) { seen.add(key); items.push(it); }
        } catch {}
      }
      const before = items.length;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      if (items.length === before) idleRounds++; else idleRounds = 0;
      if (idleRounds >= 3) break;
    }
  } finally {
    await ctx.close();
    await browser.close();
  }
  return items.slice(0, limit);
}

// No-login search that attempts desktop HTML -> mobile HTML -> headless fallback
export async function searchC1688NoLogin(q: string, page = 1): Promise<ExternalListing[]> {
  const REQUIRE_MOQ = !/^(0|false|no)$/i.test(String(process.env.C1688_REQUIRE_MOQ || '1'));
  const enc = encodeURIComponent(q);
  const desktop = `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y&beginPage=${page}`;
  const mobile = `https://m.1688.com/offer_search/-${enc}.html?beginPage=${page}`;
  const cookieStr = process.env.C1688_COOKIES || '';
  const headersDesktop: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://s.1688.com/',
  };
  const headersMobile: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://m.1688.com/',
  };
  if (cookieStr) { headersDesktop['Cookie'] = cookieStr; headersMobile['Cookie'] = cookieStr; }
  try { console.log('[C1688] Try desktop HTML…', q, page); } catch {}
  try {
    const res = await fetch(desktop, { headers: headersDesktop });
    const html = await res.text();
    if (!/login\.1688\.com|x5secdata/.test(html)) {
      const rows = parseC1688SearchHTML(html, 'https://s.1688.com', REQUIRE_MOQ);
      if (rows.length) { try { console.log('[C1688] desktop ok:', rows.length); } catch {} return rows; }
    } else { try { console.log('[C1688] desktop blocked (x5sec)'); } catch {} }
  } catch {}
  try { console.log('[C1688] Try mobile HTML…'); } catch {}
  try {
    const res = await fetch(mobile, { headers: headersMobile });
    const html = await res.text();
    if (!/login\.1688\.com|x5secdata/.test(html)) {
      const rows = parseC1688SearchHTML(html, 'https://m.1688.com', REQUIRE_MOQ);
      if (rows.length) { try { console.log('[C1688] mobile ok:', rows.length); } catch {} return rows; }
    } else { try { console.log('[C1688] mobile blocked (x5sec)'); } catch {} }
  } catch {}
  try { console.log('[C1688] Fallback to headless (no login)…'); } catch {}
  try {
    const rows = await fetchC1688Headless(q, 80);
    try { console.log('[C1688] headless ok:', rows.length); } catch {}
    return rows;
  } catch (e: any) {
    try { console.log('[C1688] headless failed:', e?.message || e); } catch {}
    return [];
  }
}

// Extract a representative product image from a 1688 detail page.
// Strategy:
// 1) Prefer meta og:image / link rel=image_src
// 2) Parse inline JSON for fields like imageList, images, offerImageList, mainImage
// 3) Fallback to scanning visible gallery/img elements ignoring sprites/logos
export async function getC1688DetailMainImage(detailUrl: string): Promise<string | null> {
  const toAbs = (u: string) => {
    if (!u) return '';
    if (u.startsWith('http')) return u.replace(/^http:\/\//i, 'https://');
    if (u.startsWith('//')) return `https:${u}`;
    return `https://detail.1688.com${u.startsWith('/') ? '' : '/'}${u}`;
  };
  const isGood = (u: string) => {
    if (!u) return false;
    const x = u.toLowerCase();
    if (/sprite|icon|logo|placeholder|default|noimage/.test(x)) return false;
    // Accept common raster formats
    return /(\.jpe?g|\.png|\.webp)(?:$|[_.?])/i.test(x);
  };
  try {
    const headers: Record<string,string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Referer': 'https://s.1688.com/',
    };
    const res = await fetch(detailUrl, { headers });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // 1) Meta tags
    const metaImg = (
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      ''
    );
    if (metaImg) {
      const a = toAbs(metaImg);
      if (isGood(a)) return a;
    }

    // 2) Inline JSON blocks: look for image arrays/fields
    const candidates = new Set<string>();
    const add = (u?: string) => { const a = toAbs(u || ''); if (isGood(a)) candidates.add(a); };
    $('script').each((_, el) => {
      const txt = $(el).contents().text() || '';
      // Try JSON parse for objects containing image lists
      try {
        const data = JSON.parse(txt);
        const collect = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          const arrFields = ['imageList','images','offerImageList','gallery','thumbnails'];
          for (const k of arrFields) {
            const v = (obj as any)[k];
            const arr = Array.isArray(v) ? v : (v ? [v] : []);
            for (const it of arr) {
              if (!it) continue;
              if (typeof it === 'string') add(it);
              else if (typeof it === 'object') {
                add((it.url || it.src || it.image || it.imgUrl || it.lgImgUrl || it.bigImage || '').toString());
              }
            }
          }
          const singleFields = ['mainImage','image','cover','mainPic','imgUrl'];
          for (const k of singleFields) {
            const v = (obj as any)[k];
            if (typeof v === 'string') add(v);
          }
        };
        const arr = Array.isArray(data) ? data : [data];
        for (const d of arr) collect(d);
      } catch {}
      // Regex fallback to extract URL-like strings near known field names
      const rx = /"(?:imageList|images|offerImageList|mainImage|imgUrl|image)"\s*:\s*(\[[^\]]+\]|"[^"]+")/gi;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(txt))) {
        const blob = m[1];
        const urlRx = /(https?:\/\/[^"\s]+|\/[^"\s]+\.(?:jpg|jpeg|png|webp)[^"\s]*)/ig;
        let u: RegExpExecArray | null;
        while ((u = urlRx.exec(blob))) add(u[1]);
      }
    });
    if (candidates.size) return Array.from(candidates)[0];

    // 3) DOM scan for gallery/img
    const pushImg = (sel: string) => {
      $(sel).each((_, el) => {
        const node = $(el);
        const st = (node.attr('style') || '').toString();
        const bg = st.match(/url\(([^)]+)\)/i)?.[1]?.replace(/['"]/g, '') || '';
        const src = node.attr('data-large') || node.attr('data-src') || node.attr('src') || bg || '';
        if (src) add(src);
      });
    };
    pushImg('.image-list img, .gallery img, .mod-gallery img, .img-list img, .detail-gallery img');
    pushImg('[style*="background-image"]');
    if (candidates.size) return Array.from(candidates)[0];
  } catch {
    return null;
  }
  return null;
}
