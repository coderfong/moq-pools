"use client";

import { useState } from 'react';
import ProductQuickViewModal from './ProductQuickViewModal';
import { Eye } from 'lucide-react';

type QuickViewWrapperProps = {
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
  };
  children: React.ReactNode;
};

export default function QuickViewWrapper({ product, children }: QuickViewWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <div className="relative">
      {children}
      
      {/* Quick View Button */}
      <button
        onClick={handleQuickView}
        className="absolute top-3 right-3 z-20 p-2.5 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-orange-50 hover:border-orange-300 hover:scale-110"
        aria-label="Quick view"
        title="Quick view"
      >
        <Eye className="w-5 h-5 text-gray-700 hover:text-orange-600" />
      </button>

      {/* Modal */}
      <ProductQuickViewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
      />
    </div>
  );
}
