import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BottomNav } from '@/components/BottomNav';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yepitshalal.com';

export const metadata: Metadata = {
  // Without this, the generated OG/Twitter image URLs stay relative and no
  // scraper can resolve them.
  metadataBase: new URL(siteUrl),
  title: {
    default: 'YepItsHalal — Find halal food near you',
    template: '%s — YepItsHalal',
  },
  description:
    'Discover halal restaurants in London with clear, verified halal information — not guesswork.',
  openGraph: {
    type: 'website',
    siteName: 'YepItsHalal',
    locale: 'en_GB',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport = {
  themeColor: '#FAF9F6',
  // Explicitly leaves pinch-zoom enabled — locking it out is an accessibility
  // failure for anyone who needs to magnify a menu photo or address.
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="pb-16 sm:pb-0">
          {children}
        </main>
        <SiteFooter />
        <BottomNav />
        <Analytics />
      </body>
    </html>
  );
}
