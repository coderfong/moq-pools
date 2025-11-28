#!/usr/bin/env ts-node
/**
 * Ingest listings for specified top-level IndiaMART categories (and optional subcategory expansion)
 * using export category pages + fallback IndiaMART search, quality filters, and categorization.
 *
 * Usage:
 *   pnpm ts-node scripts/ingestIndiaMartTopCategories.ts --cats "Hospital and Medical Equipment|Industrial Plants, Machinery & Equipment" \
 *     --depth 1 --limit 140 --page-limit 120 --min-informative 2
 *
 * Flags:
 *   --cats            Pipe/comma separated category labels (exact or partial match on stored ExportCategory.label)
 *   --depth           Subcategory BFS depth (default 0 = only given categories)
 *   --limit           Max items per search term attempt (default 140)
 *   --page-limit      Pagination depth for direct IndiaMART fetch before export fallback (default 120)
 *   --min-informative Min informative token threshold (default 2)
 *   --allow-accessories Allow accessory inclusion (default false)
 *   --detail          Attempt export product detail enrichment for first few items when using export fallback
 *   --per-detail      Number of detail pages to fetch when --detail enabled (default 5)
 *   --debug           Verbose logging
 *   --dry             Do not persist (just simulate counters)
 */

import { prisma } from '../src/lib/prisma';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { fetchExportCategoryPage, fetchExportProductDetail } from '../src/lib/providers/indiamartExport';
import { upsertSavedListings } from '../src/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '../src/lib/quality/xrayQuality';
import { termToCategorySlug } from '../src/lib/quality/termCategory';

interface Args { cats: string[]; depth: number; limit: number; pageLimit: number; minInformative: number; allowAccessories: boolean; detail: boolean; perDetail: number; debug: boolean; dry: boolean; suggest: boolean; fallbackSearch: boolean; minSim: number; topSuggest: number; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { cats: [], depth: 0, limit: 140, pageLimit: 120, minInformative: 2, allowAccessories: false, detail: false, perDetail: 5, debug: false, dry: false, suggest: false, fallbackSearch: false, minSim: 0.25, topSuggest: 8 };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch(k){
      case '--cats': {
        const raw = String(take()||'').trim();
        if (raw.includes('|')) {
          args.cats = raw.split('|').map(s=>s.trim()).filter(Boolean);
        } else if (raw.includes('||')) { // edge: double pipe accidental
          args.cats = raw.split('||').map(s=>s.trim()).filter(Boolean);
        } else if (!raw.includes('|') && raw.includes('±')) { // placeholder for exotic delim (future)
          args.cats = raw.split('±').map(s=>s.trim()).filter(Boolean);
        } else if (!raw.includes('|')) {
          // Fallback: split on comma ONLY if we think it's a list of short tokens (avoid breaking long category names with commas & ampersands)
          const parts = raw.split(',').map(p=>p.trim()).filter(Boolean);
          if (parts.length > 1 && parts.every(p => p.length < 60)) {
            args.cats = parts;
          } else {
            args.cats = [raw];
          }
        }
        break;
      }
      case '--depth': args.depth = Math.max(0, Number(take())||0); break;
      case '--limit': args.limit = Math.max(20, Number(take())||140); break;
      case '--page-limit': args.pageLimit = Math.max(20, Number(take())||120); break;
      case '--min-informative': args.minInformative = Math.max(0, Number(take())||2); break;
      case '--allow-accessories': args.allowAccessories = true; break;
      case '--detail': args.detail = true; break;
      case '--per-detail': args.perDetail = Math.max(1, Number(take())||5); break;
      case '--debug': args.debug = true; break;
      case '--dry': args.dry = true; break;
      case '--suggest': args.suggest = true; break;
      case '--fallback-search': args.fallbackSearch = true; break;
      case '--min-sim': args.minSim = Math.max(0, Math.min(1, Number(take())||0.25)); break;
      case '--top-suggest': args.topSuggest = Math.max(1, Number(take())||8); break;
    }
  }
  return args;
}

const STOP = new Set(['and','the','of','for','with','to','in','a','an','&','products','product','equipment','supplies','material','materials']);

function tokenize(label: string): string[] {
  return label.toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .split(/\s+/)
    .filter(t => t && !STOP.has(t));
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a); const B = new Set(b);
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
}

