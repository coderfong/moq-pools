import { prisma } from '../src/lib/prisma';

const get = (k: string, d: string = '0') => (process.argv.find(a => a.startsWith(`--${k}`))?.split('=')[1] ?? d);
const APPLY = get('apply') === '1';
const BATCH = Number(get('batch', '5000')) || 5000;

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
    if (u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    const host = u.hostname.replace(/^www\./, '');
    return `im://${host}${u.pathname}${u.search}`.toLowerCase();
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

async function fetchAllIM(): Promise<Array<{ id: string; url: string | null; title: string; image: string | null; description: string | null; updatedAt: Date }>> {
  const out: any[] = [];
  let cursor: string | undefined;
  while (true) {
    const page = await prisma.savedListing.findMany({
      where: { platform: 'INDIAMART' as any },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, url: true, title: true, image: true, description: true, updatedAt: true },
    });
    if (!page.length) break;
    out.push(...page);
    cursor = page[page.length - 1].id;
  }
  return out;
}

async function main() {
  console.log(`[IM Dedupe] scanning…`);
  const rows = await fetchAllIM();

  // Pass 1: group by canonical URL
  const byUrl = new Map<string, any[]>();
  for (const r of rows) {
    const key = r.url ? canonical(r.url) : null;
    if (!key) continue;
    const arr = byUrl.get(key) ?? [];
    arr.push(r); byUrl.set(key, arr);
  }
  const dropIds = new Set<string>();
  for (const arr of byUrl.values()) {
    if (arr.length <= 1) continue;
    const sorted = [...arr].sort((a, b) => score(b) - score(a));
    sorted.slice(1).forEach(d => dropIds.add(d.id));
  }

  // Pass 2: group by normalized title (skip those already marked)
  const byTitle = new Map<string, any[]>();
  for (const r of rows) {
    if (dropIds.has(r.id)) continue;
    const key = (r.title || '').replace(/\bindiamart\b/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!key) continue;
    const arr = byTitle.get(key) ?? [];
    arr.push(r); byTitle.set(key, arr);
  }
  for (const arr of byTitle.values()) {
    if (arr.length <= 1) continue;
    const sorted = [...arr].sort((a, b) => score(b) - score(a));
    sorted.slice(1).forEach(d => dropIds.add(d.id));
  }

  console.log(`[IM Dedupe] will drop ${dropIds.size} rows`);
  if (!dropIds.size) return;

  if (APPLY) {
    const res = await prisma.savedListing.deleteMany({ where: { id: { in: [...dropIds] } } });
    console.log(`[IM Dedupe] hard-deleted=${res.count}`);
  } else {
    console.log(`[IM Dedupe] dry-run only. Use --apply=1 to delete.`);
  }
}

main().finally(() => prisma.$disconnect());
