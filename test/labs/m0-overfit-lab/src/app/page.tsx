'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ShellLayout } from '@/components/ShellLayout';
import { Banner } from '@/components/Banner';
import { NestedGridSection } from '@/components/NestedGridSection';
import { CardListSection } from '@/components/CardListSection';
import { FooterSection } from '@/components/FooterSection';

const DynamicWidget = dynamic(() => import('@/components/DynamicWidget'), {
  ssr: true,
});

export default function Home() {
  const [showPromo] = useState(true);

  return (
    <ShellLayout>
      {/* Conditionally rendered component */}
      {showPromo && <Banner message="High-density verification workspace active." />}

      {/* Nested Grid Section with fragments and prop-fed text */}
      <NestedGridSection sectionTitle="Multi-tier Architecture" badgeLabel="System v2" />

      {/* Mapped list and static cards */}
      <CardListSection />

      {/* Dynamic component */}
      <div className="mb-16">
        <DynamicWidget />
      </div>

      {/* Footer with shared components and unstyled controls */}
      <FooterSection />
    </ShellLayout>
  );
}
