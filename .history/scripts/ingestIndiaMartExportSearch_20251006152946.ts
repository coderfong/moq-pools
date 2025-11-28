#!/usr/bin/env ts-node
import { fetchExportSearch } from '@/lib/providers/indiamartExport';
import { upsertSavedListings } from '@/lib/listingStore';
import { sanitizeTitle, classify, passesQuality, QualityGateOptions } from '@/lib/quality/xrayQuality';
import { termToCategorySlug } from '@/lib/quality/termCategory';

interface Args { q: string; limit: number; detail: boolean; detailLimit: number; detailAll: boolean; debug: boolean; terms: string[]; purge: boolean; exclude?: string[]; excludeRegex?: string; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { q: '', limit: 120, detail: true, detailLimit: 16, detailAll: false, debug: false, terms: [], purge: false };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch(k){
      case '--q': args.q = String(take()||'').trim(); break;
      case '--terms': args.terms = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
      case '--limit': args.limit = Math.max(10, Number(take())||120); break;
      case '--detail': args.detail = /^(1|true|yes)$/i.test(String(take())); break;
  case '--detail-limit': args.detailLimit = Math.max(1, Number(take())||16); break;
  case '--detail-all': args.detailAll = /^(1|true|yes)$/i.test(String(take())); break;
  case '--debug': args.debug = /^(1|true|yes)$/i.test(String(take())); break;
  case '--exclude': args.exclude = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
  case '--exclude-regex': args.excludeRegex = String(take()||'').trim(); break;
  case '--purge': args.purge = true; break;
    }
  }
  if (args.q && !args.terms.length) args.terms = [args.q];
  if (!args.terms.length) args.terms = ['x ray machine'];
  return args;
}

async function ingestTerm(term: string, args: Args) {
  const listings = await fetchExportSearch(term, { limit: args.limit, detail: args.detail, detailLimit: args.detailLimit, debug: args.debug, detailAll: args.detailAll });
  if (!listings.length) { console.log(`[IM-EXPORT-SEARCH] term='${term}' no listings`); return 0; }
  const re = args.excludeRegex ? (() => { try { return new RegExp(args.excludeRegex!, 'i'); } catch { return undefined; } })() : undefined;
  const seen = new Set<string>();
  let filteredMoq = 0, filteredExclude = 0, filteredRegex = 0, filteredQuality = 0;
  const kept: any[] = [];
  for (const raw of listings) {
    const moqStr = String(raw.moq || '');
    const m = moqStr.match(/(\d{1,5})/);
    if (m) {
      const val = Number(m[1]);
      if (Number.isFinite(val) && val <= 1) { filteredMoq++; continue; }
    }
    if (args.exclude && args.exclude.length) {
      const tl = (raw.title||'').toLowerCase();
      if (args.exclude.some(x => tl.includes(x.toLowerCase()))) { filteredExclude++; continue; }
    }
    if (re && re.test(raw.title||'')) { filteredRegex++; continue; }
    const title = sanitizeTitle(raw.title || 'Product');
    const classification = classify(title, term);
    const qualityOpts: QualityGateOptions = { seen };
    if (!passesQuality(classification, qualityOpts)) { filteredQuality++; continue; }
    seen.add(classification.canonicalKey);
    kept.push({ raw, title, classification });
  }
  if (!kept.length) { console.log(`[IM-EXPORT-SEARCH] term='${term}' all listings filtered`); return 0; }
  const termSlug = termToCategorySlug(term);
  await upsertSavedListings(kept.map(k => ({
    platform: 'INDIAMART',
    url: k.raw.url,
    title: k.title,
    image: k.raw.image || undefined,
    price: k.raw.price || undefined,
    moq: k.raw.moq || undefined,
    storeName: (k.raw as any).storeName || undefined,
    description: k.raw.description || undefined,
    categories: k.classification.groups.length ? Array.from(new Set([...k.classification.groups, termSlug])) : [termSlug],
    terms: [term]
  })) as any);
  const saved = kept.length;
  const filtered = listings.length - saved;
  console.log(`[IM-EXPORT-SEARCH] term='${term}' saved=${saved} filteredTotal=${filtered} details={moq:${filteredMoq},exclude:${filteredExclude},regex:${filteredRegex},quality:${filteredQuality}}`);
  return saved;
}

async function main(){
  const args = parseArgs();
  console.log(`[IM-EXPORT-SEARCH] start terms=${args.terms.join(',')} limit=${args.limit} detail=${args.detail}`);
  const { prisma } = await import('@/lib/prisma');
  if (args.purge) {
    for (const t of args.terms) {
      await prisma.savedListing.deleteMany({ where: { platform: 'INDIAMART' as any, terms: { has: t } } });
      console.log(`[IM-EXPORT-SEARCH] purged existing listings with term='${t}'`);
    }
  }
  let total = 0;
  for (const term of args.terms) {
    total += await ingestTerm(term, args);
  }
  console.log(`[IM-EXPORT-SEARCH] done total=${total}`);
}
main();
