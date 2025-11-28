#!/usr/bin/env ts-node
import { prisma } from '@/lib/prisma';

interface Args { platform: string; urlContains: string[]; titleContains: string[]; dry: boolean; }
function parse(): Args {
  const a = process.argv.slice(2);
  const args: Args = { platform: 'INDIAMART', urlContains: [], titleContains: [], dry: false };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch(k){
      case '--platform': args.platform = String(take()||'').trim().toUpperCase(); break;
      case '--url-contains': args.urlContains = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
      case '--title-contains': args.titleContains = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
      case '--dry': args.dry = true; break;
    }
  }
  return args;
}

async function main(){
  const args = parse();
  const all = await prisma.savedListing.findMany({ where: { platform: args.platform as any } });
  const lower = (s: string) => s.toLowerCase();
  const matches = all.filter(r => {
    const u = lower(r.url);
    const t = lower(r.title || '');
    if (args.urlContains.length && !args.urlContains.some(x => u.includes(x.toLowerCase()))) return false;
    if (args.titleContains.length && !args.titleContains.some(x => t.includes(x.toLowerCase()))) return false;
    return true;
  });
  console.log(`[REMOVE] matched ${matches.length} of ${all.length} for platform=${args.platform}`);
  if (!matches.length) return;
  if (args.dry) { console.log('[REMOVE] dry run done'); return; }
  const ids = matches.map(m=>m.id);
  await prisma.$transaction(ids.map(id => prisma.savedListing.delete({ where: { id } })));
  console.log(`[REMOVE] deleted ${ids.length}`);
}
main();
