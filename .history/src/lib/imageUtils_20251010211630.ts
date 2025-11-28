import { BAD_IMAGE_HASHES } from '@/lib/badImages';

// Decode Next.js image proxy URLs back to their original src when possible
export const decodeNext = (s: string) => {
  try {
    const u = new URL(s, 'http://x');
    if (u.pathname.startsWith('/_next/image')) {
      let q = u.searchParams.get('url') || '';
      for (let i = 0; i < 3; i++) {
        const d = decodeURIComponent(q);
        if (d === q) break;
        q = d;
      }
      return q || s;
    }
  } catch {}
  return s;
};

// Extract the 40-char sha1 from a /cache/<sha>.ext path
export const extractCacheSha = (src?: string | null) => {
  if (!src) return null;
  const p = new URL(decodeNext(src), 'http://x').pathname;
  const m = p.match(/\/cache\/([a-f0-9]{40})(?:\.[a-z]+)?$/i);
  return m ? m[1].toLowerCase() : null;
};

// Returns true when the image is a seed placeholder or known bad cache hash
export const isSeedOrBad = (src?: string | null) => {
  if (!src) return true;
  const u = decodeNext(src);
  const p = new URL(u, 'http://x').pathname;
  if (p.includes('/seed/sleeves')) return true;
  const sha = extractCacheSha(u);
  return sha ? BAD_IMAGE_HASHES.has(sha) : false;
};

export const hasGoodImage = (src?: string | null) => !isSeedOrBad(src);

// Build a canonical URL string (drop fragment + noisy params) for dedupe keys
export const canonicalizeUrl = (raw?: string | null) => {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    u.hash = '';
    // drop common tracking/noise params
    ['utm_source','utm_medium','utm_campaign','ref','cid','spm','src'].forEach(p => u.searchParams.delete(p));
    return `${u.hostname}${u.pathname}${u.search}`.toLowerCase();
  } catch {
    return String(raw || '').toLowerCase();
  }
};

export { BAD_IMAGE_HASHES };

// Normalize titles for coarse-grained equality (IndiaMART)
export const normalizeTitle = (t?: string | null) =>
  (t ?? '')
    .replace(/\bindiamart\b/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
