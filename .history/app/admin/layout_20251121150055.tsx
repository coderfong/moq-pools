import { redirect } from 'next/navigation';
import { getSession } from '@/app/api/_lib/session';
import AdminLayoutClient from './AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getSession();

  // Check if user is logged in and is admin
  if (!session?.email || session.email.toLowerCase() !== 'jonfong78@gmail.com') {
    redirect('/?error=unauthorized');
  }

  return <AdminLayoutClient userEmail={session.email}>{children}</AdminLayoutClient>;
}
