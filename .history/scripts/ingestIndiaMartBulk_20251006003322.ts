import { flattenIndiaMartLeaves, getIndiaMartSearchTerms } from '@/lib/indiamartCategories';
import { fetchIndiaMart } from '@/lib/providers/indiamart';
import { upsertSavedListings } from '@/lib/listingStore';

/*
 * Bulk IndiaMART ingestion:
 *  - Iterates all leaves
 *  - Uses up to first 2 search terms per leaf (configurable)
 *  - Allows limit override via CLI (--limit 240)
 *  - Skips leaves already producing >= minExisting items when --resumeJson provided
 *
 * Usage examples:
 *   pnpm ts-node scripts/ingestIndiaMartBulk.ts --limit 240 --terms 2 --headless 0
 *   pnpm ts-node scripts/ingestIndiaMartBulk.ts --limit 300 --resumeJson scripts/indiamart.progress.json
 */

interface Args { limit: number; terms: number; headless: boolean; resumeJson?: string; debug: boolean; overrides: string[]; }

function parseArgs(argv: string[]): Args {
  const args: Args = { limit: 240, terms: 2, headless: false, debug: false, overrides: [] } as any;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const [k, raw] = a.includes('=') ? a.split(/=(.*)/) : [a, argv[i + 1]];
    const take = () => { if (!a.includes('=')) i++; return raw; };
    switch (k) {
      case '--limit': {
        const prev = args.limit;
        args.limit = Math.min(1000, Math.max(30, Number(take()) || 240));
        if (prev !== 240) args.overrides.push(`--limit (overrode previous ${prev})`);
        break;
      }
      case '--terms': {
        const prev = args.terms;
        args.terms = Math.min(5, Math.max(1, Number(take()) || 2));
        if (prev !== 2) args.overrides.push(`--terms (overrode previous ${prev})`);
        break;
      }
      case '--headless': {
        const prev = args.headless;
        args.headless = /^(1|true|yes)$/i.test(String(take()));
        if (prev !== args.headless) args.overrides.push(`--headless (changed to ${args.headless})`);
        break;
      }
      case '--resumeJson': args.resumeJson = String(take() || '').trim(); break;
      case '--debug': args.debug = /^(1|true|yes)$/i.test(String(take())); break;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const leaves = flattenIndiaMartLeaves();
  console.log(`[IndiaMART Bulk] Start: leaves=${leaves.length} limit=${args.limit} termsPerLeaf=${args.terms} headless=${args.headless} debug=${args.debug}`);
  if (args.overrides.length) console.log(`[IndiaMART Bulk] Flag overrides detected: ${args.overrides.join(', ')}`);
  if (args.resumeJson) console.log(`[IndiaMART Bulk] Resuming with progress file: ${args.resumeJson}`);
  const progress: Record<string, number> = {};
  if (args.resumeJson) {
    try {
      const fs = await import('node:fs/promises');
      const raw = await fs.readFile(args.resumeJson, 'utf8');
      Object.assign(progress, JSON.parse(raw || '{}'));
    } catch {}
  }

  let total = 0;
  for (const leaf of leaves) {
    const terms = getIndiaMartSearchTerms(leaf.key).slice(0, args.terms);
    for (const term of terms) {
      const key = `${leaf.key}::${term}`;
      if (progress[key]) {
        console.log(`[skip] ${key} (already ingested: ${progress[key]})`);
        continue; // already ingested
      }
  let items: ReturnType<typeof fetchIndiaMart> extends Promise<infer R> ? R : any[] = [] as any;
      try {
        items = await fetchIndiaMart(term, args.limit, { headless: args.headless, debug: args.debug });
      } catch (e) {
        if (args.debug) console.warn('fetch error', key, e);
      }
      if (!items.length) {
        console.log(`[empty] ${key} (0 items)`);
        progress[key] = 0;
        continue;
      }
      try {
  await upsertSavedListings((items as any[]).map((it: any) => ({
          platform: it.platform,
          url: it.url,
          title: it.title || 'Product',
          image: it.image || undefined,
          price: it.price || undefined,
          currency: it.currency || undefined,
          moq: it.moq || undefined,
          storeName: it.storeName || undefined,
          description: it.description || undefined,
          categories: [leaf.key],
          terms: Array.from(new Set([term, ...term.split(/\s+/g)])),
          rating: it.rating || undefined,
          orders: it.orders || undefined,
        })));
        total += items.length;
        progress[key] = items.length;
        console.log(`[ok] ${key} -> ${items.length} items (total=${total})`);
      } catch (e) {
        console.warn(`[error] upsert failed for ${key}`, e);
        progress[key] = -1;
      }
    }
  }
  if (args.resumeJson) {
    try {
      const fs = await import('node:fs/promises');
      await fs.writeFile(args.resumeJson, JSON.stringify(progress, null, 2));
    } catch {}
  }
  console.log(`[IndiaMART Bulk] Done. Total ingested: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); });
