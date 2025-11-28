"use client";
import { Scale } from 'lucide-react';
import { useCompareStore } from '@/store/compareStore';

interface CompareButtonProps {
  id: string;
  title: string;
  image?: string;
  url: string;
  price?: string;
  moq?: string;
  platform?: string;
  supplier?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CompareButton({
  id,
  title,
  image,
  url,
  price,
  moq,
  platform,
  supplier,
  description,
  className = '',
  size = 'md',
}: CompareButtonProps) {
  const addItem = useCompareStore((state) => state.addItem);
  const removeItem = useCompareStore((state) => state.removeItem);
  const isInCompare = useCompareStore((state) => state.isInCompare);
  const isSelected = isInCompare(id);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isSelected) {
      removeItem(id);
    } else {
      addItem({ id, title, image, url, price, moq, platform, supplier, description });
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-200 ${
        isSelected
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl'
          : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
      } hover:scale-110 ${className}`}
      aria-label={isSelected ? 'Remove from comparison' : 'Add to comparison'}
      title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
    >
      <Scale className={iconSizes[size]} />
    </button>
  );
}
