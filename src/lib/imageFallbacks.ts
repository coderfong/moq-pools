import { BAD_IMAGE_HASHES, isBadImageHashFromPath } from './badImages';

// Simple curated keyword → preferred replacement image mapping.
// Extend this list as you curate higher-quality canonical product photos.
// Keys are matched case-insensitively; the first match wins.
export interface FallbackMapping { keyword: RegExp; image: string; }

export const FALLBACK_MAPPINGS: FallbackMapping[] = [
  { keyword: /vitamin\s*c|ascorbic/i, image: '/cache/898fc7f230ca0b89daa17949779dd695542b1d7d.jpg' },
  { keyword: /rice|basmati|parboiled/i, image: '/seed/rice.jpg' },
  { keyword: /wheat|flour|atta/i, image: '/seed/wheat.jpg' },
  { keyword: /pulses|lentils|dal|gram/i, image: '/seed/pulses.jpg' },
  { keyword: /spice|turmeric|chili|masala|cumin|coriander/i, image: '/seed/spices.jpg' },
  { keyword: /sugar|jaggery|sweet/i, image: '/seed/sugar.jpg' },
  { keyword: /oil|sunflower|soybean|mustard/i, image: '/seed/oil.jpg' },
  { keyword: /tea|coffee|beverage/i, image: '/seed/tea.jpg' },
  { keyword: /fertilizer|urea|compost/i, image: '/seed/fertilizer.jpg' },
];

export function resolveFallbackImage(originalPath: string | null | undefined, title: string, description?: string): string | null {
  // If original path is good (cache path AND not bad hash), keep it
  if (originalPath && originalPath.startsWith('/cache/') && !isBadImageHashFromPath(originalPath)) return originalPath;
  const hay = `${title || ''} ${description || ''}`;
  for (const m of FALLBACK_MAPPINGS) {
    if (m.keyword.test(hay)) return m.image;
  }
  // If original is a bad cache hash, deliberately return null so caller can choose UI placeholder
  if (originalPath && isBadImageHashFromPath(originalPath)) return null;
  return originalPath || null;
}

export { BAD_IMAGE_HASHES, isBadImageHashFromPath };
