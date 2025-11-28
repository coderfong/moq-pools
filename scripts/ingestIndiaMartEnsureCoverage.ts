#!/usr/bin/env ts-node
/**
 * ingestIndiaMartEnsureCoverage.ts
 * Orchestrates multi-phase IndiaMART ingestion to guarantee a minimum per-leaf listing coverage.
 *
 * Phases (each may run multiple cycles until thresholds satisfied or cycle cap reached):
 *   1. Bulk (broad intake)
 *   2. Sparse (populate zero / near-zero leaves)
 *   3. Zero Booster (aggressive synthetic terms for stubborn leaves)
 *   4. Topoff (raise floor to final target)
 *
 * Default tiered targets:
 *   Stage A: ensure >=1 per leaf
 *   Stage B: ensure >=4 per leaf
 *   Stage C: ensure >=8 per leaf (final)
 *
 * Invocations of existing scripts reuse their own internal logic / flags; we call them via Node API (child_process) to avoid code duplication
 * and to preserve behavioral parity with manual runs.
 *
 * Flags:
 *   --stage-a <n>         Target for stage A (default 1)
 *   --stage-b <n>         Target for stage B (default 4)
 *   --stage-c <n>         Target for stage C (default 8)
 *   --max-cycles <n>      Maximum full orchestrator cycles across ALL stages (default 6)
 *   --phase-timeout <ms>  Kill a child phase if it exceeds this many ms (default 25m = 1_500_000)
 *   --concurrency <n>     Concurrency hint passed to underlying scripts (default 6)
 *   --dry                 Simulate only (do not actually run phases) – still prints planned actions
 *   --debug               Verbose logging
 *   --no-moq              Pass MOQ removal to phases
 *   --relaxed             Force relaxed for every phase (where applicable)
 *   --skip-bulk / --skip-sparse / --skip-zero / --skip-topoff  Skip individual phases
 *   --only <phase>        Run only a single phase (bulk|sparse|zero|topoff) once
 *
 * Exit codes:
 *   0 success (targets met or best effort within max cycles)
 *   1 unexpected error
 *   2 max cycles exhausted without reaching final target
 */
import { spawn } from 'node:child_process';
import { flattenIndiaMartLeaves } from '../src/lib/indiamartCategories';
import { prisma } from '../src/lib/prisma';

interface Args { stageA:number; stageB:number; stageC:number; maxCycles:number; phaseTimeout:number; concurrency:number; dry:boolean; debug:boolean; noMoq:boolean; relaxed:boolean; skipBulk:boolean; skipSparse:boolean; skipZero:boolean; skipTopoff:boolean; only?:string; }
function parseArgs(): Args { const a=process.argv.slice(2); const r:Args={ stageA:1, stageB:4, stageC:8, maxCycles:6, phaseTimeout:1_500_000, concurrency:6, dry:false, debug:false, noMoq:false, relaxed:false, skipBulk:false, skipSparse:false, skipZero:false, skipTopoff:false }; const take=()=>a.shift(); while(a.length){ const k=take(); if(!k) break; switch(k){
  case '--stage-a': r.stageA=Math.max(1,Number(take())||1); break;
  case '--stage-b': r.stageB=Math.max(r.stageA,Number(take())||4); break;
  case '--stage-c': r.stageC=Math.max(r.stageB,Number(take())||8); break;
  case '--max-cycles': r.maxCycles=Math.max(1,Number(take())||6); break;
  case '--phase-timeout': r.phaseTimeout=Math.max(60_000,Number(take())||1_500_000); break;
  case '--concurrency': r.concurrency=Math.min(16,Math.max(1,Number(take())||6)); break;
  case '--dry': r.dry=true; break;
  case '--debug': r.debug=true; break;
  case '--no-moq': r.noMoq=true; break;
  case '--relaxed': r.relaxed=true; break;
  case '--skip-bulk': r.skipBulk=true; break;
  case '--skip-sparse': r.skipSparse=true; break;
  case '--skip-zero': r.skipZero=true; break;
  case '--skip-topoff': r.skipTopoff=true; break;
  case '--only': r.only=String(take()||'').toLowerCase(); break;
 }} return r; }

