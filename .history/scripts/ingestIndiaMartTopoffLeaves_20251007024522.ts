#!/usr/bin/env ts-node
/**
 * ingestIndiaMartTopoffLeaves.ts
 * Purpose: After primary bulk/full-tree ingestion, many leaves may still have <= 1 kept listing due to
 *          strict quality filters or sparse static results. This script targets only underfilled leaves
 *          and attempts progressive relaxed passes until a per-leaf minimum is reached.
 *
 * Strategy:
 *  1. Scan all leaves -> compute current kept counts from SavedListing (platform=INDIAMART, category=leaf.key).
 *  2. Select leaves where kept < --min-target (default 8).
 *  3. For each sparse leaf, iterate ordered search terms (up to --terms) and run progressive attempts:
 *       a) Static fetch limit prefetch (--prefetch) -> quality filter (normal thresholds).
 *       b) If still below floor and --relax enabled, lower minInformative or allow accessories.
 *       c) Optional headless escalation if static + relaxed still sparse.
 *  4. Persist new listings incrementally; stop per leaf when target reached or all terms tried.
 *
 * CLI Flags:
 *   --min-target <n>        Minimum desired kept listings per leaf (default 8)
 *   --terms <n>             Max search terms per leaf (default 3)
 *   --prefetch <n>          Fetch size per attempt (default 70)
 *   --limit <n>             Max listings fetched per term escalation (default 160)
 *   --concurrency <n>       Number of parallel leaf workers (default 4)
 *   --min-informative <n>   Minimum informative tokens (default 2)
 *   --allow-accessories     Start with accessories allowed (default false)
 *   --relax                 Enable progressive relaxation (minInformative->1 then allowAccessories)
 *   --headless              Allow headless escalation when still under target
 *   --resume <file>         JSON progress file storing per-leaf attempts (skip completed)
 *   --group-filter <substr> Restrict to leaves whose top-level group label contains substring
 *   --debug                 Verbose logging
 */

import { INDIAMART_CATEGORIES, flattenIndiaMartLeaves, getIndiaMartSearchTerms } from '../src/lib/indiamartCategories';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { upsertSavedListings } from '../src/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '../src/lib/quality/xrayQuality';
import { termToCategorySlug } from '../src/lib/quality/termCategory';
import { prisma } from '../src/lib/prisma';
import fs from 'node:fs/promises';

interface Args { minTarget:number; terms:number; prefetch:number; limit:number; concurrency:number; minInformative:number; allowAccessories:boolean; relax:boolean; headless:boolean; resume?:string; groupFilter?:string; debug:boolean; }
function parseArgs(): Args { const a = process.argv.slice(2); const r: Args = { minTarget:8, terms:3, prefetch:70, limit:160, concurrency:4, minInformative:2, allowAccessories:false, relax:true, headless:false, debug:false } as any; const take=()=>a.shift(); while(a.length){ const k = take(); if(!k) break; switch(k){
  case '--min-target': r.minTarget=Math.min(50,Math.max(1,Number(take())||8)); break;
  case '--terms': r.terms=Math.min(6,Math.max(1,Number(take())||3)); break;
  case '--prefetch': r.prefetch=Math.min(120,Math.max(20,Number(take())||70)); break;
  case '--limit': r.limit=Math.min(400,Math.max(40,Number(take())||160)); break;
  case '--concurrency': r.concurrency=Math.min(16,Math.max(1,Number(take())||4)); break;
  case '--min-informative': r.minInformative=Math.max(0,Number(take())||2); break;
  case '--allow-accessories': r.allowAccessories=true; break;
  case '--relax': r.relax=true; break;
  case '--no-relax': r.relax=false; break;
  case '--headless': r.headless=true; break;
  case '--resume': r.resume=String(take()||'').trim(); break;
  case '--group-filter': r.groupFilter=String(take()||'').toLowerCase(); break;
  case '--debug': r.debug=true; break; }
 } return r; }

interface LeafState { done?:boolean; attempts?:number; }
interface Progress { [leafKey:string]: LeafState; }
async function loadProgress(f?:string): Promise<Progress>{ if(!f) return {}; try { return JSON.parse(await fs.readFile(f,'utf8')||'{}'); } catch { return {}; } }
async function saveProgress(f:string, p:Progress){ try { await fs.writeFile(f, JSON.stringify(p,null,2)); } catch {} }

async function currentLeafCounts(): Promise<Record<string,number>> {
  // For each leaf key, count SavedListings where categories array contains that key
  const leaves = flattenIndiaMartLeaves();
  const counts: Record<string,number> = {};
  for(const leaf of leaves){
    const c = await prisma.savedListing.count({ where: { platform:'INDIAMART' as any, categories: { has: leaf.key } } });
 *   --no-moq               Skip MOQ <= 1 filter (retain all entries regardless of MOQ)
 *   --relaxed              Force immediately relaxed mode (minInformative=1, accessories allowed)
    counts[leaf.key] = c;
  }
  return counts;
}

async function fetchTerm(term:string, limit:number, headless:boolean, debug:boolean){
  try { return await fetchIndiaMart(term, limit, { headless, debug }); } catch { return []; }
}

