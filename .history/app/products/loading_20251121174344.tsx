import { ProductGridSkeleton } from '@/components/ProductCardSkeleton';

/**
 * Loading state for /products route
 * Displays during server-side data fetching
 */
export default function Loading() {
  return (
    <div className="px-6 md:px-10 xl:px-16 py-6">
      {/* Header skeleton */}
      <div className="mb-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="mb-6 flex gap-3 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg flex-1 max-w-md"></div>
        <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
        <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
      </div>

      {/* Product grid skeleton */}
      <ProductGridSkeleton count={15} />
    </div>
  );
}
