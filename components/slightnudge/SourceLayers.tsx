'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Frame, PanelsTopLeft, Navigation, PanelTop, PanelBottom, Image, PenTool, TextCursorInput, SquareMousePointer, Link2, FileText, Rows3, Columns3, Grid2X2, Type, Heading, Search, X } from 'lucide-react';
import type { CanvasLayer } from '@/lib/slightnudge/source-canvas-contract';
import styles from './source-layers.module.css';

function layerLabel(layer: CanvasLayer) {
  const names: Record<string, string> = { main: 'Page', nav: 'Navigation', header: 'Header', footer: 'Footer' };
  if (names[layer.tagName]) return names[layer.tagName];
  const friendly: Record<string, string> = { hero: 'Hero section', content: 'Content', trust: 'Trust bar' };
  if (friendly[layer.name]) return friendly[layer.name];
  if (layer.name && layer.name !== layer.tagName) return layer.name;
  if (layer.tagName === 'div') {
    if (/grid/.test(layer.computed.display || '')) return 'Grid';
    if (/flex/.test(layer.computed.display || '')) return (layer.computed.flexDirection || '').startsWith('column') ? 'Stack' : 'Row';
  }
  return ({ section: 'Section', article: 'Article', aside: 'Aside', p: 'Text', a: 'Link', button: 'Button', img: 'Image', input: 'Input', form: 'Form', textarea: 'Text area', select: 'Select', svg: 'Vector' } as Record<string, string>)[layer.tagName] || 'Group';
}

function layerAppearance(layer: CanvasLayer) {
  const tag = layer.tagName;
  if (tag === 'main') return { Icon: PanelsTopLeft, kind: 'frame' };
  if (/^h[1-6]$/.test(tag)) return { Icon: Heading, kind: 'text' };
  if (/^(p|span|label|strong|em|li)$/.test(tag)) return { Icon: Type, kind: 'text' };
  if (tag === 'a') return { Icon: Link2, kind: 'action' };
  if (tag === 'button') return { Icon: SquareMousePointer, kind: 'action' };
  if (/^(input|textarea|select)$/.test(tag)) return { Icon: TextCursorInput, kind: 'field' };
  if (tag === 'svg') return { Icon: PenTool, kind: 'media' };
  if (/^(img|video|picture)$/.test(tag)) return { Icon: Image, kind: 'media' };
  if (tag === 'nav') return { Icon: Navigation, kind: 'frame' };
  if (tag === 'header') return { Icon: PanelTop, kind: 'frame' };
  if (tag === 'footer') return { Icon: PanelBottom, kind: 'frame' };
  if (tag === 'form') return { Icon: FileText, kind: 'field' };
  if (/grid/.test(layer.computed.display || '')) return { Icon: Grid2X2, kind: 'layout' };
  if (/flex/.test(layer.computed.display || '')) return { Icon: (layer.computed.flexDirection || '').startsWith('column') ? Rows3 : Columns3, kind: 'layout' };
  return { Icon: Frame, kind: 'frame' };
}

