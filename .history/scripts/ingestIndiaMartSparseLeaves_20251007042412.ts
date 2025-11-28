#!/usr/bin/env ts-node
/**
 * ingestIndiaMartSparseLeaves.ts
 * Purpose: Specifically target IndiaMART leaves (and their alias terms) that currently have 0 (or below a threshold) listings
 *          and attempt multiple relaxed passes to populate them.
 *
 * Strategy:
 *  1. Compute counts per leaf (SavedListing.platform=INDIAMART, categories HAS leaf.key).
 *  2. Select leaves with count < --max-current (default 1) AND up to --limit-leaves.
 *  3. For each leaf, build candidate terms: leaf.term + aliases + label variants.
 *  4. For each term, attempt (a) static fetch (prefetch size) (b) headless fallback if sparse.
 *  5. Apply progressive relaxation stages lowering minInformative then allowing accessories.
 *  6. Stop a leaf when it reaches --target.
 *
 * Flags:
 *   --target <n>            Desired kept listings per leaf (default 4)
 *   --max-current <n>       Only process leaves with existing count <= n (default 1)
 *   --limit-leaves <n>      Cap number of sparse leaves to process (default 80)
 *   --prefetch <n>          Fetch size per attempt (default 70)
 *   --terms-cap <n>         Max terms per leaf to try (default 5)
 *   --min-informative <n>   Starting informative threshold (default 2)
 *   --headless              Allow headless escalation (default true)
 *   --debug                 Verbose logging
 *   --dry                   Do not persist (simulate only)
 */
import { flattenIndiaMartLeaves } from '../src/lib/indiamartCategories';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { upsertSavedListings } from '../src/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '../src/lib/quality/xrayQuality';
import { termToCategorySlug } from '../src/lib/quality/termCategory';
import { prisma } from '../src/lib/prisma';

interface Args { target:number; maxCurrent:number; limitLeaves:number; prefetch:number; termsCap:number; minInformative:number; headless:boolean; debug:boolean; dry:boolean; noMoq:boolean; relaxed:boolean; concurrency:number; }
function parseArgs(): Args { const a = process.argv.slice(2); const r:Args = { target:4, maxCurrent:1, limitLeaves:80, prefetch:70, termsCap:5, minInformative:2, headless:true, debug:false, dry:false, noMoq:false, relaxed:false, concurrency:1 }; const take=()=>a.shift(); while(a.length){ const k = take(); if(!k) break; switch(k){
  case '--target': r.target=Math.max(1,Number(take())||4); break;
  case '--max-current': r.maxCurrent=Math.max(0,Number(take())||1); break;
  case '--limit-leaves': r.limitLeaves=Math.max(1,Number(take())||80); break;
  case '--prefetch': r.prefetch=Math.min(150,Math.max(20,Number(take())||70)); break;
  case '--terms-cap': r.termsCap=Math.min(10,Math.max(1,Number(take())||5)); break;
  case '--min-informative': r.minInformative=Math.max(0,Number(take())||2); break;
  case '--headless': r.headless=true; break;
  case '--no-headless': r.headless=false; break;
  case '--debug': r.debug=true; break;
  case '--dry': r.dry=true; break;
  case '--no-moq': r.noMoq=true; break;
  case '--relaxed': r.relaxed=true; break;
  case '--concurrency': r.concurrency=Math.min(12,Math.max(1,Number(take())||1)); break;
 }} return r; }

async function leafCounts(): Promise<Record<string,number>> { const leaves = flattenIndiaMartLeaves(); const out:Record<string,number>={}; for(const l of leaves){ out[l.key] = await prisma.savedListing.count({ where: { platform:'INDIAMART' as any, categories: { has: l.key } } }); } return out; }

async function fetchTerm(term:string, limit:number, headless:boolean, debug:boolean){ try { return await fetchIndiaMart(term, limit, { headless, debug }); } catch { return []; } }

