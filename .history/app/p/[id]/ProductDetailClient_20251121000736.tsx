'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Heart, Share2, TrendingUp, Package, Clock, Truck, Shield, 
  ChevronLeft, ChevronRight, ExternalLink, MessageCircle,
  Star, Check, X
} from 'lucide-react';
import WishlistButton from '@/components/WishlistButton';
import CompareButton from '@/components/CompareButton';
import StatusPill from '@/components/StatusPill';
import JoinForm from './join-form';

interface ProductDetailProps {
  product: {
    id: string;
    title: string;
    description: string;
    images: string[];
    unitPrice: number;
    baseCurrency: string;
    moqQty: number;
    leadTimeDays: number;
    maxQtyPerUser: number;
    sourceUrl: string;
    supplier: {
      name: string;
      id: string;
    };
  };
  pool: {
    id: string;
    status: string;
    pledgedQty: number;
    targetQty: number;
    deadlineAt: string | null;
  };
  similarProducts: Array<{
    id: string;
    title: string;
    image: string;
    unitPrice: number;
    currency: string;
    poolProgress: number;
  }>;
}

export default function ProductDetailClient({ product, pool, similarProducts }: ProductDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'shipping' | 'qa'>('details');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const images = product.images.filter(Boolean);
  const pledged = pool.pledgedQty;
  const target = pool.targetQty;
  const progress = Math.min(100, Math.floor((pledged / Math.max(1, target)) * 100));
  const isAlmostFull = progress >= 90;
  const isLocked = pool.status === 'LOCKED' || pool.status === 'FULFILLED';

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleShare = (platform?: string) => {
    const url = window.location.href;
    const text = `Check out ${product.title} on MOQ Pools!`;
    
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
    setShowShareMenu(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/" className="hover:text-orange-600">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/pools" className="hover:text-orange-600">Pools</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium truncate">{product.title.substring(0, 50)}...</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Left Column - Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden group">
            {images.length > 0 ? (
              <>
                <img
                  src={images[currentImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-contain"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package className="w-20 h-20" />
              </div>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentImageIndex
                      ? 'border-orange-500 scale-105'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <Shield className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-900">Buyer Protection</p>
            </div>
            <div className="text-center">
              <Package className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-900">Quality Assured</p>
            </div>
            <div className="text-center">
              <Truck className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-900">Fast Shipping</p>
            </div>
          </div>
        </div>

        {/* Right Column - Details & Actions */}
        <div className="space-y-6">
          {/* Title & Actions */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{product.title}</h1>
              <div className="flex items-center gap-2">
                <WishlistButton 
                  productId={product.id}
                  productTitle={product.title}
                  productImage={images[0]}
                  productUrl={`/p/${product.id}`}
                  productPrice={`${product.baseCurrency} ${product.unitPrice}`}
                  size="lg"
                />
                <CompareButton
                  item={{
                    id: product.id,
                    title: product.title,
                    image: images[0] || '',
                    url: `/p/${product.id}`,
                    price: `${product.baseCurrency} ${product.unitPrice}`,
                    moq: product.moqQty.toString(),
                    platform: 'Pool',
                    supplier: product.supplier.name,
                  }}
                />
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-10 min-w-[160px]">
                      <button
                        onClick={() => handleShare('twitter')}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Share on Twitter
                      </button>
                      <button
                        onClick={() => handleShare('facebook')}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Share on Facebook
                      </button>
                      <button
                        onClick={() => handleShare('linkedin')}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Share on LinkedIn
                      </button>
                      <button
                        onClick={() => handleShare()}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Copy Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Supplier */}
            <Link 
              href={`/products?supplier=${product.supplier.id}`}
              className="text-sm text-gray-600 hover:text-orange-600 inline-flex items-center gap-1"
            >
              by <span className="font-medium">{product.supplier.name}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Pricing Card */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-6">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-orange-600">
                {product.baseCurrency} {product.unitPrice.toFixed(2)}
              </span>
              <span className="text-gray-600">/ unit</span>
            </div>

            {/* Status & Progress */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <StatusPill status={pool.status} />
                {isAlmostFull && (
                  <span className="text-xs font-semibold text-red-600 animate-pulse">
                    🔥 Almost Full!
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">{pledged} joined</span>
                  <span className="text-gray-600">{target} needed (MOQ)</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      progress >= 100
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : progress >= 90
                        ? 'bg-gradient-to-r from-orange-500 to-red-500'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 text-center">{progress}% to MOQ</p>
              </div>
            </div>

            {/* CTA Button */}
            {!isLocked ? (
              <Link
                href={`/checkout?poolId=${pool.id}`}
                className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center px-6 py-4 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Join Pool Now
              </Link>
            ) : (
              <div className="bg-gray-100 text-gray-600 text-center px-6 py-4 rounded-xl font-semibold">
                Pool Closed
              </div>
            )}
            
            {/* Legacy Form */}
            <div className="mt-4">
              <JoinForm productId={product.id} poolId={pool.id} maxQty={product.maxQtyPerUser} />
            </div>
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <Package className="w-5 h-5 text-gray-600 mb-2" />
              <p className="text-xs text-gray-600 mb-1">Minimum Order</p>
              <p className="text-lg font-bold text-gray-900">{product.moqQty} units</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <Clock className="w-5 h-5 text-gray-600 mb-2" />
              <p className="text-xs text-gray-600 mb-1">Lead Time</p>
              <p className="text-lg font-bold text-gray-900">~{product.leadTimeDays} days</p>
            </div>
          </div>

          {/* Source Link */}
          {product.sourceUrl && (
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-orange-600 border border-gray-300 rounded-lg py-2 hover:border-orange-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on Supplier Site
            </a>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mb-12">
        {/* Tab Headers */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-8 overflow-x-auto">
            {[
              { id: 'details', label: 'Product Details' },
              { id: 'specs', label: 'Specifications' },
              { id: 'shipping', label: 'Shipping & Returns' },
              { id: 'qa', label: 'Q&A' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="prose max-w-none">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">About This Product</h3>
              <p className="text-gray-700 leading-relaxed">{product.description || 'No description available.'}</p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Why Join a Pool?</h4>
                <ul className="text-sm text-blue-900 space-y-1">
                  <li>✓ Access wholesale pricing without meeting large MOQs alone</li>
                  <li>✓ Share shipping costs with other buyers</li>
                  <li>✓ Payment held in escrow until MOQ is reached</li>
                  <li>✓ Full refund if pool doesn't fill by deadline</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Technical Specifications</h3>
              <div className="grid gap-3">
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">MOQ (Minimum Order Quantity)</span>
                  <span className="text-gray-900">{product.moqQty} units</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Unit Price</span>
                  <span className="text-gray-900">{product.baseCurrency} {product.unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Lead Time</span>
                  <span className="text-gray-900">{product.leadTimeDays} days after MOQ met</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Max Per User</span>
                  <span className="text-gray-900">{product.maxQtyPerUser} units</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Supplier</span>
                  <span className="text-gray-900">{product.supplier.name}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Shipping Information</h3>
                <div className="space-y-2 text-gray-700">
                  <p>• Estimated delivery: {product.leadTimeDays} days after MOQ is met</p>
                  <p>• Shipping cost calculated at checkout based on your location</p>
                  <p>• Tracking number provided once order ships</p>
                  <p>• International shipping available</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Returns & Refunds</h3>
                <div className="space-y-2 text-gray-700">
                  <p>• Full refund if pool doesn't reach MOQ by deadline</p>
                  <p>• Cancel anytime before pool locks</p>
                  <p>• 7-day return policy for defective items</p>
                  <p>• Buyer protection guaranteed</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qa' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Questions & Answers</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Ask Question
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-orange-600">Q</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-2">What happens if the pool doesn't fill?</p>
                      <div className="flex items-start gap-3 mt-3 pl-11">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-green-600">A</span>
                        </div>
                        <p className="text-gray-700 text-sm">
                          If the pool doesn't reach the MOQ by the deadline, all payments are automatically refunded in full. No fees, no penalties.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No questions yet. Be the first to ask!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Similar Products</h2>
            <Link href="/pools" className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similarProducts.map((item) => (
              <Link
                key={item.id}
                href={`/p/${item.id}`}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="aspect-square bg-gray-100">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-orange-600">
                    {item.title}
                  </h3>
                  <p className="text-lg font-bold text-orange-600 mb-2">
                    {item.currency} {item.unitPrice.toFixed(2)}
                  </p>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${item.poolProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{item.poolProgress}% filled</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