export function SourceLayers({ layers, selected, onSelect }: { layers: CanvasLayer[]; selected: string | null; onSelect(key: string): void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  // Styled block containers own padding, fills and clipping too. They can be
  // covered by a parent's decorative pseudo-element, making Layers their only
  // reliable selection route. Keep unstyled pass-through divs out of the tree.
  // Keep the inline text tags recognized by layerAppearance selectable here,
  // including badges covered by editor controls on the canvas.
  const visible = layers.filter(layer => /^(main|section|nav|header|footer|article|aside|h[1-6]|p|span|label|strong|em|li|a|button|input|textarea|select|img|form|svg|video|picture)$/.test(layer.tagName) || layer.className.includes('sn-playground-content') || layer.tagName === 'div' && (Boolean(layer.className.trim()) || /^(flex|inline-flex|grid|inline-grid)$/.test(layer.computed.display || '')));
  const all = new Map(layers.map(layer => [layer.key, layer]));
  const keys = new Set(visible.map(layer => layer.key));
  const parents = new Map(visible.map(layer => {
    let parent = layer.parentKey; const seen = new Set<string>();
    while (parent && !keys.has(parent) && !seen.has(parent)) { seen.add(parent); parent = all.get(parent)?.parentKey; }
    return [layer.key, parent] as const;
  }));
  const ancestors = (key: string) => {
    const result: string[] = []; let parent = parents.get(key);
    while (parent && !result.includes(parent)) { result.push(parent); parent = parents.get(parent); }
    return result;
  };
  useEffect(() => {
    if (!selected) return;
    const path = ancestors(selected);
    setCollapsed(previous => path.some(key => previous.has(key)) ? new Set([...previous].filter(key => !path.includes(key))) : previous);
  }, [selected, layers]);
  const needle = query.trim().toLocaleLowerCase();
  const matches = new Set(visible.filter(layer => [layerLabel(layer), layer.tagName, layer.textContent, layer.elementId || ''].join(' ').toLocaleLowerCase().includes(needle)).map(layer => layer.key));
  const shown = new Set([...matches].flatMap(key => [key, ...ancestors(key)]));
  const previousSelection = useRef(selected);
  useEffect(() => {
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    if (selected && needle && !matches.has(selected)) setQuery('');
  }, [selected]);
  const childParents = new Set(parents.values());
  return <section className={styles.panel} aria-label="Layers panel">
    <div className={styles.searchRow}>
      <div className={styles.search}>
        <Search size={14} strokeWidth={1.8} aria-hidden="true" />
        <input type="search" aria-label="Search layers" placeholder="Search layers…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && query) { event.preventDefault(); event.stopPropagation(); setQuery(''); } }} />
        {query && <button type="button" aria-label="Clear layer search" onClick={() => setQuery('')}><X size={12}/></button>}
      </div>
    </div>
    <nav className={styles.layers} aria-label="Source layers">
      {!visible.length && <p className={styles.empty}>Your page layers will appear here.</p>}
      {needle && !matches.size && <div className={styles.empty} role="status"><p>No matching layers.</p><button type="button" onClick={() => setQuery('')}>Clear search</button></div>}
      {visible.filter(layer => needle ? shown.has(layer.key) : !ancestors(layer.key).some(key => collapsed.has(key))).map(layer => {
        const children = childParents.has(layer.key), repeated = (layer.instances || 1) > 1;
        const { Icon, kind } = layerAppearance(layer);
        return <div key={layer.key} className={styles.row} data-selected={selected === layer.key} data-layer-kind={kind} data-layer-tag={layer.tagName} style={{ paddingLeft: 4 + Math.min(ancestors(layer.key).length, 5) * 12 }}>
          {children ? <button type="button" className={styles.disclosure} disabled={Boolean(needle)} aria-label={`${collapsed.has(layer.key) && !needle ? 'Expand' : 'Collapse'} ${layerLabel(layer)}`} aria-expanded={Boolean(needle) || !collapsed.has(layer.key)}
            onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(layer.key)) next.delete(layer.key); else next.add(layer.key); return next; })}><ChevronRight size={12} /></button> : <span className={styles.spacer} />}
          <button type="button" className={styles.select} disabled={repeated} aria-pressed={selected === layer.key} onClick={() => onSelect(layer.key)}
            title={`${layerLabel(layer)} · ${layer.tagName} · ${layer.path}:${layer.line}${repeated ? ' · Multiple instances; select a unique element.' : ''}`}>
            <Icon size={15} strokeWidth={1.7} aria-hidden="true" /><span>{layerLabel(layer)}</span>{repeated && <small aria-label={`${layer.instances} instances`}>×{layer.instances}</small>}
          </button>
        </div>;
      })}
    </nav>
  </section>;
}
