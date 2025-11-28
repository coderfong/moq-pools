import 'server-only';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface ApiListing {
  id: string; url: string; title: string; image?: string | null; priceRaw?: string | null; priceMin?: number | null; priceMax?: number | null; currency?: string | null; moq?: number | null; storeName?: string | null; categories: string[]; terms: string[]; createdAt: string;
}

async function fetchListings(category: string, page: number, pageSize: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const qs = new URLSearchParams({ category, page: String(page), pageSize: String(pageSize), recursive: '1' });
  const res = await fetch(`${baseUrl}/api/indiamart/listings?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load listings');
  return res.json() as Promise<{ page:number; pageSize:number; total:number; listings: ApiListing[]; categories:string[] }>;
}

export default async function ListingsView({ searchParams }: { searchParams: Record<string,string|undefined> }) {
  const cat = (searchParams.category || 'mnu').toString();
  const pg = Math.max(1, Number(searchParams.page || '1'));
  // Increase default page size to surface more IndiaMART listings at once.
  // Hard cap raised in API route (match there) to 150 to avoid excessive payloads.
  const size = Math.min(150, Math.max(1, Number(searchParams.pageSize || '80')));
  let data: Awaited<ReturnType<typeof fetchListings>> | null = null;
  try { data = await fetchListings(cat, pg, size); } catch (e) { console.error(e); }
  if (!data) return notFound();
  const { listings, total, page: cur, pageSize } = data;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div className="space-y-1">
          <div className="text-sm font-medium">Category: <code>{cat}</code></div>
          <div className="text-xs text-gray-500">{total} items • Page {cur} / {pages}</div>
        </div>
           <form className="flex gap-2" action="/indiamart" method="get">
          <input name="category" defaultValue={cat} className="border rounded px-2 py-1 text-sm" placeholder="category slug" />
          <input name="pageSize" aria-label="Page size" title="Page size" defaultValue={String(pageSize)} className="border rounded px-2 py-1 w-20 text-sm" />
             <input type="hidden" name="tax" value={searchParams.tax || '1'} />
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" type="submit">Go</button>
        </form>
      </div>
          <div className="text-xs text-gray-500">{total} items • Page {cur} / {pages} {searchParams.tax !== '0' && <span className="ml-2 italic">(taxonomy expansion on)</span>}</div>
      <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {listings.map(l => (
          <li key={l.id} className="border rounded p-3 bg-white/50 dark:bg-gray-900/30 shadow-sm flex flex-col">
            {l.image && <img src={l.image} alt={l.title} className="w-full h-32 object-cover rounded mb-2" />}
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm line-clamp-2 hover:underline">{l.title}</a>
            <div className="mt-auto pt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {l.priceRaw && <div>Price: {l.priceRaw}</div>}
              {typeof l.moq === 'number' && <div>MOQ: {l.moq}</div>}
              {l.storeName && <div className="truncate">Store: {l.storeName}</div>}
              <div className="flex flex-wrap gap-1">
                {l.categories.slice(0,3).map(c => <span key={c} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">{c}</span>)}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav className="flex flex-wrap gap-2 pt-2">
          {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 50).map(p => {
            const sp = new URLSearchParams({ category: cat, page: String(p), pageSize: String(pageSize) });
            return (
              <Link key={p} href={`/indiamart?${sp.toString()}`} className={`px-2 py-1 rounded text-xs border ${p===cur? 'bg-blue-600 text-white border-blue-600':'bg-white dark:bg-gray-800'}`}>{p}</Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
