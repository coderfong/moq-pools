import { CATEGORIES } from './categories.data';
import fs from 'node:fs/promises';

/**
 * Build a simple Global Sources ingestion job list selecting the primary featured terms per category.
 * Output JSON: { jobs: [{ platform: 'GLOBAL_SOURCES', q: 'term', limit: 160, headless: false, categories: [...] }] }
 */
async function main() {
  const limit = Number(process.env.GS_LIMIT || process.env.INGEST_LIMIT || '160');
  const headlessEnv = String(process.env.GS_HEADLESS || process.env.INGEST_HEADLESS || '0');
  const headless = /^(1|true|yes|y)$/i.test(headlessEnv);
  const jobs: Array<{ platform: 'GLOBAL_SOURCES'; q: string; limit: number; headless: boolean; categories: string[] }> = [];
  for (const cat of CATEGORIES) {
    const featured = (cat.featured || []).slice(0, 8); // cap per category to keep job set reasonable
    for (const term of featured) {
      jobs.push({ platform: 'GLOBAL_SOURCES', q: term, limit, headless, categories: [cat.key] });
    }
  }
  const out = { jobs };
  await fs.writeFile('scripts/globalsources.seed.json', JSON.stringify(out, null, 2));
  console.log(`Wrote ${jobs.length} Global Sources seed jobs to scripts/globalsources.seed.json (limit=${limit}, headless=${headless})`);
}

main().catch(e => { console.error(e); process.exit(1); });
