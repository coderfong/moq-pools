#!/usr/bin/env ts-node
/**
 * reportIndiaMartZeroLeaves.ts
 * Lists IndiaMART leaves whose SavedListing count is <= --max (default 0), with
 * their primary term, label, aliases, and generated search terms.
 * Useful to diagnose why certain categories remain empty.
 *
 * Flags:
 *   --max <n>           Max count threshold to include (default 0)
 *   --limit <n>         Limit number of leaves reported (default 200)
 *   --json              Output JSON instead of table
 *   --terms <n>         Show only first N generated search terms (default 5)
 *   --group-filter <s>  Restrict to top-level group label substring
 */
import { INDIAMART_CATEGORIES, flattenIndiaMartLeaves, getIndiaMartSearchTerms } from '../src/lib/indiamartCategories';
import { prisma } from '../src/lib/prisma';

interface Args { max:number; limit:number; json:boolean; terms:number; groupFilter?:string; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const r:Args = { max:0, limit:200, json:false, terms:5 } as any; const take=()=>a.shift();
  while(a.length){ const k = take(); if(!k) break; switch(k){
    case '--max': r.max = Math.max(0, Number(take())||0); break;
    case '--limit': r.limit = Math.max(1, Number(take())||200); break;
    case '--json': r.json = true; break;
    case '--terms': r.terms = Math.max(1, Number(take())||5); break;
    case '--group-filter': r.groupFilter = String(take()||'').toLowerCase(); break;
  }}
  return r;
}

async function main(){
  const args = parseArgs();
  let leaves = flattenIndiaMartLeaves();
  if(args.groupFilter){
    const allowed = new Set<string>();
    for(const g of INDIAMART_CATEGORIES){ if(g.label.toLowerCase().includes(args.groupFilter)){ for(const sub of g.children||[]) for(const leaf of sub.leaves||[]) allowed.add(leaf.key); } }
    leaves = leaves.filter(l => allowed.has(l.key));
  }
  const rows: any[] = [];
  for(const leaf of leaves){
    const count = await prisma.savedListing.count({ where:{ platform:'INDIAMART' as any, categories:{ has: leaf.key } } });
    if(count <= args.max){
      const terms = getIndiaMartSearchTerms(leaf.key).slice(0, args.terms);
      rows.push({ key: leaf.key, label: leaf.label, term: leaf.term, aliases: leaf.aliases||[], count, terms });
      if(rows.length >= args.limit) break;
    }
  }
  if(args.json) {
    console.log(JSON.stringify({ max: args.max, rows }, null, 2));
  } else {
    console.log(`Zero/Low Leaves (<=${args.max}) total=${rows.length}`);
    for(const r of rows){
      console.log(`${r.key.padEnd(20)} count=${String(r.count).padEnd(3)} term=${r.term} label="${r.label}" terms=[${r.terms.join('; ')}] aliases=[${r.aliases.join('; ')}]`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
