"use client";

export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-orange-200"></div>
      <div className="absolute inset-0 rounded-full border-2 border-orange-600 border-t-transparent animate-spin"></div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="relative h-56 bg-gradient-to-br from-gray-200 to-gray-100">
        <div className="absolute top-4 left-4 w-20 h-7 bg-gray-300 rounded-full"></div>
        <div className="absolute top-4 right-4 w-16 h-7 bg-gray-300 rounded-full"></div>
      </div>

      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 bg-gray-300 rounded w-24"></div>
            <div className="h-3 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded-full w-full"></div>
        </div>

        {/* Price and stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <div className="h-8 bg-gray-300 rounded w-16"></div>
            <div className="h-3 bg-gray-300 rounded w-12"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 rounded w-20"></div>
            <div className="h-3 bg-gray-300 rounded w-16"></div>
          </div>
        </div>

        {/* Button */}
        <div className="h-12 bg-gray-300 rounded-xl"></div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative">
          <LoadingSpinner size="lg" />
          <div className="absolute inset-0 -z-10 bg-orange-500/20 rounded-full blur-xl animate-pulse-slow"></div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Loading...
          </h3>
          <p className="text-sm text-gray-500 font-medium">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
}

export function SkeletonPoolGrid() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function ButtonLoader({ children, loading, ...props }: any) {
  return (
    <button {...props} disabled={loading || props.disabled} className={`relative ${props.className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-inherit">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <span className={loading ? "opacity-0" : ""}>{children}</span>
    </button>
  );
}
