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

async function main() {
  const limit = Number(process.env.INGEST_LIMIT || '200');
  const platform = (process.env.INGEST_PLATFORM || 'ALIBABA') as Job['platform'];
  const out: { jobs: Job[] } = { jobs: [] };
  for (const cat of CATEGORIES) {
    for (const sub of cat.featured || []) {
      out.jobs.push({
        platform,
        q: sub,
        limit,
        categories: [cat.key],
        terms: [sub],
        headless: false,
      });
    }
  }
  await fs.writeFile('scripts/catalogue.generated.json', JSON.stringify(out, null, 2));
  console.log(`Generated ${out.jobs.length} jobs at scripts/catalogue.generated.json (platform=${platform}, limit=${limit})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
