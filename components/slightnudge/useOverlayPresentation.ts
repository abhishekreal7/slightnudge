'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

/** Shared viewport geometry and dismissal for both editor surfaces. */
export function useOverlayPresentation(target: HTMLElement | null, manipulating: boolean) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const dismiss = useCallback(() => setDismissed(true), []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scroll = () => {
      setScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), 150);
    };
    const pointer = () => setDismissed(false);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('pointerdown', pointer, true);
    window.addEventListener('keydown', escape, true);
    window.addEventListener('blur', dismiss);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('pointerdown', pointer, true);
      window.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', dismiss);
    };
  }, [dismiss]);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!target || !toolbar || dismissed || manipulating || scrolling) return;
    const measure = () => {
      const rect = target.getBoundingClientRect();
      const { width, height } = toolbar.getBoundingClientRect();
      const inset = 8;
      const gap = 12;
      const maxLeft = window.innerWidth - width - inset;
      const maxTop = window.innerHeight - height - inset;
      const left = Math.max(inset, Math.min(rect.left + (rect.width - width) / 2, maxLeft));
      let next: typeof position = null;
      if (rect.top - height - gap >= inset) next = { left, top: Math.min(maxTop, rect.top - height - gap) };
      else if (rect.bottom + gap <= maxTop) next = { left, top: Math.max(inset, rect.bottom + gap) };
      else if (rect.left - width - gap >= inset) next = { left: rect.left - width - gap, top: Math.max(inset, Math.min(rect.top, maxTop)) };
      else if (rect.right + gap <= maxLeft) next = { left: rect.right + gap, top: Math.max(inset, Math.min(rect.top, maxTop)) };
      if (width > window.innerWidth - inset * 2 || height > window.innerHeight - inset * 2 || rect.bottom <= 0 || rect.top >= window.innerHeight) next = null;
      setPosition((current) => current?.left === next?.left && current?.top === next?.top ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    observer.observe(toolbar);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  });

  const toolbarStyle: CSSProperties = {
    position: 'fixed', top: position?.top ?? 8, left: position?.left ?? 8, transform: 'none',
    visibility: position ? 'visible' : 'hidden', zIndex: 10000,
    width: 'max-content', minWidth: 0, maxWidth: 'calc(100vw - 16px)', overflowX: 'auto',
  };
  return { toolbarRef, toolbarStyle, dismissed, scrolling, dismiss, toolbarHidden: dismissed || scrolling || manipulating };
}
