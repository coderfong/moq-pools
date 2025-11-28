import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Flags = { apply: boolean; soft: boolean; limit: number };
const get = (k: string, d: string = '0') => (process.argv.find(a => a.startsWith(`--${k}`))?.split('=')[1] ?? d);
const flags: Flags = {
  apply: get('apply') === '1',
  soft: get('soft') === '1', // reserved for soft-delete schema
  limit: Number(get('limit', '5000')),
};

const decodeNext = (s: string) => {
  try {
    const u = new URL(s, 'http://x');
    if (u.pathname.startsWith('/_next/image')) {
      let q = u.searchParams.get('url') || '';
      for (let i = 0; i < 3; i++) { const d = decodeURIComponent(q); if (d === q) break; q = d; }
      return q || s;
    }
  } catch {}
  return s;
};

const canonical = (detailUrl: string) => {
  try {
    const u = new URL(detailUrl);
    u.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'cid'].forEach(p => u.searchParams.delete(p));
    return `${u.hostname}${u.pathname}${u.search}`.toLowerCase();
  } catch {
    return detailUrl.toLowerCase();
  }
};

const BAD = new Set<string>([
  'bbb71cb4979e0c433b6f0ac4eabc2d688e809d39',
]);

const extractSha = (src?: string | null) => {
  if (!src) return null;
  const p = new URL(decodeNext(src), 'http://x').pathname;
  const m = p.match(/\/cache\/([a-f0-9]{40})(?:\.[a-z]+)?$/i);
  return m ? m[1].toLowerCase() : null;
};
const hasGoodImage = (src?: string | null) => {
  if (!src) return false;
  const p = new URL(decodeNext(src), 'http://x').pathname;
  if (p.includes('/seed/sleeves')) return false;
  const sha = extractSha(src);
  return sha ? !BAD.has(sha) : true; // treat external images as potentially good
};

const score = (r: any) =>
  (hasGoodImage(r.image) ? 1_000_000 : 0) +
  (new Date(r.updatedAt).getTime() / 1000) +
  ((r.description?.length ?? 0) / 1000);

async function main() {
  console.log(`[IM Dedupe] fetching…`);
  const rows = await prisma.savedListing.findMany({
    where: { platform: 'INDIAMART' as any, url: { not: null } },
    select: { id: true, url: true, title: true, image: true, description: true, updatedAt: true },
    take: flags.limit,
    orderBy: { updatedAt: 'desc' },
  });

  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const key = canonical(r.url!);
    const g = groups.get(key) ?? [];
    g.push(r);
    groups.set(key, g);
  }

  let toRemove: string[] = [];
  for (const [key, list] of groups) {
    if (list.length <= 1) continue;
    const sorted = [...list].sort((a, b) => score(b) - score(a));
    const keep = sorted[0];
    const drop = sorted.slice(1);
    console.log(`[DUPE] key=${key} keep=${keep.id} drops=${drop.map(d => d.id).join(',')}`);
    toRemove.push(...drop.map(d => d.id));
  }

  console.log(`[IM Dedupe] dup groups=${[...groups.values()].filter(g => g.length > 1).length}, dropCount=${toRemove.length}`);
  if (!toRemove.length) return;

  if (flags.apply) {
    if (flags.soft) {
      throw new Error('Soft-delete not configured. Add archived/deletedAt and update script.');
    } else {
      const res = await prisma.savedListing.deleteMany({ where: { id: { in: toRemove } } });
      console.log(`[IM Dedupe] hard-deleted=${res.count}`);
    }
  } else {
    console.log(`[IM Dedupe] dry-run only. Use --apply=1 to delete.`);
  }
}

main().finally(() => prisma.$disconnect());
