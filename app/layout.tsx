import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'YepItsHalal — Find halal food near you',
  description:
    'Discover halal restaurants in London with clear, verified halal information — not guesswork.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <SiteHeader />
        <main className="pb-16 sm:pb-0">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
