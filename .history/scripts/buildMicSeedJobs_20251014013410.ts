import { CATEGORIES } from './categories.data';
import fs from 'node:fs/promises';

// Build a MIC-only catalogue.generated.json for high-volume ingestion using featured terms per category
// Usage: pnpm run mic:build && pnpm run mic:ingest (see package.json scripts)

function buildVariants(term: string): string[] {
  const t = term.trim();
  const mods = ['', 'wholesale', 'bulk', 'supplier', 'factory', 'manufacturer', 'oem', 'cheap', 'best', '2024'];
  const out: string[] = [];
  for (const m of mods) out.push(m ? `${t} ${m}` : t);
  return Array.from(new Set(out));
}

async function main() {
  const limit = Math.min(600, Math.max(80, Number(process.env.MIC_LIMIT || '320')));
  const headless = /^(1|true|yes|y)$/i.test(String(process.env.MIC_HEADLESS || '0'));
  const jobs: Array<{ platform: 'MADE_IN_CHINA'; q: string; limit: number; categories: string[]; terms: string[]; headless?: boolean; }> = [];
  for (const cat of CATEGORIES) {
    const featured = cat.featured || [];
    for (const leaf of featured) {
      for (const q of buildVariants(leaf)) {
        jobs.push({ platform: 'MADE_IN_CHINA', q, limit, categories: [cat.key], terms: [leaf], headless });
      }
    }
  }
  const out = { jobs };
  await fs.writeFile('scripts/catalogue.mic.generated.json', JSON.stringify(out, null, 2));
  console.log(`Generated ${jobs.length} MIC jobs at scripts/catalogue.mic.generated.json (limit=${limit}, headless=${headless})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
