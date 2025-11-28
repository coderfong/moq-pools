import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

function contentTypeFor(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  if (e === 'svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function stripHashSegment(filename: string): { base: string; ext: string } | null {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot < 0) return null;
  const ext = filename.slice(lastDot + 1);
  let base = filename.slice(0, lastDot);
  // Remove trailing .<8-10 hex> if present (e.g., name.1271769e)
  base = base.replace(/\.[a-f0-9]{6,10}$/i, '');
  return { base, ext };
}

export async function GET(_req: Request, ctx: { params: { file: string[] } }) {
  try {
    const parts = ctx.params.file || [];
    if (!Array.isArray(parts) || parts.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Only allow flat filenames (ignore nested directories)
    const raw = decodeURIComponent(parts.join('/'));
    if (raw.includes('/') || raw.includes('..')) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const parsed = stripHashSegment(raw);
    if (!parsed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { base, ext } = parsed;
    const rootDir = path.join(process.cwd(), 'company logos');
    const abs = path.join(rootDir, `${base}.${ext}`);
    // Guard against path traversal
    const norm = path.normalize(abs);
    if (!norm.startsWith(path.normalize(rootDir + path.sep))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const tryPaths: string[] = [abs];
    // Extra fallbacks: jpg/jpeg swap
    if (/\.jpg$/i.test(abs)) tryPaths.push(abs.replace(/\.jpg$/i, '.jpeg'));
    if (/\.jpeg$/i.test(abs)) tryPaths.push(abs.replace(/\.jpeg$/i, '.jpg'));
    // Attempt to read the first existing path
    let data: Buffer | null = null;
    let chosenPath = '';
    for (const p of tryPaths) {
      try {
        const buf = await fs.readFile(p);
        data = buf;
        chosenPath = p;
        break;
      } catch {}
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const ct = contentTypeFor(path.extname(chosenPath).slice(1));
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
