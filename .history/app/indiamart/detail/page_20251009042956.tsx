import React from 'react';
import Link from 'next/link';

function escapeHtml(input: string): string {
  // Minimal escaping for <, >, & characters
  return input.replace(/[<>&]/g, (ch: string) => {
    switch (ch) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      default: return ch;
    }
  });
}

async function fetchDetail(url: string, force = false) {
  const api = new URL(`${process.env.APP_BASE_URL || ''}/api/indiamart/detail`);
  api.searchParams.set('url', url);
  if (force) api.searchParams.set('force', '1');
  try {
    const res = await fetch(api.toString(), { cache: 'no-store' });
    if (!res.ok) return { error: `Proxy ${res.status}`, status: res.status };
    return await res.json();
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

export default async function IndiaMartDetailPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const raw = typeof searchParams.url === 'string' ? searchParams.url : '';
  if (!raw) {
    return <div className="p-6"><h1 className="text-xl font-semibold mb-2">IndiaMART Detail</h1><p className="text-sm text-gray-600">Missing url parameter.</p></div>;
  }
  const detail = await fetchDetail(raw, false);
  const extHref = raw;
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-xl font-semibold break-all">IndiaMART Listing</h1>
        <Link href={extHref} target="_blank" className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500">Open Original ↗</Link>
      </div>
      {detail?.error ? (
        <div className="mb-4 p-3 rounded-md border border-red-300 bg-red-50 text-sm text-red-800">
          Upstream issue: {detail.error} {detail.status ? `(status ${detail.status})` : ''}
        </div>
      ) : null}
      <div className="text-xs text-gray-500 mb-2 flex flex-wrap gap-4">
        <span>Status: {detail?.status}</span>
        {detail?.fromCache ? <span>Cached ✓</span> : <span>Live fetch</span>}
        {typeof detail?.retries === 'number' && detail.retries > 0 ? <span>Retries: {detail.retries}</span> : null}
        <span>Fetched: {detail?.fetchedAt}</span>
      </div>
      {detail?.htmlSnippet ? (
        <pre
          className="text-xs bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto max-h-[600px] whitespace-pre-wrap"
          // Using pre-escaped snippet to avoid inline replace with implicit any
          dangerouslySetInnerHTML={{ __html: escapeHtml(detail.htmlSnippet) }}
        />
      ) : (
        <p className="text-sm text-gray-600">No snippet available (status {detail?.status}).</p>
      )}
      <div className="mt-6 flex gap-3">
        <Link href={`/indiamart/detail?url=${encodeURIComponent(raw)}&force=1`} className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Force Refresh</Link>
        <Link href="/products" className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Back</Link>
      </div>
    </div>
  );
}
