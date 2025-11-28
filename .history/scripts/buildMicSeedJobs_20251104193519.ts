import { CATEGORIES } from './categories.data';
import fs from 'node:fs/promises';

// Build a MIC-only catalogue.generated.json for high-volume ingestion using featured terms per category
// Usage: pnpm run mic:build && pnpm run mic:ingest (see package.json scripts)

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

function buildVariants(term: string, modifiers?: string[], excludeKeywords?: string[]): string[] {
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
    'private label',
    'ready to ship',
    'cheap',
    'best',
    '2024',
  ];
  
  // Filter out excluded keywords from modifiers
  const excludes = excludeKeywords || [];
  const filteredMods = defaultMods.filter(mod => {
    if (!mod) return true; // Keep empty modifier (original term)
    return !excludes.some(exclude => mod.toLowerCase().includes(exclude.toLowerCase()));
  });
  
  const mods = (modifiers && modifiers.length ? modifiers : filteredMods).map((m) => m.trim());
  const out: string[] = [];
  for (const m of mods) out.push(m ? `${t} ${m}` : t);
  return Array.from(new Set(out));
}

async function main() {
  // Controls
  const limit = Math.min(600, Math.max(80, Number(process.env.MIC_LIMIT || '320')));
  const headless = parseBoolEnv('MIC_HEADLESS', false);
  const includeCats = parseListEnv('MIC_CATEGORIES'); // e.g. "consumer-electronics,sports-entertainment"
  const modifiers = parseListEnv('MIC_MODIFIERS'); // override default modifiers
  const termsCap = parseIntEnv('MIC_TERMS_CAP', 0); // 0 = no cap per category
  const jobsCap = parseIntEnv('MIC_JOBS_CAP', 0); // 0 = no global cap

  const jobs: Array<{ platform: 'MADE_IN_CHINA'; q: string; limit: number; categories: string[]; terms: string[]; headless?: boolean; }> = [];

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
        jobs.push({ platform: 'MADE_IN_CHINA', q, limit, categories: [cat.key], terms: [leaf], headless });
        if (jobsCap > 0 && jobs.length >= jobsCap) break;
      }
      if (jobsCap > 0 && jobs.length >= jobsCap) break;
    }
    if (jobsCap > 0 && jobs.length >= jobsCap) break;
  }

  const out = { jobs };
  await fs.writeFile('scripts/catalogue.mic.generated.json', JSON.stringify(out, null, 2));
  const catKeys = cats.map((c) => c.key).join(',');
  console.log(
    `Generated ${jobs.length} MIC jobs at scripts/catalogue.mic.generated.json (limit=${limit}, headless=${headless}, categories=[${catKeys}], termsCap=${termsCap || 'none'}, jobsCap=${jobsCap || 'none'})`
  );
  console.log(`Summary: categories=${cats.length}, totalFeaturedTerms=${totalTerms}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
