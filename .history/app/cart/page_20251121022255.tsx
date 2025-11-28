"use client";

import ShoppingCart from '@/src/components/ShoppingCart';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function CartPage() {
  const handleCheckout = () => {
    // Redirect to checkout page
    window.location.href = '/checkout';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back to Shopping */}
        <Link 
          href="/products" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Continue Shopping</span>
        </Link>

        {/* Page Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {/* Shopping Cart Component */}
        <ShoppingCart onCheckout={handleCheckout} />
      </div>
    </div>
  );
}
