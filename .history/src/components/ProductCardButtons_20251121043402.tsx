'use client';

import WishlistButton from './WishlistButton';
import AddToCartButton from './AddToCartButton';

interface ProductCardButtonsProps {
  savedListingId?: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productUrl: string;
  productPrice?: string;
  productMoq?: number;
  platform?: string;
}

export default function ProductCardButtons({
  savedListingId,
  productId,
  productTitle,
  productImage,
  productUrl,
  productPrice,
  productMoq,
  platform,
}: ProductCardButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <WishlistButton
        savedListingId={savedListingId}
        productId={productId}
        productTitle={productTitle}
        productImage={productImage}
        productUrl={productUrl}
        productPrice={productPrice}
        productMoq={productMoq?.toString()}
        platform={platform}
        size="md"
      />
      <AddToCartButton
        productId={productId}
        productTitle={productTitle}
        productImage={productImage}
        productUrl={productUrl}
        productPrice={productPrice}
        productMoq={productMoq}
        platform={platform}
        size="md"
      />
    </div>
  );
}
