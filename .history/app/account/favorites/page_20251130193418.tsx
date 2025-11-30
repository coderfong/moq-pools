import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wishlist - Account - MOQ Pools' };

// Redirect favorites to wishlist (they're the same feature)
export default function FavoritesPage() {
  redirect('/account/wishlist');
}
