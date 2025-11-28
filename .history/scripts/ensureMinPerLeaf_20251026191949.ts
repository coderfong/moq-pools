#!/usr/bin/env ts-node
/**
 * ensureMinPerLeaf.ts
 * Ensure each featured sub-subcategory (leaf) in categories.data has at least N listings
 * for a given platform (ALIBABA or MADE_IN_CHINA). Excludes banned keywords (custom/service).
 * Optionally caches images to /public/cache while ingesting.
 *
 * Usage examples:
 *  - pnpm run alibaba:min300
 *  - pnpm run mic:min300
 *  - cross-env TS_NODE_PROJECT=tsconfig.scripts.json node -r ts-node/register -r tsconfig-paths/register scripts/ensureMinPerLeaf.ts --platform ALIBABA --min 300 --headless 1 --cache-images 1 --debug 1
 */
import { SHARED_CATEGORIES, SharedCategoryNode, SharedLeaf } from '../src/lib/sharedTaxonomy';
import { prisma } from '@/lib/prisma';
import { upsertSavedListings } from '@/lib/listingStore';
import { isExcludedByKeywords } from '@/lib/quality/textFilters';
import type { ExternalListing, PlatformKey } from '@/lib/providers/types';
import { fetchAlibaba } from '@/lib/providers/alibaba';
import { fetchMadeInChina } from '@/lib/providers/madeinchina';
import { cacheExternalImage } from '@/lib/imageCache';

type Args = {
  platform: Extract<PlatformKey, 'ALIBABA' | 'MADE_IN_CHINA'>;
  min: number;
  headless: boolean;
  maxPerLeaf: number;
  debug: boolean;
  cacheImages: boolean;
  // Shuffle traversal order to diversify across runs
  shuffle: boolean;
  // Optionally cap how many leaves to process per top-level category in a single run (0 = unlimited)
  perCategory: number;
};

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const r: Args = {
    platform: 'ALIBABA',
    min: 100,
    headless: true,
    maxPerLeaf: 480,
    debug: false,
    cacheImages: false,
    shuffle: true,
    perCategory: 0,
  };
  const take = () => a.shift();
  const parseBool = (v?: string) => /^(1|true|yes|y)$/i.test(String(v || ''));
  while (a.length) {
    const k = take(); if (!k) break;
    switch (k) {
      case '--platform': {
        const v = String(take() || '').toUpperCase();
        r.platform = (v === 'MADE_IN_CHINA' ? 'MADE_IN_CHINA' : 'ALIBABA');
        break;
      }
      case '--min': r.min = Math.min(1000, Math.max(10, Number(take()) || 300)); break;
      case '--headless': r.headless = parseBool(take()); break;
      case '--max-per-leaf': r.maxPerLeaf = Math.min(1000, Math.max(40, Number(take()) || 480)); break;
      case '--debug': r.debug = true; break;
      case '--cache-images': r.cacheImages = parseBool(take()); break;
      case '--shuffle': r.shuffle = parseBool(take()); break;
      case '--no-shuffle': r.shuffle = false; break;
      case '--per-category': r.perCategory = Math.max(0, Number(take()) || 0); break;
    }
  }
  return r;
}

const STATIC_MODIFIERS = [
  'wholesale','bulk','supplier','factory','manufacturer','oem','odm','private label',
  'ready to ship','in stock','low moq','cheap','best','2024','hot','new','latest','top',
  'direct','exporter','distributor','high quality','fast shipping','original','authentic','premium','stock',
  '1pc','2pcs','10pcs','100pcs','lot'
];

async function countForLeaf(platform: Args['platform'], catKey: string, leaf: string) {
  const p: any = prisma as any;
  if (!p?.savedListing?.count) return 0;
  // Count listings tagged to the category and having the leaf in terms
  try {
    return await p.savedListing.count({ where: { platform: platform as any, categories: { has: catKey }, terms: { has: leaf } } });
  } catch (e: any) {
    const code = e?.code;
    const msg = String(e?.message || '').toLowerCase();
    const unreachable = code === 'P1001' || msg.includes("can't reach database server") || msg.includes('cannot reach database');
    if (unreachable) {
      if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
        console.warn(`[savedListing] count unreachable (treating as 0):`, code || '', e?.message || e);
      }
      return 0;
    }
    throw e;
  }
}

async function fetchForPlatform(platform: Args['platform'], q: string, limit: number, headless: boolean): Promise<ExternalListing[]> {
  if (platform === 'ALIBABA') return fetchAlibaba(q, limit, { headless });
  if (platform === 'MADE_IN_CHINA') return fetchMadeInChina(q, limit, { headless, upgradeImages: true, detailTimeoutMs: 2500 });
  return [];
}

