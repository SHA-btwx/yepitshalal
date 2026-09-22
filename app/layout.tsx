import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BottomNav } from '@/components/BottomNav';
import { SITE_URL } from '@/lib/site';

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

export const metadata: Metadata = {
  // Without this, the generated OG/Twitter image URLs stay relative and no
  // scraper can resolve them.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'YepItsHalal: Find halal food near you',
    template: '%s | YepItsHalal',
  },
  description:
    'Find halal restaurants in London, with the evidence behind every label and the date it was checked.',
  // Declared by hand, as static files, for two reasons Google cares about.
  //
  // Next's generated icon routes hang a content hash off the URL
  // (/icon?c22bee58af459c4e), so the favicon's address changed with every
  // deploy that touched it, and a crawler that caches favicons by URL was
  // never looking at the same one twice. These paths never change.
  //
  // And the sizes here are the sizes of the files. The generated favicon.ico
  // was declared 32x32, which is below the 48px Google will use, so the one
  // icon sitting at the root of the domain was advertising itself as too small
  // to show.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    type: 'website',
    siteName: 'YepItsHalal',
    locale: 'en_GB',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport = {
  themeColor: '#FBF7F0',
  // Explicitly leaves pinch-zoom enabled: locking it out is an accessibility
  // failure for anyone who needs to magnify a menu photo or address.
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        {/* Scroll reveals start hidden and are shown by a script. Without one,
            everything must simply be there: a decorative entrance is never a
            good enough reason for a blank page. */}
        <noscript>
          {/* eslint-disable-next-line react/no-danger */}
          <style dangerouslySetInnerHTML={{ __html: '.reveal{opacity:1!important;transform:none!important}' }} />
        </noscript>
      </head>
      <body className="min-h-screen bg-sand-soft font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        {/* The tab bar is fixed over the page on a phone, and on an iPhone it
            sits above the home indicator, so the page has to end above both. */}
        <main id="main" className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
          {children}
        </main>
        <SiteFooter />
        <BottomNav />
        <Analytics />
      </body>
    </html>
  );
}
