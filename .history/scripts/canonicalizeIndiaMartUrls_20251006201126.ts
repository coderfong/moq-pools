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
import fetch from 'node-fetch';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('write', { type: 'boolean', default: false, describe: 'Apply updates (without this it is a dry run)' })
  .option('no-verify', { type: 'boolean', default: false, describe: 'Skip HTTP verification of canonical URLs' })
  .option('limit', { type: 'number', describe: 'Limit number of rows processed (for testing)' })
  .demandOption([], '')
  .help()
  .parseSync();

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
  if (argv['no-verify']) return true; // assume ok
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
