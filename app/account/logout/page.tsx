import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LogoutPage() {
  await fetch('/api/logout', { method: 'POST' as any, cache: 'no-store', credentials: 'include' as any });
  redirect('/login');
}
