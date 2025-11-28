'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';

interface AddToCartButtonProps {
  productId: string;
  productTitle: string;
  productImage: string;
  productUrl: string;
  productPrice?: string;
  productMoq?: number;
  platform?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AddToCartButton({
  productId,
  productTitle,
  productImage,
  productUrl,
  productPrice,
  productMoq,
  platform,
  size = 'md',
  className = '',
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const addToCart = () => {
    try {
      setIsAdding(true);

      // Get existing cart
      const cartStr = localStorage.getItem('shopping_cart') || '[]';
      const cart = JSON.parse(cartStr);

      // Check if item already in cart
      const existingIndex = cart.findIndex((item: any) => item.productId === productId);

      if (existingIndex >= 0) {
        // Item exists - increase quantity
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
      } else {
        // Add new item
        cart.push({
          productId,
          productTitle,
          productImage,
          productUrl,
          productPrice: productPrice || 'See listing',
          productMoq: productMoq || 1,
          platform: platform || 'Unknown',
          quantity: 1,
          addedAt: new Date().toISOString(),
        });
      }

      // Save cart
      localStorage.setItem('shopping_cart', JSON.stringify(cart));

      // Dispatch custom event to update cart count in navbar
      window.dispatchEvent(new Event('cart-updated'));

      // Show success state
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart();
      }}
      disabled={isAdding}
      className={`
        ${sizeClasses[size]}
        ${justAdded
          ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500'
          : 'bg-orange-500 hover:bg-orange-600 border-orange-500'
        }
        rounded-xl border-2 text-white
        transition-all duration-300 
        hover:scale-110 hover:shadow-lg hover:shadow-orange-500/30
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        ${className}
      `}
      title={justAdded ? 'Added to cart!' : 'Add to cart'}
      aria-label={justAdded ? 'Added to cart!' : 'Add to cart'}
    >
      {isAdding ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      ) : (
        <ShoppingCart size={iconSizes[size]} className={justAdded ? 'animate-bounce' : ''} />
      )}
    </button>
  );
}
