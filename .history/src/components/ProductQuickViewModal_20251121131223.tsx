"use client";

import { useState, useEffect } from 'react';
import { X, Heart, ShoppingCart, ExternalLink, Package, DollarSign, Store, TrendingUp } from 'lucide-react';
import Link from 'next/link';

type ProductQuickViewProps = {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    image: string | null;
    priceMin: number | null;
    priceMax: number | null;
    currency: string | null;
    moq: number | null;
    storeName: string | null;
    platform: string;
    url: string;
    description?: string | null;
  } | null;
};

export default function ProductQuickViewModal({ isOpen, onClose, product }: ProductQuickViewProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    setSelectedImage(0);
    setIsWishlisted(false);
  }, [product?.id]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const images = product.image ? [product.image] : [];
  const priceDisplay = product.priceMin && product.priceMax
    ? `${product.currency || '$'}${product.priceMin.toFixed(2)} - ${product.currency || '$'}${product.priceMax.toFixed(2)}`
    : product.priceMin
    ? `${product.currency || '$'}${product.priceMin.toFixed(2)}`
    : 'Contact for price';

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    // TODO: Implement actual wishlist API call
  };

  const handleAddToCart = () => {
    // TODO: Implement add to cart functionality
    alert('Added to cart! (Feature coming soon)');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Modal */}
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all hover:scale-110"
          aria-label="Close modal"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
          {/* Left: Image Gallery */}
          <div className="bg-gray-50 p-8 flex flex-col items-center justify-center">
            {images.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-white shadow-md mb-4">
                  <img
                    src={images[selectedImage] || images[0]}
                    alt={product.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Thumbnails (if multiple images) */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto w-full pb-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === idx
                            ? 'border-orange-500 ring-2 ring-orange-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={img} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full aspect-square rounded-xl bg-gray-200 flex items-center justify-center">
                <Package className="w-24 h-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Right: Product Details */}
          <div className="p-8 flex flex-col">
            {/* Platform Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                <Store className="w-3.5 h-3.5" />
                {product.platform}
              </span>
              {product.storeName && (
                <span className="text-sm text-gray-600">by {product.storeName}</span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 line-clamp-3">
              {product.title}
            </h2>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <span className="text-3xl font-bold text-orange-600">{priceDisplay}</span>
              </div>
              {product.moq && (
                <span className="text-sm text-gray-500">MOQ: {product.moq} units</span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Description</h3>
                <p className="text-gray-600 text-sm line-clamp-4">{product.description}</p>
              </div>
            )}

            {/* Key Features */}
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Key Features</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-gray-600">Verified Supplier</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Fast Shipping</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Quality Assured</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-gray-600">Bulk Discounts</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500">Popularity</div>
                  <div className="text-sm font-semibold text-gray-900">High Demand</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Stock</div>
                  <div className="text-sm font-semibold text-gray-900">Available</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleWishlist}
                  className={`flex-shrink-0 p-3 rounded-lg border-2 transition-all ${
                    isWishlisted
                      ? 'bg-red-50 border-red-500 text-red-600'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-red-500 hover:text-red-600'
                  }`}
                  aria-label="Add to wishlist"
                >
                  <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>

              <Link
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:border-orange-500 hover:text-orange-600 transition-all"
              >
                <ExternalLink className="w-5 h-5" />
                View on {product.platform}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
