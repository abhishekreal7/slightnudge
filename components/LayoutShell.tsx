'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith('/fixtures') || pathname?.startsWith('/studio');

  if (isStudio) {
    return <main className="flex-1 w-full min-h-screen bg-slate-950">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
