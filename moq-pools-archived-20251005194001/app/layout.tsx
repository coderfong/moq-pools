import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white/70 backdrop-blur">
          <div className="container flex items-center justify-between">
            <Link href="/" className="font-bold text-lg">MOQ Pools</Link>
            <nav className="flex items-center gap-5">
              <Link href="/products">Browse</Link>
              <Link href="/admin/pools">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