async function leafCounts(): Promise<Record<string,number>> { const leaves=flattenIndiaMartLeaves(); const out:Record<string,number>={}; for(const l of leaves){ out[l.key]=await prisma.savedListing.count({ where:{ platform:'INDIAMART' as any, categories:{ has:l.key } } }); } return out; }

function scriptInvocation(phase: string, args: Args): { cmd:string; argv:string[] } {
  // All scripts launched with ts-node/register using the scripts tsconfig via env var when invoked through package script.
  // Here we'll replicate that environment. We presume execution from repo root.
  const baseNodeArgs = ['-r','ts-node/register','-r','tsconfig-paths/register'];
  const scriptBase = 'scripts';
  const commonFlags: string[] = [];
  if(args.noMoq) commonFlags.push('--no-moq');
  if(args.relaxed) commonFlags.push('--relaxed');
  switch(phase){
    case 'bulk':
      return { cmd: 'node', argv: [...baseNodeArgs, `${scriptBase}/ingestIndiaMartBulk.ts`, '--limit','380','--terms','3','--headless','1','--concurrency', String(args.concurrency), ...commonFlags] };
    case 'sparse':
      return { cmd: 'node', argv: [...baseNodeArgs, `${scriptBase}/ingestIndiaMartSparseLeaves.ts`, '--target', String(Math.min(args.stageB,4)), '--max-current','0','--limit-leaves','200','--prefetch','70','--terms-cap','6','--headless','--concurrency', String(args.concurrency), ...commonFlags] };
    case 'zero':
      return { cmd: 'node', argv: [...baseNodeArgs, `${scriptBase}/ingestIndiaMartZeroBooster.ts`, '--target', String(Math.min(args.stageB,6)), '--max-current','1','--limit-leaves','220','--prefetch','70','--terms-cap','20','--combos','1','--headless','--concurrency', String(args.concurrency), ...commonFlags] };
    case 'topoff':
      return { cmd: 'node', argv: [...baseNodeArgs, `${scriptBase}/ingestIndiaMartTopoffLeaves.ts`, '--min-target', String(args.stageC), '--terms','3','--prefetch','70','--concurrency', String(args.concurrency), '--relax','--headless', ...commonFlags] };
    default: throw new Error(`Unknown phase ${phase}`);
  }
}

function runChild(label:string, cmd:string, argv:string[], timeoutMs:number, debug:boolean): Promise<{ code:number|null; signal:NodeJS.Signals|null; timedOut:boolean }>{
  return new Promise((resolve)=>{
    const child = spawn(cmd, argv, { stdio: 'inherit', env: { ...process.env, TS_NODE_PROJECT:'tsconfig.scripts.json' } });
    let finished=false; let to:NodeJS.Timeout|undefined;
    const done = (code:number|null, signal:NodeJS.Signals|null, timedOut:boolean)=>{ if(finished) return; finished=true; if(to) clearTimeout(to); resolve({ code, signal, timedOut }); };
    if(timeoutMs>0){ to=setTimeout(()=>{ if(debug) console.warn(`[COVER] phase ${label} timeout reached -> killing child`); child.kill('SIGKILL'); done(null,'SIGKILL',true); }, timeoutMs); }
    child.on('exit',(code,signal)=> done(code, signal as any, false));
    child.on('error',()=> done(1,null,false));
  });
}

function summarizeCounts(counts:Record<string,number>){
  const vals=Object.values(counts); const totalLeaves=vals.length; const zeros=vals.filter(v=>v===0).length; const p=(n:number)=> totalLeaves? (vals.filter(v=>v>=n).length/totalLeaves*100).toFixed(1):'0.0';
  return { totalLeaves, zeros, p1:p(1), p4:p(4), p8:p(8), min:Math.min(...vals), max:Math.max(...vals) };
}

async function stageSatisfied(counts:Record<string,number>, target:number){ return Object.values(counts).every(c=>c>=target); }

