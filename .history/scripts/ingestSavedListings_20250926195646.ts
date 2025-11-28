#!/usr/bin/env ts-node
// Scrape listings from providers and populate SavedListing (your instant catalogue)
import 'dotenv/config';
import { upsertSavedListings, type SavedListingUpsert } from '@/lib/listingStore';
import { fetchAlibaba } from '@/lib/providers/alibaba';
import { fetchAliExpress } from '@/lib/providers/aliexpress';
import { fetchC1688 } from '@/lib/providers/c1688';
import type { ExternalListing, PlatformKey } from '@/lib/providers/types';

type Job = {
  platform: PlatformKey | 'ALL';
  q: string;
  limit?: number;
  headless?: boolean;
  categories?: string[];
  terms?: string[];
};

function parseArgs(argv: string[]): { jobs: Job[]; dryRun?: boolean } {
  const args: Record<string, string | boolean> = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    const k = m[1];
    const v = m[2] ?? 'true';
    args[k] = v;
  }
  const fromFile = (args['config'] as string | undefined)?.trim();
  if (fromFile) {
    // Support either { jobs: Job[] } or Job[] as root
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require(require('path').resolve(process.cwd(), fromFile));
    const jobs: Job[] = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
    return { jobs, dryRun: args['dry-run'] === 'true' || args['dry-run'] === true };
  }

  const platform = String(args['platform'] || 'ALL').toUpperCase() as Job['platform'];
  const q = String(args['q'] || '').trim();
  if (!q) {
    console.error('Missing required --q search term.');
    process.exit(1);
  }
  const limit = Math.min(2000, Math.max(1, Number(args['limit'] || 100)));
  const headless = !/^(0|false|no)$/i.test(String(args['headless'] || '1'));
  const categories = String(args['categories'] || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const terms = String(args['terms'] || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return { jobs: [{ platform, q, limit, headless, categories, terms }], dryRun: args['dry-run'] === 'true' || args['dry-run'] === true };
}

function dedupeByUrl(list: ExternalListing[]): ExternalListing[] {
  const seen = new Set<string>();
  const out: ExternalListing[] = [];
  const normalize = (u: string) => {
    try { const x = new URL(u); x.search = ''; x.hash = ''; return x.toString(); } catch { return u; }
  };
  for (const it of list) {
    const key = normalize(it.url || '');
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

async function runJob(job: Job): Promise<ExternalListing[]> {
  const { platform, q, limit = 100, headless = true } = job;
  if (platform === 'ALL') {
    const per = Math.ceil(limit / 3);
    const [a, e, c] = await Promise.all([
      fetchAlibaba(q, per, { headless }).catch(() => []),
      fetchAliExpress(q, per, { headless }).catch(() => []),
      fetchC1688(q, per, { headless }).catch(() => []),
    ]);
    return dedupeByUrl((a as ExternalListing[]).concat(e as ExternalListing[], c as ExternalListing[])).slice(0, limit);
  }
  if (platform === 'ALIBABA') return dedupeByUrl(await fetchAlibaba(q, limit, { headless }));
  if (platform === 'ALIEXPRESS') return dedupeByUrl(await fetchAliExpress(q, limit, { headless }));
  if (platform === 'C1688') return dedupeByUrl(await fetchC1688(q, limit, { headless }));
  return [];
}

function toUpserts(list: ExternalListing[], job: Job): SavedListingUpsert[] {
  const extraTerms = (job.terms || []);
  const termSet = new Set<string>([job.q, ...extraTerms].filter(Boolean).map(s => s.trim()));
  const terms = Array.from(termSet);
  return list.map((it) => ({
    platform: it.platform,
    url: it.url,
    title: it.title || 'Product',
    image: it.image || undefined,
    price: it.price || undefined,
    currency: it.currency || undefined,
    moq: it.moq || undefined,
    storeName: it.storeName || undefined,
    description: it.description || undefined,
    categories: job.categories || [],
    terms,
    rating: it.rating || undefined,
    orders: it.orders || undefined,
  }));
}

async function main() {
  const { jobs, dryRun } = parseArgs(process.argv);
  if (!jobs.length) {
    console.error('No jobs to run. Provide --config path or flags like --platform=ALIBABA --q=Respirator');
    process.exit(1);
  }
  let totalFound = 0;
  let totalUpserts = 0;

  for (const job of jobs) {
    console.log(`Running job: platform=${job.platform} q="${job.q}" limit=${job.limit ?? 100} headless=${job.headless !== false}`);
    const items = await runJob(job);
    console.log(`  Fetched ${items.length} listings`);
    totalFound += items.length;
    if (!items.length) continue;
    const upserts = toUpserts(items, job);
    if (dryRun) {
      console.log(`  Dry run: would upsert ${upserts.length} items.`);
      continue;
    }
    await upsertSavedListings(upserts);
    console.log(`  Upserted ${upserts.length} into SavedListing`);
    totalUpserts += upserts.length;
  }
  console.log(`Done. Found ${totalFound} total, upserted ${totalUpserts}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
