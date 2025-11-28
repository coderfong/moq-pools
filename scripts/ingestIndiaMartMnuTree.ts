#!/usr/bin/env ts-node
/**
 * Ingest all IndiaMART listings for every ExportCategory whose url/hash path contains a given root token (default 'mnu').
 * Traversal strategy:
 *   1. Query ExportCategory rows whose url includes the root token (case-insensitive) OR whose parent chain includes it.
 *   2. (Optional) BFS by parentLabel relationships to ensure we capture descendants even if their URL omits the token.
 *   3. For each category label, attempt direct IndiaMART fetch first (pagination limit), then fallback to export category page (and optional detail enrichment) if sparse.
 *   4. Apply quality + MOQ filters consistent with other ingestion scripts.
 *
 * Usage examples:
 *   pnpm ts-node scripts/ingestIndiaMartMnuTree.ts
 *   pnpm ts-node scripts/ingestIndiaMartMnuTree.ts --root mnu --page-limit 100 --sparse-threshold 5 --limit 500 --debug
 *
 * Flags:
 *   --root <token>            Root code token to match in ExportCategory.url (default 'mnu')
 *   --limit <n>               Max categories to process (default 1000)
 *   --page-limit <n>          Pagination depth for direct IndiaMART fetch (default 120)
 *   --sparse-threshold <n>    If fewer direct listings than this, use export fallback (default 6)
 *   --detail                  Enable export detail page enrichment for fallback (default false)
 *   --per-detail <n>          Number of detail pages when --detail enabled (default 5)
 *   --min-informative <n>     Minimum informative groups (default 2)
 *   --allow-accessories       Permit accessory/part terms (default false)
 *   --dry                     Do not persist SavedListing writes
 *   --debug                   Verbose logging
 */

import { prisma } from '../src/lib/prisma';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { fetchExportCategoryPage, fetchExportProductDetail } from '../src/lib/providers/indiamartExport';
import { upsertSavedListings } from '../src/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '../src/lib/quality/xrayQuality';
import { termToCategorySlug } from '../src/lib/quality/termCategory';

interface Args { root: string; limit: number; pageLimit: number; sparseThreshold: number; detail: boolean; perDetail: number; minInformative: number; allowAccessories: boolean; dry: boolean; debug: boolean; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { root: 'mnu', limit: 1000, pageLimit: 120, sparseThreshold: 6, detail: false, perDetail: 5, minInformative: 2, allowAccessories: false, dry: false, debug: false };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch(k){
      case '--root': args.root = String(take()||'mnu'); break;
      case '--limit': args.limit = Math.max(1, Number(take())||1000); break;
      case '--page-limit': args.pageLimit = Math.max(20, Number(take())||120); break;
      case '--sparse-threshold': args.sparseThreshold = Math.max(1, Number(take())||6); break;
      case '--detail': args.detail = true; break;
      case '--per-detail': args.perDetail = Math.max(1, Number(take())||5); break;
      case '--min-informative': args.minInformative = Math.max(0, Number(take())||2); break;
      case '--allow-accessories': args.allowAccessories = true; break;
      case '--dry': args.dry = true; break;
      case '--debug': args.debug = true; break;
    }
  }
  return args;
}

async function collectRootedCategories(rootToken: string, limit: number, debug: boolean): Promise<Array<{label:string;url:string;parentLabel:string|null}>> {
  const p: any = prisma as any;
  if (!p.exportCategory?.findMany) return [];
  const token = rootToken.toLowerCase();
  const all: Array<{ label: string; url: string; parentLabel: string | null }> = await p.exportCategory.findMany({ select: { label: true, url: true, parentLabel: true } });
  // Seed set: url contains token
  const seed = new Set<string>();
  for (const r of all) if (r.url.toLowerCase().includes(token)) seed.add(r.label);
  if (debug) console.log(`[IM-MNU] seed by url token='${token}' count=${seed.size}`);
  // Build adjacency (parent -> children)
  const children = new Map<string, string[]>();
  for (const r of all) {
    if (r.parentLabel) {
      if (!children.has(r.parentLabel)) children.set(r.parentLabel, []);
      children.get(r.parentLabel)!.push(r.label);
    }
  }
  // BFS expand descendants
  const queue = Array.from(seed);
  const visited = new Set(queue);
  while (queue.length) {
    const cur = queue.shift()!;
    const kids = children.get(cur) || [];
    for (const k of kids) if (!visited.has(k)) { visited.add(k); queue.push(k); }
    if (visited.size >= limit) break;
  }
  const result = all.filter(r => visited.has(r.label)).slice(0, limit);
  if (debug) console.log(`[IM-MNU] collected rooted categories total=${result.length}`);
  return result;
}

