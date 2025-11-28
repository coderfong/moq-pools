import { CATEGORIES } from './categories.data';
import fs from 'node:fs/promises';

// Build an ALIBABA-only catalogue config for high-volume ingestion using featured terms per category
// Usage:
//   pnpm run alibaba:build
//   pnpm run alibaba:ingest
//   pnpm run alibaba:prime
//
// Environment overrides (optional):
//   ALI_LIMIT=360           # listings per query (job limit)
//   ALI_HEADLESS=1          # use headless browser where supported
//   ALI_CATEGORIES=cat1,cat2  # restrict to specific category keys from categories.data.ts
//   ALI_MODIFIERS=...       # comma-separated list to override default modifiers
//   ALI_TERMS_CAP=10        # cap featured terms per category (0 = no cap)
//   ALI_JOBS_CAP=2000       # cap total jobs generated (0 = no cap)

type Job = {
  platform: 'ALIBABA';
  q: string;
  limit: number;
  categories: string[];
  terms: string[];
  headless?: boolean;
};

function parseListEnv(name: string): string[] | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBoolEnv(name: string, def = false): boolean {
  const v = process.env[name];
  if (v == null) return def;
  return /^(1|true|yes|y)$/i.test(String(v));
}

function parseIntEnv(name: string, def: number): number {
  const v = Number(process.env[name] || '');
  return Number.isFinite(v) && v > 0 ? v : def;
}

function buildVariants(term: string, modifiers?: string[]): string[] {
  const t = term.trim();
  const defaultMods = [
    '',
    'wholesale',
    'bulk',
    'supplier',
    'factory',
    'manufacturer',
    'oem',
    'odm',
    'custom',
    'custom logo',
    'private label',
    'ready to ship',
    'dropshipping',
    'in stock',
    'low moq',
    'free sample',
    'fast delivery',
    '2024',
  ];
  const mods = (modifiers && modifiers.length ? modifiers : defaultMods).map((m) => m.trim());
  const out: string[] = [];
  for (const m of mods) out.push(m ? `${t} ${m}` : t);
  return Array.from(new Set(out));
}

async function main() {
  // Controls
  const limit = Math.min(800, Math.max(80, parseIntEnv('ALI_LIMIT', 360)));
  const headless = parseBoolEnv('ALI_HEADLESS', true);
  const includeCats = parseListEnv('ALI_CATEGORIES'); // e.g. "consumer-electronics,sports-entertainment"
  const modifiers = parseListEnv('ALI_MODIFIERS'); // override default modifiers
  const termsCap = parseIntEnv('ALI_TERMS_CAP', 0); // 0 = no cap per category
  const jobsCap = parseIntEnv('ALI_JOBS_CAP', 0); // 0 = no global cap

  const jobs: Job[] = [];

  const cats = includeCats && includeCats.length
    ? CATEGORIES.filter((c) => includeCats.includes(c.key))
    : CATEGORIES;

  let totalTerms = 0;
  for (const cat of cats) {
    let featured = (cat.featured || []).slice();
    if (termsCap > 0) featured = featured.slice(0, termsCap);
    totalTerms += featured.length;
    for (const leaf of featured) {
      const variants = buildVariants(leaf, modifiers);
      for (const q of variants) {
        jobs.push({ platform: 'ALIBABA', q, limit, categories: [cat.key], terms: [leaf], headless });
        if (jobsCap > 0 && jobs.length >= jobsCap) break;
      }
      if (jobsCap > 0 && jobs.length >= jobsCap) break;
    }
    if (jobsCap > 0 && jobs.length >= jobsCap) break;
  }

  const out = { jobs } as { jobs: Job[] };
  await fs.writeFile('scripts/catalogue.alibaba.generated.json', JSON.stringify(out, null, 2));
  const catKeys = cats.map((c) => c.key).join(',');
  console.log(
    `Generated ${jobs.length} ALIBABA jobs at scripts/catalogue.alibaba.generated.json (limit=${limit}, headless=${headless}, categories=[${catKeys}], termsCap=${termsCap || 'none'}, jobsCap=${jobsCap || 'none'})`
  );
  console.log(`Summary: categories=${cats.length}, totalFeaturedTerms=${totalTerms}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
