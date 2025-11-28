#!/usr/bin/env ts-node
/**
 * Hard reset for IndiaMART listings.
 * Deletes ALL SavedListing rows with platform = INDIAMART.
 * Supports --dry (default), --write, and optional --backup-json to dump rows before deletion.
 *
 * Usage:
 *   pnpm exec ts-node scripts/resetIndiaMartListings.ts         # dry-run count only
 *   pnpm exec ts-node scripts/resetIndiaMartListings.ts --backup-json im-backup.json
 *   pnpm exec ts-node scripts/resetIndiaMartListings.ts --write
 *   pnpm exec ts-node scripts/resetIndiaMartListings.ts --write --backup-json im-backup.json
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');
import * as fs from 'fs';

interface Args { write:boolean; backup?:string }
function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { write:false };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--write') out.write = true;
    else if (a === '--backup-json') out.backup = args[++i];
  }
  return out;
}
const argv = parseArgs();
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.savedListing.count({ where: { platform: 'INDIAMART' } });
  console.log(`[IM-RESET] Found ${total} IndiaMART listings.`);
  if (total === 0) { await prisma.$disconnect(); return; }
  if (argv.backup) {
    const rows = await prisma.savedListing.findMany({ where: { platform: 'INDIAMART' } });
    fs.writeFileSync(argv.backup, JSON.stringify(rows, null, 2));
    console.log(`[IM-RESET] Backup written to ${argv.backup}`);
  }
  if (!argv.write) {
    console.log('[IM-RESET] Dry-run. Re-run with --write to actually delete.');
  } else {
    const batchSize = 200;
    let deleted = 0;
    while (true) {
  const batch: { id: string }[] = await prisma.savedListing.findMany({ where: { platform: 'INDIAMART' }, select: { id:true }, take: batchSize });
  if (batch.length === 0) break;
  const ids = batch.map((b: { id: string }) => b.id);
      for (const id of ids) {
        try { await prisma.savedListing.delete({ where: { id } }); deleted++; } catch {}
      }
      console.log(`[IM-RESET] Deleted ${deleted}/${total}`);
    }
    console.log(`[IM-RESET] Completed deletion. Removed ${deleted} listings.`);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
