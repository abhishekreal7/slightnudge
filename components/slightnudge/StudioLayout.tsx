'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, Code2, Laptop2, PanelRight, Smartphone, Tablet, Undo2 } from 'lucide-react';
import { SlightNudgeOverlay } from './SlightNudgeOverlay';

const demoPages = [
  { id: '1', title: 'Product overview', path: '/fixtures/1', file: 'fixtures/1-plain-static.tsx' },
  { id: '2', title: 'Feature section', path: '/fixtures/2', file: 'fixtures/2-several-utilities.tsx' },
  { id: '3', title: 'Pricing panel', path: '/fixtures/3', file: 'fixtures/3-conditional-cn.tsx' },
  { id: '4', title: 'Customer cards', path: '/fixtures/4', file: 'fixtures/4-shared-component.tsx' },
  { id: '5', title: 'Responsive layout', path: '/fixtures/5', file: 'fixtures/5-responsive-classes.tsx' },
];

type Viewport = 'desktop' | 'tablet' | 'mobile';

export function StudioLayout({ children, projectName = 'SlightNudge Playground', activeFile, inspectorEnabled = true, previewConnected = false }: { children: React.ReactNode; projectName?: string; activeFile?: string; inspectorEnabled?: boolean; previewConnected?: boolean }) {
  const pathname = usePathname();
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [zoom, setZoom] = useState<number>(100);
  const currentPage = demoPages.find((item) => item.path === pathname) || demoPages[0];
  const width = viewport === 'mobile' ? 390 : viewport === 'tablet' ? 768 : 1120;
  const selectViewport = (value: Viewport) => {
    setViewport(value);
    window.dispatchEvent(new CustomEvent('slightnudge:viewport', { detail: { viewport: value } }));
  };

  return <div className="sn-editor-shell">
    {inspectorEnabled && <SlightNudgeOverlay defaultFilePath={activeFile || currentPage?.file} zoom={zoom} />}
    <header className="sn-editor-header">
      <Link className="sn-editor-brand" href="/workspace" aria-label="Back to projects"><span className="sn-brand-icon"><Code2 size={17}/></span><span>SlightNudge</span></Link>
      <span className="sn-editor-divider"/>
      <div className="sn-editor-project"><Link href="/workspace" aria-label="Back to projects"><ArrowLeft size={15}/></Link><div><strong>{projectName}</strong><span>{inspectorEnabled ? 'Local playground' : 'Imported project'}</span></div>{inspectorEnabled && <ChevronDown size={14}/>}</div>
      <div className="sn-editor-header-right"><span className="sn-save-state"><Check size={14}/> {inspectorEnabled ? 'Local source · no commit created' : 'Repository files · read only'}</span><Link className="sn-editor-add-repo" href="/workspace">Projects <ArrowUpRight size={14}/></Link></div>
    </header>
    <div className="sn-editor-toolbar">
      <div className="sn-breadcrumb"><span>{projectName}</span><span>/</span><strong>{inspectorEnabled ? currentPage.title : 'Source files'}</strong></div>
      {(inspectorEnabled || previewConnected) && <div className="sn-editor-controls">
        <div className="sn-viewport-control" role="group" aria-label="Preview viewport">
          <button type="button" aria-label="Desktop preview" title="Desktop" aria-pressed={viewport === 'desktop'} onClick={() => selectViewport('desktop')}><Laptop2 size={16}/></button>
          <button type="button" aria-label="Tablet preview" title="Tablet" aria-pressed={viewport === 'tablet'} onClick={() => selectViewport('tablet')}><Tablet size={16}/></button>
          <button type="button" aria-label="Mobile preview" title="Mobile" aria-pressed={viewport === 'mobile'} onClick={() => selectViewport('mobile')}><Smartphone size={16}/></button>
        </div>
        <div className="sn-zoom-control" role="group" aria-label="Canvas zoom">
          <button type="button" className="sn-zoom-btn" title="Zoom out" aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom((z) => Math.max(50, z - 10))}>−</button>
          <button type="button" className="sn-zoom-val" title="Reset zoom (100%)" aria-label="Reset zoom" onClick={() => setZoom(100)}>{zoom}%</button>
          <button type="button" className="sn-zoom-btn" title="Zoom in" aria-label="Zoom in" disabled={zoom >= 150} onClick={() => setZoom((z) => Math.min(150, z + 10))}>+</button>
        </div>
        {inspectorEnabled && <button type="button" className="sn-undo-button" title="Undo last visual edit (Ctrl+Z)" onClick={() => window.dispatchEvent(new Event('slightnudge:undo'))}><Undo2 size={15}/><span>Undo</span></button>}
      </div>}
    </div>
    <div className={`sn-editor-body ${inspectorEnabled ? '' : 'sn-readonly-repository'}`}>
      <aside className="sn-page-sidebar">
        {inspectorEnabled ? <><div className="sn-sidebar-heading"><span>PAGES</span><button type="button" disabled title="Page management is not available in the playground yet">+</button></div>
        <nav aria-label="Demo pages">{demoPages.map((page) => <Link className={page.path === pathname ? 'is-active' : ''} href={page.path} key={page.id}><span className="sn-page-glyph">{page.id}</span><span>{page.title}</span></Link>)}</nav></> : <div className="sn-sidebar-heading"><span>REPOSITORY</span></div>}
        <div className="sn-file-location"><span className="sn-sidebar-heading">SOURCE</span><div><Code2 size={14}/><span>{activeFile || currentPage.file}</span></div><p>{inspectorEnabled ? 'Changes are written to this local source file.' : 'Source inspection only. Files stay unchanged.'}</p></div>
        <Link href="/workspace" className="sn-sidebar-back"><ArrowLeft size={15}/> All projects</Link>
      </aside>
      <main className={`sn-canvas-area ${inspectorEnabled ? '' : 'sn-canvas-no-inspector'}`}>
        <div className="sn-canvas-note"><span><PanelRight size={15}/> {inspectorEnabled ? 'Select an element to inspect it' : 'Repository source inspection'}</span><span>{inspectorEnabled ? <>Preview width <strong>{width}px</strong></> : 'Read-only'}</span></div>
        <div className="sn-canvas-stage">
          <div
            className={`sn-preview-frame sn-preview-${viewport}`}
            style={{
              width: `min(${width}px, 100%)`,
              transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: 'top center',
              transition: 'width 0.25s var(--ease), transform 0.16s ease',
            }}
          >
            <div className="sn-preview-topline"><span className="sn-preview-origin"><span className="sn-lock-mark">⌑</span> {inspectorEnabled ? `playground.slightnudge.local${pathname}` : `${projectName} · source`}</span>{inspectorEnabled && <span>{zoom}%</span>}</div>
            <div className="sn-preview-content">{children}</div>
          </div>
        </div>
      </main>
    </div>
  </div>;
}
