import { isBadImageHashFromPath } from '@/lib/badImages';

export function isSeedishImage(p?: string | null) {
  if (!p) return true;
  // Handles Next/Image proxying the seed too
  if (p.includes('/seed/sleeves')) return true;
  if (p.includes('/_next/image') && p.includes('url=%2Fseed%2Fsleeves')) return true;
  return false;
}

export function isRenderableImage(p?: string | null) {
  if (!p) return false;
  if (isSeedishImage(p)) return false;
  if (isBadImageHashFromPath(p)) return false;
  return true;
}
