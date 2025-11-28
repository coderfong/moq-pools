#!/usr/bin/env ts-node
/**
 * Aggressively prune low-signal IndiaMART SavedListings.
 * Low-signal definition (heuristic):
 *  - URL host contains indiamart AND path includes /products/ OR /proddetail/ OR /product
 *  - AND (no image) AND (no price) AND (no moq) AND (no storeName) AND (title length < 6 OR generic title)
 *  - OR URL pattern /products/?id=... AND title <= 6 words AND missing image
 *  - Optionally fetch page and re-check for stronger signals (price currency etc). If still empty -> delete.
 *
 * Flags:
 *  --dry            Dry-run (default)
 *  --limit N        Limit candidates processed
 *  --concurrency N  Parallel fetches (default 6)
 *  --debug          Verbose logging
 *
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');
import * as cheerio from 'cheerio';

interface Args { dry:boolean; limit?:number; concurrency:number; debug:boolean; }
function parseArgs(): Args {
  const out: Args = { dry:true, limit:undefined, concurrency:6, debug:false };
  const a = process.argv.slice(2);
  for (let i=0;i<a.length;i++) {
    const k = a[i];
    if (k === '--write') out.dry = false;
    else if (k === '--dry') out.dry = true;
    else if (k === '--limit') { const v = a[++i]; if (v && !isNaN(Number(v))) out.limit = Number(v); }
    else if (k === '--concurrency') { const v = a[++i]; if (v && !isNaN(Number(v))) out.concurrency = Math.min(20, Math.max(1, Number(v))); }
    else if (k === '--debug') out.debug = true;
  }
  return out;
}
const args = parseArgs();
const prisma = new PrismaClient();

function isCandidate(l: any): boolean {
  const url = l.url || '';
  if (!/indiamart\.com/i.test(url)) return false;
  if (!/products|product|proddetail/i.test(url)) return false;
  const title = (l.title || '').trim();
  const generic = /^product$/i.test(title) || title.length < 6;
  const noMeta = !(l.image && l.image.length > 4) && !(l.price && l.price.length > 1) && !(l.moq && l.moq.length > 1) && !(l.storeName && l.storeName.length > 2);
  if (noMeta && generic) return true;
  if (/\/products\/.*id=/.test(url) && noMeta) return true;
  return false;
}

async function fetchSignals(url: string) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' }, cache:'no-store' });
    if (!res.ok) return { ok:false };
    const html = await res.text();
    const $ = cheerio.load(html);
    const hasCurrency = /(?:₹|Rs\.?|INR)/i.test(html);
    const hasPriceNode = $('*[class*="price"], .pdp-price').text().length > 3;
    const prodImgs = $('img').filter((_,el)=>{ const s = (el.attribs?.src||'')+(el.attribs?.['data-src']||''); return /product|prodimg|imghost/i.test(s) && !/logo|placeholder|default/i.test(s); }).length;
    const hasContact = /contact supplier|send enquiry|send inquiry|company video/i.test(html);
    return { ok:true, hasCurrency, hasPriceNode, prodImgs, hasContact };
  } catch { return { ok:false }; }
}

async function main() {
  const where = { platform: 'INDIAMART' as any };
  const all = await prisma.savedListing.findMany({ where, orderBy: { createdAt:'asc' }, take: args.limit });
  const candidates = all.filter(isCandidate);
  console.log(`[IM-PRUNE] candidates=${candidates.length} (from ${all.length}) dry=${args.dry}`);
  let idx = 0; let deleted = 0; let kept = 0;
  async function worker(){
    while(idx < candidates.length){
      const l = candidates[idx++];
      const sig = await fetchSignals(l.url);
      const strong = sig.ok && (sig.hasCurrency || sig.hasPriceNode || (sig.prodImgs||0) > 0 || sig.hasContact);
      if (!strong) {
        if (!args.dry) {
          try { await prisma.savedListing.delete({ where: { id: l.id } }); deleted++; if(args.debug) console.log(`[IM-PRUNE] deleted id=${l.id} url=${l.url}`); }
          catch(e){ if(args.debug) console.log('[IM-PRUNE] delete failed', l.id, e); }
        } else {
          deleted++;
          if(args.debug) console.log(`[IM-PRUNE] would delete id=${l.id} url=${l.url}`);
        }
      } else {
        kept++; if(args.debug) console.log(`[IM-PRUNE] kept id=${l.id} url=${l.url}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(args.concurrency, candidates.length) }, () => worker()));
  console.log(`[IM-PRUNE] done deleted=${deleted} kept=${kept} candidates=${candidates.length}`);
  if(args.dry) console.log(' (dry run - rerun with --write to apply)');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
