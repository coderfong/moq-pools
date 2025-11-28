import 'server-only';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import GridDensityPreference from '@/components/GridDensityPreference';

interface ApiListing {
  id: string; url: string; title: string; image?: string | null; priceRaw?: string | null; priceMin?: number | null; priceMax?: number | null; currency?: string | null; moq?: number | null; storeName?: string | null; categories: string[]; terms: string[]; createdAt: string;
}

async function fetchListings(category: string, page: number, pageSize: number, tax: boolean) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const qs = new URLSearchParams({ category, page: String(page), pageSize: String(pageSize), recursive: '1', tax: tax ? '1' : '0' });
  const res = await fetch(`${baseUrl}/api/indiamart/listings?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load listings');
  return res.json() as Promise<{ page:number; pageSize:number; total:number; listings: ApiListing[]; categories:string[] }>;
}

interface CoverageResponse { platform:string; totalListings:number; leafTotals:{ key:string; label:string; count:number }[]; sparse:number; p50:number; p90:number; p95:number; p99:number; generatedAt:string; }
async function fetchCoverage(): Promise<CoverageResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  try {
    const res = await fetch(`${baseUrl}/api/indiamart/leaf-counts?limit=400&sort=asc`, { cache: 'no-store' });
    if(!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function ListingsView({ searchParams }: { searchParams: Record<string,string|undefined> }) {
  const cat = (searchParams.category || 'mnu').toString();
  const pg = Math.max(1, Number(searchParams.page || '1'));
  // Increase default page size to surface more IndiaMART listings at once.
  // Hard cap raised in API route (match there) to 150 to avoid excessive payloads.
  const size = Math.min(150, Math.max(1, Number(searchParams.pageSize || '80')));
  const tax = searchParams.tax !== '0';
  const showCoverage = searchParams.coverage === '1';
  // Grid density (columns)
  const colsQ = Number(searchParams.cols || '');
  const selectedCols = ([5,6,7,8] as number[]).includes(colsQ) ? colsQ : 5;
  const GRID_COLS: Record<number, string> = {
    5: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5',
    6: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6',
    7: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 xl:grid-cols-7 2xl:grid-cols-7',
    8: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-8 xl:grid-cols-8 2xl:grid-cols-8',
  };
  const gridColsClass = GRID_COLS[selectedCols] || GRID_COLS[5];
  let data: Awaited<ReturnType<typeof fetchListings>> | null = null;
  let coverage: Awaited<ReturnType<typeof fetchCoverage>> | null = null;
  try { data = await fetchListings(cat, pg, size, tax); } catch (e) { console.error(e); }
  if (showCoverage) { coverage = await fetchCoverage(); }
  if (!data) return notFound();
  const { listings, total, page: cur, pageSize } = data;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="space-y-4">
      {/* Persist and restore grid density (cols) preference */}
      <GridDensityPreference />
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div className="space-y-1">
          <div className="text-sm font-medium">Category: <code>{cat}</code></div>
          <div className="text-xs text-gray-500">{total} items • Page {cur} / {pages}</div>
        </div>
           <form className="flex gap-2" action="/indiamart" method="get">
          <input name="category" defaultValue={cat} className="border rounded px-2 py-1 text-sm" placeholder="category slug" />
          <input name="pageSize" aria-label="Page size" title="Page size" defaultValue={String(pageSize)} className="border rounded px-2 py-1 w-20 text-sm" />
          <input type="hidden" name="coverage" value={showCoverage ? '1' : (searchParams.coverage || '0')} />
             <input type="hidden" name="tax" value={searchParams.tax || '1'} />
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" type="submit">Go</button>
        </form>
      </div>
          <div className="text-xs text-gray-500">{total} items • Page {cur} / {pages} {tax && <span className="ml-2 italic">(taxonomy expansion on)</span>}</div>
      <div className="flex flex-wrap gap-3 text-xs items-center">
        <Link href={`/indiamart?category=${cat}&page=${pg}&pageSize=${pageSize}&tax=${tax ? '1':'0'}&coverage=${showCoverage ? '0':'1'}&cols=${selectedCols}`} className="underline text-blue-600">{showCoverage ? 'Hide coverage' : 'Show coverage'}</Link>
        {(() => {
          const sizes = [5,6,7,8] as const;
          const buildHref = (cc: number) => {
            const usp = new URLSearchParams({ category: cat, page: String(pg), pageSize: String(pageSize), tax: tax ? '1' : '0', coverage: showCoverage ? '1':'0', cols: String(cc) });
            return `/indiamart?${usp.toString()}`;
          };
          return (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Per row:</span>
              <div className="inline-flex rounded-md overflow-hidden ring-1 ring-gray-300 dark:ring-gray-700">
                {sizes.map((cc, idx) => {
                  const active = cc === selectedCols;
                  const base = 'px-2.5 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black';
                  const tone = active ? 'bg-black text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700';
                  const sep = idx > 0 ? 'border-l border-gray-300 dark:border-gray-700' : '';
                  return (
                    <Link key={cc} href={buildHref(cc)} className={`${base} ${tone} ${sep}`}>{cc}</Link>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
      {showCoverage && coverage && (
        <div className="border rounded p-3 bg-white/60 dark:bg-gray-900/40 text-xs space-y-2">
          <div className="font-semibold text-sm">Coverage Summary</div>
          <div className="flex flex-wrap gap-4">
            <span>Total listings: {coverage.totalListings}</span>
            <span>Zero leaves: {coverage.sparse}</span>
            <span>P50: {coverage.p50}</span>
            <span>P90: {coverage.p90}</span>
            <span>P95: {coverage.p95}</span>
            <span>P99: {coverage.p99}</span>
          </div>
          <CoverageBars coverage={coverage} />
        </div>
      )}
      <ul className={`${gridColsClass} gap-4`}>
        {listings.map(l => {
          // Normalize image: prefer local cached path (/cache/...) else external. Some records may have null.
          const img = l.image && l.image.trim().length > 0 ? l.image : null;
          // Format price prominently: prefer structured fields when present, else priceRaw
          const fmtCurrency = (c?: string | null) => {
            const cur = String(c || '').toUpperCase();
            if (cur === 'USD' || cur === 'US$' || cur === 'USD$') return '$';
            if (cur === 'INR' || cur === '₹') return '₹';
            if (cur === 'CNY' || cur === 'RMB' || cur === '¥' || cur === '￥') return '¥';
            return cur || '';
          };
          const priceText = (() => {
            const sym = fmtCurrency(l.currency);
            const min = typeof l.priceMin === 'number' && isFinite(l.priceMin) ? l.priceMin : null;
            const max = typeof l.priceMax === 'number' && isFinite(l.priceMax) ? l.priceMax : null;
            if (min != null && max != null) {
              if (min === max) return `${sym}${min}`;
              return `${sym}${min} - ${sym}${max}`;
            }
            if (min != null) return `${sym}${min}`;
            if (l.priceRaw && l.priceRaw.trim()) return l.priceRaw.trim();
            return '';
          })();
          return (
            <li key={l.id} className="border rounded-2xl p-3 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-card hover:shadow-lg transition hover:-translate-y-0.5 flex flex-col">
              <div className="relative aspect-square mb-2 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center group">
                {img ? (
                  // Use next/image for optimization (remotePatterns/local should be allowed). Layout fill replaced by explicit sizes.
                  <Image
                    src={img.startsWith('/cache/') ? img : img}
                    alt={l.title}
                    fill
                    sizes="(max-width:640px) 100vw, 25vw"
                    className="object-cover transition-transform duration-300 ease-out-quart group-hover:scale-[1.04]"
                    unoptimized={img.startsWith('http') && !process.env.NEXT_PUBLIC_IMAGE_REMOTE_OPT}
                  />
                ) : (
                  <div className="text-[10px] text-gray-400">No image</div>
                )}
              </div>
              {l.storeName ? (
                <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate" title={l.storeName}>{l.storeName}</div>
              ) : null}
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm mt-0.5 text-gray-900 dark:text-gray-100 hover:underline">{l.title}</a>
              <div className="mt-1 text-lg font-semibold text-orange-600">{priceText ? `${priceText} / unit` : 'See listing'}</div>
              <div className="mt-auto pt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {typeof l.moq === 'number' && <div>MOQ: {l.moq}</div>}
                <div className="flex flex-wrap gap-1">
                  {l.categories.slice(0,3).map(c => <span key={c} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">{c}</span>)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <nav className="flex flex-wrap gap-2 pt-2">
          {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 50).map(p => {
            const sp = new URLSearchParams({ category: cat, page: String(p), pageSize: String(pageSize), tax: tax ? '1' : '0', coverage: showCoverage ? '1':'0' });
            return (
              <Link key={p} href={`/indiamart?${sp.toString()}`} className={`px-2 py-1 rounded text-xs border ${p===cur? 'bg-blue-600 text-white border-blue-600':'bg-white dark:bg-gray-800'}`}>{p}</Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function CoverageBars({ coverage }: { coverage: CoverageResponse }) {
  const sample = coverage.leafTotals.slice(0, 120);
  const buckets = [0,1,2,3,4,5,6,7,8,12,20];
  const counts = buckets.map((b,i)=> sample.filter(r=> r.count >= b && r.count < (buckets[i+1] ?? Infinity)).length);
  const max = Math.max(1, ...counts);
  return (
    <div className="flex flex-wrap gap-1 items-end">
      {counts.map((c,i)=> {
        const height = 8 + (c/max)*40;
        const label = `${buckets[i]}${buckets[i+1]?'-'+(buckets[i+1]-1):'+'}`;
        return (
          <div key={i} className="flex flex-col items-center">
            {/* Use a CSS custom property applied via style attribute only for variable height, else Tailwind classes; linter disallows generic inline style so we restrict to --h token */}
            <div className="im-bar bg-blue-500/70 rounded-t w-3" data-h={height} title={`${label}: ${c}`}></div>
            <div className="text-[9px] mt-0.5 text-gray-600 dark:text-gray-400">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
