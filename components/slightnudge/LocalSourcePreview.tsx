'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { startLocalSourceCanvas } from '@/lib/slightnudge/source-canvas-bridge';
import PlainStaticPage from '@/fixtures/1-plain-static';
import SeveralUtilitiesPage from '@/fixtures/2-several-utilities';
import ConditionalPage from '@/fixtures/3-conditional-cn';
import SharedPage from '@/fixtures/4-shared-component';
import ResponsivePage from '@/fixtures/5-responsive-classes';

const pages = { 'fixture-1': PlainStaticPage, 'fixture-2': SeveralUtilitiesPage, 'fixture-3': ConditionalPage, 'fixture-4': SharedPage, 'fixture-5': ResponsivePage };

/** Mount the real client page before restoring mutable drafts. During source
 * rebuilds Next's server/client bundles can differ; this editor-owned preview
 * must not hydrate one source revision over another. */
export function LocalSourcePreview({ pageId }: { pageId: string }) {
  const [mounted, setMounted] = useState(false);
  const Page = pages[pageId as keyof typeof pages];
  useLayoutEffect(() => {
    const params = new URL(location.href).searchParams;
    const canvasPage = params.get('__slightnudge_canvas') === '1';
    const initTheme = params.get('__slightnudge_theme');
    document.documentElement.toggleAttribute('data-editor-canvas-page', canvasPage);
    if (initTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-slightnudge-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    } else if (initTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-slightnudge-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    }
    return () => document.documentElement.removeAttribute('data-editor-canvas-page');
  }, []);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted) startLocalSourceCanvas();
  }, [mounted]);
  return <>
    <style data-canvas-document-chrome>{`
      html[data-editor-canvas-page], html[data-editor-canvas-page] body {
        overflow: hidden !important;
        scrollbar-width: none !important;
        scrollbar-gutter: auto !important;
      }
      html[data-editor-canvas-page]::-webkit-scrollbar,
      html[data-editor-canvas-page] body::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `}</style>
    <div data-source-canvas-root>{mounted && Page && <Page />}</div>
  </>;
}
