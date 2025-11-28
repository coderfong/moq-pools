import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';
import RevealRoot from '@/components/RevealRoot';
import Footer from '@/components/Footer';
import CompareModal from '@/components/CompareModal';
import { PlatformProviders } from '@/components/PlatformProviders';
import AuthSessionProvider from '@/components/AuthSessionProvider';
import ProductsProviders from '@/components/ProductsProviders';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-screen font-display bg-base text-ink">
        <PlatformProviders>
          <AuthSessionProvider>
            <ProductsProviders>
              <Navbar />
              <RevealRoot />
              {/* Full-bleed main with responsive gutters; remove vertical padding to keep hero flush */}
              <main className="w-screen max-w-none px-0 md:px-0 xl:px-0">{children}</main>
              <Footer />
              <CompareModal />
            </ProductsProviders>
          </AuthSessionProvider>
        </PlatformProviders>
      </body>
    </html>
  );
}
