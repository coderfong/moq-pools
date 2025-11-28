#!/usr/bin/env ts-node
/**
 * ingestIndiaMartZeroBooster.ts
 * Purpose: Aggressively attempt to populate stubborn IndiaMART leaves whose listing counts remain
 *          at or below a threshold even after bulk/sparse/topoff. Generates synthetic search terms
 *          (token variants, plural/singular, pairwise combos) to discover additional listings.
 *
 * Strategy:
 *   1. Load all leaves + current counts; select those with count <= --max-current.
 *   2. Generate an expanded term set per leaf:
 *        - Base leaf.term
 *        - Leaf.label tokens (stopword filtered)
 *        - Aliases & their tokens
 *        - Plural/singular variants (naive 's' add/remove) for medium-length tokens
 *        - Pairwise combinations (if --combos > 0)
 *   3. Deduplicate, truncate to --terms-cap.
 *   4. For each term, fetch (static) then headless fallback if sparse.
 *   5. Apply staged relaxation (or immediate relaxed) with MOQ filter optionally disabled.
 *   6. Upsert kept listings; stop when --target for leaf achieved or terms exhausted.
 *
 * Flags:
 *   --target <n>           Desired kept per leaf (default 6)
 *   --max-current <n>      Include leaves with count <= n (default 1)
 *   --limit-leaves <n>     Cap leaves processed (default 120)
 *   --prefetch <n>         Fetch size per term attempt (default 70)
 *   --min-informative <n>  Starting informative threshold (default 2)
 *   --terms-cap <n>        Max generated terms per leaf (default 18)
 *   --tokens-max <n>       Max base tokens (label/alias tokens) to consider before combos (default 8)
 *   --combos <n>           0=disabled, 1=add pair combos only, 2=add pair + triple combos (default 1)
 *   --headless             Enable headless fallback (default true)
 *   --no-headless          Disable headless fallback
 *   --no-moq               Remove MOQ <=1 filter
 *   --relaxed              Immediate relaxed mode (minInf=1, accessories)
 *   --concurrency <n>      Parallel leaf workers (default 6)
 *   --dry                  Do not persist (simulate)
 *   --debug                Verbose logging
 */
import { flattenIndiaMartLeaves } from '../src/lib/indiamartCategories';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { upsertSavedListings } from '../src/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '../src/lib/quality/xrayQuality';
import { termToCategorySlug } from '../src/lib/quality/termCategory';
import { prisma } from '../src/lib/prisma';

interface Args { target:number; maxCurrent:number; limitLeaves:number; prefetch:number; minInformative:number; termsCap:number; tokensMax:number; combos:number; headless:boolean; noMoq:boolean; relaxed:boolean; concurrency:number; dry:boolean; debug:boolean; }
function parseArgs(): Args { const a=process.argv.slice(2); const r:Args={ target:6, maxCurrent:1, limitLeaves:120, prefetch:70, minInformative:2, termsCap:18, tokensMax:8, combos:1, headless:true, noMoq:false, relaxed:false, concurrency:6, dry:false, debug:false }; const take=()=>a.shift(); while(a.length){ const k=take(); if(!k) break; switch(k){
  case '--target': r.target=Math.max(1,Number(take())||6); break;
  case '--max-current': r.maxCurrent=Math.max(0,Number(take())||1); break;
  case '--limit-leaves': r.limitLeaves=Math.max(1,Number(take())||120); break;
  case '--prefetch': r.prefetch=Math.min(150,Math.max(20,Number(take())||70)); break;
  case '--min-informative': r.minInformative=Math.max(0,Number(take())||2); break;
  case '--terms-cap': r.termsCap=Math.min(40,Math.max(4,Number(take())||18)); break;
  case '--tokens-max': r.tokensMax=Math.min(20,Math.max(2,Number(take())||8)); break;
  case '--combos': r.combos=Math.min(2,Math.max(0,Number(take())||1)); break;
  case '--headless': r.headless=true; break;
  case '--no-headless': r.headless=false; break;
  case '--no-moq': r.noMoq=true; break;
  case '--relaxed': r.relaxed=true; break;
  case '--concurrency': r.concurrency=Math.min(16,Math.max(1,Number(take())||6)); break;
  case '--dry': r.dry=true; break;
  case '--debug': r.debug=true; break;
 }} return r; }

async function currentCounts(): Promise<Record<string,number>> { const leaves=flattenIndiaMartLeaves(); const out:Record<string,number>={}; for(const l of leaves){ out[l.key]=await prisma.savedListing.count({ where:{ platform:'INDIAMART' as any, categories:{ has:l.key } } }); } return out; }

function tokenize(str:string): string[] { return (str||'').toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>=3 && !STOP.has(t)); }
const STOP=new Set(['and','the','for','with','from','your','you','are','can','all','any','new','hot','best','top','get','buy']);

function pluralize(tok:string){ if(tok.endsWith('s')) return tok; return tok+'s'; }
function singularize(tok:string){ if(tok.endsWith('s') && tok.length>3) return tok.slice(0,-1); return tok; }

