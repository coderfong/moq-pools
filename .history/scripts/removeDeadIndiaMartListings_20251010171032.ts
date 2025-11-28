import { prisma } from '../src/lib/prisma';

type Flags = {
  limit: number;
  concurrency: number;
  delete: boolean; // hard delete when true
  includeAll: boolean; // check all IM rows, not just imageless
  timeoutMs: number;
};

function getFlag<T = string>(name: string, def?: T): T {
  // Support --name=value and --name (implies true)
  const arg = process.argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!arg) return (def as T);
  const eq = arg.indexOf('=');
  if (eq === -1) return (true as unknown as T);
  return (arg.slice(eq + 1) as unknown as T);
}

const flags: Flags = {
  limit: Number(String(getFlag('limit', '1000'))),
  concurrency: Number(String(getFlag('concurrency', '8'))),
  delete: /^(1|true|yes)$/i.test(String(getFlag('delete', '0'))),
  includeAll: /^(1|true|yes)$/i.test(String(getFlag('includeAll', '0'))),
  timeoutMs: Number(String(getFlag('timeout', '10000'))),
};

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function isDeadDetailPage(detailUrl: string, timeoutMs: number): Promise<{ dead: boolean; reason?: string }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(detailUrl, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return { dead: true, reason: `http_${res.status}` };
    const text = (await res.text()).toLowerCase();
    const hit =
      text.includes('oh no! it seems this page is not available') ||
      text.includes('page not found') ||
      text.includes('this page is not available') ||
      text.includes('doesn’t exist') ||
      text.includes("doesn't exist");
    if (hit) return { dead: true, reason: 'im_oh_no_body' };
    if (text.length < 1500 && !text.includes('prdimgdiv')) return { dead: true, reason: 'tiny_no_prdimgdiv' };
    return { dead: false };
  } catch (e: any) {
    return { dead: true, reason: e?.name === 'AbortError' ? 'timeout' : 'fetch_error' };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log(`[PruneIMDead] Start limit=${flags.limit} delete=${flags.delete} concurrency=${flags.concurrency} includeAll=${flags.includeAll}`);

  // SavedListing does not have a separate detailUrl field; use url as the IndiaMART detail URL.
  const whereBase: any = { platform: 'INDIAMART', url: { not: null } };
  const where = flags.includeAll
    ? whereBase
    : { ...whereBase, OR: [{ image: null }, { image: { contains: '/seed/sleeves' } }] };

  const rows = await prisma.savedListing.findMany({
    where,
    select: { id: true, title: true, url: true, image: true },
    take: flags.limit,
    orderBy: { updatedAt: 'asc' },
  });
  console.log(`[PruneIMDead] Candidates=${rows.length}`);
  if (!rows.length) { console.log('[PruneIMDead] Nothing to check.'); return; }

  const results: { id: string; dead: boolean; reason?: string }[] = [];
  let idx = 0;
  async function worker() {
    while (idx < rows.length) {
      const i = idx++;
      const r = rows[i];
      if (!r.url) continue;
      const res = await isDeadDetailPage(r.url, flags.timeoutMs);
      results.push({ id: r.id, dead: res.dead, reason: res.reason });
      if (res.dead) console.log(`[DEAD] ${r.id} reason=${res.reason} url=${r.url}`);
      await sleep(50); // gentle pacing
    }
  }
  await Promise.all(Array.from({ length: Math.min(flags.concurrency, rows.length || 1) }, () => worker()));

  const deadIds = results.filter((x) => x.dead).map((x) => x.id);
  console.log(`[PruneIMDead] Dead=${deadIds.length}`);

  if (flags.delete && deadIds.length) {
    const del = await prisma.savedListing.deleteMany({ where: { id: { in: deadIds } } });
    console.log(`[PruneIMDead] Deleted=${del.count}`);
  } else {
    console.log('[PruneIMDead] Dry-run (no delete). Use --delete=1 to remove.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
