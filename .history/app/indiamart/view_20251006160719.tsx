import 'server-only';
import { notFound } from 'next/navigation';

interface ApiListing {
  id: string; url: string; title: string; image?: string | null; priceRaw?: string | null; priceMin?: number | null; priceMax?: number | null; currency?: string | null; moq?: number | null; storeName?: string | null; categories: string[]; terms: string[]; createdAt: string;
}

async function fetchListings(category: string, page: number) {
  const qs = new URLSearchParams({ category, page: String(page), pageSize: '40', recursive: '1' });
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/indiamart/listings?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load listings');
  return res.json() as Promise<{ page:number; pageSize:number; total:number; listings: ApiListing[]; categories:string[] }>;
}

export default async function ListingsView({ category, page }: { category?: string; page?: number }) {
  const search = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search); // SSR: window undefined
  const cat = category || 'mnu';
  const pg = page || 1;
  let data: Awaited<ReturnType<typeof fetchListings>> | null = null;
  try { data = await fetchListings(cat, pg); } catch (e) { console.error(e); }
  if (!data) return notFound();
  const { listings, total, page: cur, pageSize } = data;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Category: <code>{cat}</code> • {total} items</div>
        <div className="text-xs text-gray-500">Page {cur} / {pages}</div>
      </div>
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
    </div>
  );
}
