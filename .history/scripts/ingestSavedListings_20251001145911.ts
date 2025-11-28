import { upsertSavedListings } from '@/lib/listingStore';
import type { ExternalListing, PlatformKey } from '@/lib/providers/types';
import { fetchAlibaba } from '@/lib/providers/alibaba';
import { fetchAliExpress } from '@/lib/providers/aliexpress';
import { fetchC1688 } from '@/lib/providers/c1688';

type Job = {
  platform: PlatformKey | 'ALL';
  q: string;
  limit?: number;
  headless?: boolean;
  categories?: string[];
  terms?: string[];
};

function parseBool(v: any, def = false): boolean {
  if (v == null) return def;
  const s = String(v).trim();
  if (/^(1|true|yes|y)$/i.test(s)) return true;
  if (/^(0|false|no|n)$/i.test(s)) return false;
  return def;
}

function parseArgs(argv: string[]): { config?: string; job?: Job } {
  const out: any = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const [k, vRaw] = a.includes('=') ? a.split(/=(.*)/) : [a, ''];
    const v = vRaw || argv[i + 1];
    const nextIsVal = !a.includes('=');
    const take = () => { if (nextIsVal) i++; return v; };
    if (k === '--config') out.config = take();
    if (k === '--platform') out.platform = String(take() || '').toUpperCase();
    if (k === '--q') out.q = String(take() || '');
    if (k === '--limit') out.limit = Number(take() || '');
    if (k === '--headless') out.headless = parseBool(take(), true);
    if (k === '--categories') out.categories = String(take() || '').split(',').map(s => s.trim()).filter(Boolean);
    if (k === '--terms') out.terms = String(take() || '').split(',').map(s => s.trim()).filter(Boolean);
  }
  if (out.config) return { config: out.config };
  if (!out.platform || !out.q) return {};
  const job: Job = {
    platform: out.platform,
    q: out.q,
    limit: Number.isFinite(out.limit) ? out.limit : undefined,
    headless: typeof out.headless === 'boolean' ? out.headless : undefined,
    categories: Array.isArray(out.categories) ? out.categories : undefined,
    terms: Array.isArray(out.terms) ? out.terms : undefined,
  };
  return { job };
}

async function runOne(job: Job): Promise<number> {
  const platform = (job.platform || 'ALL') as Job['platform'];
  const q = job.q;
  const limit = Math.min(2000, Math.max(1, Number(job.limit || 200)));
  const headless = job.headless ?? true;
  const categories = job.categories || [];
  const extraTerms = job.terms || [];

  const fetchFor = async (p: PlatformKey, qStr: string, lim: number): Promise<ExternalListing[]> => {
    if (p === 'ALIBABA') return fetchAlibaba(qStr, lim, { headless });
    if (p === 'ALIEXPRESS') return fetchAliExpress(qStr, lim, { headless });
    if (p === 'C1688') return fetchC1688(qStr, lim, { headless });
    return [];
  };

  let items: ExternalListing[] = [];
  if (platform === 'ALL') {
    const per = Math.max(40, Math.floor(limit / 3));
    const [a, e, c] = await Promise.all([
      fetchFor('ALIBABA', q, per).catch(() => []),
      fetchFor('ALIEXPRESS', q, per).catch(() => []),
      fetchFor('C1688', q, per).catch(() => []),
    ]);
    items = ([] as ExternalListing[]).concat(a, e, c);
  } else {
    items = await fetchFor(platform as PlatformKey, q, limit).catch(() => []);
  }

  // Map to SavedListingUpsert and add categories/terms hints
  const termsFromQ = Array.from(new Set(q.split(/\s+/g).filter(Boolean)));
  const mapped = items.map((it) => ({
    platform: it.platform,
    url: it.url,
    title: it.title || 'Product',
    image: it.image || undefined,
    price: it.price || undefined,
    currency: it.currency || undefined,
    moq: it.moq || undefined,
    storeName: it.storeName || undefined,
    description: it.description || undefined,
    categories,
    terms: Array.from(new Set([q, ...termsFromQ, ...extraTerms].filter(Boolean))),
    rating: it.rating || undefined,
    orders: it.orders || undefined,
  }));

  if (!mapped.length) {
    console.log(`No items scraped for ${platform}:${q}`);
    return 0;
  }
  await upsertSavedListings(mapped);
  console.log(`Upserted ${mapped.length} into SavedListing for ${platform}:${q}`);
  return mapped.length;
}

async function main() {
  const { config, job } = parseArgs(process.argv);
  if (!config && !job) {
    console.log('Usage: ts-node scripts/ingestSavedListings.ts --platform ALIBABA --q "Respirator" --limit 200 --categories safety-security --terms mask,face,respirator --headless 1');
    console.log('   or: ts-node scripts/ingestSavedListings.ts --config scripts/catalogue.example.json');
    process.exit(1);
  }
  if (config) {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(config, 'utf8');
    const json = JSON.parse(raw) as { jobs: Job[] };
    let total = 0;
    for (const j of json.jobs || []) {
      try { total += await runOne(j); } catch (e) { console.warn('Job failed', j.platform, j.q, e); }
    }
    console.log(`Done. Total upserted: ${total}`);
    return;
  }
  if (job) {
    await runOne(job);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
