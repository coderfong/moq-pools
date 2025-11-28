import { NextResponse } from 'next/server';
// AliExpress removed
import { fetchAlibaba } from '@/lib/providers/alibaba';
import { fetchC1688 } from '@/lib/providers/c1688';
import { fetchMadeInChina } from '@/lib/providers/madeinchina';
import { fetchIndiaMart } from '@/lib/providers/indiamart';
import { getIndiaMartSearchTerms, findIndiaMartLeaf } from '@/lib/indiamartCategories';
import type { ExternalListing } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  // If a leaf key is provided (lk param), derive multi-level fallback terms automatically for IndiaMART
  // Accept legacy imLeaf param as alias for lk
  const leafKey = searchParams.get('lk') || searchParams.get('imLeaf') || undefined; // expected to be IndiaMART leaf key
  const platform = (searchParams.get('platform') || 'ALIBABA').toUpperCase();
  // Allow larger responses to support longer pages/infinite scroll; default 100, cap 240
  const limit = Math.min(240, Math.max(1, Number(searchParams.get('limit') || '100')));
  // Default to headless=true unless explicitly disabled
  const headless = /^(0|false|no)$/i.test(String(searchParams.get('headless') || '1')) ? false : true;

  try {
    let items: ExternalListing[] = [];
    if (!q) return NextResponse.json({ items: [] });
  if (platform === 'ALIBABA') items = await fetchAlibaba(q, limit, { headless });
  else if (platform === 'C1688') items = await fetchC1688(q, limit, { headless });
  else if (platform === 'MADE_IN_CHINA') items = await fetchMadeInChina(q, limit, { headless, upgradeImages: false });
  else if (platform === 'INDIAMART') {
      // Fallback escalation logic:
      // 1. If lk provided -> derive ordered terms from taxonomy helpers
      // 2. Else if q contains '||' separated terms treat as manual fallback list
      // 3. Iterate until we gather at least minDesired results or exhaust terms
      const minDesired = Math.min(30, limit); // early stop threshold
      let termList: string[] = [];
      if (leafKey) {
        const leaf = findIndiaMartLeaf(leafKey);
        if (leaf) termList = getIndiaMartSearchTerms(leaf.key);
      }
      if (termList.length === 0) {
        termList = q.split('||').map(s => s.trim()).filter(Boolean);
      }
      if (termList.length === 0) termList = [q];
      const collected: ExternalListing[] = [];
      for (const term of termList) {
        if (collected.length >= limit) break;
        if (!term) continue;
        const batch = await fetchIndiaMart(term, limit - collected.length, { headless });
        // Deduplicate by URL
        for (const b of batch) {
          if (collected.some(x => x.url === b.url)) continue;
          collected.push(b);
        }
        if (collected.length >= minDesired) break; // early success
      }
      items = collected.slice(0, limit);
  }
  
    else return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });

    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
