'use client';
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type CSSProperties } from 'react';
import { rectIntersects, roundValue } from '../../lib/editor/geometry';

export function useWindowDock(enabled: boolean, isSuspended?: () => boolean, resumeSignal = false) {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [occluded, setOccluded] = useState(false);
  const scheduleAvoidance = useRef(() => { });
  const isSuspendedRef = useRef(isSuspended);
  isSuspendedRef.current = isSuspended;
  const drag = useRef<{ pointer: number; x: number; y: number; left: number; top: number; previous: typeof position } | null>(null);
  const getBounds = () => {
    const visibleRight = (sel: string, fallback = 0) => {
      const el = typeof document !== 'undefined' ? document.querySelector<HTMLElement>(sel) : null;
      if (!el || el.getAttribute('data-dock-visible') === 'false') return fallback;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > 0 && r.left < innerWidth / 2 ? r.right + 12 : fallback;
    };
    const visibleLeft = (sel: string, fallback: number) => {
      const el = typeof document !== 'undefined' ? document.querySelector<HTMLElement>(sel) : null;
      if (!el || el.getAttribute('data-dock-visible') === 'false') return fallback;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.left < innerWidth && r.left > innerWidth / 2 ? r.left - 12 : fallback;
    };
    const minLeft = Math.max(12, visibleRight('[data-editor-panel="layers"]'), visibleRight('[data-editor-rail="left"]'));
    const maxRight = Math.min(typeof innerWidth === 'number' ? innerWidth - 12 : 1200, visibleLeft('[data-editor-panel="inspector"]', 99999), visibleLeft('[data-editor-rail="right"]', 99999));
    const dockWidth = ref.current?.offsetWidth || 400;
    const dockHeight = ref.current?.offsetHeight || 48;
    const safeMinX = minLeft;
    const safeMaxX = Math.max(safeMinX, maxRight - dockWidth);
    const safeMaxY = (typeof innerHeight === 'number' ? innerHeight : 900) - dockHeight - 12;
    return { minLeft, maxRight, safeMinX, safeMaxX, safeMaxY, dockWidth, dockHeight };
  };
  const clamp = (x: number, y: number) => {
    const { safeMinX, safeMaxX, safeMaxY } = getBounds();
    return {
      x: roundValue(Math.max(safeMinX, Math.min(x, safeMaxX)), 'nearest', 1),
      y: roundValue(Math.max(12, Math.min(y, safeMaxY)), 'nearest', 1),
    };
  };
  useEffect(() => {
    if (!enabled) return;
    const resize = () => setPosition(previous => previous ? clamp(previous.x, previous.y) : previous);
    window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    let animation = 0;
    const avoidSelection = () => {
      if (!ref.current || drag.current || isSuspendedRef.current?.()) return;
      const selection = document.querySelector<HTMLElement>('[aria-label="Selected source element"]');
      if (!selection) {
        setOccluded(false);
        setPosition(prev => (prev !== null ? null : prev));
        return;
      }
      const target = selection.getBoundingClientRect(), dock = ref.current.getBoundingClientRect();
      if (!target.width || !target.height) {
        setOccluded(false);
        setPosition(prev => (prev !== null ? null : prev));
        return;
      }
      const targetBox = { left: target.left, top: target.top, width: target.width, height: target.height };
      const clear = (x: number, y: number) => !rectIntersects({ left: x, top: y, width: dock.width, height: dock.height }, targetBox);
      const { minLeft, maxRight, dockWidth, dockHeight } = getBounds();
      const defaultX = roundValue(Math.max(minLeft, minLeft + (maxRight - minLeft - dockWidth) / 2), 'nearest', 1);
      const defaultY = innerHeight - dockHeight - 12;
      if (clear(defaultX, defaultY)) {
        setOccluded(false);
        setPosition(prev => (prev !== null ? null : prev));
        return;
      }
      if (clear(dock.left, dock.top)) { setOccluded(false); return; }
      const gap = 12;
      const candidateY = roundValue(target.top - dockHeight - gap, 'nearest', 1);
      const fitsVertically = candidateY >= 12 && candidateY + dockHeight <= innerHeight - 12;
      if (fitsVertically && clear(defaultX, candidateY)) {
        setOccluded(false);
        setPosition(prev => (prev?.x === defaultX && prev?.y === candidateY ? prev : { x: defaultX, y: candidateY }));
      } else {
        setOccluded(true);
      }
    };
    const schedule = () => {
      if (isSuspendedRef.current?.()) return;
      cancelAnimationFrame(animation);
      animation = requestAnimationFrame(avoidSelection);
    };
    scheduleAvoidance.current = schedule;
    const changes = new MutationObserver(schedule);
    changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    const sizes = new ResizeObserver(schedule); if (ref.current) sizes.observe(ref.current);
    window.addEventListener('scroll', schedule, true); window.addEventListener('resize', schedule); schedule();
    return () => { cancelAnimationFrame(animation); changes.disconnect(); sizes.disconnect(); window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); scheduleAvoidance.current = () => { }; };
  }, [enabled]);
  useEffect(() => {
    if (enabled && !resumeSignal) scheduleAvoidance.current();
  }, [enabled, resumeSignal]);
  const release = (event: PointerEvent<HTMLButtonElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); drag.current = null; scheduleAvoidance.current(); };
  const grip = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0 || !ref.current) return;
      event.preventDefault(); event.stopPropagation(); event.currentTarget.focus();
      const box = ref.current.getBoundingClientRect();
      drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: box.left, top: box.top, previous: position };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) { const current = drag.current; if (current?.pointer === event.pointerId) setPosition(clamp(current.left + event.clientX - current.x, current.top + event.clientY - current.y)); },
    onPointerUp: release,
    onPointerCancel(event: PointerEvent<HTMLButtonElement>) { if (drag.current) setPosition(drag.current.previous); release(event); },
    onDoubleClick() { setPosition(null); },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      if (event.key === 'Home' || event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setPosition(drag.current?.previous || null); drag.current = null; return; }
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || !ref.current) return;
      event.preventDefault(); event.stopPropagation(); const box = ref.current.getBoundingClientRect(), step = event.shiftKey ? 24 : 8;
      setPosition(clamp(box.left + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), box.top + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)));
    },
  };
  const style: CSSProperties = { ...(position ? { left: position.x, top: position.y, bottom: 'auto', transform: 'none' } : {}), visibility: occluded ? 'hidden' : undefined };
  return { ref, position, style, grip };
}
