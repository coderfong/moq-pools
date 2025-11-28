import { redirect } from 'next/navigation';
import { auth } from '@/auth.config';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user is logged in
  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/admin');
  }

  // Check if user is admin
  const isAdmin = session.user.email?.endsWith('@admin.com') || 
                  session.user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    redirect('/?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user.email}</span>
              <a
                href="/api/auth/signout"
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Admin content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
