import { prisma } from '../src/lib/prisma';
/*
Find SavedListing rows referencing a particular cached image hash.
Usage:
  pnpm ts-node scripts/findListingsByImageHash.ts --hash=bbb71cb4979e0c433b6f0ac4eabc2d688e809d39
*/
function arg(name: string): string | undefined { const p = `--${name}=`; return process.argv.find(a=>a.startsWith(p))?.slice(p.length); }
(async () => {
  const hash = arg('hash');
  if (!hash || !/^[a-f0-9]{40}$/i.test(hash)) { console.error('Provide --hash=<40charsha1>'); process.exit(1); }
  const imgRegex = new RegExp(`/cache/${hash}\\.(?:jpg|jpeg|png|webp)$`,`i`);
  const rows = await prisma.savedListing.findMany({ where: { image: { contains: hash } }, select: { id:true, url:true, title:true, image:true }, take: 500 });
  const filtered = rows.filter(r => r.image && imgRegex.test(r.image));
  console.log(JSON.stringify({ count: filtered.length, hash, listings: filtered }, null, 2));
})();
