#!/usr/bin/env ts-node
/**
 * Validate existing INDIAMART SavedListings by issuing lightweight HEAD/GET requests.
 * Removes listings that are 404, or that redirect to generic directory/search pages lacking product signal.
 *
 * Heuristics for invalid:
 *  - HTTP status >= 400
 *  - Final URL host not indiamart.com
 *  - HTML contains no product-ish markers (price/moq/store selectors) AND very short (< 2k chars)
 *  - Title looks generic like 'IndiaMART' only
 *
 * Flags:
 *  --concurrency <n>   Parallel requests (default 6)
 *  --limit <n>         Max listings to validate (default 2000; 0 = all)
 *  --dry               Do not delete, just report
 *  --debug             Verbose logging
 */

import { prisma } from '@/lib/prisma';
import * as cheerio from 'cheerio';

interface Args { concurrency:number; limit:number; dry:boolean; debug:boolean; }
function parseArgs(): Args {
  const args: Args = { concurrency:6, limit:2000, dry:false, debug:false };
  const a = process.argv.slice(2); const take = () => a.shift();
  while(a.length){ const k = take(); if(!k) break; switch(k){
    case '--concurrency': args.concurrency = Math.min(20, Math.max(1, Number(take())||6)); break;
    case '--limit': args.limit = Math.max(0, Number(take())||2000); break;
    case '--dry': args.dry = true; break;
    case '--debug': args.debug = true; break;
  }}
  return args;
}

async function fetchHtml(url:string): Promise<{ ok:boolean; status:number; html:string; finalUrl:string; }>{
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36' }, cache:'no-store' });
    const html = await res.text();
    return { ok: res.ok, status: res.status, html, finalUrl: res.url };
  } catch { return { ok:false, status:0, html:'', finalUrl:url }; }
}

function isLikelyInvalid(resp:{ ok:boolean; status:number; html:string; finalUrl:string; }): boolean {
  if(!resp.ok || resp.status >= 400) return true;
  try { const u = new URL(resp.finalUrl); if(!/indiamart\.com$/i.test(u.hostname)) return true; } catch {}
  const html = resp.html || '';
  if(html.length < 800) return true; // extremely short
  // Generic title detection
  const m = html.match(/<title>([^<]{0,120})<\/title>/i); const title = (m?.[1] || '').trim();
  if(/^indiamart\s*-?\s*$/i.test(title)) return true;
  // Product-ish markers: price/moq/store
  const hasMarker = /(MOQ|Min Order|Price|Supplier|Company Name)/i.test(html);
  if(!hasMarker && html.length < 2000) return true;
  return false;
}

async function main(){
  const args = parseArgs();
  const where = { platform: 'INDIAMART' as any };
  const total = await prisma.savedListing.count({ where });
  const takeAll = args.limit === 0 ? total : Math.min(args.limit, total);
  console.log(`[IM-VALIDATE] start total=${total} willCheck=${takeAll} concurrency=${args.concurrency} dry=${args.dry}`);
  const rows = await prisma.savedListing.findMany({ where, orderBy: { updatedAt: 'asc' }, take: takeAll, select: { id:true, url:true } });
  let idx = 0; let removed = 0; let processed = 0;
  async function worker(){
    while(idx < rows.length){
      const i = idx++; const row = rows[i];
      const resp = await fetchHtml(row.url);
      const invalid = isLikelyInvalid(resp);
      processed++;
      if(invalid){
        if(!args.dry){
          try { await prisma.savedListing.delete({ where: { id: row.id } }); removed++; }
          catch(e){ if(args.debug) console.warn('[IM-VALIDATE] delete failed', row.url, e); }
        } else removed++;
        if(args.debug) console.log(`[IM-VALIDATE] removed url=${row.url} status=${resp.status}`);
      } else if(args.debug) {
        console.log(`[IM-VALIDATE] ok url=${row.url} status=${resp.status}`);
      }
      if(processed % 50 === 0) console.log(`[IM-VALIDATE] progress ${processed}/${rows.length} removed=${removed}`);
    }
  }
  await Promise.all(Array.from({length: Math.min(args.concurrency, rows.length) }, () => worker()));
  console.log(`[IM-VALIDATE] done processed=${processed} removed=${removed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
