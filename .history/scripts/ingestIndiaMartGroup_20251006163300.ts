#!/usr/bin/env ts-node
/**
 * Ingest all IndiaMART leaves (and optional subgroup label fallback terms) under a specified top-level taxonomy group.
 * Designed to preload listings so UI category clicks instantly show results.
 *
 * Usage:
 *   pnpm ts-node scripts/ingestIndiaMartGroup.ts --group "Building Construction Material & Equipment" --limit 180 --terms 2
 *
 * Flags:
 *   --group <label>         Exact (or case-insensitive) top-level group label (required)
 *   --limit <n>             Max listings per search term (default 160)
 *   --terms <n>             Max search terms per leaf (1-4) (default 2)
 *   --headless              Enable headless scraper mode (default false)
 *   --include-subgroups     Also search subgroup labels when a subgroup has zero leaves (default true)
 *   --dry                   Do not persist SavedListings
 *   --debug                 Verbose logging
 *   --min-informative <n>   Minimum informative tokens (default 2)
 *   --allow-accessories     Permit accessory/part style items (default false)
 */

import { INDIAMART_CATEGORIES, getIndiaMartSearchTerms } from '@/lib/indiamartCategories';
import { fetchIndiaMart } from '@/lib/providers/indiamart';
import { upsertSavedListings } from '@/lib/listingStore';
import { sanitizeTitle, classify, passesQuality } from '@/lib/quality/xrayQuality';
import { termToCategorySlug } from '@/lib/quality/termCategory';

interface Args { group: string; limit: number; terms: number; headless: boolean; includeSubgroups: boolean; dry: boolean; debug: boolean; minInformative: number; allowAccessories: boolean; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { group: '', limit: 160, terms: 2, headless: false, includeSubgroups: true, dry: false, debug: false, minInformative: 2, allowAccessories: false };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch(k){
      case '--group': args.group = String(take()||'').trim(); break;
      case '--limit': args.limit = Math.min(400, Math.max(40, Number(take())||160)); break;
      case '--terms': args.terms = Math.min(4, Math.max(1, Number(take())||2)); break;
      case '--headless': args.headless = true; break;
      case '--include-subgroups': args.includeSubgroups = true; break; // default already true
      case '--no-include-subgroups': args.includeSubgroups = false; break;
      case '--dry': args.dry = true; break;
      case '--debug': args.debug = true; break;
      case '--min-informative': args.minInformative = Math.max(0, Number(take())||2); break;
      case '--allow-accessories': args.allowAccessories = true; break;
    }
  }
  return args;
}

function findTopGroup(label: string) {
  const norm = label.toLowerCase();
  return INDIAMART_CATEGORIES.find(g => g.label.toLowerCase() === norm || g.label.toLowerCase().includes(norm));
}

async function ingestTerm(term: string, args: Args) {
  let items: any[] = [];
  try { items = await fetchIndiaMart(term, args.limit, { headless: args.headless, debug: args.debug }); } catch {}
  if (!items.length) return { kept: 0, filtered: { moq:0, quality:0 } };
  let filteredMoq=0, filteredQuality=0; const seenCanon = new Set<string>();
  const kept: any[] = [];
  for (const it of items) {
    const m = String(it.moq || '').match(/(\d{1,5})/);
    if (m) { const val = Number(m[1]); if (Number.isFinite(val) && val <= 1) { filteredMoq++; continue; } }
    const title = sanitizeTitle(it.title || 'Product');
    const cls = classify(title, term);
    if (!passesQuality(cls, { minInformative: args.minInformative, allowAccessories: args.allowAccessories, seen: seenCanon })) { filteredQuality++; continue; }
    seenCanon.add(cls.canonicalKey);
    kept.push({ it, title, groups: cls.groups });
  }
  return { kept: kept.length, filtered: { moq:filteredMoq, quality:filteredQuality }, keptItems: kept };
}

async function persist(keptItems: any[], leafKeyOrGroup: string, term: string) {
  if (!keptItems.length) return;
  const termSlug = termToCategorySlug(term);
  await upsertSavedListings(keptItems.map(k => ({
    platform: k.it.platform || 'INDIAMART',
    url: k.it.url,
    title: k.title,
    image: k.it.image || undefined,
    price: k.it.price || undefined,
    currency: k.it.currency || undefined,
    moq: k.it.moq || undefined,
    storeName: k.it.storeName || undefined,
    description: k.it.description || undefined,
    categories: Array.from(new Set([leafKeyOrGroup, termSlug, ...(k.groups||[])])),
    terms: Array.from(new Set([term]))
  })) as any);
}

async function main(){
  const args = parseArgs();
  if (!args.group) { console.error('Provide --group "<Top Level Group Label>"'); process.exit(1); }
  const grp = findTopGroup(args.group);
  if (!grp) { console.error(`Group not found: ${args.group}`); process.exit(1); }
  console.log(`[IM-GROUP] start group='${grp.label}' limit=${args.limit} terms=${args.terms} headless=${args.headless} includeSubgroups=${args.includeSubgroups} minInf=${args.minInformative}`);

  // Collect tasks: each leaf key with its ordered search terms; optionally subgroup labels with zero leaves.
  const tasks: Array<{ leafKey: string; term: string; type: 'leaf' | 'subgroup'; }> = [];
  for (const sub of grp.children || []) {
    if (sub.leaves && sub.leaves.length) {
      for (const leaf of sub.leaves) {
        const terms = getIndiaMartSearchTerms(leaf.key).slice(0, args.terms);
        for (const t of terms) tasks.push({ leafKey: leaf.key, term: t, type: 'leaf' });
      }
    } else if (args.includeSubgroups) {
      // Fallback: use subgroup label itself as a term to seed some listings
      const labelTerm = sub.label;
      tasks.push({ leafKey: sub.key, term: labelTerm, type: 'subgroup' });
    }
  }
  console.log(`[IM-GROUP] tasks=${tasks.length}`);
  let totalKept=0, totalFilteredMoq=0, totalFilteredQuality=0; let processed=0;
  for (const task of tasks) {
    processed++;
    const r = await ingestTerm(task.term, args);
    if (r.keptItems && r.keptItems.length && !args.dry) await persist(r.keptItems, task.leafKey, task.term);
    totalKept += r.kept || 0; totalFilteredMoq += r.filtered.moq; totalFilteredQuality += r.filtered.quality;
    console.log(`[IM-GROUP] (${processed}/${tasks.length}) ${task.type} key='${task.leafKey}' term='${task.term}' kept=${r.kept} filtered={moq:${r.filtered.moq},quality:${r.filtered.quality}} cumKept=${totalKept}`);
  }
  console.log(`[IM-GROUP] done group='${grp.label}' tasks=${tasks.length} kept=${totalKept} filteredTotals={moq:${totalFilteredMoq},quality:${totalFilteredQuality}}`);
}

main().catch(e => { console.error(e); process.exit(1); });
