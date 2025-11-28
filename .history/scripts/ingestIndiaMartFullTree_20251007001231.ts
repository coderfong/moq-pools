#!/usr/bin/env ts-node
/**
 * ingestIndiaMartFullTree.ts
 * High-volume ingestion across ALL top-level IndiaMART taxonomy groups and their leaves.
 * Combines strategies from group + live scripts with configurable concurrency, resume, and
 * adaptive escalation. Intended to dramatically increase SavedListing density per category.
 *
 * Features:
 *  - Walk every top-level group, every subgroup, every leaf.
 *  - For each leaf: ordered terms via getIndiaMartSearchTerms.
 *  - Prefetch probe (like live script) + optional escalation to larger limit.
 *  - Optional second-pass headless fallback only when static is sparse.
 *  - Concurrency control at term level.
 *  - Resume file storing per leaf kept count + per term progress to skip already-done work.
 *  - Quality filtering identical to other scripts (informative tokens, accessory gating, MOQ > 1).
 *
 * Usage Examples:
 *   pnpm ts-node scripts/ingestIndiaMartFullTree.ts --limit 260 --terms 3 --concurrency 6 --prefetch 70 --threshold 35 --resume im.full.progress.json --headless
 *   pnpm ts-node scripts/ingestIndiaMartFullTree.ts --limit 320 --terms 4 --allow-accessories --min-informative 1 --resume im.full.progress.json
 */

import { INDIAMART_CATEGORIES, getIndiaMartSearchTerms, flattenIndiaMartLeaves } from '@/lib/indiamartCategories';
import { fetchIndiaMart } from '@/lib/providers/indiamart';
import { upsertSavedListings } from '@/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '@/lib/quality/xrayQuality';
import { termToCategorySlug } from '@/lib/quality/termCategory';
import fs from 'node:fs/promises';

interface Args { limit:number; terms:number; prefetch:number; threshold:number; floor:number; concurrency:number; headless:boolean; minInformative:number; allowAccessories:boolean; debug:boolean; resume?:string; maxLeaves?:number; forceHeadless:boolean; groupFilter?:string; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const r: Args = { limit:260, terms:3, prefetch:60, threshold:30, floor:10, concurrency:5, headless:false, minInformative:2, allowAccessories:false, debug:false, forceHeadless:false } as any;
  const take = () => a.shift();
  while(a.length){ const k = take(); if(!k) break; switch(k){
    case '--limit': r.limit = Math.min(500, Math.max(60, Number(take())||260)); break;
    case '--terms': r.terms = Math.min(6, Math.max(1, Number(take())||3)); break;
    case '--prefetch': r.prefetch = Math.min(120, Math.max(20, Number(take())||60)); break;
    case '--threshold': r.threshold = Math.min(r.prefetch, Math.max(5, Number(take())||30)); break;
    case '--floor': r.floor = Math.min(r.threshold, Math.max(1, Number(take())||10)); break;
    case '--concurrency': r.concurrency = Math.min(16, Math.max(1, Number(take())||5)); break;
    case '--headless': r.headless = true; break;
    case '--force-headless': r.forceHeadless = true; break;
    case '--min-informative': r.minInformative = Math.max(0, Number(take())||2); break;
    case '--allow-accessories': r.allowAccessories = true; break;
    case '--debug': r.debug = true; break;
    case '--resume': r.resume = String(take()||'').trim(); break;
    case '--max-leaves': r.maxLeaves = Math.max(1, Number(take())||1); break;
    case '--group-filter': r.groupFilter = String(take()||'').toLowerCase(); break;
  }}
  return r;
}

interface LeafProgress { kept:number; termsDone:string[]; }
interface Progress { [leafKey:string]: LeafProgress; }
async function loadProgress(file?:string): Promise<Progress>{ if(!file) return {}; try { return JSON.parse(await fs.readFile(file,'utf8')||'{}'); } catch { return {}; } }
async function saveProgress(file:string, prog:Progress){ try { await fs.writeFile(file, JSON.stringify(prog,null,2)); } catch {} }

interface FetchedItem { platform:string; url:string; title:string; image?:string; price?:string; currency?:string; moq?:string|number; storeName?:string; description?:string; rating?:string; orders?:string; }

async function fetchTerm(term:string, prefetch:number, limit:number, opts:{headless:boolean; forceHeadless:boolean; debug:boolean;}): Promise<FetchedItem[]> {
  let items: FetchedItem[] = [];
  try { items = await fetchIndiaMart(term, prefetch, { headless:false, debug:opts.debug }); } catch {}
  if(opts.debug) console.log(`[FULL] prefetch term='${term}' got=${items.length}`);
  if(items.length === 0 && (opts.headless || opts.forceHeadless)) {
    try { const retry = await fetchIndiaMart(term, prefetch, { headless:true, debug:opts.debug, forceHeadless:true }); if(retry.length) { items = retry; if(opts.debug) console.log(`[FULL] headless recovery ${retry.length}`);} } catch {}
  }
  if(items.length >= prefetch && prefetch < limit) {
    // Escalate if we haven't hit limit.
    try { const more = await fetchIndiaMart(term, limit, { headless: opts.headless, debug: opts.debug }); if(more.length > items.length) items = more; } catch {}
  }
  return items;
}

