'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Code2, Laptop2, Maximize2, Minimize2, Smartphone, Tablet, Undo2 } from 'lucide-react';
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
  const [focusMode, setFocusMode] = useState<boolean>(false);

  const currentPage = demoPages.find((item) => item.path === pathname) || demoPages[0];
  const width = viewport === 'mobile' ? 390 : viewport === 'tablet' ? 768 : 1120;

  const selectViewport = (value: Viewport) => {
    setViewport(value);
    window.dispatchEvent(new CustomEvent('slightnudge:viewport', { detail: { viewport: value } }));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFocusMode((prev) => !prev);
      } else if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);

  return (
    <div className={`sn-editor-shell ${focusMode ? 'is-focus-mode' : ''}`}>
      {inspectorEnabled && (
        <SlightNudgeOverlay
          defaultFilePath={activeFile || currentPage?.file}
          focusMode={focusMode}
          onExitFocusMode={() => setFocusMode(false)}
          zoom={zoom}
        />
      )}

      {/* ONE slim top bar merging header and breadcrumb row */}
      <header className="sn-editor-header sn-slim-topbar">
        <div className="sn-topbar-left">
          <Link className="sn-editor-brand" href="/workspace" aria-label="Back to projects">
            <span className="sn-brand-icon"><Code2 size={15}/></span>
            <span>SlightNudge</span>
          </Link>
          <span className="sn-topbar-divider" />
          <div className="sn-editor-project">
            <Link href="/workspace" aria-label="Back to projects"><ArrowLeft size={13}/></Link>
            <div><strong>{projectName}</strong></div>
            {inspectorEnabled && <ChevronDown size={13}/>}
          </div>
          <span className="sn-topbar-slash">/</span>
          <span className="sn-topbar-page-name">{inspectorEnabled ? currentPage.title : 'Source files'}</span>
        </div>

        <div className="sn-topbar-center">
          <span className="sn-save-state">
            <Check size={13}/> {inspectorEnabled ? 'Local source · no commit created' : 'Repository files · read only'}
          </span>
        </div>

        <div className="sn-topbar-right">
          {(inspectorEnabled || previewConnected) && (
            <div className="sn-topbar-actions">
              <div className="sn-viewport-group">
                <div className="sn-viewport-control" role="group" aria-label="Preview viewport">
                  <button
                    type="button"
                    aria-label="Desktop preview"
                    title="Desktop width (1120px) — edits apply to desktop (lg:)"
                    aria-pressed={viewport === 'desktop'}
                    onClick={() => selectViewport('desktop')}
                  >
                    <Laptop2 size={15}/>
                  </button>
                  <button
                    type="button"
                    aria-label="Tablet preview"
                    title="Tablet width (768px) — edits apply to tablet & up (md:)"
                    aria-pressed={viewport === 'tablet'}
                    onClick={() => selectViewport('tablet')}
                  >
                    <Tablet size={15}/>
                  </button>
                  <button
                    type="button"
                    aria-label="Mobile preview"
                    title="Mobile width (390px) — base styles apply to all screen sizes"
                    aria-pressed={viewport === 'mobile'}
                    onClick={() => selectViewport('mobile')}
                  >
                    <Smartphone size={15}/>
                  </button>
                </div>
                <span className="sn-preview-width-label">Preview width {width}px</span>
              </div>

              <span className="sn-topbar-divider" />

              <div className="sn-zoom-control" role="group" aria-label="Canvas zoom">
                <button
                  type="button"
                  className="sn-zoom-btn"
                  title="Zoom out"
                  aria-label="Zoom out"
                  disabled={zoom <= 50}
                  onClick={() => setZoom((z) => Math.max(50, z - 10))}
                >
                  −
                </button>
                <button
                  type="button"
                  className="sn-zoom-val"
                  title="Reset zoom (100%)"
                  aria-label="Reset zoom"
                  onClick={() => setZoom(100)}
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  className="sn-zoom-btn"
                  title="Zoom in"
                  aria-label="Zoom in"
                  disabled={zoom >= 150}
                  onClick={() => setZoom((z) => Math.min(150, z + 10))}
                >
                  +
                </button>
              </div>

              <span className="sn-topbar-divider" />

              <button
                type="button"
                className={`sn-focus-toggle-btn ${focusMode ? 'is-active' : ''}`}
                title={focusMode ? "Exit Focus mode (Esc or F)" : "Focus mode (F)"}
                aria-pressed={focusMode}
                onClick={() => setFocusMode((v) => !v)}
              >
                {focusMode ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
                <span>{focusMode ? 'Exit focus' : 'Focus'}</span>
                <kbd>F</kbd>
              </button>

              <span className="sn-topbar-divider" />

              <button
                type="button"
                className="sn-undo-button"
                title="Undo last visual edit (Ctrl+Z)"
                onClick={() => window.dispatchEvent(new Event('slightnudge:undo'))}
              >
                <Undo2 size={14}/>
                <span>Undo</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={`sn-editor-body ${inspectorEnabled ? '' : 'sn-readonly-repository'}`}>
        {!focusMode && (
          <aside className="sn-page-sidebar">
            {inspectorEnabled ? (
              <>
                <div className="sn-sidebar-heading">
                  <span>PAGES</span>
                  <button type="button" disabled title="Page management is not available in the playground yet">+</button>
                </div>
                <nav aria-label="Demo pages">
                  {demoPages.map((page) => (
                    <Link className={page.path === pathname ? 'is-active' : ''} href={page.path} key={page.id}>
                      <span className="sn-page-glyph">{page.id}</span>
                      <span>{page.title}</span>
                    </Link>
                  ))}
                </nav>
              </>
            ) : (
              <div className="sn-sidebar-heading"><span>REPOSITORY</span></div>
            )}
            <div className="sn-file-location">
              <span className="sn-sidebar-heading">SOURCE</span>
              <div>
                <Code2 size={14}/>
                <span>{activeFile || currentPage.file}</span>
              </div>
              <p>{inspectorEnabled ? 'Changes are written to this local source file.' : 'Source inspection only. Files stay unchanged.'}</p>
            </div>
            <Link href="/workspace" className="sn-sidebar-back"><ArrowLeft size={15}/> All projects</Link>
          </aside>
        )}

        <main className={`sn-canvas-area ${inspectorEnabled ? '' : 'sn-canvas-no-inspector'} ${focusMode ? 'is-focus-mode' : ''}`}>
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
              <div className="sn-preview-content">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
