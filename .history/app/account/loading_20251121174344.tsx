/**
 * Loading state for /account routes
 * Displays during server-side data fetching for user account pages
 */
export default function Loading() {
  return (
    <div className="px-6 md:px-10 xl:px-16 py-10">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>

        {/* Navigation tabs skeleton */}
        <div className="mb-6 flex gap-4 border-b border-gray-200 pb-0 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-t w-24"></div>
          <div className="h-10 bg-gray-200 rounded-t w-24"></div>
          <div className="h-10 bg-gray-200 rounded-t w-24"></div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-4 animate-pulse">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
