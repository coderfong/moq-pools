import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../_lib/session';
import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

function isAllowedImage(buf: Buffer, declaredType?: string): boolean {
  if (!buf || buf.length < 12) return false;
  const b = buf;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return true;
  // GIF: GIF87a or GIF89a
  if (
    b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
    (b[4] === 0x39 || b[4] === 0x37) && b[5] === 0x61
  ) return true;
  // WebP: RIFF....WEBP
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return true;
  // AVIF (HEIF) is trickier; allow declared avif only to reduce false negatives
  if (declaredType === 'image/avif') return true;
  return false;
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
    if (!isAllowedImage(buf, type)) {
      return NextResponse.json({ ok: false, reason: 'invalid_image_data' }, { status: 400 });
    }
    const now = new Date();
    const year = String(now.getFullYear());
    const mon = String(now.getMonth() + 1).padStart(2, '0');
    const ext = extFromType(type || null, (file as any).name || null);
    const key = `uploads/${year}/${mon}/${now.getTime()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const bucket = process.env.S3_BUCKET || process.env.NEXT_PUBLIC_S3_BUCKET;
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const s3 = new S3Client({ region, endpoint, forcePathStyle: !!endpoint });

    if (bucket) {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buf, ContentType: type }));
      const cdnBase = process.env.CDN_BASE_URL || (endpoint ? `${endpoint.replace(/\/$/, '')}/${bucket}` : undefined);
      const url = cdnBase ? `${cdnBase}/${key}` : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      return NextResponse.json({ ok: true, url });
    }

    // Fallback: local disk if no S3 bucket configured
    const baseDir = path.join(process.cwd(), 'public', path.dirname(key));
    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(path.join(process.cwd(), 'public', key), buf);
    return NextResponse.json({ ok: true, url: `/${key}` });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/uploads failed', e?.message || e);
    return NextResponse.json({ ok: false, reason: 'server_error' }, { status: 500 });
  }
}
