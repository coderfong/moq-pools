#!/usr/bin/env ts-node
import { fetchExportCategoryPage } from '@/lib/providers/indiamartExport';
import fs from 'fs';

/*
  Crawl export.indiamart.com category pages starting from seed queries.
  Usage: pnpm ts-node scripts/buildIndiaMartExportCategories.ts --seeds "Hospital Linen,Medical Scrub" --limit 3 --out exportCats.json --debug 1
*/
interface Args { seeds: string[]; limit: number; out: string; debug: boolean; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { seeds: [], limit: 2, out: 'indiamart.export.categories.json', debug: false };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch (k) {
      case '--seeds': args.seeds = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
      case '--limit': args.limit = Math.max(1, Number(take())||2); break;
      case '--out': args.out = String(take()||'').trim(); break;
      case '--debug': args.debug = /^(1|true|yes)$/i.test(String(take())); break;
    }
  }
  if (!args.seeds.length) args.seeds = ['Hospital Linen','Medical Scrub'];
  return args;
}

async function main() {
  const args = parseArgs();
  const visited = new Set<string>();
  const frontier: string[] = [...args.seeds];
  const results: Record<string, any> = {};
  while (frontier.length && Object.keys(results).length < 500) {
    const term = frontier.shift()!;
    if (visited.has(term.toLowerCase())) continue;
    visited.add(term.toLowerCase());
    const { subcategories } = await fetchExportCategoryPage(term, args.debug).catch(()=>({ subcategories: [] }));
    results[term] = subcategories.map(s => ({ label: s.label, count: s.count, url: s.url }));
    if (args.debug) console.log(`[IM-EXPORT] term='${term}' found subs=${subcategories.length}`);
    // Add next layer (limited breadth) from top N counts
    const sorted = [...subcategories].sort((a,b) => (b.count||0) - (a.count||0)).slice(0, args.limit);
    for (const sc of sorted) {
      // Use the label as next query; if label contains spaces keep as is
      frontier.push(sc.label);
    }
  }
  fs.writeFileSync(args.out, JSON.stringify({ generatedAt: new Date().toISOString(), seeds: args.seeds, results }, null, 2));
  console.log(`Wrote ${args.out} with ${Object.keys(results).length} root entries`);
}
main();
