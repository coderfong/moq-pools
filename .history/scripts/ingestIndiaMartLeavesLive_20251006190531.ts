#!/usr/bin/env ts-node
/**
 * Live IndiaMART leaf ingestion ("copy x-ray machine approach across all leaves").
 *
 * Strategy:
 *  - Iterate all leaves from taxonomy.
 *  - For each leaf compute ordered search terms via getIndiaMartSearchTerms(leaf.key).
 *  - For each term:
 *      * Perform a small fast prefetch (limit=min(prefetchLimit, targetLimit)) to gauge density.
 *      * If result count < minPrefetchThreshold, skip escalating (avoid sparse/noisy export fallback).
 *      * If meets threshold, perform a full fetch up to --limit (optionally headless) and quality filter.
 *  - Persist only quality-filtered unique items (dedupe by canonical key) with categories including leaf key.
 *  - Optionally stop early for leaf once aggregate kept >= --limit (to avoid over-scraping).
 *  - No export fallback usage here; strictly live search to reduce stale items.
 *
 * Flags:
 *   --limit <n>           Target max kept listings per leaf (default 160)
 *   --terms <n>           Max search terms per leaf to attempt (default 2)
 *   --prefetch <n>        Prefetch probe size per term (default 60)
 *   --threshold <n>       Minimum prefetch items required to escalate into full fetch (default 30)
 *   --headless            Allow headless escalation when static sparse (default false)
 *   --min-informative <n> Minimum informative tokens in title classification (default 2)
 *   --allow-accessories   Allow accessory/part style items (default false)
 *   --debug               Verbose logging
 *   --dry                 Do not persist (for testing)
 *   --resume <file>       JSON progress file to resume (stores kept counts per leaf)
 */

import { flattenIndiaMartLeaves, getIndiaMartSearchTerms } from '../src/lib/indiamartCategories';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { upsertSavedListings } from '../src/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '../src/lib/quality/xrayQuality';
import { termToCategorySlug } from '../src/lib/quality/termCategory';
import fs from 'node:fs/promises';

interface Args { limit:number; terms:number; prefetch:number; threshold:number; headless:boolean; minInformative:number; allowAccessories:boolean; debug:boolean; dry:boolean; resume?:string; }
function parseArgs(): Args {
  const args: Args = { limit:160, terms:2, prefetch:60, threshold:30, headless:false, minInformative:2, allowAccessories:false, debug:false, dry:false };
  const a = process.argv.slice(2);
  const take = () => a.shift();
  while(a.length){
    const k = take(); if(!k) break;
    switch(k){
      case '--limit': args.limit = Math.min(400, Math.max(40, Number(take())||160)); break;
      case '--terms': args.terms = Math.min(5, Math.max(1, Number(take())||2)); break;
      case '--prefetch': args.prefetch = Math.min(120, Math.max(20, Number(take())||60)); break;
      case '--threshold': args.threshold = Math.min(args.prefetch, Math.max(5, Number(take())||30)); break;
      case '--headless': args.headless = true; break;
      case '--min-informative': args.minInformative = Math.max(0, Number(take())||2); break;
      case '--allow-accessories': args.allowAccessories = true; break;
      case '--debug': args.debug = true; break;
      case '--dry': args.dry = true; break;
      case '--resume': args.resume = String(take()||'').trim(); break;
    }
  }
  return args;
}

interface Progress { [leafKey:string]: number; }
async function loadProgress(file?:string): Promise<Progress>{
  if(!file) return {};
  try { const raw = await fs.readFile(file,'utf8'); return JSON.parse(raw||'{}'); } catch { return {}; }
}
async function saveProgress(file:string, prog:Progress){
  try { await fs.writeFile(file, JSON.stringify(prog,null,2)); } catch{}
}