async function expandCategories(labels: string[], depth: number, debug: boolean, opts: { suggest: boolean; minSim: number; topSuggest: number; fallbackSearch: boolean; }): Promise<{ matched: string[]; fallbackTerms: string[]; suggestions?: Record<string, Array<{label:string;score:number}>> }> {
  const p: any = prisma as any;
  if (!p.exportCategory?.findMany) return { matched: [], fallbackTerms: [], suggestions: {} };
  const all: Array<{ label: string; parentLabel: string | null }> = await p.exportCategory.findMany({ select: { label: true, parentLabel: true } });
  const allTokens = all.map(r => ({ label: r.label, tokens: tokenize(r.label) }));
  const start = new Set<string>();
  const suggestions: Record<string, Array<{label:string;score:number}>> = {};
  const fallbackTerms: string[] = [];
  for (const req of labels) {
    const reqTokens = tokenize(req);
    const scored = allTokens
      .map(at => ({ label: at.label, score: jaccard(reqTokens, at.tokens) }))
      .filter(x => x.score > 0)
      .sort((a,b)=> b.score - a.score);
    suggestions[req] = scored.slice(0, opts.topSuggest);
    for (const s of scored) if (s.score >= opts.minSim) start.add(s.label);
    if (!scored.length && opts.fallbackSearch) fallbackTerms.push(req);
  }
  if (opts.suggest) return { matched: Array.from(start), fallbackTerms, suggestions };
  if (!start.size && !fallbackTerms.length) return { matched: [], fallbackTerms, suggestions };
  if (depth <= 0) return { matched: Array.from(start), fallbackTerms, suggestions };
  // Build adjacency
  const childrenMap = new Map<string, string[]>();
  for (const r of all) {
    if (!r.parentLabel) continue;
    if (!childrenMap.has(r.parentLabel)) childrenMap.set(r.parentLabel, []);
    childrenMap.get(r.parentLabel)!.push(r.label);
  }
  const frontier = Array.from(start);
  const visited = new Set(frontier);
  for (let d = 0; d < depth; d++) {
    const layer = frontier.splice(0, frontier.length);
    for (const cat of layer) {
      const kids = childrenMap.get(cat) || [];
      for (const c of kids) if (!visited.has(c)) { visited.add(c); frontier.push(c); }
    }
  }
  return { matched: Array.from(visited), fallbackTerms, suggestions };
}

async function ingestTerm(term: string, args: Args) {
  let listings: any[] = [];
  try {
    listings = await fetchIndiaMart(term, args.pageLimit, { headless:false, forceHeadless:false, debug: args.debug });
  } catch {}
  if (!listings.length) {
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
  if (!listings.length) return { saved: 0, filtered: { moq:0, quality:0 } };
  let filteredMoq=0, filteredQuality=0; const seenCanon = new Set<string>();
  const kept: any[] = [];
  for (const l of listings) {
    const m = String(l.moq || '').match(/(\d{1,5})/);
    if (m) { const val = Number(m[1]); if (Number.isFinite(val) && val <= 1) { filteredMoq++; continue; } }
    const title = sanitizeTitle(l.title || 'Product');
    const cls = classify(title, term);
    if (!passesQuality(cls, { minInformative: args.minInformative, allowAccessories: args.allowAccessories, seen: seenCanon })) { filteredQuality++; continue; }
    seenCanon.add(cls.canonicalKey);
    kept.push({ l, title, groups: cls.groups });
  }
  if (!kept.length) return { saved: 0, filtered: { moq:filteredMoq, quality:filteredQuality } };
  const termSlug = termToCategorySlug(term);
  if (!args.dry) {
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
  return { saved: kept.length, filtered: { moq: filteredMoq, quality: filteredQuality } };
}

async function main() {
  const args = parseArgs();
  if (!args.cats.length) {
    console.error('Provide --cats "Category A|Category B"');
    process.exit(1);
  }
  const { matched, fallbackTerms, suggestions } = await expandCategories(args.cats, args.depth, args.debug, { suggest: args.suggest, minSim: args.minSim, topSuggest: args.topSuggest, fallbackSearch: args.fallbackSearch });
  if (args.suggest) {
    console.log('[IM-TOP-CATS] Suggestions:');
    for (const req of args.cats) {
      const list = suggestions?.[req] || [];
      console.log(`  > ${req}`);
      if (!list.length) { console.log('    (no similar export categories)'); continue; }
      for (const s of list) console.log(`    - ${s.label} (score=${s.score.toFixed(2)})`);
    }
    process.exit(0);
  }
  if (!matched.length && !fallbackTerms.length) {
    console.error('No categories matched and no fallback terms. Use --suggest to inspect candidates.');
    process.exit(1);
  }
  const ingestTerms = [...matched];
  if (fallbackTerms.length) {
    console.log(`[IM-TOP-CATS] Fallback to raw search terms (no category match): ${fallbackTerms.join(', ')}`);
    ingestTerms.push(...fallbackTerms);
  }
  console.log(`[IM-TOP-CATS] start categories=${matched.length} fallbackTerms=${fallbackTerms.length} depth=${args.depth} limit=${args.limit} pageLimit=${args.pageLimit} minInf=${args.minInformative} allowAcc=${args.allowAccessories} minSim=${args.minSim}`);
  let totalSaved=0, totalFilteredMoq=0, totalFilteredQuality=0;
  for (const term of ingestTerms.slice(0, args.limit)) { // reuse --limit to cap number of category terms processed
    const { saved, filtered } = await ingestTerm(term, args);
    totalSaved += saved; totalFilteredMoq += filtered.moq; totalFilteredQuality += filtered.quality;
    console.log(`[IM-TOP-CATS] term='${term}' saved=${saved} filtered={moq:${filtered.moq},quality:${filtered.quality}} cumSaved=${totalSaved}`);
  }
  console.log(`[IM-TOP-CATS] done termsProcessed=${Math.min(ingestTerms.length, args.limit)} saved=${totalSaved} filteredTotals={moq:${totalFilteredMoq},quality:${totalFilteredQuality}}`);
  await prisma.$disconnect();
}

main();
