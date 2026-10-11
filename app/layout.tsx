import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: {
    default: 'SlightNudge — Make the change. Keep the code.',
    template: '%s | SlightNudge',
  },
  description:
    'Refine a real interface in context. Select what feels off, make a focused adjustment, and review the source change before it lands in your project.',
  authors: [{ name: 'SlightNudge' }],
  creator: 'SlightNudge',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'SlightNudge — Make the change. Keep the code.',
    description: 'Refine a real interface in context and review the source change before it lands in your project.',
    url: 'https://slightnudge.app',
    siteName: 'SlightNudge',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'SlightNudge visual design workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SlightNudge — Make the change. Keep the code.',
    description: 'Make a focused visual adjustment and review the source change.',
    images: ['/opengraph-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className={`${geist.variable} ${geistMono.variable} flex min-h-screen flex-col`}>
        <Header />
        <div className="sn-main-content">{children}</div>
      </body>
    </html>
  );
}
