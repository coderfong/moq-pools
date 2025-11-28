#!/usr/bin/env ts-node
import fs from 'fs';
import { upsertExportCategories } from '@/lib/exportCategoriesStore';

interface Args { file: string; depthGuess: boolean; parentInfer: boolean; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { file: 'exportCats.json', depthGuess: true, parentInfer: true };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch (k) {
      case '--file': args.file = String(take()||'').trim(); break;
      case '--no-depth-guess': args.depthGuess = false; break;
      case '--no-parent-infer': args.parentInfer = false; break;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  if (!fs.existsSync(args.file)) {
    console.error(`File not found: ${args.file}`);
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(args.file,'utf8'));
  const results = json.results || {};
  const rows: { label: string; url: string; itemCount?: number; parentLabel?: string; depth?: number }[] = [];
  for (const rootLabel of Object.keys(results)) {
    const subs = results[rootLabel];
    if (!Array.isArray(subs)) continue;
    for (const sc of subs) {
      const label = sc.label || '';
      const url = sc.url || '';
      if (!label || !url) continue;
      const itemCount = typeof sc.count === 'number' ? sc.count : undefined;
      let parentLabel: string | undefined;
      if (args.parentInfer) parentLabel = rootLabel;
      let depth: number | undefined;
      if (args.depthGuess) depth = 1;
      rows.push({ label, url, itemCount, parentLabel, depth });
    }
  }
  const inserted = await upsertExportCategories(rows);
  console.log(`Upserted ${inserted} export categories from ${args.file}`);
}
main();
