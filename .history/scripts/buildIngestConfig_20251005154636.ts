import { CATEGORIES } from './categories.data';
import fs from 'node:fs/promises';

type Job = {
  platform: 'ALIBABA' | 'C1688' | 'ALL';
  q: string;
  limit: number;
  categories?: string[];
  terms?: string[];
  headless?: boolean;
};

function buildVariants(term: string): string[] {
  const t = term.trim();
  const mods = [
    '',
    'wholesale',
    'bulk',
    'supplier',
    'factory',
    'manufacturer',
    'oem',
    'dropshipping',
    'cheap',
    'best',
    '2024'
  ];
  const variants: string[] = [];
  for (const m of mods) {
    variants.push(m ? `${t} ${m}` : t);
  }
  // Dedup while preserving order
  return Array.from(new Set(variants));
}

async function main() {
  const limit = Number(process.env.INGEST_LIMIT || '300');
  const platform = (process.env.INGEST_PLATFORM || 'ALL') as Job['platform'];
  const headlessEnv = String(process.env.INGEST_HEADLESS || '0').toLowerCase();
  const headless = /^(1|true|yes|y)$/i.test(headlessEnv);
  const out: { jobs: Job[] } = { jobs: [] };
  for (const cat of CATEGORIES) {
    for (const sub of cat.featured || []) {
      const variants = buildVariants(sub);
      for (const q of variants) {
        out.jobs.push({
          platform,
          q,
          limit,
          categories: [cat.key],
          terms: [sub],
          headless,
        });
      }
    }
  }
  await fs.writeFile('scripts/catalogue.generated.json', JSON.stringify(out, null, 2));
  console.log(`Generated ${out.jobs.length} jobs at scripts/catalogue.generated.json (platform=${platform}, limit=${limit}, headless=${headless})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
