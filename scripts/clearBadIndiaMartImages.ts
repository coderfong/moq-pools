import { prisma } from '../src/lib/prisma';
import { BAD_IMAGE_HASHES } from '../src/lib/badImages';

// One-shot cleanup: NULL out SavedListing.image for IndiaMART rows that match known bad image hashes.
// Run with: pnpm ts-node scripts/clearBadIndiaMartImages.ts --dry 0

function parseArgs(argv: string[]) {
  const args = { dry: true } as { dry: boolean };
  for (let i=2;i<argv.length;i++) {
    const k = argv[i];
    if (k === '--dry') { const v = argv[i+1]; i++; args.dry = !(v === '0' || v === 'false'); }
  }
  return args;
}

function hasBadHash(p?: string | null) {
  if (!p) return false;
  const m = p.match(/[a-f0-9]{40}/i);
  return !!(m && BAD_IMAGE_HASHES.has(m[0].toLowerCase()));
}

async function main() {
  const { dry } = parseArgs(process.argv);
  const rows = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART' },
    select: { id: true, image: true },
  });
  const targets = rows.filter(r => hasBadHash(r.image));
  console.log(`Found ${targets.length} IndiaMART rows with bad image hash`);
  if (!targets.length) return;
  if (dry) {
    console.log(`[dry-run] Would NULL out ${targets.length} images`);
    console.log('Sample IDs:', targets.slice(0, 20).map(t=>t.id));
    return;
  }
  const ids = targets.map(t => t.id);
  const res = await prisma.savedListing.updateMany({ where: { id: { in: ids } }, data: { image: null } });
  console.log(`Updated ${res.count} rows (set image = NULL)`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