async function processLeaf(leafKey:string, terms:string[], args:Args, prog:Progress){
  const entry = prog[leafKey] || { kept:0, termsDone:[] };
  const seenCanon = new Set<string>();
  let leafKept = entry.kept;
  for(const term of terms){
    if(leafKept >= args.limit) break;
    if(entry.termsDone.includes(term)) continue; // already processed this term
    const preItems = await fetchTerm(term, args.prefetch, args.limit, { headless: args.headless, forceHeadless: args.forceHeadless, debug: args.debug });
    // Decide batch composition based on threshold logic
    let full: FetchedItem[] = [];
    if(preItems.length === 0) { entry.termsDone.push(term); continue; }
    if(preItems.length < args.threshold) {
      if(preItems.length >= args.floor) full = preItems; else { entry.termsDone.push(term); continue; }
    } else full = preItems;
    let filteredMoq=0, filteredQuality=0, keptBatch=0; const upserts: any[] = [];
    for(const it of full){
      if(leafKept + keptBatch >= args.limit) break;
      const m = String(it.moq||'').match(/(\d{1,5})/); if(m){ const v = Number(m[1]); if(Number.isFinite(v) && v <= 1){ filteredMoq++; continue; }}
      const title = sanitizeTitle(it.title || 'Product');
      const cls = classify(title, term);
      if(!passesQuality(cls, { minInformative: args.minInformative, allowAccessories: args.allowAccessories, seen: seenCanon })) { filteredQuality++; continue; }
      if(seenCanon.has(cls.canonicalKey)) continue; seenCanon.add(cls.canonicalKey);
      keptBatch++;
      const termSlug = termToCategorySlug(term);
      upserts.push({
        platform: it.platform || 'INDIAMART', url: it.url, title,
        image: (it as any).image || undefined, price: (it as any).price || undefined,
        currency: (it as any).currency || undefined, moq: (it as any).moq || undefined,
        storeName: it.storeName || undefined, description: it.description || undefined,
        categories: Array.from(new Set([leafKey, termSlug, ...(cls.groups||[])])),
        terms: Array.from(new Set([term, ...term.split(/\s+/g)])),
        rating: (it as any).rating || undefined, orders: (it as any).orders || undefined,
      });
    }
    if(keptBatch){ await upsertSavedListings(upserts as any); leafKept += keptBatch; }
    entry.kept = leafKept; entry.termsDone.push(term);
    if(args.debug) console.log(`[FULL] leaf=${leafKey} term='${term}' keptBatch=${keptBatch} leafKept=${leafKept}`);
    if(args.resume) await saveProgress(args.resume, prog);
  }
  prog[leafKey] = entry;
  return leafKept;
}

async function main(){
  const args = parseArgs();
  const prog = await loadProgress(args.resume);
  // Collect all leaves (optionally filter by top-level group label substring)
  let leaves = flattenIndiaMartLeaves();
  if(args.groupFilter){
    const allowed = new Set<string>();
    for(const g of INDIAMART_CATEGORIES){
      if(g.label.toLowerCase().includes(args.groupFilter)){ for(const sub of g.children||[]) for(const leaf of sub.leaves||[]) allowed.add(leaf.key); }
    }
    leaves = leaves.filter(l => allowed.has(l.key));
  }
  if(args.maxLeaves) leaves = leaves.slice(0, args.maxLeaves);
  console.log(`[FULL] start leaves=${leaves.length} limit=${args.limit} terms=${args.terms} concurrency=${args.concurrency} headless=${args.headless} threshold=${args.threshold}`);
  let globalKept = 0; let index = 0;
  const queue = leaves.map(l => l.key);
  async function worker(id:number){
    while(queue.length){
      const leafKey = queue.shift()!; index++;
      const terms = getIndiaMartSearchTerms(leafKey).slice(0, args.terms);
      const before = prog[leafKey]?.kept || 0;
      const after = await processLeaf(leafKey, terms, args, prog);
      globalKept += Math.max(0, after - before);
      if(args.debug) console.log(`[FULL] worker=${id} (${index}/${leaves.length}) leaf=${leafKey} delta=${after-before} totalKept=${globalKept}`);
    }
  }
  const workers = Array.from({ length: args.concurrency }, (_, i) => worker(i+1));
  await Promise.all(workers);
  if(args.resume) await saveProgress(args.resume, prog);
  console.log(`[FULL] done leaves=${leaves.length} added=${globalKept}`);
}

main().catch(e => { console.error(e); process.exit(1); });