async function orchestrate(args:Args){
  const phasesOrder: string[] = args.only ? [args.only] : ['bulk','sparse','zero','topoff'];
  if(args.only){
    if(!phasesOrder.includes(args.only)) throw new Error('--only phase invalid');
  } else {
    if(args.skipBulk) phasesOrder.splice(phasesOrder.indexOf('bulk'),1);
    if(args.skipSparse) phasesOrder.splice(phasesOrder.indexOf('sparse'),1);
    if(args.skipZero) phasesOrder.splice(phasesOrder.indexOf('zero'),1);
    if(args.skipTopoff) phasesOrder.splice(phasesOrder.indexOf('topoff'),1);
  }
  console.log(`[COVER] Plan phases=${phasesOrder.join(', ')} targets A=${args.stageA} B=${args.stageB} C=${args.stageC} maxCycles=${args.maxCycles}`);

  let cycle=0; let counts = await leafCounts();
  if(args.debug) console.log('[COVER] initial', summarizeCounts(counts));

  const needStageA = () => Object.values(counts).some(c=>c < args.stageA);
  const needStageB = () => Object.values(counts).some(c=>c < args.stageB);
  const needStageC = () => Object.values(counts).some(c=>c < args.stageC);

  while(cycle < args.maxCycles){
    cycle++;
    console.log(`\n[COVER] === Cycle ${cycle}/${args.maxCycles} ===`);
    // Stage A focus: ensure >= stageA all leaves. Bulk + sparse + maybe zero.
    if(needStageA()){
      console.log(`[COVER] Stage A unmet (target ${args.stageA})`);
      for(const phase of phasesOrder){
        if(!needStageA()) break;
        if(phase==='topoff') continue; // not needed for stage A
        await runPhase(phase, args);
        counts = await leafCounts();
        console.log('[COVER] post-phase summary', phase, summarizeCounts(counts));
      }
      if(needStageA()) { console.warn('[COVER] Stage A still unmet after phases'); }
      else console.log('[COVER] Stage A satisfied');
    }
    // Stage B focus: >= stageB
    if(!needStageA() && needStageB()){
      console.log(`[COVER] Stage B unmet (target ${args.stageB})`);
      for(const phase of phasesOrder){
        if(!needStageB()) break;
        if(phase==='bulk') continue; // bulk less useful now
        await runPhase(phase, args);
        counts = await leafCounts();
        console.log('[COVER] post-phase summary', phase, summarizeCounts(counts));
      }
      if(needStageB()) console.warn('[COVER] Stage B still unmet'); else console.log('[COVER] Stage B satisfied');
    }
    // Stage C focus: final raise
    if(!needStageA() && !needStageB() && needStageC()){
      console.log(`[COVER] Stage C unmet (target ${args.stageC})`);
      for(const phase of phasesOrder){
        if(!needStageC()) break;
        if(phase==='bulk' || phase==='sparse') continue; // rely on zero + topoff
        await runPhase(phase, args);
        counts = await leafCounts();
        console.log('[COVER] post-phase summary', phase, summarizeCounts(counts));
      }
      if(needStageC()) console.warn('[COVER] Stage C still unmet'); else console.log('[COVER] Stage C satisfied');
    }

    if(!needStageA() && !needStageB() && !needStageC()) { console.log('[COVER] All targets satisfied early'); break; }
  }

  const finalCounts = await leafCounts();
  const finalSummary = summarizeCounts(finalCounts);
  console.log('\n[COVER] Final summary', finalSummary);
  const unmet = Object.values(finalCounts).some(c=>c < args.stageC);
  if(unmet){ console.error('[COVER] Final target NOT fully met'); process.exit(2); }
  await prisma.$disconnect();
}

async function runPhase(phase:string, args:Args){
  if(args.dry){ console.log(`[COVER] (dry) would run phase=${phase}`); return; }
  const { cmd, argv } = scriptInvocation(phase, args);
  console.log(`[COVER] Running phase=${phase} -> ${cmd} ${argv.join(' ')}`);
  const res = await runChild(phase, cmd, argv, args.phaseTimeout, args.debug);
  if(res.timedOut) console.warn(`[COVER] phase ${phase} timed out`);
  if(res.code && res.code !== 0){ console.warn(`[COVER] phase ${phase} exited code=${res.code}`); }
}

async function main(){
  const args = parseArgs();
  await orchestrate(args);
}

main().catch(e=>{ console.error(e); process.exit(1); });