async function processLeaf(leaf: ReturnType<typeof flattenIndiaMartLeaves>[number], existing:number, args:Args){
  if(existing >= args.target) return 0;
  const baseTerms = Array.from(new Set([leaf.term, leaf.label, ...(leaf.aliases||[])]))
    .filter(Boolean)
    .slice(0, args.termsCap);
  const seenCanon = new Set<string>();
  let added=0; const leafKey = leaf.key;
  for(const term of baseTerms){
    if(existing + added >= args.target) break;
    let batch = await fetchTerm(term, args.prefetch, false, args.debug);
    if(batch.length < Math.min(5, args.prefetch/3) && args.headless){
      const head = await fetchTerm(term, args.prefetch, true, args.debug); if(head.length > batch.length) batch = head;
    }
    const relaxStages: Array<{minInf:number; allowAcc:boolean}> = args.relaxed
      ? [{ minInf:1, allowAcc:true }]
      : [{ minInf: args.minInformative, allowAcc:false }, ...(args.minInformative>1 ? [{ minInf:1, allowAcc:false }] : []), { minInf:1, allowAcc:true }];
    for(const stage of relaxStages){
      if(existing + added >= args.target) break;
      let stageKept=0; const upserts:any[] = []; let filteredMoq=0, filteredQ=0;
      for(const it of batch){
        if(existing + added + stageKept >= args.target) break;
        if(!args.noMoq){ const m = String(it.moq||'').match(/(\d{1,5})/); if(m){ const v=Number(m[1]); if(Number.isFinite(v) && v<=1){ filteredMoq++; continue; }}}
        const title = sanitizeTitle(it.title||'Product');
        const cls = classify(title, term);
        if(!passesQuality(cls, { minInformative: stage.minInf, allowAccessories: stage.allowAcc, seen: seenCanon })) { filteredQ++; continue; }
        if(seenCanon.has(cls.canonicalKey)) continue; seenCanon.add(cls.canonicalKey);
        stageKept++;
        const termSlug = termToCategorySlug(term);
        upserts.push({ platform: it.platform || 'INDIAMART', url: it.url, title, image: (it as any).image || undefined, price: (it as any).price || undefined, currency: (it as any).currency || undefined, moq: (it as any).moq || undefined, storeName: it.storeName || undefined, description: it.description || undefined, categories: Array.from(new Set([leafKey, termSlug, ...(cls.groups||[])])), terms: Array.from(new Set([term, ...term.split(/\s+/g)])), rating: (it as any).rating || undefined, orders: (it as any).orders || undefined });
      }
      if(stageKept){ if(!args.dry) await upsertSavedListings(upserts as any); added += stageKept; if(args.debug) console.log(`[SPARSE] leaf=${leafKey} term='${term}' stage minInf=${stage.minInf} allowAcc=${stage.allowAcc} +${stageKept} total=${existing+added}`); }
    }
  }
  return added;
}

async function main(){
  const args = parseArgs();
  if(args.relaxed && args.minInformative>1) args.minInformative = 1;
  console.log(`[SPARSE] start target=${args.target} maxCurrent=${args.maxCurrent} limitLeaves=${args.limitLeaves} prefetch=${args.prefetch} termsCap=${args.termsCap} minInf=${args.minInformative} headless=${args.headless} noMoq=${args.noMoq} relaxed=${args.relaxed} concurrency=${args.concurrency}`);
  const leaves = flattenIndiaMartLeaves();
  const counts = await leafCounts();
  const sparse = leaves.filter(l => (counts[l.key]||0) <= args.maxCurrent).slice(0, args.limitLeaves);
  console.log(`[SPARSE] sparseLeaves=${sparse.length}`);
  let totalAdded=0; let processed=0; const queue = sparse.slice();
  async function worker(id:number){
    while(queue.length){
      const leaf = queue.shift()!; processed++;
      const existing = counts[leaf.key]||0;
      const delta = await processLeaf(leaf, existing, args);
      totalAdded += delta;
      console.log(`[SPARSE] worker=${id} (${processed}/${sparse.length}) leaf=${leaf.key} existing=${existing} added=${delta} cumAdded=${totalAdded}`);
    }
  }
  await Promise.all(Array.from({length: args.concurrency}, (_,i)=>worker(i+1)));
  console.log(`[SPARSE] done sparseProcessed=${sparse.length} added=${totalAdded}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
