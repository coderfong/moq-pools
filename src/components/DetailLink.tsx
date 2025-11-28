"use client";
import React from 'react';

type ProductData = {
  title?: string;
  platform?: string;
  price?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  moq?: number;
  moqRaw?: string;
  storeName?: string;
  description?: string;
  priceTiers?: any[];
  detailJson?: any;
  image?: string;
  ordersRaw?: string;
  ratingRaw?: string;
};

type DetailLinkProps = {
  url: string;
  title?: string;
  className?: string;
  productData?: ProductData;
  children?: React.ReactNode;
};

export default function DetailLink({ url, title, className, productData, children }: DetailLinkProps) {
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const evt = new CustomEvent('open-detail-panel', { 
        detail: { url, title, productData } 
      });
      window.dispatchEvent(evt);
    } catch {
      window.open(url, '_blank');
    }
  };
  
  const onPrefetch = () => {
    try {
      const evt = new CustomEvent('prefetch-detail-panel', { 
        detail: { url, title, productData } 
      });
      window.dispatchEvent(evt);
    } catch {}
  };
  
  return (
    <button 
      type="button" 
      onClick={onClick} 
      onMouseEnter={onPrefetch} 
      onFocus={onPrefetch} 
      className={className || 'text-xs underline text-blue-600 hover:text-blue-800 transition-colors'}
    >
      {children || 'Details'}
    </button>
  );
}

// Helper function to open drawer programmatically
export function openProductDrawer(url: string, title?: string, productData?: ProductData) {
  try {
    const evt = new CustomEvent('open-detail-panel', {
      detail: { url, title, productData }
    });
    window.dispatchEvent(evt);
  } catch (error) {
    console.error('Failed to open product drawer:', error);
    window.open(url, '_blank');
  }
}
