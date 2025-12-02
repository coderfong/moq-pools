import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';
import RevealRoot from '@/components/RevealRoot';
import Footer from '@/components/Footer';
import CompareModal from '@/components/CompareModal';
import { PlatformProviders } from '@/components/PlatformProviders';
import AuthSessionProvider from '@/components/AuthSessionProvider';
import { ProfileCompleteGuard } from '@/components/ProfileCompleteGuard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MOQ Pools - Group Buying Platform for Wholesale Products',
  description: 'Join group buying pools to meet minimum order quantities (MOQ) and unlock wholesale prices on quality products from Alibaba, 1688, Made in China, and more.',
  keywords: ['wholesale', 'group buying', 'MOQ', 'bulk purchasing', 'alibaba', '1688', 'made in china'],
  openGraph: {
    title: 'MOQ Pools - Group Buying Platform',
    description: 'Join group buying pools to meet MOQ and get wholesale prices',
    type: 'website',
    siteName: 'MOQ Pools',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOQ Pools - Group Buying Platform',
    description: 'Join group buying pools to meet MOQ and get wholesale prices',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Viewport needs to be in head for proper mobile rendering
const viewport = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        <meta name="viewport" content={viewport} />
      </head>
      <body className="min-h-screen font-display bg-base text-ink">
        <PlatformProviders>
          <AuthSessionProvider>
            <ProfileCompleteGuard>
              <Navbar />
              <RevealRoot />
              {/* Full-bleed main with responsive gutters; remove vertical padding to keep hero flush */}
              <main className="w-full">{children}</main>
              <Footer />
              <CompareModal />
            </ProfileCompleteGuard>
          </AuthSessionProvider>
        </PlatformProviders>
      </body>
    </html>
  );
}