function genTerms(leaf: ReturnType<typeof flattenIndiaMartLeaves>[number], args:Args): string[] {
  const base = new Set<string>();
  if(leaf.term) base.add(leaf.term.toLowerCase());
  if(leaf.label) base.add(leaf.label.toLowerCase());
  for(const al of leaf.aliases||[]) base.add(al.toLowerCase());
  // Tokenize
  const tokens: string[] = [];
  for(const raw of Array.from(base)) for(const t of tokenize(raw)) { tokens.push(t); }
  const uniqTokens = Array.from(new Set(tokens)).slice(0, args.tokensMax);
  const variants: string[] = [];
  for(const t of uniqTokens){
    variants.push(t);
    const plural = pluralize(t); if(plural!==t) variants.push(plural);
    const sing = singularize(t); if(sing!==t) variants.push(sing);
  }
  const comboSet = new Set<string>();
  if(args.combos>=1){
    for(let i=0;i<uniqTokens.length;i++) for(let j=i+1;j<uniqTokens.length;j++){ const c=`${uniqTokens[i]} ${uniqTokens[j]}`; comboSet.add(c); }
  }
  if(args.combos>=2){
    for(let i=0;i<uniqTokens.length;i++) for(let j=i+1;j<uniqTokens.length;j++) for(let k=j+1;k<uniqTokens.length;k++){ const c=`${uniqTokens[i]} ${uniqTokens[j]} ${uniqTokens[k]}`; comboSet.add(c); }
  }
  const all = new Set<string>();
  for(const b of base) all.add(b);
  for(const v of variants) all.add(v);
  for(const c of comboSet) all.add(c);
  return Array.from(all).filter(t=>t.length>=3).slice(0, args.termsCap);
}

async function fetchTerm(term:string, limit:number, headless:boolean, debug:boolean){
  try { return await fetchIndiaMart(term, limit, { headless, debug }); } catch(e){ if(debug) console.warn('[ZERO] fetch error', term, e); return []; }
}

async function processLeaf(leaf: ReturnType<typeof flattenIndiaMartLeaves>[number], existing:number, args:Args){
  if(existing >= args.target) return 0;
  const terms = genTerms(leaf, args);
  if(args.debug) console.log(`[ZERO] leaf=${leaf.key} existing=${existing} genTerms=${terms.length}`);
  const seenCanon = new Set<string>();
  let added=0; const target=args.target;
  for(const term of terms){
    if(existing + added >= target) break;
    let batch = await fetchTerm(term, args.prefetch, false, args.debug);
    if(batch.length < Math.min(5, args.prefetch/3) && args.headless){
      const h = await fetchTerm(term, args.prefetch, true, args.debug); if(h.length > batch.length) batch = h;
    }
    const relaxStages: Array<{ minInf:number; allowAcc:boolean }> = args.relaxed
      ? [{ minInf:1, allowAcc:true }]
      : [{ minInf: args.minInformative, allowAcc:false }, ...(args.minInformative>1 ? [{ minInf:1, allowAcc:false }] : []), { minInf:1, allowAcc:true }];
    for(const stage of relaxStages){
      if(existing + added >= target) break;
      let stageKept=0; const upserts:any[] = [];
      for(const it of batch){
        if(existing + added + stageKept >= target) break;
        if(!args.noMoq){ const m = String(it.moq||'').match(/(\d{1,5})/); if(m){ const v=Number(m[1]); if(Number.isFinite(v) && v<=1) continue; }}
        const title = sanitizeTitle(it.title||'Product');
        const cls = classify(title, term);
        if(!passesQuality(cls,{ minInformative: stage.minInf, allowAccessories: stage.allowAcc, seen: seenCanon })) continue;
        if(seenCanon.has(cls.canonicalKey)) continue; seenCanon.add(cls.canonicalKey);
        stageKept++;
        const termSlug = termToCategorySlug(term);
        upserts.push({ platform: it.platform||'INDIAMART', url: it.url, title, image: (it as any).image||undefined, price:(it as any).price||undefined, currency:(it as any).currency||undefined, moq:(it as any).moq||undefined, storeName: it.storeName||undefined, description: it.description||undefined, categories: Array.from(new Set([leaf.key, termSlug, ...(cls.groups||[])])), terms: Array.from(new Set([term, ...term.split(/\s+/g)])), rating:(it as any).rating||undefined, orders:(it as any).orders||undefined });
      }
      if(stageKept){ if(!args.dry) await upsertSavedListings(upserts as any); added += stageKept; if(args.debug) console.log(`[ZERO] leaf=${leaf.key} term='${term}' stage minInf=${stage.minInf} allowAcc=${stage.allowAcc} +${stageKept} total=${existing+added}`); }
    }
  }
  return added;
}

async function main(){
  const args = parseArgs();
  if(args.relaxed && args.minInformative>1) args.minInformative=1;
  console.log(`[ZERO] start target=${args.target} maxCurrent=${args.maxCurrent} limitLeaves=${args.limitLeaves} prefetch=${args.prefetch} minInf=${args.minInformative} noMoq=${args.noMoq} relaxed=${args.relaxed} concurrency=${args.concurrency}`);
  const leaves = flattenIndiaMartLeaves();
  const counts = await currentCounts();
  const focus = leaves.filter(l => (counts[l.key]||0) <= args.maxCurrent).slice(0, args.limitLeaves);
  console.log(`[ZERO] focusLeaves=${focus.length}`);
  let totalAdded=0; let processed=0; const queue = focus.slice();
  async function worker(id:number){
    while(queue.length){
      const leaf = queue.shift()!; processed++;
      const existing = counts[leaf.key]||0;
      const delta = await processLeaf(leaf, existing, args);
      totalAdded += delta;
      console.log(`[ZERO] worker=${id} (${processed}/${focus.length}) leaf=${leaf.key} existing=${existing} added=${delta} cumAdded=${totalAdded}`);
    }
  }
  await Promise.all(Array.from({length: args.concurrency}, (_,i)=>worker(i+1)));
  console.log(`[ZERO] done focus=${focus.length} added=${totalAdded}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
