"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, TrendingUp, ShoppingBag } from 'lucide-react';

interface RecommendedProduct {
  id: string;
  title: string;
  image: string;
  price: string;
  url: string;
  reason?: string;
}

interface ProductRecommendationsProps {
  userId?: string;
  currentProductId?: string;
  limit?: number;
  className?: string;
}

export default function ProductRecommendations({
  userId,
  currentProductId,
  limit = 6,
  className = '',
}: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // In production, this would call your AI recommendation API
        // For now, using mock data
        const mockRecommendations: RecommendedProduct[] = [
          {
            id: '1',
            title: 'Premium Mechanical Keyboard Kit',
            image: '/cache/e186fc621035f4c6919ede962d2ae332433908a4.webp',
            price: '$89.99',
            url: '/products/1',
            reason: 'Based on your recent views',
          },
          {
            id: '2',
            title: 'Artisan Keycap Set - Cherry Profile',
            image: '/cache/e189a0b8652e56a67b57cb4d8e6d8cdf3c5b2ec3.webp',
            price: '$45.00',
            url: '/products/2',
            reason: 'Frequently bought together',
          },
          {
            id: '3',
            title: 'Custom Coiled USB Cable',
            image: '/cache/e196bdf6eca09f8148c4c505cbeb1986b142f9e1.webp',
            price: '$29.99',
            url: '/products/3',
            reason: 'Popular in your category',
          },
          {
            id: '4',
            title: 'Switch Lubing Kit Pro',
            image: '/cache/e19d286f7a0cd2c4552d013deb72c4e5c46255c3.jpg',
            price: '$19.99',
            url: '/products/4',
            reason: 'Trending now',
          },
          {
            id: '5',
            title: 'Desk Mat XXL - Premium Fabric',
            image: '/cache/e1c9822dff934fd3f894a4de5f07a3099acc9ff9.jpg',
            price: '$34.99',
            url: '/products/5',
            reason: 'Completes your setup',
          },
          {
            id: '6',
            title: 'Wrist Rest - Memory Foam',
            image: '/cache/e1efd3cc08171046b93eb971cdb5eb5281dd2df5.jpg',
            price: '$24.99',
            url: '/products/6',
            reason: 'Recommended for you',
          },
        ];

        setTimeout(() => {
          setRecommendations(mockRecommendations.slice(0, limit));
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, currentProductId, limit]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl animate-pulse h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-orange-600" />
        <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
        <span className="text-sm text-gray-500">Powered by AI</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {recommendations.map((product) => (
          <Link
            key={product.id}
            href={product.url}
            className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          >
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              <Image
                src={product.image}
                alt={product.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors">
                {product.title}
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-orange-600">{product.price}</span>
              </div>
              
              {product.reason && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <TrendingUp className="w-3 h-3" />
                  <span>{product.reason}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          View All Products
        </Link>
      </div>
    </div>
  );
}