async function main(){
  const args = parseArgs();
  const leaves = flattenIndiaMartLeaves();
  const progress = await loadProgress(args.resume);
  console.log(`[IM-LIVE] start leaves=${leaves.length} limit=${args.limit} terms=${args.terms} prefetch=${args.prefetch} threshold=${args.threshold} headless=${args.headless}`);
  if(args.resume) console.log(`[IM-LIVE] resume file=${args.resume}`);
  let globalKept=0;
  for(const leaf of leaves){
    if(progress[leaf.key] && progress[leaf.key] >= args.limit){
      if(args.debug) console.log(`[IM-LIVE] skip leaf=${leaf.key} already kept=${progress[leaf.key]}`);
      continue;
    }
    const terms = getIndiaMartSearchTerms(leaf.key).slice(0, args.terms);
    let leafKept = progress[leaf.key] || 0;
    const seenCanon = new Set<string>();
    for(const term of terms){
      if(leafKept >= args.limit) break;
      // 1) Prefetch probe (small, fast). Use fetchIndiaMart with limited limit.
      let preItems: any[] = [];
      try { preItems = await fetchIndiaMart(term, args.prefetch, { headless:false, debug: args.debug }); } catch {}
      if(args.debug) console.log(`[IM-LIVE] prefetch leaf=${leaf.key} term='${term}' got=${preItems.length}`);
      if(preItems.length < args.threshold){
        if(args.debug) console.log(`[IM-LIVE] below threshold (${preItems.length} < ${args.threshold}) skipping full fetch for term='${term}'`);
        continue; // do not escalate (avoid noisy export fallback)
      }
      // Optionally escalate for larger fetch if target not met
      const remaining = args.limit - leafKept;
      const fullLimit = Math.min(args.limit, remaining * 3); // overfetch factor then filter
      let fullItems: any[] = preItems; // reuse prefetch results baseline
      if(preItems.length < fullLimit){
        try {
          fullItems = await fetchIndiaMart(term, fullLimit, { headless: args.headless, debug: args.debug });
        } catch {}
      }
      // Quality filtering & dedupe
      let filteredMoq=0, filteredQuality=0, keptBatch=0;
      const keptRecords: any[] = [];
      for(const it of fullItems){
        if(leafKept + keptBatch >= args.limit) break;
        const m = String(it.moq || '').match(/(\d{1,5})/);
        if(m){ const val = Number(m[1]); if(Number.isFinite(val) && val <= 1){ filteredMoq++; continue; } }
        const title = sanitizeTitle(it.title || 'Product');
        const cls = classify(title, term);
        if(!passesQuality(cls, { minInformative: args.minInformative, allowAccessories: args.allowAccessories, seen: seenCanon })){ filteredQuality++; continue; }
        if(seenCanon.has(cls.canonicalKey)) continue; // duplicate
        seenCanon.add(cls.canonicalKey);
        keptBatch++;
        const termSlug = termToCategorySlug(term);
        keptRecords.push({
          platform: it.platform || 'INDIAMART',
          url: it.url,
          title,
          image: it.image || undefined,
          price: it.price || undefined,
          currency: it.currency || undefined,
          moq: it.moq || undefined,
          storeName: it.storeName || undefined,
          description: it.description || undefined,
          categories: Array.from(new Set([leaf.key, termSlug, ...(cls.groups||[])])),
          terms: Array.from(new Set([term, ...term.split(/\s+/g)])),
          rating: it.rating || undefined,
          orders: it.orders || undefined,
        });
      }
      if(keptBatch){
        if(!args.dry){ await upsertSavedListings(keptRecords as any); }
        leafKept += keptBatch; globalKept += keptBatch; progress[leaf.key] = leafKept;
        if(args.debug) console.log(`[IM-LIVE] kept leaf=${leaf.key} term='${term}' batch=${keptBatch} leafKept=${leafKept} filtered={moq:${filteredMoq},quality:${filteredQuality}}`);
      } else if(args.debug){
        console.log(`[IM-LIVE] none kept for leaf=${leaf.key} term='${term}' filtered={moq:${filteredMoq},quality:${filteredQuality}}`);
      }
      if(args.resume) await saveProgress(args.resume, progress);
    }
    if(args.debug) console.log(`[IM-LIVE] leaf done key=${leaf.key} totalKept=${leafKept}`);
  }
  if(args.resume) await saveProgress(args.resume, progress);
  console.log(`[IM-LIVE] done globalKept=${globalKept}`);
}

main().catch(e => { console.error(e); process.exit(1); });