async function topoffLeaf(args: Args, catKey: string, leaf: string, deficit: number): Promise<number> {
  const modifiers = [...STATIC_MODIFIERS];
  // Add a few random seeds to diversify search surface
  const randSeeds = Array.from({ length: 6 }, () => Math.random().toString(36).slice(2, 6));
  modifiers.push(...randSeeds);
  // Shuffle modifiers
  for (let i = modifiers.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [modifiers[i], modifiers[j]] = [modifiers[j], modifiers[i]]; }
  const seen = new Set<string>();
  let added = 0;
  for (const m of modifiers) {
    if (added >= deficit) break;
    const q = `${leaf} ${m}`.trim();
    // Scale per-query fetch size with remaining deficit
    const remaining = deficit - added;
    const per = Math.min(args.maxPerLeaf, Math.max(120, Math.min(360, remaining * 6)));
    let batch: ExternalListing[] = [];
    try { batch = await fetchForPlatform(args.platform, q, per, args.headless); } catch {}
    if (!batch?.length) continue;
    const keep: ExternalListing[] = [];
    for (const it of batch) {
      if (!it?.url) continue;
      if (seen.has(it.url)) continue; seen.add(it.url);
      if (isExcludedByKeywords(it.title, it.description).excluded) continue;
      // Optional eager image caching
      if (args.cacheImages && it.image) {
        try {
          const cached = await cacheExternalImage(it.image, { preferJpgForIndiaMart: false });
          if (cached?.localPath) it.image = cached.localPath;
        } catch {}
      }
      keep.push(it);
    }
    if (!keep.length) continue;
    try {
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
      categories: [catKey],
      terms: Array.from(new Set([leaf, ...q.split(/\s+/g).filter(Boolean)])),
      rating: it.rating || undefined,
      orders: it.orders || undefined,
    })));
    } catch (e: any) {
      const code = e?.code;
      const msg = String(e?.message || '').toLowerCase();
      const unreachable = code === 'P1001' || msg.includes("can't reach database server") || msg.includes('cannot reach database');
      if (unreachable) {
        if (args.debug) console.warn(`[savedListing] upsert unreachable, continuing in dry-run mode`);
      } else {
        throw e;
      }
    }
    added += keep.length;
    if (args.debug) console.log(`[TOP-OFF ${args.platform}] ${catKey} '${leaf}' via '${q}' +${keep.length} (cum ${added}/${deficit})`);
  }
  return added;
}

async function main() {
  const args = parseArgs();
  let totalAdded = 0;
  let totalDeficits = 0;
  // Derive flat category defs from SHARED_CATEGORIES (top-level only)
  const categoryDefs: { key: string; featured: string[] }[] = SHARED_CATEGORIES.map((top: SharedCategoryNode) => {
    const featured: string[] = [];
    // Collect leaves from first-level children and any nested children
    if (top.leaves) featured.push(...top.leaves.map((l: SharedLeaf) => l.label));
    if (top.children) {
      for (const sub of top.children) {
        if (sub.leaves) featured.push(...sub.leaves.map((l: SharedLeaf) => l.label));
        if (sub.children) {
          for (const subsub of sub.children) {
            if (subsub.leaves) featured.push(...subsub.leaves.map((l: SharedLeaf) => l.label));
          }
        }
      }
    }
    // Deduplicate while preserving order
    const seen = new Set<string>();
    const deduped = featured.filter((f: string) => (seen.has(f) ? false : (seen.add(f), true)));
    return { key: top.key, featured: deduped };
  });

  // Optionally shuffle category order to avoid repeatedly hitting the same few on subsequent runs
  const cats = args.shuffle ? [...categoryDefs].sort(() => Math.random() - 0.5) : categoryDefs;

  for (const cat of cats) {
    // Optionally shuffle leaves to diversify within a category
    const leaves = args.shuffle ? [...(cat.featured || [])].sort(() => Math.random() - 0.5) : (cat.featured || []);
    let processedInCat = 0;
    for (const leaf of leaves) {
      const cur = await countForLeaf(args.platform, cat.key, leaf);
      if (cur >= args.min) continue;
      totalDeficits++;
      const deficit = args.min - cur;
      if (args.debug) console.log(`[CHECK ${args.platform}] ${cat.key} :: '${leaf}' has ${cur}, need +${deficit}`);
      const added = await topoffLeaf(args, cat.key, leaf, deficit);
      totalAdded += added;
      // Only count this leaf towards the per-category cap if we actually added something.
      if (added > 0) {
        processedInCat++;
      } else if (args.debug) {
        console.log(`[SKIP ${args.platform}] ${cat.key} '${leaf}' yielded 0; not counting towards per-category cap`);
      }
      if (args.perCategory && processedInCat >= args.perCategory) break;
    }
  }
  console.log(`[DONE ${args.platform}] Leaves below ${args.min}: ${totalDeficits}. Added ${totalAdded} listings.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
