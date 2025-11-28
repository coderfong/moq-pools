import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../_lib/session';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

function extFromType(t: string | null, filename?: string | null): string {
  if (t) {
    if (t === 'image/jpeg') return '.jpg';
    if (t === 'image/png') return '.png';
    if (t === 'image/webp') return '.webp';
    if (t === 'image/gif') return '.gif';
    if (t === 'image/avif') return '.avif';
  }
  const n = (filename || '').toLowerCase();
  const known = ['.jpg','.jpeg','.png','.webp','.gif','.avif'];
  for (const k of known) if (n.endsWith(k)) return k === '.jpeg' ? '.jpg' : k;
  return '.bin';
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as unknown as File | null;
    if (!file) return NextResponse.json({ ok: false, reason: 'missing_file' }, { status: 400 });
    const type = (file as any).type as string | undefined;
    if (!type || !type.startsWith('image/')) {
      return NextResponse.json({ ok: false, reason: 'invalid_type' }, { status: 400 });
    }
    const size = (file as any).size as number | undefined;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!size || size > maxSize) {
      return NextResponse.json({ ok: false, reason: 'too_large' }, { status: 400 });
    }

    const buf = Buffer.from(await (file as any).arrayBuffer());
    const now = new Date();
    const year = String(now.getFullYear());
    const mon = String(now.getMonth() + 1).padStart(2, '0');
    const baseDir = path.join(process.cwd(), 'public', 'uploads', year, mon);
    await fs.mkdir(baseDir, { recursive: true });
    const ext = extFromType(type || null, (file as any).name || null);
    const name = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const full = path.join(baseDir, name);
    await fs.writeFile(full, buf);
    const url = `/uploads/${year}/${mon}/${name}`;
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/uploads failed', e?.message || e);
    return NextResponse.json({ ok: false, reason: 'server_error' }, { status: 500 });
  }
}
