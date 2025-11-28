/**
 * ProductCardSkeleton - Loading skeleton for product cards
 * Displays during data fetching to improve perceived performance
 */

export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square bg-gray-200 relative">
        <div className="absolute top-3 left-3 h-6 w-20 bg-gray-300 rounded-full"></div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title lines */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
        </div>

        {/* Price and stats */}
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-1">
            <div className="h-6 bg-gray-200 rounded w-20"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2 bg-gray-200 rounded-full w-full"></div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-200 rounded w-12"></div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
          <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
          <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * ProductGridSkeleton - Grid of product card skeletons
 * @param count - Number of skeleton cards to display (default: 10)
 */
export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-5 xl:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
