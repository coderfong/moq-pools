import 'server-only';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { isAlibabaBadImageUrl } from './providers/alibaba';
import { BAD_IMAGE_HASHES } from './badImages';
// Lazy-load sharp at runtime to avoid build-time dependency issues
let sharpModule: any = null;
async function getSharp() {
  if (sharpModule) return sharpModule;
  try {
    const req: any = (0, eval)('require');
    sharpModule = req('sharp');
  } catch {
    sharpModule = null;
  }
  return sharpModule;
}

const ALLOWED_HOST_SUFFIXES = [
  '.alibaba.com',
  '.alicdn.com',
  '.1688.com',
  // AliExpress fully removed
  '.made-in-china.com',
  '.micstatic.com',
  // IndiaMART image/CDN domains
  '.indiamart.com',
  '.imimg.com',
];

function isAllowedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suf) => h === suf.slice(1) || h.endsWith(suf));
}

function refererForHost(host: string) {
  // AliExpress referer removed
  if (host.includes('1688')) return 'https://s.1688.com/';
  if (host.includes('alicdn') || host.includes('alibaba')) return 'https://www.alibaba.com/';
  if (host.includes('made-in-china')) return 'https://www.made-in-china.com/';
  if (host.includes('indiamart') || host.includes('imimg')) return 'https://dir.indiamart.com/';
  return undefined;
}

async function ensureDir(dir: string) {
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}

async function fileHeader(filePath: string, max = 16): Promise<Buffer | null> {
  try {
    // Restrict reads to the public/cache directory to avoid dynamic FS concerns
    const cacheRootAbs = path.resolve(process.cwd(), 'public', 'cache');
    const abs = path.resolve(filePath);
    const rel = path.relative(cacheRootAbs, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;

    // Read only the first few bytes via a small stream and then destroy
    const headerSize = Math.max(1, Math.min(64, max));
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream(abs, { start: 0, end: headerSize - 1 });
      let done = false;
      rs.on('data', (c) => {
        if (!done) {
          const chunk: Buffer = typeof c === 'string' ? Buffer.from(c) : Buffer.isBuffer(c) ? (c as Buffer) : Buffer.from(c as any);
          chunks.push(chunk);
          done = true;
          rs.destroy();
        }
      });
      rs.on('close', () => resolve());
      rs.on('error', (e) => reject(e));
    });
    if (!chunks.length) return null;
    const buf = Buffer.concat(chunks);
    return buf.subarray(0, Math.min(buf.length, headerSize));
  } catch {
    return null;
  }
}

function headerMatchesExt(header: Buffer, ext: string): boolean {
  const e = ext.toLowerCase();
  if (e === 'jpg' || e === 'jpeg') {
    return header.length >= 2 && header[0] === 0xff && header[1] === 0xd8; // JPEG SOI
  }
  if (e === 'png') {
    return header.length >= 8 && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47 && header[4] === 0x0d && header[5] === 0x0a && header[6] === 0x1a && header[7] === 0x0a;
  }
  if (e === 'webp') {
    // WEBP: 'RIFF'....'WEBP'
    return header.length >= 12 && header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  }
  return true; // Unknown: don't block reuse
}

function detectImageExtFromBytes(buf: Buffer): 'jpg' | 'png' | 'webp' | 'unknown' {
  if (!buf || buf.length < 12) return 'unknown';
  // JPEG SOI
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  // PNG signature
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'png';
  // WEBP RIFF....WEBP
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';
  return 'unknown';
}