interface Args { minTarget:number; terms:number; prefetch:number; limit:number; concurrency:number; minInformative:number; allowAccessories:boolean; relax:boolean; headless:boolean; resume?:string; groupFilter?:string; debug:boolean; noMoq:boolean; forceRelaxed:boolean; }
  const target = args.minTarget;
  if(existing >= target){ progress[leafKey] = { done:true }; return 0; }
  const terms = getIndiaMartSearchTerms(leafKey).slice(0, args.terms);
  let keptAdd = 0; let minInf = args.minInformative; let allowAcc = args.allowAccessories;
  const seenCanon = new Set<string>();
  for(const term of terms){
    if(existing + keptAdd >= target) break;
    let batch = await fetchTerm(term, args.prefetch, false, args.debug);
    if(batch.length < Math.min(6, args.prefetch/2) && args.headless){
      const head = await fetchTerm(term, args.prefetch, true, args.debug); if(head.length > batch.length) batch = head;
    }
    // Progressive relax attempts per term
    const relaxStages: Array<{minInf:number; allowAcc:boolean}> = [{ minInf, allowAcc }];
    if(args.relax){
  case '--no-moq': r.noMoq=true; break;
  case '--relaxed': r.forceRelaxed=true; break; }
      if(minInf > 1) relaxStages.push({ minInf:1, allowAcc });
      if(!allowAcc) relaxStages.push({ minInf:1, allowAcc:true });
    }
    for(const stage of relaxStages){
      if(existing + keptAdd >= target) break;
      let filteredMoq=0, filteredQ=0, stageKept=0; const upserts:any[] = [];
      for(const it of batch){
        if(existing + keptAdd + stageKept >= target) break;
        if(!args.noMoq){ const m = String(it.moq||'').match(/(\d{1,5})/); if(m){ const v=Number(m[1]); if(Number.isFinite(v) && v<=1){ filteredMoq++; continue; }}
        const title = sanitizeTitle(it.title || 'Product');
        const cls = classify(title, term);
        if(!passesQuality(cls, { minInformative: stage.minInf, allowAccessories: stage.allowAcc, seen: seenCanon })) { filteredQ++; continue; }
        if(seenCanon.has(cls.canonicalKey)) continue; seenCanon.add(cls.canonicalKey);
        stageKept++;
        const termSlug = termToCategorySlug(term);
        upserts.push({ platform: it.platform || 'INDIAMART', url: it.url, title, image: (it as any).image || undefined, price: (it as any).price || undefined, currency: (it as any).currency || undefined, moq: (it as any).moq || undefined, storeName: it.storeName || undefined, description: it.description || undefined, categories: Array.from(new Set([leafKey, termSlug, ...(cls.groups||[])])), terms: Array.from(new Set([term, ...term.split(/\s+/g)])), rating: (it as any).rating || undefined, orders: (it as any).orders || undefined });
      }
      if(stageKept){ await upsertSavedListings(upserts as any); keptAdd += stageKept; if(args.debug) console.log(`[TOPOFF] leaf=${leafKey} term='${term}' stage minInf=${stage.minInf} allowAcc=${stage.allowAcc} kept=${stageKept} totalLeaf=${existing+keptAdd}`); }
    }
  }
  progress[leafKey] = { done: existing + keptAdd >= target, attempts: (progress[leafKey]?.attempts||0)+1 };
  return keptAdd;
}

async function main(){
  const args = parseArgs();
  const progress = await loadProgress(args.resume);
  let leaves = flattenIndiaMartLeaves();
  if(args.groupFilter){
    const allow = new Set<string>();
    for(const g of INDIAMART_CATEGORIES){ if(g.label.toLowerCase().includes(args.groupFilter)){ for(const sub of g.children||[]) for(const leaf of sub.leaves||[]) allow.add(leaf.key); } }
    leaves = leaves.filter(l => allow.has(l.key));
  }
  console.log(`[TOPOFF] scanning current counts ...`);
  const counts = await currentLeafCounts();
  const sparse = leaves.filter(l => (counts[l.key]||0) < args.minTarget);
  console.log(`[TOPOFF] leaves total=${leaves.length} sparse=${sparse.length} target=${args.minTarget}`);
  let added=0, processed=0; const queue = sparse.map(l => l.key);
  async function worker(id:number){
    while(queue.length){
      const key = queue.shift()!; processed++;
      if(progress[key]?.done){ if(args.debug) console.log(`[TOPOFF] skip leaf=${key} already done`); continue; }
      const delta = await topoffLeaf(key, counts[key]||0, args, progress);
      added += delta;
      if(args.resume) await saveProgress(args.resume, progress);
      if(args.debug) console.log(`[TOPOFF] worker=${id} (${processed}/${sparse.length}) leaf=${key} +${delta} (cumAdded=${added})`);
    }
  }
  const workers = Array.from({ length: args.concurrency }, (_, i) => worker(i+1));
  await Promise.all(workers);
  if(args.resume) await saveProgress(args.resume, progress);
  console.log(`[TOPOFF] done sparse=${sparse.length} added=${added}`);
}

main().catch(e => { console.error(e); process.exit(1); });
