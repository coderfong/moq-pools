import { BAD_IMAGE_HASHES } from '@/lib/badImages';

function decodeNextImageURL(src: string): string {
  try {
    const u = new URL(src, 'http://local');
    if (u.pathname.startsWith('/_next/image')) {
      let q = u.searchParams.get('url') || '';
      // decode up to 3x to handle double-encoding
      for (let i = 0; i < 3; i++) {
        const dec = decodeURIComponent(q);
        if (dec === q) break;
        q = dec;
      }
      return q || src;
    }
  } catch {}
  return src;
}

function pathOf(u: string): string {
  try { return new URL(u, 'http://local').pathname; } catch { return u; }
}

export function extractCacheSha(src?: string | null): string | null {
  if (!src) return null;
  const underlying = decodeNextImageURL(src);
  const p = pathOf(underlying);
  const m = p.match(/\/cache\/([a-f0-9]{40})(?:\.[a-z]+)?$/i);
  return m ? m[1].toLowerCase() : null;
}

export function isSeedishImage(src?: string | null): boolean {
  if (!src) return true; // treat missing as seed
  const u = decodeNextImageURL(src);
  const p = pathOf(u);
  return p.includes('/seed/sleeves');
}

export function isRenderableImage(src?: string | null): boolean {
  if (!src) return false;
  if (isSeedishImage(src)) return false;
  const sha = extractCacheSha(src);
  if (sha) return !BAD_IMAGE_HASHES.has(sha); // good cached file if not marked bad
  return true; // allow non-cache external images if present
}
