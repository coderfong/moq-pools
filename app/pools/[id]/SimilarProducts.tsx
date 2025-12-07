"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  title: string;
  image: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  moq: number | null;
  platform: string;
  pledgedQty?: number;
  targetQty?: number;
}

export default function SimilarProducts({ 
  currentProductId, 
  categories 
}: { 
  currentProductId: string; 
  categories: string[];
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      try {
        const categoryParam = categories.join(',');
        const res = await fetch(
          `/api/products/similar?id=${currentProductId}&categories=${encodeURIComponent(categoryParam)}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch similar products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarProducts();
  }, [currentProductId, categories]);

  const itemsPerPage = 4;
  const maxIndex = Math.max(0, products.length - itemsPerPage);

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  if (loading) {
    return (
      <div className="mt-6 sm:mt-8 md:mt-12">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-5 md:mb-6 bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent">
          Similar Products
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 sm:h-40 md:h-48 rounded-lg mb-2 sm:mb-3"></div>
              <div className="bg-gray-200 h-3 sm:h-4 rounded mb-1 sm:mb-2"></div>
              <div className="bg-gray-200 h-3 sm:h-4 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const visibleProducts = products.slice(currentIndex, currentIndex + itemsPerPage);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;

  return (
    <div className="mt-6 sm:mt-8 md:mt-12">
      <h2 className="text-lg sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8 bg-gradient-to-r from-gray-900 via-orange-600 to-amber-600 bg-clip-text text-transparent">
        Similar Products You May Like
      </h2>
      
      <div className="relative px-2">
        {/* Previous Button */}
        {canGoPrev && (
          <button
            onClick={handlePrev}
            disabled={isTransitioning}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-4 md:-translate-x-6 z-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full p-1.5 sm:p-2 md:p-3 shadow-md sm:shadow-lg md:shadow-xl border sm:border-2 border-white hover:from-orange-600 hover:to-amber-600 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous products"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Products Grid with Smooth Transition */}
        <div className="overflow-hidden">
          <div 
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 transition-all duration-500 ease-in-out"
            style={{
              opacity: isTransitioning ? 0.5 : 1,
              transform: isTransitioning ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            {visibleProducts.map((product, index) => {
              const progress = product.targetQty 
                ? Math.min(100, Math.round(((product.pledgedQty || 0) / product.targetQty) * 100))
                : 0;
              const moqReached = product.pledgedQty && product.targetQty && product.pledgedQty >= product.targetQty;

              return (
                <Link
                  key={product.id}
                  href={`/pools/${product.id}`}
                  className="group block bg-white rounded-lg sm:rounded-xl border sm:border-2 border-orange-100 hover:border-orange-400 shadow-sm sm:shadow-md hover:shadow-xl sm:hover:shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div className="relative h-32 sm:h-40 md:h-48 lg:h-56 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        className="object-contain p-2 group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Platform Badge */}
                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 md:top-3 md:left-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[8px] sm:text-[10px] md:text-xs font-bold px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-full shadow-sm sm:shadow-md md:shadow-lg">
                      {product.platform.toUpperCase()}
                    </div>

                    {/* MOQ Status Badge */}
                    {moqReached && (
                      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 md:top-3 md:right-3 bg-green-500 text-white text-[8px] sm:text-[10px] md:text-xs font-bold px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-full shadow-sm sm:shadow-md md:shadow-lg flex items-center gap-0.5 sm:gap-1">
                        <span>✓</span> Active
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 sm:p-3 md:p-4">
                    <h3 className="font-bold text-gray-900 text-[10px] sm:text-xs md:text-sm line-clamp-2 mb-1.5 sm:mb-2 md:mb-3 h-7 sm:h-8 md:h-10 group-hover:text-orange-600 transition-colors">
                      {product.title}
                    </h3>

                    {/* MOQ Progress Bar */}
                    {product.targetQty && (
                      <div className="mb-1.5 sm:mb-2 md:mb-3">
                        <div className="flex items-center justify-between text-[8px] sm:text-[10px] md:text-xs mb-1 sm:mb-1.5">
                          <span className="text-gray-600 font-medium">Pool Progress</span>
                          <span className={`font-bold ${moqReached ? 'text-green-600' : 'text-orange-600'}`}>
                            {product.pledgedQty || 0}/{product.targetQty}
                          </span>
                        </div>
                        <div className="relative h-1 sm:h-1.5 md:h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div 
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                              moqReached 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                : 'bg-gradient-to-r from-orange-400 to-amber-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-[10px] sm:text-xs md:text-sm border-t border-gray-100 pt-1.5 sm:pt-2 md:pt-3">
                      <div>
                        {product.priceMin != null && (
                          <span className="font-bold text-orange-600 text-xs sm:text-sm md:text-base">
                            {product.currency || '$'}{product.priceMin.toFixed(2)}
                            {product.priceMax != null && product.priceMax !== product.priceMin && (
                              <span className="text-[10px] sm:text-xs md:text-sm"> - {product.currency || '$'}{product.priceMax.toFixed(2)}</span>
                            )}
                          </span>
                        )}
                      </div>
                      {product.moq != null && (
                        <span className="text-[8px] sm:text-[10px] md:text-xs text-gray-500 bg-gray-100 px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 rounded">
                          MOQ: {product.moq}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Next Button */}
        {canGoNext && (
          <button
            onClick={handleNext}
            disabled={isTransitioning}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-4 md:translate-x-6 z-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full p-1.5 sm:p-2 md:p-3 shadow-md sm:shadow-lg md:shadow-xl border sm:border-2 border-white hover:from-orange-600 hover:to-amber-600 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next products"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Dots Indicator */}
      {products.length > itemsPerPage && (
        <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3 mt-4 sm:mt-6 md:mt-8">
          {[...Array(Math.ceil(products.length / itemsPerPage))].map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (!isTransitioning) {
                  setIsTransitioning(true);
                  setCurrentIndex(i * itemsPerPage);
                  setTimeout(() => setIsTransitioning(false), 500);
                }
              }}
              disabled={isTransitioning}
              className={`h-1.5 sm:h-2 md:h-2.5 rounded-full transition-all duration-300 ${
                Math.floor(currentIndex / itemsPerPage) === i
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 w-6 sm:w-8 md:w-10 shadow-sm sm:shadow-md'
                  : 'bg-gray-300 hover:bg-orange-300 w-1.5 sm:w-2 md:w-2.5'
              }`}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
