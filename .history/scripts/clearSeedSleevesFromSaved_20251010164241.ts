import { prisma } from '../src/lib/prisma';

// One-shot: clear the specific placeholder seed image from SavedListing.image
// Usage: pnpm ts-node scripts/clearSeedSleevesFromSaved.ts --dry 0

function parseArgs(argv: string[]) {
  const args = { dry: true } as { dry: boolean };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--dry') { const v = argv[i + 1]; i++; args.dry = !(v === '0' || v === 'false'); }
  }
  return args;
}

(async () => {
  const { dry } = parseArgs(process.argv);
  const rows = await prisma.savedListing.findMany({
    where: { image: { equals: '/seed/sleeves.jpg' } },
    select: { id: true },
  });
  console.log(`Found ${rows.length} SavedListing rows with image=/seed/sleeves.jpg`);
  if (!rows.length) return;
  if (dry) { console.log(`[dry-run] Would null out ${rows.length} images`); return; }
  const ids = rows.map(r => r.id);
  const res = await prisma.savedListing.updateMany({ where: { id: { in: ids } }, data: { image: null } });
  console.log(`Updated ${res.count} rows (set image=null)`);
})();
