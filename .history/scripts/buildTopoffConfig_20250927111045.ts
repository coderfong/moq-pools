import { prisma } from '@/lib/prisma';
import { CATEGORIES } from './categories.data';
import fs from 'node:fs/promises';

type Job = {
  platform: 'ALIBABA' | 'ALIEXPRESS' | 'C1688' | 'ALL';
  q: string;
  limit: number;
  categories?: string[];
  terms?: string[];
  headless?: boolean;
};

function buildVariants(term: string): string[] {
  const t = term.trim();
  const mods = [
    '', 'wholesale', 'bulk', 'supplier', 'factory', 'manufacturer', 'oem', 'dropshipping', 'cheap', 'best', '2024',
    // extra boosters
    'china', 'factory price', 'direct'
  ];
  const out: string[] = [];
  for (const m of mods) out.push(m ? `${t} ${m}` : t);
  return Array.from(new Set(out));
}

async function main() {
  const targetMin = Number(process.env.INGEST_TARGET_MIN || '100');
  const limit = Number(process.env.INGEST_LIMIT || '800');
  const platform = (process.env.INGEST_PLATFORM || 'ALL') as Job['platform'];
  const headlessEnv = String(process.env.INGEST_HEADLESS || '0').toLowerCase();
  const headless = /^(1|true|yes|y)$/i.test(headlessEnv);

  const p: any = prisma as any;
  const rows = await p.savedListing.findMany({ select: { categories: true, terms: true } });
  const countFor = (catKey: string, sub: string) => {
    let c = 0;
    for (const r of rows as Array<{ categories: string[]; terms: string[] }>) {
      const inCat = Array.isArray(r.categories) && r.categories.includes(catKey);
      const hasTerm = Array.isArray(r.terms) && (r.terms.includes(sub) || r.terms.includes(sub.toLowerCase()));
      if (inCat && hasTerm) c++;
    }
    return c;
  };

  const out: { jobs: Job[] } = { jobs: [] };
  for (const cat of CATEGORIES) {
    for (const sub of cat.featured || []) {
      const cur = countFor(cat.key, sub);
      if (cur >= targetMin) continue;
      const variants = buildVariants(sub);
      for (const q of variants) {
        out.jobs.push({ platform, q, limit, categories: [cat.key], terms: [sub], headless });
      }
    }
  }
  await fs.writeFile('scripts/catalogue.topoff.json', JSON.stringify(out, null, 2));
  console.log(`Generated top-off ${out.jobs.length} jobs at scripts/catalogue.topoff.json (platform=${platform}, limit=${limit}, headless=${headless}, targetMin=${targetMin})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
