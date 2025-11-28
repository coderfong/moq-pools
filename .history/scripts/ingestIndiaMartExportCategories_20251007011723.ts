#!/usr/bin/env ts-node
import { prisma } from '../src/lib/prisma';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { fetchExportCategoryPage, fetchExportProductDetail } from '../src/lib/providers/indiamartExport';
import { upsertSavedListings } from '../src/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '../src/lib/quality/xrayQuality';
import { termToCategorySlug } from '../src/lib/quality/termCategory';

interface Args { limit: number; minCount: number; pageLimit: number; detail: boolean; debug: boolean; dry: boolean; perDetail: number; sparseThreshold: number; minInformative: number; allowAccessories: boolean; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { limit: 150, minCount: 0, pageLimit: 120, detail: false, debug: false, dry: false, perDetail: 5, sparseThreshold: 6, minInformative: 2, allowAccessories: false };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch(k){
      case '--limit': args.limit = Math.max(1, Number(take())||50); break;
      case '--min-count': args.minCount = Math.max(0, Number(take())||0); break;
      case '--page-limit': args.pageLimit = Math.max(20, Number(take())||120); break;
      case '--detail': args.detail = /^(1|true|yes)$/i.test(String(take())); break;
      case '--per-detail': args.perDetail = Math.max(1, Number(take())||5); break;
      case '--debug': args.debug = /^(1|true|yes)$/i.test(String(take())); break;
      case '--dry': args.dry = true; break;
  case '--sparse-threshold': args.sparseThreshold = Math.max(1, Number(take())||6); break;
  case '--min-informative': args.minInformative = Math.max(0, Number(take())||2); break;
  case '--allow-accessories': args.allowAccessories = true; break;
    }
  }
  return args;
}

async function main(){
  const args = parseArgs();
  console.log(`[IM-EXPORT-CATS] start limit=${args.limit} minCount=${args.minCount} pageLimit=${args.pageLimit} detail=${args.detail} sparseThresh=${args.sparseThreshold} minInf=${args.minInformative} allowAcc=${args.allowAccessories}`);
  const p: any = prisma as any;
  if (!p.exportCategory?.findMany) {
    console.error("Prisma client missing exportCategory model (did you run prisma generate after adding the model?)");
    process.exit(1);
  }
  const rows = await p.exportCategory.findMany({
    where: args.minCount > 0 ? { OR: [ { itemCount: { gte: args.minCount } }, { itemCount: null } ] } : {},
    orderBy: [ { itemCount: 'desc' }, { firstSeen: 'asc' } ],
    take: args.limit
  });
  console.log(`[IM-EXPORT-CATS] fetched ${rows.length} categories`);
  let totalListings = 0; let totalTerms = 0; const seen = new Set<string>();
  for (const r of rows) {
    const term = r.label.trim();
    if (term.length < 3) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue; seen.add(key); totalTerms++;
    if (args.debug) console.log(`[IM-EXPORT-CATS] term='${term}' fetchIndiaMart`);
    let listings = await fetchIndiaMart(term, args.pageLimit, { headless:false, forceHeadless:false, debug: args.debug }).catch(()=>[] as any[]);
    if (listings.length < args.sparseThreshold) {
      if (args.debug) console.log(`[IM-EXPORT-CATS] term='${term}' sparse=${listings.length} -> export fallback`);
      const exp = await fetchExportCategoryPage(term, args.debug).catch(()=>({ listings: [] as any[] }));
      if (exp.listings.length) listings = exp.listings;
      if (args.detail && listings.length) {
        const detailed: any[] = [];
        for (const l of listings.slice(0, args.perDetail)) {
          const d = await fetchExportProductDetail(l.url, args.debug).catch(()=>null);
            if (d) detailed.push(d);
        }
        if (detailed.length) listings = detailed as any;
      }
    }
    if (!listings.length) { if (args.debug) console.log(`[IM-EXPORT-CATS] term='${term}' no listings`); continue; }
    // Filter out MOQ <= 1
    let filteredMoq=0, filteredQuality=0; const seenCanon = new Set<string>();
    const kept = [] as any[];
    for (const l of listings) {
      const m = String(l.moq || '').match(/(\d{1,5})/);
      if (m) {
        const val = Number(m[1]);
        if (Number.isFinite(val) && val <= 1) { filteredMoq++; continue; }
      }
      const title = sanitizeTitle(l.title || 'Product');
      const cls = classify(title, term);
      if (!passesQuality(cls, { minInformative: args.minInformative, allowAccessories: args.allowAccessories, seen: seenCanon })) { filteredQuality++; continue; }
      seenCanon.add(cls.canonicalKey);
      kept.push({ l, title, groups: cls.groups });
    }
    if (!kept.length) { if (args.debug) console.log(`[IM-EXPORT-CATS] term='${term}' all listings filtered (moq=${filteredMoq} quality=${filteredQuality})`); continue; }
    totalListings += kept.length;
    if (!args.dry) {
      const termSlug = termToCategorySlug(term);
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
        terms: [term]
      })) as any);
    }
    console.log(`[IM-EXPORT-CATS] ${term} -> kept=${kept.length} filtered={moq:${filteredMoq},quality:${filteredQuality}} (cum ${totalListings})`);
  }
  console.log(`[IM-EXPORT-CATS] done categories=${rows.length} uniqueTerms=${totalTerms} listings=${totalListings}`);
  await prisma.$disconnect();
}
main();
