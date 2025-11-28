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

interface Args { limit: number; terms: number; headless: boolean; resumeJson?: string; debug: boolean; }

function parseArgs(argv: string[]): Args {
  const args: Args = { limit: 240, terms: 2, headless: false, debug: false } as any;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const [k, raw] = a.includes('=') ? a.split(/=(.*)/) : [a, argv[i + 1]];
    const take = () => { if (!a.includes('=')) i++; return raw; };
    switch (k) {
      case '--limit': args.limit = Math.min(1000, Math.max(30, Number(take()) || 240)); break;
      case '--terms': args.terms = Math.min(5, Math.max(1, Number(take()) || 2)); break;
      case '--headless': args.headless = /^(1|true|yes)$/i.test(String(take())); break;
      case '--resumeJson': args.resumeJson = String(take() || '').trim(); break;
      case '--debug': args.debug = /^(1|true|yes)$/i.test(String(take())); break;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const leaves = flattenIndiaMartLeaves();
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
      if (progress[key]) continue; // already ingested
      let items = [];
      try {
        items = await fetchIndiaMart(term, args.limit, { headless: args.headless, debug: args.debug });
      } catch (e) {
        if (args.debug) console.warn('fetch error', key, e);
      }
      if (!items.length) {
        if (args.debug) console.log(`No items for leaf ${leaf.key} term '${term}'`);
        progress[key] = 0;
        continue;
      }
      try {
        await upsertSavedListings(items.map(it => ({
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
        if (args.debug) console.log(`Ingested ${items.length} for ${key}`);
      } catch (e) {
        if (args.debug) console.warn('upsert error', key, e);
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
  console.log(`Done. Total IndiaMART listings ingested: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); });
