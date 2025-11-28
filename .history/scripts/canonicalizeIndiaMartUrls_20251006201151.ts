#!/usr/bin/env ts-node
/*
  Canonicalize existing IndiaMART SavedListing URLs in the database.
  - Strips tracking params (pos,tags,etc) leaving only id (+ optional kwd) for /products/ links
  - Avoids duplicates: if canonical URL already exists for same platform+sourceKey, deletes the old row
  - Provides --dry-run mode (default) to preview changes
  - Optionally verifies HTTP 200 (HEAD then GET fallback) unless --no-verify passed

  Usage:
    pnpm ts-node scripts/canonicalizeIndiaMartUrls.ts --dry-run
    pnpm ts-node scripts/canonicalizeIndiaMartUrls.ts --write
    pnpm ts-node scripts/canonicalizeIndiaMartUrls.ts --write --no-verify
*/
import { PrismaClient } from '@prisma/client';

// Lightweight arg parsing (avoid extra deps). Supported flags:
// --write        Apply updates (otherwise dry run)
// --no-verify    Skip HTTP verification of canonical URLs
// --limit N      Process only first N rows
interface CLI { write: boolean; noVerify: boolean; limit?: number }
function parseArgs(): CLI {
  const out: CLI = { write: false, noVerify: false };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--write') out.write = true;
    else if (a === '--no-verify') out.noVerify = true;
    else if (a === '--limit') {
      const v = args[++i];
      if (v && !isNaN(Number(v))) out.limit = Number(v);
    } else if (/^--limit=/.test(a)) {
      const v = a.split('=')[1];
      if (v && !isNaN(Number(v))) out.limit = Number(v);
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage: ts-node scripts/canonicalizeIndiaMartUrls.ts [--write] [--no-verify] [--limit N]\n`);
      process.exit(0);
    }
  }
  return out;
}
const argv = parseArgs();

// Re-implement lightweight canonicalizer consistent with provider (avoid import side-effects)
function canonicalize(u: string): string {
  try {
    const url = new URL(u, 'https://dir.indiamart.com');
    if (!/\.indiamart\.com$/i.test(url.hostname)) return url.toString();
    if (url.pathname.startsWith('/products')) {
      const id = url.searchParams.get('id');
      const kwd = url.searchParams.get('kwd');
      url.search = '';
      if (id) url.searchParams.set('id', id);
      if (kwd) url.searchParams.set('kwd', kwd);
      return url.toString();
    }
    const keep = new Set(['id','kwd']);
    if (url.search) {
      const entries = Array.from(url.searchParams.entries()).filter(([k]) => keep.has(k));
      url.search = '';
      for (const [k,v] of entries) url.searchParams.append(k,v);
    }
    return url.toString();
  } catch {
    return u;
  }
}

async function verify(url: string): Promise<boolean> {
  if (argv.noVerify) return true; // assume ok
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (head.ok) return true;
    // Some hosts may not allow HEAD -> fallback to GET
    const get = await fetch(url, { method: 'GET', redirect: 'follow' });
    return get.ok && (get.headers.get('content-type') || '').includes('text/html');
  } catch {
    return false;
  }
}

const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART' },
    orderBy: { id: 'asc' },
  take: argv.limit,
  });
  let changed = 0, deleted = 0, verified = 0, failedVerify = 0;

  for (const l of listings) {
    const canon = canonicalize(l.url);
    if (canon === l.url) continue; // no change
    const ok = await verify(canon);
    if (ok) verified++; else failedVerify++;
    if (!ok) {
      console.log(`[skip unverifiable] ${l.id} -> ${canon}`);
      continue;
    }
  if (argv.write) {
      // dedupe check
      const existing = await prisma.savedListing.findFirst({ where: { platform: 'INDIAMART', url: canon } });
      if (existing) {
        await prisma.savedListing.delete({ where: { id: l.id } });
        deleted++;
        console.log(`[deleted duplicate] ${l.id} -> existing ${existing.id} ${canon}`);
        continue;
      }
      await prisma.savedListing.update({ where: { id: l.id }, data: { url: canon } });
    }
    changed++;
    console.log(`${argv.write ? '[updated]' : '[would update]'} ${l.id} ${l.url} -> ${canon}`);
  }

  console.log(`\nSummary:`);
  console.log(` Listings scanned: ${listings.length}`);
  console.log(` Canonicalizable changed: ${changed}`);
  console.log(` Duplicates deleted: ${deleted}`);
  console.log(` Verified OK: ${verified}`);
  console.log(` Failed verification: ${failedVerify}`);
  if (!argv.write) console.log(' (dry run - rerun with --write to apply)');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
