'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

interface WishlistItem {
  id: string;
  savedListingId?: string;
  productId?: string;
  productTitle: string;
  productImage?: string;
  productUrl: string;
  productPrice?: string;
  productMoq?: string;
  platform?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  isLoading: boolean;
  isInWishlist: (savedListingId?: string, productId?: string) => boolean;
  addToWishlist: (item: Omit<WishlistItem, 'id'>) => Promise<boolean>;
  removeFromWishlist: (savedListingId?: string, productId?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ 
  children,
  isAuthenticated 
}: { 
  children: ReactNode;
  isAuthenticated: boolean;
}) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/wishlist', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = useCallback((savedListingId?: string, productId?: string) => {
    return items.some((item) => {
      if (savedListingId && item.savedListingId === savedListingId) return true;
      if (productId && item.productId === productId) return true;
      return false;
    });
  }, [items]);

  const addToWishlist = useCallback(async (item: Omit<WishlistItem, 'id'>) => {
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (res.ok) {
        await fetchWishlist(); // Refresh list
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  }, [fetchWishlist]);

  const removeFromWishlist = useCallback(async (savedListingId?: string, productId?: string) => {
    try {
      const params = new URLSearchParams();
      if (savedListingId) params.append('savedListingId', savedListingId);
      if (productId) params.append('productId', productId);

      const res = await fetch(`/api/wishlist?${params.toString()}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchWishlist(); // Refresh list
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  }, [fetchWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        isLoading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        refresh: fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
