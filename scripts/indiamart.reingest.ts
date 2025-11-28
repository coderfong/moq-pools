#!/usr/bin/env ts-node
/**
 * Orchestrated aggressive IndiaMART re-ingestion.
 * Steps:
 *  1. Bulk sweep across all leaves (broad high-limit multi-term) with resume support.
 *  2. Live leaf enrichment pass to top off sparse leaves (prefetch probing) with resume.
 *  3. Optional validation pass (skipped by default unless --validate specified).
 *
 * Usage:
 *   pnpm ts-node scripts/indiamart.reingest.ts --bulk-limit 400 --bulk-terms 3 --live-limit 200 --live-terms 3 --resume progress.im.bulk.json --live-resume progress.im.live.json --headless 1 --validate
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

interface Args { bulkLimit:number; bulkTerms:number; liveLimit:number; liveTerms:number; headless:boolean; validate:boolean; bulkResume?:string; liveResume?:string; debug:boolean; }
function parseArgs(): Args {
  const a = process.argv.slice(2); const r: Args = { bulkLimit:400, bulkTerms:3, liveLimit:200, liveTerms:3, headless:false, validate:false, debug:false } as any;
  const take = () => a.shift();
  while(a.length){ const k = take(); if(!k) break; switch(k){
    case '--bulk-limit': r.bulkLimit = Math.min(800, Math.max(60, Number(take())||400)); break;
    case '--bulk-terms': r.bulkTerms = Math.min(5, Math.max(1, Number(take())||3)); break;
    case '--live-limit': r.liveLimit = Math.min(400, Math.max(60, Number(take())||200)); break;
    case '--live-terms': r.liveTerms = Math.min(5, Math.max(1, Number(take())||3)); break;
    case '--headless': r.headless = true; break;
    case '--validate': r.validate = true; break;
    case '--bulk-resume': r.bulkResume = String(take()||'').trim(); break;
    case '--live-resume': r.liveResume = String(take()||'').trim(); break;
    case '--debug': r.debug = true; break;
  }}
  return r;
}

const execP = promisify(exec);
async function run(cmd: string){
  console.log('[reingest]', cmd);
  const { stdout, stderr } = await execP(cmd);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

async function main(){
  const args = parseArgs();
  console.log(`[REINGEST] start bulkLimit=${args.bulkLimit} bulkTerms=${args.bulkTerms} liveLimit=${args.liveLimit} liveTerms=${args.liveTerms} headless=${args.headless}`);
  const bulkFlags = [ `--limit ${args.bulkLimit}`, `--terms ${args.bulkTerms}`, args.headless? '--headless 1':'' , args.bulkResume? `--resumeJson ${args.bulkResume}`:'' ].filter(Boolean).join(' ');
  await run(`pnpm ts-node scripts/ingestIndiaMartBulk.ts ${bulkFlags}`);
  const liveFlags = [ `--limit ${args.liveLimit}`, `--terms ${args.liveTerms}`, '--prefetch 70', '--threshold 35', args.headless? '--headless':'' , args.liveResume? `--resume ${args.liveResume}`:'' ].filter(Boolean).join(' ');
  await run(`pnpm ts-node scripts/ingestIndiaMartLeavesLive.ts ${liveFlags}`);
  if(args.validate){ await run('pnpm run indiamart:validate'); }
  console.log('[REINGEST] complete');
}
main().catch(e => { console.error('[REINGEST] failed', e); process.exit(1); });
