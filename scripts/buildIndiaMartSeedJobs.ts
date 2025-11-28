import { flattenIndiaMartLeaves, getIndiaMartSearchTerms } from '@/lib/indiamartCategories';
import fs from 'node:fs/promises';

/**
 * Build a simple IndiaMART ingestion job list selecting the primary term of each leaf.
 * Output JSON: { jobs: [{ platform: 'INDIAMART', q: 'term', limit: 120, headless: true }] }
 */
async function main() {
  const leaves = flattenIndiaMartLeaves();
  const jobs = leaves.map(l => {
    const terms = getIndiaMartSearchTerms(l.key);
    return {
      platform: 'INDIAMART',
      q: terms[0],
      limit: 120,
      headless: false
    };
  });
  const out = { jobs };
  await fs.writeFile('scripts/indiamart.seed.json', JSON.stringify(out, null, 2));
  console.log(`Wrote ${jobs.length} IndiaMART seed jobs to scripts/indiamart.seed.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
