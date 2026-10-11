import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SlightNudgeOverlay } from '@/components/slightnudge/SlightNudgeOverlay';

export const metadata: Metadata = {
  title: {
    default: 'ShipCheck — AI QA Tester for Vibecoded Apps',
    template: '%s | ShipCheck',
  },
  description:
    'Find the bugs before your users do. Real cloud Chromium browser testing on desktop and mobile with ready-to-paste fix prompts for Cursor, Claude Code, and Lovable.',
  keywords: [
    'AI QA tester',
    'vibecoded apps',
    'browser automation',
    'cursor fix prompt',
    'claude code QA',
    'end to end testing',
    'playwright cloud',
    'indie hacker testing',
  ],
  authors: [{ name: 'ShipCheck' }],
  creator: 'ShipCheck',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://shipcheck.ai'),
  openGraph: {
    title: 'ShipCheck — AI QA Tester for Vibecoded Apps',
    description:
      'Autonomous cloud browsers test your web app on desktop and mobile. Get concrete bug repro steps and instant fix prompts for Cursor & Claude Code.',
    url: 'https://shipcheck.ai',
    siteName: 'ShipCheck',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'ShipCheck browser QA report with evidence-backed findings' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShipCheck — AI QA Tester for Vibecoded Apps',
    description:
      'Find the bugs before your users do. Real cloud Chromium browser testing with ready-to-paste fix prompts.',
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
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} flex min-h-screen flex-col`}>
        <SlightNudgeOverlay />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