export async function cacheExternalImage(rawSrc: string, opts?: { preferJpgForIndiaMart?: boolean }): Promise<{ localPath: string; absPath: string }> {
  // Decode if encoded
  const tryDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
  let src = tryDecode(rawSrc);
  if (/^https?%3A/i.test(src) || src.includes('%2F')) src = tryDecode(src);

  // Normalize
  const full = src.startsWith('http') ? src : (src.startsWith('//') ? `https:${src}` : src);
  const url = new URL(full);
  if (!/^https?:$/.test(url.protocol)) throw new Error('Protocol not allowed');
  if (!isAllowedHost(url.hostname)) throw new Error('Host not allowed');
  // Block obvious Alibaba placeholder/logo images before fetching
  if ((url.hostname.includes('alicdn') || url.hostname.includes('alibaba')) && isAlibabaBadImageUrl(url.toString())) {
    throw new Error('Bad placeholder image rejected');
  }
  // Block common MIC placeholder (transparent space)
  if (url.hostname.includes('micstatic.com') && /\/common\/img\/space\.png/i.test(url.pathname)) {
    throw new Error('MIC placeholder image rejected');
  }

  const hash = crypto.createHash('sha1').update(url.toString()).digest('hex');
  const outDir = path.join(process.cwd(), 'public', 'cache');
  await ensureDir(outDir);
  // If any cached variant exists (jpg/png/webp), reuse it (unless hash is known-bad)
  const exts = ['jpg','png','webp'];
  for (const ext of exts) {
    const p = path.join(outDir, `${hash}.${ext}`);
    try {
      await fs.access(p);
      // Never serve known-bad placeholder by URL hash
      if (BAD_IMAGE_HASHES.has(hash)) {
        try { await fs.unlink(p); } catch {}
        throw new Error('Known bad placeholder image rejected');
      }
      const hdr = await fileHeader(p);
      if (hdr && headerMatchesExt(hdr, ext)) {
        // If caller asked for JPG unification for IndiaMART and cached file isn't JPG, convert once and return JPG
        const isIM = url.hostname.includes('imimg') || url.hostname.includes('indiamart');
        if (opts?.preferJpgForIndiaMart && isIM && ext !== 'jpg') {
          const sharp = await getSharp();
          const jpgPath = path.join(outDir, `${hash}.jpg`);
          if (sharp) {
            try {
              const buf = await fs.readFile(p);
              const jpg = await sharp(buf).flatten({ background: { r: 255, g: 255, b: 255 } }).jpeg({ quality: 82 }).toBuffer();
              await fs.writeFile(jpgPath, jpg);
              try { await fs.unlink(p); } catch {}
              return { localPath: `/cache/${hash}.jpg`, absPath: jpgPath };
            } catch { /* fallthrough to reuse existing */ }
          }
        }
        return { localPath: `/cache/${hash}.${ext}`, absPath: p };
      }
      // Mismatch: remove bad file and continue to recache
      try { await fs.unlink(p); } catch {}
    } catch {}
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
  const ref = refererForHost(url.hostname);
  if (ref) headers['Referer'] = ref;

  // Block known-bad placeholder by URL hash before any fetch/write
  if (BAD_IMAGE_HASHES.has(hash)) {
    throw new Error('Known bad placeholder image rejected');
  }
  const upstream = await fetch(url.toString(), { headers });
  if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
  const buf = Buffer.from(await upstream.arrayBuffer());
  // Reject obviously tiny payloads (likely placeholders/icons)
  if (buf.byteLength < 4000) {
    throw new Error('Tiny image payload rejected');
  }
  // If possible, inspect actual image dimensions and reject tiny icons/badges
  try {
    const sharp = await getSharp();
    if (sharp) {
      const meta = await sharp(buf).metadata();
      const w = Number(meta.width || 0);
      const h = Number(meta.height || 0);
      // Treat very small assets as non-product images (badges, logos, favicons)
      // Use a conservative threshold to avoid caching 16-120px UI icons.
      if (w > 0 && h > 0) {
        const minSide = Math.min(w, h);
        if (minSide < 120) {
          throw new Error(`Image too small (${w}x${h})`);
        }
      }
    }
  } catch {}
  // Reject by content hash as well (some placeholders share content across varying URLs)
  try {
    const contentSha1 = crypto.createHash('sha1').update(buf).digest('hex');
    if (BAD_IMAGE_HASHES.has(contentSha1)) {
      throw new Error('Known bad placeholder image (content) rejected');
    }
  } catch {}
  const ct = (upstream.headers.get('content-type') || '').toLowerCase();
  // Prefer format from bytes; fall back to content-type
  const extFromBytes = detectImageExtFromBytes(buf);
  const extFromMime = ct.includes('webp') ? 'webp' : ct.includes('png') ? 'png' : ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : 'jpg';
  const decidedExt = extFromBytes !== 'unknown' ? extFromBytes : extFromMime as 'jpg' | 'png' | 'webp';
  const sharp = await getSharp();
  let destExt = extFromMime;
  let dest = path.join(outDir, `${hash}.${destExt}`);
  const forceJpgIndiaMart = !!opts?.preferJpgForIndiaMart && (url.hostname.includes('imimg') || url.hostname.includes('indiamart'));
  // If IndiaMART image and conversion requested: always convert to JPG (flatten alpha if needed)
  if (forceJpgIndiaMart) {
    const sharp = await getSharp();
    if (sharp) {
      try {
        destExt = 'jpg';
        dest = path.join(outDir, `${hash}.jpg`);
        // Flatten to white background if PNG/WEBP had transparency
        const pipeline = sharp(buf).flatten({ background: { r: 255, g: 255, b: 255 } }).jpeg({ quality: 82 });
        await pipeline.toFile(dest);
        return { localPath: `/cache/${hash}.jpg`, absPath: dest };
      } catch {/* fall through to default branches */}
    }
  }
  // If source is WEBP or PNG (by bytes), preserve original format unless we forced IndiaMART conversion
  if ((decidedExt === 'webp' || decidedExt === 'png') && !forceJpgIndiaMart) {
    destExt = decidedExt;
    dest = path.join(outDir, `${hash}.${destExt}`);
    await fs.writeFile(dest, buf);
    return { localPath: `/cache/${hash}.${destExt}`, absPath: dest };
  }
  // If JPEG or unknown: try to convert/compress to JPG with sharp; else write original bytes
  if (sharp) {
    try {
      destExt = 'jpg';
      dest = path.join(outDir, `${hash}.jpg`);
      await sharp(buf).jpeg({ quality: 80 }).toFile(dest);
      return { localPath: `/cache/${hash}.jpg`, absPath: dest };
    } catch {
      destExt = decidedExt;
      dest = path.join(outDir, `${hash}.${destExt}`);
      await fs.writeFile(dest, buf);
      return { localPath: `/cache/${hash}.${destExt}`, absPath: dest };
    }
  } else {
    destExt = decidedExt;
    dest = path.join(outDir, `${hash}.${destExt}`);
    await fs.writeFile(dest, buf);
    return { localPath: `/cache/${hash}.${destExt}`, absPath: dest };
  }
}

/**
 * Create and cache a solid-color swatch image and return a /cache path.
 * Accepts CSS color strings like "#rrggbb", "#rgb", "rgb(r,g,b)", or "rgba(r,g,b,a)".
 */
export async function cacheColorSwatchImage(color: string, size = 88): Promise<{ localPath: string; absPath: string }> {
  const tryParse = (c: string): { r: number; g: number; b: number } | null => {
    const s = String(c || '').trim().toLowerCase();
    // rgb(a)
    let m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (m) {
      const r = Math.min(255, Math.max(0, parseInt(m[1], 10)));
      const g = Math.min(255, Math.max(0, parseInt(m[2], 10)));
      const b = Math.min(255, Math.max(0, parseInt(m[3], 10)));
      return { r, g, b };
    }
    // #rrggbb or #rgb
    m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      const hex = m[1];
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return { r, g, b };
      } else {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b };
      }
    }
    return null;
  };
  const rgb = tryParse(color) || { r: 238, g: 238, b: 238 }; // default light gray
  const hash = crypto.createHash('sha1').update(`swatch:${rgb.r},${rgb.g},${rgb.b}|${size}`).digest('hex');
  const outDir = path.join(process.cwd(), 'public', 'cache');
  await ensureDir(outDir);
  const dest = path.join(outDir, `${hash}.png`);
  try {
    await fs.access(dest);
    return { localPath: `/cache/${hash}.png`, absPath: dest };
  } catch {}

  const sharp = await getSharp();
  if (sharp) {
    const img = sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: { r: rgb.r, g: rgb.g, b: rgb.b },
      },
    }).png();
    await img.toFile(dest);
    return { localPath: `/cache/${hash}.png`, absPath: dest };
  }
  // Fallback: write a 1x1 PNG buffer scaled up (very basic) if sharp unavailable
  const buf = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009077' +
    '3df40000000c49444154789c6360f8cfc0000003000101', 'hex'
  );
  await fs.writeFile(dest, buf);
  return { localPath: `/cache/${hash}.png`, absPath: dest };
}
