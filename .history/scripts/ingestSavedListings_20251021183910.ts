import { upsertSavedListings } from '@/lib/listingStore';
import type { ExternalListing, PlatformKey } from '@/lib/providers/types';
import { fetchAlibaba } from '@/lib/providers/alibaba';
// AliExpress removed
import { fetchIndiaMart } from '@/lib/providers/indiamart';
import { fetchC1688 } from '@/lib/providers/c1688';
import { fetchMadeInChina } from '@/lib/providers/madeinchina';
import { fetchGlobalSources } from '@/lib/providers/globalsources';
import { isExcludedByKeywords } from '@/lib/quality/textFilters';

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

function parseArgs(argv: string[]): { config?: string; job?: Job; cookiesFile?: string } {
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
    if (k === '--cookies-file') out.cookiesFile = String(take() || '');
  }
  if (out.config) return { config: out.config, cookiesFile: out.cookiesFile };
  if (!out.platform || !out.q) return {};
  const job: Job = {
    platform: out.platform,
    q: out.q,
    limit: Number.isFinite(out.limit) ? out.limit : undefined,
    headless: typeof out.headless === 'boolean' ? out.headless : undefined,
    categories: Array.isArray(out.categories) ? out.categories : undefined,
    terms: Array.isArray(out.terms) ? out.terms : undefined,
  };
  return { job, cookiesFile: out.cookiesFile };
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
    if (p === 'C1688') return fetchC1688(qStr, lim, { headless });
    if (p === 'MADE_IN_CHINA') return fetchMadeInChina(qStr, lim, { headless });
    if (p === 'INDIAMART') return fetchIndiaMart(qStr, lim, { headless });
    if ((p as any) === 'GLOBAL_SOURCES') return fetchGlobalSources(qStr, lim, { headless });
    return [];
  };

  let items: ExternalListing[] = [];
  if (platform === 'ALL') {
    const per = Math.max(40, Math.floor(limit / 5));
    const [a, i, c, m, g] = await Promise.all([
      fetchFor('ALIBABA', q, per).catch(() => []),
      fetchFor('INDIAMART', q, per).catch(() => []),
      fetchFor('C1688', q, per).catch(() => []),
      fetchFor('MADE_IN_CHINA', q, per).catch(() => []),
      fetchFor('GLOBAL_SOURCES' as any, q, per).catch(() => []),
    ]);
    items = ([] as ExternalListing[]).concat(a, i, c, m, g);
  } else {
    items = await fetchFor(platform as PlatformKey, q, limit).catch(() => []);
    // For Alibaba/Global Sources: aggressive top-off with extended/randomized modifiers until we reach a minimum per variation
    if (platform === 'ALIBABA' || (platform as any) === 'GLOBAL_SOURCES') {
      const envKey = (platform === 'ALIBABA') ? (process.env.ALIBABA_MIN_PER) : (process.env.GS_MIN_PER);
      const targetMinEnv = Number(envKey || process.env.INGEST_MIN_PER || '120');
      const targetMin = Math.max(40, Math.min(500, targetMinEnv));
      if (items.length < targetMin) {
        const staticMods = [
          'wholesale','bulk','supplier','factory','manufacturer','oem','odm','custom','custom logo','private label',
          'ready to ship','in stock','low moq','cheap','best','2024','hot','new','latest','top',
          'direct','exporter','distributor','high quality','fast shipping','original','authentic','premium','stock'
        ];
        // Generate some random alphanumeric seeds to diversify search surface
        const randSeeds = Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 6));
        const qtyMods = ['1pc','2pcs','10pcs','100pcs','lot'];
        const allMods = [...new Set([...staticMods, ...qtyMods, ...randSeeds])];
        // Shuffle modifiers so we don't bias early ones
        for (let i = allMods.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allMods[i], allMods[j]] = [allMods[j], allMods[i]];
        }
        const seen = new Set<string>(items.map((it) => it.url));
        for (const m of allMods) {
          if (items.length >= targetMin) break;
          const q2 = `${q} ${m}`.trim();
          // Scale per-query fetch size; allow larger pulls when still far from target
          const deficit = targetMin - items.length;
          const per = Math.min(limit, Math.max(100, Math.min(400, deficit * 6)));
          const extra = await fetchFor(platform as PlatformKey, q2, per).catch(() => []);
          if (!extra.length) continue;
          for (const it of extra) {
            if (!it?.url) continue;
            if (seen.has(it.url)) continue;
            seen.add(it.url);
            items.push({ ...it });
            if (items.length >= targetMin) break;
          }
        }
      }
    }
  }

  // Global keyword exclusion: drop listings with banned keywords (e.g., custom/services)
  items = items.filter((it) => !isExcludedByKeywords(it.title, it.description).excluded);

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
  const { config, job, cookiesFile } = parseArgs(process.argv);
  // If a cookies file is specified, read it and set GS_COOKIES as a single line
  if (cookiesFile) {
    try {
      const fs = await import('node:fs/promises');
      const raw = await fs.readFile(cookiesFile, 'utf8');
      const single = raw.replace(/\r/g, '').replace(/\n/g, '').trim();
      if (single) process.env.GS_COOKIES = single;
      console.log(`[INGEST] Using GS_COOKIES from ${cookiesFile}, length=${single.length}`);
    } catch (e) {
      console.warn('[INGEST] Failed to read cookies file', cookiesFile, e);
    }
  }
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
