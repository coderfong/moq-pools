"use client";
import { useEffect } from 'react';

interface TrackProductViewProps {
  savedListingId: string;
  productTitle: string;
  productImage: string | null;
  productUrl: string;
}

export default function TrackProductView({ 
  savedListingId, 
  productTitle, 
  productImage, 
  productUrl 
}: TrackProductViewProps) {
  useEffect(() => {
    // Track the product view
    const trackView = async () => {
      try {
        await fetch('/api/product-views', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            savedListingId,
            productTitle,
            productImage,
            productUrl,
          }),
        });
      } catch (error) {
        // Silently fail - tracking is not critical
        console.error('Failed to track product view:', error);
      }
    };

    trackView();
  }, [savedListingId, productTitle, productImage, productUrl]);

  return null; // This component doesn't render anything
}
