import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

function buildHeaders(host: string) {
  const referer = host.includes('made-in-china')
    ? 'https://www.made-in-china.com/'
    : host.includes('indiamart')
    ? 'https://dir.indiamart.com/'
    : 'https://www.alibaba.com/';
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': referer,
  } as Record<string, string>;
}

function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return u;
  }
}

function toAbs(base: string, href = '') {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

function sanitizeAndExtractAlibaba(html: string) {
  const $ = cheerio.load(html);
  const base = 'https://www.alibaba.com';

  // Gather relevant sections by data-testid or known class fallbacks
  const selectors = [
    '[data-testid="module_sku_summary_tabs"]',
    '[data-testid="module_price"]',
    '[data-testid*="ladder-price"]',
    '[data-testid*="sku-logistic"]',
    '[data-testid*="shipping"]',
    '[data-testid*="delivery"]',
    '[data-testid*="coupon"]',
    '[data-testid*="store"], [data-testid*="seller"], [data-testid*="company"]',
    '.module_price',
    '.sku-logistic',
  ].join(',');

  const picked: Array<cheerio.Cheerio<any>> = [];
  $(selectors).each((_, el) => {
    const node = $(el);
    if (node && node.length) picked.push(node);
  });

  // Fallback: pick a reasonable container near the top summary
  if (picked.length === 0) {
    const fallback = $('[data-widget-id], #root, body').first();
    if (fallback && fallback.length) picked.push(fallback);
  }

  // Create a container and clone sanitized nodes in original order
  const wrapper = $('<div class="alibaba-detail space-y-4"></div>');
  const seen = new Set<any>();

  const absolutize = (u: string) => toAbs(base, u);

  for (const node of picked) {
    node.each((_: any, el: any) => {
      if (seen.has(el)) return; // avoid duplicates
      seen.add(el);
      const clone = $(el).clone();

      // Remove scripts, styles, iframes
      clone.find('script, style, iframe, noscript').remove();
      // Remove inline event handlers and potentially risky attributes
      clone.find('*').each((__, child) => {
        const $c = $(child);
        // strip all on* handlers
        const attrs = child.attribs || {} as any;
        for (const name of Object.keys(attrs)) {
          if (/^on/i.test(name)) $c.removeAttr(name);
          if (name === 'style') $c.removeAttr('style');
        }
        // Rewrite anchors
        if ($c.is('a')) {
          const href = ($c.attr('href') || '').toString();
          if (href) {
            const abs = absolutize(href);
            $c.attr('href', abs);
            $c.attr('target', '_blank');
            $c.attr('rel', 'noreferrer noopener nofollow');
          }
        }
        // Rewrite images to go through cache endpoint and absolutize
        if ($c.is('img')) {
          const src = ($c.attr('src') || $c.attr('data-src') || '').toString();
          if (src) {
            const abs = absolutize(src);
            $c.attr('src', `/api/external/cache-img?src=${encodeURIComponent(abs)}`);
            $c.removeAttr('srcset');
            $c.removeAttr('data-src');
          }
        }
        // Remove inline SVGs' scripts if any (already removed), keep svg content otherwise
      });

      wrapper.append(clone);
    });
  }

  // A light heading to identify origin
  const header = $('<div class="text-xs text-gray-500 dark:text-gray-400">Details from Alibaba</div>');
  const headerHtml = (header.prop('outerHTML') as string | null) || '<div class="text-xs text-gray-500 dark:text-gray-400">Details from Alibaba</div>';
  const wrapperHtml = (wrapper.prop('outerHTML') as string | null) || '<div class="alibaba-detail"></div>';
  return headerHtml + wrapperHtml;
}

function sanitizeAndExtractMic(html: string) {
  const $ = cheerio.load(html);
  const base = 'https://www.made-in-china.com';
  const selectors = [
    // Price, summary, attributes/specs, description blocks commonly used on MIC
    '.sr-proMainInfo',
    '.sr-proMainInfo-attr',
    '.sr-proMainInfo-price',
    '.sr-proMainInfo-details',
    '.sr-proParameter',
    '.sr-proSpecification',
    '.sr-proDesc',
    '#J-detail',
    '.detail-box',
  ].join(',');

  const picked: Array<cheerio.Cheerio<any>> = [];
  $(selectors).each((_, el) => {
    const node = $(el);
    if (node && node.length) picked.push(node);
  });
  if (picked.length === 0) {
    const fallback = $('#root, body').first();
    if (fallback && fallback.length) picked.push(fallback);
  }

  const wrapper = $('<div class="mic-detail space-y-4"></div>');
  const seen = new Set<any>();
  const toAbs = (href = '') => {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
  };

  for (const node of picked) {
    node.each((_: any, el: any) => {
      if (seen.has(el)) return;
      seen.add(el);
      const clone = $(el).clone();
      clone.find('script, style, iframe, noscript').remove();
      clone.find('*').each((__, child) => {
        const $c = $(child);
        const attrs = child.attribs || {} as any;
        for (const name of Object.keys(attrs)) {
          if (/^on/i.test(name)) $c.removeAttr(name);
          if (name === 'style') $c.removeAttr('style');
        }
        if ($c.is('a')) {
          const href = ($c.attr('href') || '').toString();
          if (href) {
            const abs = toAbs(href);
            $c.attr('href', abs);
            $c.attr('target', '_blank');
            $c.attr('rel', 'noreferrer noopener nofollow');
          }
        }
        if ($c.is('img')) {
          const src = ($c.attr('src') || $c.attr('data-src') || $c.attr('data-original') || '').toString();
          if (src) {
            const abs = toAbs(src);
            $c.attr('src', `/api/external/cache-img?src=${encodeURIComponent(abs)}`);
            $c.removeAttr('srcset');
            $c.removeAttr('data-src');
            $c.removeAttr('data-original');
          }
        }
      });
      wrapper.append(clone);
    });
  }
  const header = $('<div class="text-xs text-gray-500 dark:text-gray-400">Details from Made-in-China</div>');
  const headerHtml = (header.prop('outerHTML') as string | null) || '<div class="text-xs text-gray-500 dark:text-gray-400">Details from Made-in-China</div>';
  const wrapperHtml = (wrapper.prop('outerHTML') as string | null) || '<div class="mic-detail"></div>';
  return headerHtml + wrapperHtml;
}

function sanitizeAndExtractIndiaMart(html: string) {
  const $ = cheerio.load(html);
  const base = 'https://dir.indiamart.com';
  const selectors = [
    '.pdpbox',
    '.priceSection, .pricing, .p_price',
    '.specification, .specs, .product-specification',
    '.product-desc, .description, #prodDesc',
    '.seller-info, .cmp-detail, .cmp-info',
  ].join(',');

  const picked: Array<cheerio.Cheerio<any>> = [];
  $(selectors).each((_, el) => {
    const node = $(el);
    if (node && node.length) picked.push(node);
  });
  if (picked.length === 0) {
    const fallback = $('#root, body').first();
    if (fallback && fallback.length) picked.push(fallback);
  }

  const wrapper = $('<div class="indiamart-detail space-y-4"></div>');
  const seen = new Set<any>();
  const toAbs = (href = '') => {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
  };

  for (const node of picked) {
    node.each((_: any, el: any) => {
      if (seen.has(el)) return;
      seen.add(el);
      const clone = $(el).clone();
      clone.find('script, style, iframe, noscript').remove();
      clone.find('*').each((__, child) => {
        const $c = $(child);
        const attrs = child.attribs || {} as any;
        for (const name of Object.keys(attrs)) {
          if (/^on/i.test(name)) $c.removeAttr(name);
          if (name === 'style') $c.removeAttr('style');
        }
        if ($c.is('a')) {
          const href = ($c.attr('href') || '').toString();
          if (href) {
            const abs = toAbs(href);
            $c.attr('href', abs);
            $c.attr('target', '_blank');
            $c.attr('rel', 'noreferrer noopener nofollow');
          }
        }
        if ($c.is('img')) {
          const src = ($c.attr('src') || $c.attr('data-src') || '').toString();
          if (src) {
            const abs = toAbs(src);
            $c.attr('src', `/api/external/cache-img?src=${encodeURIComponent(abs)}`);
            $c.removeAttr('srcset');
            $c.removeAttr('data-src');
          }
        }
      });
      wrapper.append(clone);
    });
  }
  const header = $('<div class="text-xs text-gray-500 dark:text-gray-400">Details from IndiaMART</div>');
  const headerHtml = (header.prop('outerHTML') as string | null) || '<div class="text-xs text-gray-500 dark:text-gray-400">Details from IndiaMART</div>';
  const wrapperHtml = (wrapper.prop('outerHTML') as string | null) || '<div class="indiamart-detail"></div>';
  return headerHtml + wrapperHtml;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const src = String(searchParams.get('src') || '').trim();
    if (!src) return NextResponse.json({ error: 'missing src' }, { status: 400 });
    let url = src;
    try {
      const u = new URL(src);
      const host = u.hostname.toLowerCase();
      url = normalizeUrl(src);
      // Supported hosts: Alibaba, Made-in-China, IndiaMART
      const isAlibaba = host.includes('alibaba.com');
      const isMic = host.includes('made-in-china.com');
      const isIm = host.includes('indiamart.com');
      if (!isAlibaba && !isMic && !isIm) {
        return NextResponse.json({ html: '' }, { headers: { 'Cache-Control': 'public, max-age=300' } });
      }
      const res = await fetch(url, { headers: buildHeaders(host), cache: 'no-store' });
      if (!res.ok) return NextResponse.json({ html: '' }, { headers: { 'Cache-Control': 'public, max-age=120' } });
      const html = await res.text();
      const frag = isAlibaba ? sanitizeAndExtractAlibaba(html) : isMic ? sanitizeAndExtractMic(html) : sanitizeAndExtractIndiaMart(html);
      return NextResponse.json({ html: frag }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600' } });
    } catch {
      return NextResponse.json({ html: '' }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
