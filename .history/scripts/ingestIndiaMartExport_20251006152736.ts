#!/usr/bin/env ts-node
import fs from 'fs';
import { fetchExportCategoryPage, fetchExportProductDetail } from '@/lib/providers/indiamartExport';
import { fetchIndiaMart } from '@/lib/providers/indiamart';
import { upsertSavedListings } from '@/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '@/lib/quality/xrayQuality';

interface Args { seeds: string[]; depth: number; per: number; limit: number; detail: boolean; debug: boolean; minInformative: number; allowAccessories: boolean; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { seeds: [], depth: 1, per: 2, limit: 120, detail: false, debug: false, minInformative: 2, allowAccessories: false };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch (k) {
      case '--seeds': args.seeds = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
      case '--depth': args.depth = Math.max(1, Number(take())||1); break;
      case '--per': args.per = Math.max(1, Number(take())||2); break;
      case '--limit': args.limit = Math.max(20, Number(take())||120); break;
      case '--detail': args.detail = /^(1|true|yes)$/i.test(String(take())); break;
  case '--debug': args.debug = /^(1|true|yes)$/i.test(String(take())); break;
  case '--min-informative': args.minInformative = Math.max(0, Number(take())||2); break;
  case '--allow-accessories': args.allowAccessories = true; break;
    }
  }
  if (!args.seeds.length) args.seeds = ['Hospital Linen','Medical Scrub'];
  return args;
}

async function main() {
  const args = parseArgs();
  console.log(`[IM-EXPORT-INGEST] start seeds=${args.seeds.join(',')} depth=${args.depth} per=${args.per} limit=${args.limit} detail=${args.detail} minInf=${args.minInformative} allowAcc=${args.allowAccessories}`);
  const frontier = args.seeds.slice();
  const visited = new Set<string>();
  const toIngestTerms: string[] = [];
  for (let d = 0; d < args.depth; d++) {
    const layer = frontier.splice(0, frontier.length);
    for (const term of layer) {
      const key = term.toLowerCase();
      if (visited.has(key)) continue;
      visited.add(key);
      const { subcategories } = await fetchExportCategoryPage(term, args.debug).catch(()=>({ subcategories: [] }));
      toIngestTerms.push(term);
      if (args.debug) console.log(`[IM-EXPORT-INGEST] term='${term}' subs=${subcategories.length}`);
      const next = subcategories.sort((a,b)=>(b.count||0)-(a.count||0)).slice(0, args.per).map(s=>s.label);
      frontier.push(...next);
    }
  }
  // Deduplicate ingest terms
  const uniq = Array.from(new Set(toIngestTerms));
  let total = 0;
  for (const t of uniq) {
    let listings = await fetchIndiaMart(t, args.limit, { headless: false, forceHeadless: false, debug: args.debug });
    if (listings.length < 4) {
      // attempt export page product anchors (details optional)
      const { listings: exportAnchors } = await fetchExportCategoryPage(t, args.debug).catch(()=>({ listings: [] }));
      if (exportAnchors.length) listings = exportAnchors;
      if (args.detail) {
        const detailed: any[] = [];
        for (const l of listings.slice(0, args.per)) {
          const det = await fetchExportProductDetail(l.url).catch(()=>null);
          if (det) detailed.push(det);
        }
        if (detailed.length) listings = detailed as any;
      }
    }
    if (!listings.length) continue;
    let filteredMoq=0, filteredQuality=0; const seenCanon = new Set<string>();
    const kept: any[] = [];
    for (const l of listings) {
      const m = String(l.moq || '').match(/(\d{1,5})/);
      if (m) {
        const val = Number(m[1]);
        if (Number.isFinite(val) && val <= 1) { filteredMoq++; continue; }
      }
      const title = sanitizeTitle(l.title || 'Product');
      const cls = classify(title, t);
      if (!passesQuality(cls, { minInformative: args.minInformative, allowAccessories: args.allowAccessories, seen: seenCanon })) { filteredQuality++; continue; }
      seenCanon.add(cls.canonicalKey);
      kept.push({ l, title, groups: cls.groups });
    }
    if (!kept.length) continue;
    total += kept.length;
    await upsertSavedListings(kept.map(k => ({
      platform: 'INDIAMART',
      url: k.l.url,
      title: k.title,
      image: k.l.image || undefined,
      price: k.l.price || undefined,
      moq: k.l.moq || undefined,
      storeName: (k.l as any).storeName || undefined,
      description: (k.l as any).description || undefined,
      categories: k.groups.length ? k.groups : undefined,
      terms: [t]
    })) as any);
    console.log(`[IM-EXPORT-INGEST] ${t} -> kept=${kept.length} filtered={moq:${filteredMoq},quality:${filteredQuality}} (cumulative ${total})`);
  }
  console.log(`[IM-EXPORT-INGEST] done total=${total}`);
}
main();
