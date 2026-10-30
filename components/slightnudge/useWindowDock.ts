'use client';
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type CSSProperties } from 'react';

export function useWindowDock(enabled: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; left: number; top: number; previous: typeof position } | null>(null);
  const clamp = (x: number, y: number) => ({ x: Math.round(Math.max(8, Math.min(x, innerWidth - (ref.current?.offsetWidth || 0) - 8))), y: Math.round(Math.max(8, Math.min(y, innerHeight - (ref.current?.offsetHeight || 48) - 8))) });
  useEffect(() => {
    if (!enabled) return;
    const resize = () => setPosition(previous => previous ? clamp(previous.x, previous.y) : previous);
    window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, [enabled]);
  const release = (event: PointerEvent<HTMLButtonElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); drag.current = null; };
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
  const style: CSSProperties = position ? { left: position.x, top: position.y, bottom: 'auto', transform: 'none' } : {};
  return { ref, position, style, grip };
}
