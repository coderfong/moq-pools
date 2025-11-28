"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';

type RoutesResponse = { ok: true; routes: string[] } | { ok: false; error?: string };

export default function PageDropdown() {
  const router = useRouter();
  const [routes, setRoutes] = React.useState<string[] | null>(null);
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/dev/routes', { cache: 'no-store' });
        const json = (await res.json()) as RoutesResponse;
        if (!active) return;
        if ((json as any)?.ok) {
          const list = (json as any).routes as string[];
          // Filter noise and duplicates; keep top-level and inner routes
          const filtered = list
            .filter(Boolean)
            // Remove /pools option (top-level only), all /p options, and /information/* except the root /information
            .filter((r) => {
              // remove exact /pools only (keep e.g. /admin/pools)
              if (r === '/pools') return false;
              // remove /p root and any nested under /p/
              if (r === '/p' || r.startsWith('/p/')) return false;
              // remove /indiamart and its children (e.g., /indiamart/detail)
              if (r === '/indiamart' || r.startsWith('/indiamart/')) return false;
              // keep /information root but remove children
              if (r.startsWith('/information/') ) return false;
              return true;
            });
          setRoutes(filtered);
        } else {
          setError((json as any)?.error || 'Failed to load routes');
          setRoutes([]);
        }
      } catch (e: any) {
        if (!active) return;
        setError(String(e?.message || e));
        setRoutes([]);
      }
    })();
    return () => { active = false; };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setValue(v);
    if (v) {
      router.push(v);
      // Reset selection after navigating to keep placeholder visible
      setTimeout(() => setValue(''), 0);
    }
  };

  // Hide entirely if still loading
  if (routes == null) return null;

  return (
    <div className="hidden md:flex items-center">
      <label className="sr-only" htmlFor="page-dropdown">Navigate to page</label>
      <select
        id="page-dropdown"
        className="min-w-[180px] rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-800 shadow-sm hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        value={value}
        onChange={onChange}
        title="Quick navigate to a page"
      >
        <option value="">All pages…</option>
        {routes.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {error && <span className="ml-2 text-xs text-red-600" title={error}>!</span>}
    </div>
  );
}
