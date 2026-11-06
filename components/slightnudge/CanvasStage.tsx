'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './canvas-stage.module.css';

export type CanvasZoom = 'fit' | number;
export function CanvasStage({ width, zoom, reset, pan, disabled, onZoom, children }: { width: number; zoom: CanvasZoom; reset: number; pan: boolean; disabled: boolean; onZoom(value: CanvasZoom): void; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null), page = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 800, height: 700, pageHeight: 720 });
  const gesture = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null);
  const dragged = useRef(false);
  const [space, setSpace] = useState(false);
  const anchor = useRef<{ x: number; y: number; worldX: number; worldY: number } | null>(null);
  const previousLayout = useRef<{ scale: number; left: number; top: number; width: number; height: number } | null>(null);
  const scale = zoom === 'fit' ? Math.max(.02, Math.min(1, (bounds.width - 96) / width, (bounds.height - 96) / bounds.pageHeight)) : zoom;
  const sceneWidth = Math.max(bounds.width * 3, width * scale + bounds.width * 2), sceneHeight = Math.max(bounds.height * 3, bounds.pageHeight * scale + bounds.height * 2);
  const left = (sceneWidth - width * scale) / 2, top = (sceneHeight - bounds.pageHeight * scale) / 2;
  const latest = useRef({ scale, left, top, disabled, onZoom }); latest.current = { scale, left, top, disabled, onZoom };
  useLayoutEffect(() => {
    const host = viewport.current, content = page.current; if (!host || !content) return;
    const measure = () => setBounds(previous => {
      const next = { width: host.clientWidth, height: host.clientHeight, pageHeight: Math.max(240, content.offsetHeight) };
      return previous.width === next.width && previous.height === next.height && previous.pageHeight === next.pageHeight ? previous : next;
    });
    measure(); const observer = new ResizeObserver(measure); observer.observe(host); observer.observe(content); return () => observer.disconnect();
  }, [width]);
  useLayoutEffect(() => {
    const host = viewport.current; if (!host) return;
    const previous = previousLayout.current;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (zoom === 'fit' || !previous) {
      host.scrollLeft = (sceneWidth - width) / 2;
      host.scrollTop = zoom === 'fit' ? (sceneHeight - height) / 2 : Math.min(top - 32, (sceneHeight - height) / 2);
    } else {
      const point = anchor.current ?? {
        x: width / 2,
        y: height / 2,
        worldX: (host.scrollLeft + previous.width / 2 - previous.left) / previous.scale,
        worldY: (host.scrollTop + previous.height / 2 - previous.top) / previous.scale,
      };
      host.scrollLeft = left + point.worldX * scale - point.x;
      host.scrollTop = top + point.worldY * scale - point.y;
    }
    previousLayout.current = { scale, left, top, width, height };
    anchor.current = null;
    window.dispatchEvent(new Event('resize'));
  }, [scale, left, top, sceneWidth, sceneHeight, zoom, reset]);
  useEffect(() => {
    const host = viewport.current; if (!host) return;
    const wheel = (event: WheelEvent | CustomEvent) => {
      const forwarded = event.type === 'slightnudge:canvas-wheel';
      const data = forwarded ? (event as CustomEvent).detail : event as WheelEvent;
      const dx = Number(data.deltaX), dy = Number(data.deltaY); if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      if (data.ctrlKey || data.metaKey) {
        event.preventDefault(); if (latest.current.disabled) return;
        const box = host.getBoundingClientRect();
        const x = Math.max(0, Math.min(host.clientWidth, (Number(data.clientX) || box.left + host.clientWidth / 2) - box.left));
        const y = Math.max(0, Math.min(host.clientHeight, (Number(data.clientY) || box.top + host.clientHeight / 2) - box.top));
        const current = latest.current;
        const nextScale = Math.max(.1, Math.min(2, Math.round(current.scale * Math.exp(-dy * .003) * 100) / 100));
        if (nextScale === current.scale) return;
        anchor.current = { x, y, worldX: (host.scrollLeft + x - current.left) / current.scale, worldY: (host.scrollTop + y - current.top) / current.scale };
        current.onZoom(nextScale);
      } else if (forwarded) {
        const unit = data.deltaMode === 1 ? 16 : data.deltaMode === 2 ? host.clientHeight : 1;
        host.scrollBy(dx * unit, dy * unit);
      }
    };
    const blur = () => { setSpace(false); gesture.current = null; };
    host.addEventListener('wheel', wheel, { passive: false }); host.addEventListener('slightnudge:canvas-wheel', wheel as EventListener); window.addEventListener('blur', blur);
    return () => { host.removeEventListener('wheel', wheel); host.removeEventListener('slightnudge:canvas-wheel', wheel as EventListener); window.removeEventListener('blur', blur); };
  }, []);
  const hand = (pan || space) && !disabled;
  return <div ref={viewport} className={styles.viewport} data-canvas-stage data-hand={hand || undefined} data-zoom={scale} tabIndex={0} aria-label="Page canvas"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSpace(false); }}
    onClick={event => { if (hand || dragged.current) { event.stopPropagation(); dragged.current = false; } }}
    onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.code === 'Space') { event.preventDefault(); event.stopPropagation(); setSpace(true); } if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); event.currentTarget.scrollBy(event.key === 'ArrowLeft' ? -40 : event.key === 'ArrowRight' ? 40 : 0, event.key === 'ArrowUp' ? -40 : event.key === 'ArrowDown' ? 40 : 0); } }} onKeyUp={event => { if (event.code === 'Space') { event.preventDefault(); setSpace(false); } }}
    onPointerDown={event => { if (disabled || event.button !== 0 && event.button !== 1 || !hand && event.button !== 1 && event.target !== event.currentTarget && !(event.target instanceof HTMLElement && event.target.hasAttribute('data-canvas-scene'))) return; event.preventDefault(); event.stopPropagation(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; }}
    onPointerMove={event => { const g = gesture.current; if (g?.pointer !== event.pointerId) return; if (Math.hypot(event.clientX-g.x,event.clientY-g.y)>3) dragged.current = true; event.currentTarget.scrollLeft = g.left - event.clientX + g.x; event.currentTarget.scrollTop = g.top - event.clientY + g.y; }}
    onPointerUp={event => { if (!gesture.current) return; gesture.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { gesture.current = null; }} onLostPointerCapture={() => { gesture.current = null; }}>
    <div data-canvas-scene className={styles.scene} style={{ width: sceneWidth, height: sceneHeight }}>
      <div ref={page} className={styles.page} style={{ width, left, top, transform: `scale(${scale})`, '--canvas-zoom': scale } as CSSProperties}>{children}</div>
    </div>
  </div>;
}
