#!/usr/bin/env ts-node
import { fetchExportSearch } from '@/lib/providers/indiamartExport';
import { upsertSavedListings } from '@/lib/listingStore';

interface Args { q: string; limit: number; detail: boolean; detailLimit: number; debug: boolean; terms: string[]; }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = { q: '', limit: 120, detail: true, detailLimit: 16, debug: false, terms: [] };
  const take = () => a.shift();
  while (a.length) {
    const k = take(); if (!k) break;
    switch(k){
      case '--q': args.q = String(take()||'').trim(); break;
      case '--terms': args.terms = (take()||'').split(/[,|]/).map(s=>s.trim()).filter(Boolean); break;
      case '--limit': args.limit = Math.max(10, Number(take())||120); break;
      case '--detail': args.detail = /^(1|true|yes)$/i.test(String(take())); break;
      case '--detail-limit': args.detailLimit = Math.max(1, Number(take())||16); break;
      case '--debug': args.debug = /^(1|true|yes)$/i.test(String(take())); break;
    }
  }
  if (args.q && !args.terms.length) args.terms = [args.q];
  if (!args.terms.length) args.terms = ['x ray machine'];
  return args;
}

async function ingestTerm(term: string, args: Args) {
  const listings = await fetchExportSearch(term, { limit: args.limit, detail: args.detail, detailLimit: args.detailLimit, debug: args.debug });
  if (!listings.length) { console.log(`[IM-EXPORT-SEARCH] term='${term}' no listings`); return 0; }
  const valid = listings.filter(l => {
    const moqStr = String(l.moq || '');
    const m = moqStr.match(/(\d{1,5})/);
    if (m) {
      const val = Number(m[1]);
      if (Number.isFinite(val) && val <= 1) return false;
    }
    return true;
  });
  if (!valid.length) { console.log(`[IM-EXPORT-SEARCH] term='${term}' all listings filtered by MOQ`); return 0; }
  await upsertSavedListings(valid.map(l => ({
    platform: 'INDIAMART',
    url: l.url,
    title: l.title || 'Product',
    image: l.image || undefined,
    price: l.price || undefined,
    moq: l.moq || undefined,
    storeName: (l as any).storeName || undefined,
    description: l.description || undefined,
    terms: [term]
  })) as any);
  console.log(`[IM-EXPORT-SEARCH] term='${term}' saved=${valid.length} (filtered ${listings.length - valid.length})`);
  return valid.length;
}

async function main(){
  const args = parseArgs();
  console.log(`[IM-EXPORT-SEARCH] start terms=${args.terms.join(',')} limit=${args.limit} detail=${args.detail}`);
  let total = 0;
  for (const term of args.terms) {
    total += await ingestTerm(term, args);
  }
  console.log(`[IM-EXPORT-SEARCH] done total=${total}`);
}
main();
