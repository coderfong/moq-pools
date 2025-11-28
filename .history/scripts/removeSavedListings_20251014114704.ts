#!/usr/bin/env ts-node
import { prisma } from '@/lib/prisma';

interface Args { platform?: string; category?: string; urlContains: string[]; titleContains: string[]; dry: boolean; }
function parse(): Args {
  const a = process.argv.slice(2);
  const args: Args = { platform: undefined, category: undefined, urlContains: [], titleContains: [], dry: false } as any;
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch(k){
      case '--platform': args.platform = String(take()||'').trim().toUpperCase(); break;
      case '--category': args.category = String(take()||'').trim(); break;
      case '--url-contains': args.urlContains = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
      case '--title-contains': args.titleContains = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
      case '--dry': args.dry = true; break;
    }
  }
  return args;
}

async function main(){
  const args = parse();
  const where: any = {};
  if (args.platform) where.platform = args.platform;
  if (args.category) where.categories = { hasSome: [args.category] };
  if (args.urlContains.length || args.titleContains.length) {
    const or: any[] = [];
    if (args.urlContains.length) for (const u of args.urlContains) or.push({ url: { contains: u, mode: 'insensitive' } });
    if (args.titleContains.length) for (const t of args.titleContains) or.push({ title: { contains: t, mode: 'insensitive' } });
    if (or.length) where.OR = or;
  }
  const allCount = await prisma.savedListing.count({ where });
  console.log(`[REMOVE] matched ${allCount} rows for platform=${args.platform || 'ANY'} category=${args.category || 'ANY'}`);
  if (!allCount) return;
  if (args.dry) { console.log('[REMOVE] dry run done'); return; }
  // Delete in batches to avoid parameter limits
  const batch = 200;
  let deleted = 0;
  while (true) {
    const ids = await prisma.savedListing.findMany({ where, select: { id: true }, take: batch });
    if (!ids.length) break;
    await prisma.$transaction(ids.map(({ id }) => prisma.savedListing.delete({ where: { id } })));
    deleted += ids.length;
    console.log(`[REMOVE] deleted ${deleted}/${allCount}...`);
    if (ids.length < batch) break;
  }
  console.log(`[REMOVE] done. deleted ${deleted}`);
}
main();
