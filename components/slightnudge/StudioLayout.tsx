'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, ChevronRight, Code2, FileCode2, Layers, Laptop2, PanelRight, Smartphone, Tablet, Undo2 } from 'lucide-react';
import { SlightNudgeOverlay } from './SlightNudgeOverlay';

const demoPages = [
  { id: '1', title: 'Product overview', path: '/fixtures/1', file: 'fixtures/1-plain-static.tsx' },
  { id: '2', title: 'Feature section', path: '/fixtures/2', file: 'fixtures/2-several-utilities.tsx' },
  { id: '3', title: 'Pricing panel', path: '/fixtures/3', file: 'fixtures/3-conditional-cn.tsx' },
  { id: '4', title: 'Customer cards', path: '/fixtures/4', file: 'fixtures/4-shared-component.tsx' },
  { id: '5', title: 'Responsive layout', path: '/fixtures/5', file: 'fixtures/5-responsive-classes.tsx' },
];

type Viewport = 'desktop' | 'tablet' | 'mobile';
type LayerNode = { key: string; name: string; tag: string; file: string; line: string; column: string; children: LayerNode[] };

function readPreviewLayers(root: HTMLElement): LayerNode[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-source-file][data-source-line]'));
  const included = elements.filter((element) => {
    const tag = element.tagName.toLowerCase();
    const parentTag = element.parentElement?.tagName.toLowerCase();
    const hasDirectText = Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()));
    const hasUsefulClass = Array.from(element.classList).some((name) => ['sn-playground-page', 'sn-playground-nav', 'sn-playground-hero', 'sn-playground-content', 'sn-playground-visual', 'sn-playground-window', 'sn-playground-main', 'sn-playground-trust'].includes(name));
    const semantic = ['main', 'section', 'nav', 'header', 'footer', 'article', 'aside', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a', 'input', 'img', 'li'].includes(tag);
    const shortCopy = ['span', 'strong', 'em'].includes(tag) && hasDirectText && !['a', 'button'].includes(parentTag || '');
    return semantic || shortCopy || hasUsefulClass;
  });
  const nodes = new Map<HTMLElement, LayerNode>();
  const roots: LayerNode[] = [];
  for (const element of included) {
    const tag = element.tagName.toLowerCase();
    const sourceFile = element.getAttribute('data-source-file') || '';
    const line = element.getAttribute('data-source-line') || '';
    const column = element.getAttribute('data-source-column') || '';
    const copy = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a', 'li', 'span', 'strong', 'em'].includes(tag)
      ? (element.textContent || '').replace(/\s+/g, ' ').trim()
      : '';
    const friendlyClass = Array.from(element.classList).find((name) => name.startsWith('sn-playground-'))?.replace('sn-playground-', '').replace(/-/g, ' ');
    const name = tag === 'main' ? 'Page' : copy || friendlyClass || (element.id ? `#${element.id}` : tag[0].toUpperCase() + tag.slice(1));
    const node: LayerNode = { key: `${sourceFile}:${line}:${column}:${tag}`, name: name.length > 34 ? `${name.slice(0, 32)}…` : name, tag, file: sourceFile, line, column, children: [] };
    nodes.set(element, node);
    let parent = element.parentElement;
    while (parent && parent !== root && !nodes.has(parent)) parent = parent.parentElement;
    const parentNode = parent ? nodes.get(parent) : undefined;
    if (parentNode) parentNode.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function LayerRows({ nodes, selectedKey, onSelect, depth = 0 }: { nodes: LayerNode[]; selectedKey: string; onSelect: (node: LayerNode) => void; depth?: number }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(nodes.filter((node) => node.children.length).map((node) => node.key)));
  return <>{nodes.map((node) => {
    const open = expanded.has(node.key);
    return <React.Fragment key={node.key}>
      <div className={`sn-layer-row ${selectedKey === node.key ? 'is-selected' : ''}`} style={{ '--layer-depth': depth } as React.CSSProperties}>
        {node.children.length ? <button type="button" className="sn-layer-disclosure" aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`} aria-expanded={open} onClick={() => setExpanded((value) => { const next = new Set(value); if (next.has(node.key)) next.delete(node.key); else next.add(node.key); return next; })}>{open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}</button> : <span className="sn-layer-disclosure-spacer"/>}
        <button type="button" className="sn-layer-select" title={`${node.tag} · ${node.file}:${node.line}`} onClick={() => onSelect(node)}><span className="sn-layer-tag">{node.tag}</span><span>{node.name}</span></button>
      </div>
      {node.children.length > 0 && open && <LayerRows nodes={node.children} selectedKey={selectedKey} onSelect={onSelect} depth={depth + 1}/>}
    </React.Fragment>;
  })}</>;
}

export function StudioLayout({ children, projectName = 'SlightNudge Playground', activeFile, activePageId, inspectorEnabled = true, previewConnected = false }: { children: React.ReactNode; projectName?: string; activeFile?: string; activePageId?: string; inspectorEnabled?: boolean; previewConnected?: boolean }) {
  const pathname = usePathname();
  const [inIframe, setInIframe] = useState(false);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [zoom, setZoom] = useState<number>(100);
  const [sidebarTab, setSidebarTab] = useState<'pages' | 'layers'>('pages');
  const [layers, setLayers] = useState<LayerNode[]>([]);
  const [selectedLayer, setSelectedLayer] = useState('');
  const currentPage = demoPages.find((item) => activePageId ? item.id === activePageId : item.path === pathname) || demoPages[0];
  const width = viewport === 'mobile' ? 390 : viewport === 'tablet' ? 768 : 1120;
  useEffect(() => {
    setInIframe(typeof window !== 'undefined' && window.parent !== window);
  }, []);
  const selectViewport = (value: Viewport) => {
    setViewport(value);
    window.dispatchEvent(new CustomEvent('slightnudge:viewport', { detail: { viewport: value } }));
  };

  useEffect(() => {
    if (!inspectorEnabled || inIframe) return;
    const root = document.querySelector<HTMLElement>('.sn-preview-content');
    if (!root) return;
    const updateLayers = () => setLayers(readPreviewLayers(root));
    const updateSelection = (event: Event) => {
      const detail = (event as CustomEvent<{ filePath?: string; line?: string | number; column?: string | number; tagName?: string } | null>).detail;
      if (!detail) { setSelectedLayer(''); return; }
      setSelectedLayer(`${detail.filePath || ''}:${detail.line || ''}:${detail.column || ''}:${detail.tagName || ''}`);
    };
    updateLayers();
    const observer = new MutationObserver(updateLayers);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener('slightnudge:selection', updateSelection);
    return () => { observer.disconnect(); window.removeEventListener('slightnudge:selection', updateSelection); };
  }, [inspectorEnabled, pathname, activePageId, inIframe]);

  const selectLayer = (layer: LayerNode) => {
    window.dispatchEvent(new CustomEvent('slightnudge:select-source', { detail: { filePath: layer.file, line: layer.line, column: layer.column, tagName: layer.tag } }));
  };

  if (inIframe) {
    return <div className="sn-preview-content">{children}</div>;
  }

  return <div className="sn-editor-shell">
    {inspectorEnabled && <SlightNudgeOverlay key={currentPage.id} defaultFilePath={activeFile || currentPage?.file} zoom={zoom} />}
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
        {inspectorEnabled ? <>
          <div className="sn-sidebar-tabs" role="tablist" aria-label="Workspace panels">
            <button type="button" role="tab" aria-selected={sidebarTab === 'pages'} className={sidebarTab === 'pages' ? 'is-active' : ''} onClick={() => setSidebarTab('pages')}><FileCode2 size={14}/> Pages</button>
            <button type="button" role="tab" aria-selected={sidebarTab === 'layers'} className={sidebarTab === 'layers' ? 'is-active' : ''} onClick={() => setSidebarTab('layers')}><Layers size={14}/> Layers</button>
          </div>
          {sidebarTab === 'pages' ? <><div className="sn-sidebar-heading"><span>Project pages</span><button type="button" disabled title="Page management is not available in the playground yet">+</button></div>
            <nav aria-label="Demo pages">{demoPages.map((page) => <Link className={page.id === currentPage.id ? 'is-active' : ''} href={pathname === '/studio' ? `/studio?page=${page.id}` : page.path} key={page.id}><span className="sn-page-glyph">{page.id}</span><span>{page.title}</span></Link>)}</nav></> : <>
            <div className="sn-sidebar-heading"><span>Page layers</span><span className="sn-layer-count">Live source map</span></div>
            <div className="sn-layer-tree" role="tree" aria-label="Page layers">{layers.length ? <LayerRows nodes={layers} selectedKey={selectedLayer} onSelect={selectLayer}/> : <p className="sn-layer-empty">Loading page structure…</p>}</div>
          </>}
        </> : <div className="sn-sidebar-heading"><span>Repository</span></div>}
        <div className="sn-file-location"><span className="sn-sidebar-heading">Source</span><div><Code2 size={14}/><span>{activeFile || currentPage.file}</span></div><p>{inspectorEnabled ? 'Changes are written to this local source file.' : 'Source inspection only. Files stay unchanged.'}</p></div>
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
