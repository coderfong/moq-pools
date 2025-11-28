import type { ExternalListing } from '@/lib/providers/types';

// Internal helpers
const removeNoise = (s: string) => (s || '').replace(/\b(certified|verified|supplier)\b/ig, '').replace(/\s+/g, ' ').trim();
const stripSuffixes = (s: string) => (
  (s || '')
    // Drop known file extensions if they leaked into titles
    .replace(/\.(?:s?html?|php|asp|aspx)\b.*$/i, '')
    // Remove trailing long numeric id tokens often appended by marketplaces
    .replace(/[\s\-_/]?\d{6,}[a-z]?$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
);
const looksJunky = (s: string) => {
  const t = (s || '').trim();
  if (!t) return true;
  if (/^\d+[\s\/\-]*\d*$/.test(t) && !/[a-z]/i.test(t)) return true; // avoid strings like "1/ 6"
  if (t.length < 4 && !/[a-z]/i.test(t)) return true;
  return false;
};

export function sanitizeTitle(raw: string): string {
  return stripSuffixes(removeNoise(String(raw || '')));
}

export function computeDisplayTitle(listing: ExternalListing): string {
  // Prefer existing sanitized/display title when present
  const anyListing = listing as any;
  const pre = (anyListing.displayTitle || anyListing.sanitizedTitle || '').toString().trim();
  if (pre) {
    const s = sanitizeTitle(pre);
    if (s && !/^see listing$/i.test(s) && !looksJunky(s)) return s;
  }
  const t1 = sanitizeTitle(String(listing.title || ''));
  if (t1 && !/^see listing$/i.test(t1) && !looksJunky(t1)) return t1;

  // Try description first line that doesn't look like a price-only line
  const desc = removeNoise(String(listing.description || ''));
  if (desc && !/^(US\$|\$|USD|RMB|CNY|¥|￥)/i.test(desc)) {
    const first = stripSuffixes(desc.split(/[\n\r\.\!\?]/)[0].trim());
    if (first && !/^see listing$/i.test(first) && !looksJunky(first)) return first;
  }

  // Derive from URL path segment
  try {
    const u = new URL(String(listing.url || ''));
    const raw = decodeURIComponent(u.pathname.split('/').filter(Boolean).slice(-1)[0] || '');
    // Strip extensions and trailing numeric IDs (e.g., -1600082383276.html)
    let seg = raw
      .replace(/\.(?:s?html?|php|asp|aspx)\b.*$/i, '')
      .replace(/[-_]+/g, ' ');
    seg = seg.replace(/[\s\-_]?\d{6,}[a-z]?$/i, '');
    const guess = stripSuffixes(removeNoise(seg));
    if (guess && !looksJunky(guess)) return guess;
  } catch {}

  // Last resort: store name product
  if ((listing as any).storeName) return removeNoise(`${(listing as any).storeName} product`);
  return 'Product';
}
