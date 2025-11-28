'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';

function WishlistProviderWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return (
    <WishlistProvider isAuthenticated={isAuthenticated}>
      {children}
    </WishlistProvider>
  );
}

export default function ProductsProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WishlistProviderWrapper>
        {children}
      </WishlistProviderWrapper>
    </AuthProvider>
  );
}
