import Link from 'next/link';
import { Suspense } from 'react';
import ListingsView from './view';

export const dynamic = 'force-dynamic';

export default function IndiaMartRootPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">IndiaMART Listings (mnu subtree)</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">Browsing SavedListings previously ingested for the <code>mnu</code> category subtree. Use query params: <code>?category=&lt;slug&gt;&amp;page=1</code>. Default category is <code>mnu</code>.</p>
      <Suspense fallback={<div>Loading listings...</div>}>
        {/* @ts-expect-error Async Server Component */}
        <ListingsView />
      </Suspense>
      <div className="text-xs text-gray-500">API source: <Link className="underline" href="/api/indiamart/listings?category=mnu">/api/indiamart/listings</Link></div>
    </div>
  );
}
