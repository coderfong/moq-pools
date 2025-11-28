import AdminLayoutClient from './AdminLayoutClient';

// Note: Admin auth is checked by middleware and custom session handling
// This layout provides the UI structure

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Email is passed from middleware/auth
  const userEmail = 'jonfong78@gmail.com'; // Admin email

  return <AdminLayoutClient userEmail={userEmail}>{children}</AdminLayoutClient>;
}
