#!/usr/bin/env ts-node
/**
 * validateAndTopoffPerSubcategory.ts
 * Ensures each IndiaMART subcategory (leaf) has at least N listings in SavedListing,
 * excluding listings with banned keywords (custom/services, etc.). Optionally attempts top-off.
 */
import { flattenIndiaMartLeaves } from '../src/lib/indiamartCategories';
import { prisma } from '../src/lib/prisma';
import { fetchIndiaMart } from '../src/lib/providers/indiamart';
import { upsertSavedListings } from '../src/lib/listingStore';
import { isExcludedByKeywords } from '../src/lib/quality/textFilters';

interface Args { min:number; headless:boolean; tryTopoff:boolean; maxPerLeaf:number; debug:boolean; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const r: Args = { min: 300, headless: true, tryTopoff: false, maxPerLeaf: 480, debug: false };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch (k) {
      case '--min': r.min = Math.min(1000, Math.max(10, Number(take())||300)); break;
      case '--headless': r.headless = /^(1|true|yes|y)$/i.test(String(take())); break;
      case '--topoff': r.tryTopoff = true; break;
      case '--max-per-leaf': r.maxPerLeaf = Math.min(1000, Math.max(40, Number(take())||480)); break;
      case '--debug': r.debug = true; break;
    }
  }
  return r;
}

const MODIFIERS = ['wholesale','bulk','supplier','factory','manufacturer','oem','odm','ready to ship','in stock','2024','best','cheap','top'];

async function countLeaf(leafKey: string): Promise<number> {
  const p: any = prisma as any;
  if (!p?.savedListing?.count) return 0;
  return await p.savedListing.count({ where: { platform: 'INDIAMART' as any, categories: { has: leafKey } } });
}

async function topoffLeaf(leafKey: string, baseTerm: string, deficit: number, args: Args) {
  const modifiers = [...MODIFIERS];
  // Shuffle to diversify
  for (let i = modifiers.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [modifiers[i], modifiers[j]] = [modifiers[j], modifiers[i]]; }
  const seen = new Set<string>();
  let added = 0;
  for (const m of modifiers) {
    if (added >= deficit) break;
    const q = `${baseTerm} ${m}`.trim();
    let batch: any[] = [];
    try { batch = await fetchIndiaMart(q, Math.min(args.maxPerLeaf, 240), { headless: args.headless }); } catch {}
    if (!batch?.length) continue;
    const keep = batch.filter((it) => {
      if (!it?.url) return false;
      if (seen.has(it.url)) return false; seen.add(it.url);
      return !isExcludedByKeywords(it.title, it.description).excluded;
    });
    if (!keep.length) continue;
    await upsertSavedListings(keep.map((it) => ({
      platform: it.platform,
      url: it.url,
      title: it.title || 'Product',
      image: it.image || undefined,
      price: it.price || undefined,
      currency: it.currency || undefined,
      moq: it.moq || undefined,
      storeName: it.storeName || undefined,
      description: it.description || undefined,
      categories: [leafKey],
      terms: Array.from(new Set(q.split(/\s+/g))),
      rating: it.rating || undefined,
      orders: it.orders || undefined,
    })));
    added += keep.length;
    if (args.debug) console.log(`[TOP] ${leafKey} q='${q}' +${keep.length} (cum ${added}/${deficit})`);
  }
  return added;
}

async function main() {
  const args = parseArgs();
  const leaves = flattenIndiaMartLeaves();
  const shortfalls: Array<{ leaf: string; count: number }> = [];
  for (const leaf of leaves) {
    const c = await countLeaf(leaf.key);
    if (c < args.min) shortfalls.push({ leaf: leaf.key, count: c });
  }
  if (!shortfalls.length) { console.log(`All ${leaves.length} leaves meet min ${args.min}.`); return; }
  console.log(`Leaves below ${args.min}: ${shortfalls.length}/${leaves.length}`);
  if (!args.tryTopoff) {
    for (const s of shortfalls.slice(0, 50)) console.log(` - ${s.leaf}: ${s.count}`);
    return;
  }
  let totalAdded = 0;
  for (const s of shortfalls) {
    const deficit = args.min - s.count;
    const baseTerm = s.leaf.replace(/-/g, ' ');
    const delta = await topoffLeaf(s.leaf, baseTerm, deficit, args);
    totalAdded += delta;
  }
  console.log(`Topoff done. Added ${totalAdded} listings.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
