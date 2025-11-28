#!/usr/bin/env ts-node
/**
 * Diagnose IndiaMART cached listing images to surface additional low-quality placeholders.
 * Heuristics:
 *  - Very small byte size (< 5 KB)
 *  - 1:1 square but very small resolution (< 260px each side)
 *  - Low luminance variance (flat / blurry look)
 *  - Near-identical perceptual hash (dHash) to already-known BAD_IMAGE_HASHES exemplar
 * Outputs JSON summary + candidate SHA1 hashes (from filenames) to add to BAD_IMAGE_HASHES.
 *
 * Usage:
 *   pnpm ts-node scripts/diagnoseIndiaMartImageQuality.ts --limit 800 --min-size 200 --out im.bad.candidates.json
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { BAD_IMAGE_HASHES } from '../src/lib/badImages';

interface Args { limit: number; minSize: number; out?: string; }
function parseArgs(argv: string[]): Args {
  const a: Args = { limit: 1000, minSize: 200 };
  for (let i=2;i<argv.length;i++) {
    const k = argv[i];
    const [flag, raw] = k.includes('=') ? k.split(/=(.*)/) : [k, argv[i+1]];
    const take = () => { if (!k.includes('=')) i++; return raw; };
    switch(flag) {
      case '--limit': a.limit = Math.max(10, Math.min(10000, Number(take())||a.limit)); break;
      case '--min-size': a.minSize = Math.max(32, Math.min(1000, Number(take())||a.minSize)); break;
      case '--out': a.out = String(take()); break;
    }
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv);
  const cacheDir = path.join(process.cwd(), 'public', 'cache');
  const entries = await fs.readdir(cacheDir);
  const jpgs = entries.filter(e => /\.(jpg|jpeg)$/i.test(e));
  const sharpReq: any = (0, eval)('require');
  let sharp: any = null; try { sharp = sharpReq('sharp'); } catch {}
  if (!sharp) { console.error('sharp not installed; abort'); process.exit(1); }

  interface Row { file: string; sha: string; bytes: number; w: number; h: number; var: number; dhash: string; }
  const analyzed: Row[] = [];
  function shaFromFile(f: string): string { const m = f.match(/([a-f0-9]{40})/i); return m?m[1].toLowerCase():''; }

  function dHash(pixels: Uint8ClampedArray, w: number, h: number): string {
    // downscale to 9x8 grayscale horizontally for dHash
    const targetW = 9, targetH = 8;
    // simple row/col sampling
    const hashBits: string[] = [];
    for (let y=0;y<targetH;y++) {
      for (let x=0;x<targetW-1;x++) {
        const sx = Math.floor(x/(targetW-1) * (w-1));
        const sy = Math.floor(y/targetH * (h-1));
        const sx2 = Math.min(w-1, sx+1);
        const idx1 = (sy * w + sx) * 4;
        const idx2 = (sy * w + sx2) * 4;
        const g1 = 0.299*pixels[idx1] + 0.587*pixels[idx1+1] + 0.114*pixels[idx1+2];
        const g2 = 0.299*pixels[idx2] + 0.587*pixels[idx2+1] + 0.114*pixels[idx2+2];
        hashBits.push(g1 < g2 ? '1' : '0');
      }
    }
    return hashBits.join('').replace(/(.{4})/g,'$1').padEnd(64,'0');
  }

  function hamming(a: string, b: string): number {
    const len = Math.min(a.length, b.length); let d=0; for (let i=0;i<len;i++) if (a[i]!==b[i]) d++; return d + Math.abs(a.length-b.length);
  }

  const knownSet = new Set<string>([...BAD_IMAGE_HASHES]);
  const exemplarHashes: string[] = [];

  for (const f of jpgs.slice(0, args.limit)) {
    const sha = shaFromFile(f);
    const full = path.join(cacheDir, f);
    let buf: Buffer;
    try { buf = await fs.readFile(full); } catch { continue; }
    const bytes = buf.byteLength;
    let w=0,h=0,varLum=0,dhash='';
    try {
      const img = sharp(buf).removeAlpha();
      const meta = await img.metadata();
      w = meta.width||0; h = meta.height||0;
      const raw = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true }) as any;
      const pix = raw.data as Buffer; // RGBA
      // compute luminance variance
      let sum=0,sum2=0; const count = w*h; const lumArr = new Float32Array(count);
      for (let i=0;i<count;i++) { const idx=i*4; const g = 0.299*pix[idx]+0.587*pix[idx+1]+0.114*pix[idx+2]; lumArr[i]=g; sum+=g; sum2+=g*g; }
      const mean = sum/count; varLum = sum2/count - mean*mean;
      dhash = dHash(new Uint8ClampedArray(lumArr.map(v=>v)), w, h);
    } catch {}
    analyzed.push({ file:f, sha, bytes, w, h, var: Number(varLum.toFixed(2)), dhash });
  }

  // Identify new candidate bad images
  const small = analyzed.filter(r => r.bytes < 5500);
  const tinySquare = analyzed.filter(r => r.w>0 && r.h>0 && Math.abs(r.w-r.h)<8 && Math.max(r.w,r.h) < 260);
  const lowVar = analyzed.filter(r => r.var < 400); // heuristic variance cutoff

  // Group by sha1 (filename) presence in hash set to see duplicates
  const dupSha = Object.values(analyzed.reduce<Record<string,Row[]>>((acc,row)=>{ (acc[row.sha]=acc[row.sha]||[]).push(row); return acc;},{})).filter(v=>v.length>1);

  const suggestions: string[] = [];
  const seenSuggest = new Set<string>();
  for (const r of analyzed) {
    if (!r.sha) continue;
    if (knownSet.has(r.sha)) continue;
    if (r.bytes < 5500 || (r.w && r.h && Math.max(r.w,r.h) < args.minSize) || r.var < 400) {
      if (!seenSuggest.has(r.sha)) { suggestions.push(r.sha); seenSuggest.add(r.sha); }
    }
  }

  const out = {
    scanned: analyzed.length,
    knownBad: Array.from(knownSet),
    smallCount: small.length,
    tinySquareCount: tinySquare.length,
    lowVarianceCount: lowVar.length,
    duplicateShaGroups: dupSha.length,
    suggestions
  };

  if (args.out) {
    await fs.writeFile(args.out, JSON.stringify(out, null, 2));
    console.log('[diagnose] wrote', args.out);
  } else {
    console.log(JSON.stringify(out, null, 2));
  }

  if (suggestions.length) {
    console.log('\nAdd these to BAD_IMAGE_HASHES if verified:');
    suggestions.forEach(s => console.log('  ', s));
  } else {
    console.log('\nNo new candidate hashes found under current heuristics.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
