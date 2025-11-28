"use client";

import { useState } from 'react';
import ProductQuickViewModal from './ProductQuickViewModal';
import { Eye } from 'lucide-react';

type Product = {
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

type ProductListingWithQuickViewProps = {
  products: Product[];
  renderCard: (product: Product, onQuickView: (product: Product) => void) => React.ReactNode;
};

export default function ProductListingWithQuickView({ products, renderCard }: ProductListingWithQuickViewProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleQuickView = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Delay clearing to allow fade-out animation
    setTimeout(() => setSelectedProduct(null), 300);
  };

  return (
    <>
      {products.map((product) => renderCard(product, handleQuickView))}
      
      <ProductQuickViewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
      />
    </>
  );
}

// Standalone Quick View Button component
export function QuickViewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="absolute top-2 right-2 z-20 p-2.5 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-orange-50 hover:border-orange-300 hover:scale-110"
      aria-label="Quick view"
    >
      <Eye className="w-5 h-5 text-gray-700 group-hover:text-orange-600" />
    </button>
  );
}
