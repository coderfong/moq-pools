"use client";
import { useState } from 'react';
import { Heart } from 'lucide-react';

interface WishlistButtonProps {
  savedListingId?: string;
  productId?: string;
  productTitle: string;
  productImage?: string;
  productUrl: string;
  productPrice?: string;
  productMoq?: string;
  platform?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function WishlistButton({
  savedListingId,
  productId,
  productTitle,
  productImage,
  productUrl,
  productPrice,
  productMoq,
  platform,
  className = '',
  size = 'md',
}: WishlistButtonProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setIsLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const success = await removeFromWishlist(savedListingId, productId);
        if (!success) {
          console.error('Error removing from wishlist');
        }
      } else {
        // Add to wishlist
        const success = await addToWishlist({
          savedListingId,
          productId,
          productTitle,
          productImage,
          productUrl,
          productPrice,
          productMoq,
          platform,
        });
        
        if (!success) {
          console.error('Error adding to wishlist');
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={toggleWishlist}
      disabled={isLoading}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-200 ${
        isInWishlist
          ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white shadow-lg shadow-pink-500/30 hover:shadow-xl'
          : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500 border border-gray-200 hover:border-red-300 hover:bg-red-50'
      } ${isLoading ? 'opacity-50 cursor-wait' : 'hover:scale-110'} ${className}`}
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        className={`${iconSizes[size]} ${isInWishlist ? 'fill-current' : ''}`}
      />
    </button>
  );
}
