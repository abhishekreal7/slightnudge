'use client';
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type CSSProperties } from 'react';

export function useWindowDock(enabled: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [occluded, setOccluded] = useState(false);
  const scheduleAvoidance = useRef(() => {});
  const drag = useRef<{ pointer: number; x: number; y: number; left: number; top: number; previous: typeof position } | null>(null);
  const clamp = (x: number, y: number) => ({ x: Math.round(Math.max(8, Math.min(x, innerWidth - (ref.current?.offsetWidth || 0) - 8))), y: Math.round(Math.max(8, Math.min(y, innerHeight - (ref.current?.offsetHeight || 48) - 8))) });
  useEffect(() => {
    if (!enabled) return;
    const resize = () => setPosition(previous => previous ? clamp(previous.x, previous.y) : previous);
    window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    let animation = 0;
    const avoidSelection = () => {
      if (!ref.current || drag.current) return;
      const selection = document.querySelector<HTMLElement>('[aria-label="Selected source element"]');
      if (!selection) { setOccluded(false); return; }
      const target = selection.getBoundingClientRect(), dock = ref.current.getBoundingClientRect();
      if (!target.width || !target.height) { setOccluded(false); return; }
      const clear = (x: number, y: number) => x + dock.width <= target.left || x >= target.right || y + dock.height <= target.top || y >= target.bottom;
      if (clear(dock.left, dock.top)) { setOccluded(false); return; }
      const gap = 8;
      const candidates = [
        { x: dock.left, y: target.top - dock.height - gap },
        { x: dock.left, y: target.bottom + gap },
        { x: target.left - dock.width - gap, y: dock.top },
        { x: target.right + gap, y: dock.top },
      ].filter(point => point.x >= gap && point.y >= gap && point.x + dock.width <= innerWidth - gap && point.y + dock.height <= innerHeight - gap && clear(point.x, point.y));
      const next = candidates.sort((a, b) => Math.hypot(a.x - dock.left, a.y - dock.top) - Math.hypot(b.x - dock.left, b.y - dock.top))[0];
      // When a selection fills the viewport there is no free band for a dock.
      // Yield its controls until selection clears rather than cover the target.
      setOccluded(!next);
      if (next) setPosition(previous => previous?.x === next.x && previous?.y === next.y ? previous : next);
    };
    const schedule = () => { cancelAnimationFrame(animation); animation = requestAnimationFrame(avoidSelection); };
    scheduleAvoidance.current = schedule;
    const changes = new MutationObserver(schedule);
    changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    const sizes = new ResizeObserver(schedule); if (ref.current) sizes.observe(ref.current);
    window.addEventListener('scroll', schedule, true); window.addEventListener('resize', schedule); schedule();
    return () => { cancelAnimationFrame(animation); changes.disconnect(); sizes.disconnect(); window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); scheduleAvoidance.current = () => {}; };
  }, [enabled]);
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