async function ingestCategoryLabel(label: string, args: Args) {
  let listings: any[] = [];
  try {
    listings = await fetchIndiaMart(label, args.pageLimit, { headless:false, forceHeadless:false, debug: args.debug });
  } catch {}
  if (listings.length < args.sparseThreshold) {
    const exp = await fetchExportCategoryPage(label, args.debug).catch(()=>({ listings: [] as any[] }));
    if (exp.listings.length) listings = exp.listings;
    if (args.detail && listings.length) {
      const detailed: any[] = [];
      for (const l of listings.slice(0, args.perDetail)) {
        const det = await fetchExportProductDetail(l.url, args.debug).catch(()=>null);
        if (det) detailed.push(det);
      }
      if (detailed.length) listings = detailed as any;
    }
  }
  if (!listings.length) return { kept: 0, filtered: { moq:0, quality:0 } };
  let filteredMoq=0, filteredQuality=0; const seenCanon = new Set<string>();
  const kept: any[] = [];
  for (const l of listings) {
    const m = String(l.moq || '').match(/(\d{1,5})/);
    if (m) {
      const val = Number(m[1]);
      if (Number.isFinite(val) && val <= 1) { filteredMoq++; continue; }
    }
    const title = sanitizeTitle(l.title || 'Product');
    const cls = classify(title, label);
    if (!passesQuality(cls, { minInformative: args.minInformative, allowAccessories: args.allowAccessories, seen: seenCanon })) { filteredQuality++; continue; }
    seenCanon.add(cls.canonicalKey);
    kept.push({ l, title, groups: cls.groups });
  }
  if (!kept.length) return { kept: 0, filtered: { moq:filteredMoq, quality:filteredQuality } };
  if (!args.dry) {
    const termSlug = termToCategorySlug(label);
    await upsertSavedListings(kept.map(k => ({
      platform: 'INDIAMART',
      url: k.l.url,
      title: k.title,
      image: k.l.image || undefined,
      price: k.l.price || undefined,
      moq: k.l.moq || undefined,
      storeName: (k.l as any).storeName || undefined,
      description: (k.l as any).description || undefined,
      categories: k.groups.length ? Array.from(new Set([...k.groups, termSlug])) : [termSlug],
      terms: [label]
    })) as any);
  }
  return { kept: kept.length, filtered: { moq:filteredMoq, quality:filteredQuality } };
}

async function main(){
  const args = parseArgs();
  console.log(`[IM-MNU] start root='${args.root}' limit=${args.limit} pageLimit=${args.pageLimit} sparse=${args.sparseThreshold} detail=${args.detail} minInf=${args.minInformative} allowAcc=${args.allowAccessories}`);
  const cats = await collectRootedCategories(args.root, args.limit, args.debug);
  if (!cats.length) {
    console.error(`[IM-MNU] no categories matched root token '${args.root}'`);
    process.exit(1);
  }
  let totalKept=0, totalFilteredMoq=0, totalFilteredQuality=0; let processed=0;
  for (const c of cats) {
    processed++;
    const { kept, filtered } = await ingestCategoryLabel(c.label, args);
    totalKept += kept; totalFilteredMoq += filtered.moq; totalFilteredQuality += filtered.quality;
    console.log(`[IM-MNU] (${processed}/${cats.length}) label='${c.label}' kept=${kept} filtered={moq:${filtered.moq},quality:${filtered.quality}} cumKept=${totalKept}`);
  }
  console.log(`[IM-MNU] done categories=${cats.length} kept=${totalKept} filteredTotals={moq:${totalFilteredMoq},quality:${totalFilteredQuality}}`);
  await prisma.$disconnect();
}

main();
