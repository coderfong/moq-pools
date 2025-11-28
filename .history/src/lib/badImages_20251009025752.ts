// Central list of known low-quality or generic blurry image hashes (sha1 of source URL path used for cache filenames)
// If an image's cache filename contains any of these hashes, treat it as a placeholder and attempt aggressive re-upgrade.
export const BAD_IMAGE_HASHES = new Set<string>([
  'bbb71cb4979e0c433b6f0ac4eabc2d688e809d39', // IndiaMART pervasive blurred commodity photo
]);

export function isBadImageHashFromPath(p?: string | null): boolean {
  if (!p) return false;
  const m = p.match(/([a-f0-9]{40})/i);
  if (!m) return false;
  return BAD_IMAGE_HASHES.has(m[1].toLowerCase());
}
