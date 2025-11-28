import { redirect } from 'next/navigation';
import { getSession } from '../_lib/session';
import AdminLayoutClient from './AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Check if user is logged in and is admin
  if (!session?.user?.email || session.user.email.toLowerCase() !== 'jonfong78@gmail.com') {
    redirect('/?error=unauthorized');
  }

  return <AdminLayoutClient userEmail={session.user.email}>{children}</AdminLayoutClient>;
}
