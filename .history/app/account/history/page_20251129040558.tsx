"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface ProductView {
  id: string;
  productTitle: string;
  productImage: string | null;
  productUrl: string;
  viewedAt: string;
  savedListing?: {
    id: string;
    title: string;
    image: string | null;
    priceMin: number | null;
    priceMax: number | null;
    currency: string | null;
    moq: number | null;
    storeName: string | null;
  } | null;
}

export default function HistoryPage() {
  const [views, setViews] = React.useState<ProductView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch('/api/product-views');
        const data = await response.json();
        
        if (data.success) {
          setViews(data.views);
        } else {
          setError(data.error || 'Failed to load history');
        }
      } catch (err) {
        setError('Failed to load browsing history');
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPrice = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const curr = currency || 'USD';
    if (min === max || !max) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(min || 0);
    }
    return `${new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(min || 0)} - ${new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(max)}`;
  };

  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 py-6 text-neutral-900">
      <h1 className="text-2xl font-bold">Browsing History</h1>
      
      {loading && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Loading your browsing history...
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && views.length === 0 && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm text-neutral-600">No browsing history yet.</p>
          <Link 
            href="/products" 
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            Browse Products
          </Link>
        </div>
      )}

      {!loading && !error && views.length > 0 && (
        <div className="mt-4 space-y-3">
          {views.map((view) => {
            const listing = view.savedListing;
            const title = listing?.title || view.productTitle;
            const image = listing?.image || view.productImage;
            const price = listing ? formatPrice(listing.priceMin, listing.priceMax, listing.currency) : null;
            const moq = listing?.moq;
            const storeName = listing?.storeName;
            const url = listing ? `/pools/${listing.id}` : view.productUrl;

            return (
              <Link 
                key={view.id}
                href={url}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {image ? (
                      <Image
                        src={image}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-400">
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-neutral-900 line-clamp-2">
                      {title}
                    </h3>
                    
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                      {price && (
                        <span className="font-medium text-neutral-900">{price}</span>
                      )}
                      {moq && (
                        <span>MOQ: {moq} units</span>
                      )}
                      {storeName && (
                        <span className="truncate max-w-[200px]">{storeName}</span>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-neutral-500">
                      Viewed {formatDate(view.viewedAt)}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

