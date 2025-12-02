import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import WishlistClient from './WishlistClient';

export const metadata = {
  title: 'My Wishlist - MOQPools',
  description: 'View and manage your saved favorite products',
};

export default async function WishlistPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login?redirect=/account/wishlist');
  }

  return <WishlistClient />;
}
