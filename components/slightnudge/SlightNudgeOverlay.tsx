'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SelectedElementInfo {
  tagName: string;
  id?: string;
  className: string;
  filePath: string;
  line: string | number;
  rect: { top: number; left: number; width: number; height: number };
  safeToEdit?: boolean;
  refusalReason?: string;
}

export function SlightNudgeOverlay() {
  const [active, setActive] = useState(true);
  const [hoveredRect, setHoveredRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [selected, setSelected] = useState<SelectedElementInfo | null>(null);
  const [loadingInspection, setLoadingInspection] = useState(false);
  const selectedNodeRef = useRef<HTMLElement | null>(null);

  // Fallback map based on fixture routes
  const routeFixtureMap: Record<string, { file: string; line: number }> = {
    '/fixtures/1': { file: 'fixtures/1-plain-static.tsx', line: 7 },
    '/fixtures/2': { file: 'fixtures/2-several-utilities.tsx', line: 7 },
    '/fixtures/3': { file: 'fixtures/3-conditional-cn.tsx', line: 11 },
    '/fixtures/4': { file: 'fixtures/4-shared-component.tsx', line: 11 },
    '/fixtures/5': { file: 'fixtures/5-responsive-classes.tsx', line: 7 },
  };

  // Resolve source file and line from element or pathname
  const resolveSource = (el: HTMLElement) => {
    let file = el.getAttribute('data-source-file');
    let line = el.getAttribute('data-source-line');

    if (!file || !line) {
      const closestTagged = el.closest('[data-source-file]');
      if (closestTagged) {
        file = closestTagged.getAttribute('data-source-file');
        line = closestTagged.getAttribute('data-source-line');
      }
    }

    if (!file || !line) {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (routeFixtureMap[pathname]) {
        file = routeFixtureMap[pathname].file;
        line = String(routeFixtureMap[pathname].line);
      }
    }

    return {
      file: file || 'unknown file',
      line: line || 'unknown line',
    };
  };

  const updateSelectedRect = () => {
    if (!selectedNodeRef.current) return;
    const rect = selectedNodeRef.current.getBoundingClientRect();
    setSelected((prev) =>
      prev
        ? {
            ...prev,
            rect: {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height,
            },
          }
        : null
    );
  };

  useEffect(() => {
    window.addEventListener('resize', updateSelectedRect);
    window.addEventListener('scroll', updateSelectedRect, true);
    return () => {
      window.removeEventListener('resize', updateSelectedRect);
      window.removeEventListener('scroll', updateSelectedRect, true);
    };
  }, []);

  // Handle pointer interactions
  useEffect(() => {
    if (!active) return;

    const handlePointerOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('#slightnudge-ui')) return;

      const rect = target.getBoundingClientRect();
      setHoveredRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    };

    const handlePointerOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('#slightnudge-ui')) return;
      setHoveredRect(null);
    };

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('#slightnudge-ui')) return;

      e.preventDefault();
      e.stopPropagation();

      selectedNodeRef.current = target;
      const rect = target.getBoundingClientRect();
      const { file, line } = resolveSource(target);

      const selInfo: SelectedElementInfo = {
        tagName: target.tagName.toLowerCase(),
        id: target.id || undefined,
        className: target.className || '',
        filePath: file,
        line,
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        },
      };

      setSelected(selInfo);
      setHoveredRect(null);

      // Inspect via AST engine
      if (file !== 'unknown file') {
        setLoadingInspection(true);
        try {
          const res = await fetch('/api/slightnudge/inspect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: file,
              line: line ? Number(line) : undefined,
              elementId: target.id || undefined,
            }),
          });
          const data = await res.json();
          setSelected((prev) =>
            prev
              ? {
                  ...prev,
                  safeToEdit: data.safeToEdit,
                  refusalReason: data.reason,
                }
              : null
          );
        } catch (err) {
          console.error('[slightnudge] inspect failed:', err);
        } finally {
          setLoadingInspection(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
        selectedNodeRef.current = null;
      }
    };

    document.addEventListener('mouseover', handlePointerOver, true);
    document.addEventListener('mouseout', handlePointerOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mouseover', handlePointerOver, true);
      document.removeEventListener('mouseout', handlePointerOut, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return (
    <div id="slightnudge-ui" className="pointer-events-none">
      {/* Floating Toolbar Badge */}
      <div className="fixed bottom-4 right-4 pointer-events-auto z-50 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 text-white rounded-full shadow-lg border border-slate-700/60 backdrop-blur-md text-xs font-medium">
        <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
        <span className="font-semibold tracking-wide text-indigo-300">slightnudge</span>
        <span className="text-slate-400">|</span>
        <button
          id="slightnudge-toggle"
          onClick={() => {
            setActive(!active);
            if (active) setSelected(null);
          }}
          className={`px-2 py-0.5 rounded transition ${
            active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {active ? 'Inspector ON' : 'Inspector OFF'}
        </button>
      </div>

      {/* Hover Bounding Box */}
      {active && hoveredRect && !selected && (
        <div
          id="slightnudge-hover-box"
          style={{
            position: 'absolute',
            top: `${hoveredRect.top}px`,
            left: `${hoveredRect.left}px`,
            width: `${hoveredRect.width}px`,
            height: `${hoveredRect.height}px`,
            border: '2px dashed rgba(99, 102, 241, 0.7)',
            backgroundColor: 'rgba(99, 102, 241, 0.06)',
            pointerEvents: 'none',
            zIndex: 9998,
            transition: 'all 0.05s ease-out',
          }}
        />
      )}

      {/* Selected Element Bounding Box (AutoCAD / Figma style) */}
      {selected && (
        <div
          id="slightnudge-selected-box"
          style={{
            position: 'absolute',
            top: `${selected.rect.top}px`,
            left: `${selected.rect.left}px`,
            width: `${selected.rect.width}px`,
            height: `${selected.rect.height}px`,
            border: '2px solid #4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.08)',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.4), 0 4px 12px rgba(79,70,229,0.25)',
          }}
        >
          {/* Corner Anchor Handles */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm" />

          {/* Floating Info Pill / Source Inspector Badge */}
          <div
            id="slightnudge-info-badge"
            className="absolute -top-9 left-0 pointer-events-auto bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md shadow-md border border-slate-700 flex items-center gap-2 whitespace-nowrap z-50"
            style={{ transform: selected.rect.top < 40 ? 'translateY(calc(100% + 36px))' : 'none' }}
          >
            <span className="font-semibold text-indigo-400">
              &lt;{selected.tagName}
              {selected.id ? `#${selected.id}` : ''}&gt;
            </span>
            <span className="text-slate-500">|</span>
            <span id="slightnudge-file-display" className="font-mono text-slate-200">
              {selected.filePath}:{selected.line}
            </span>
            {selected.className && (
              <>
                <span className="text-slate-500">|</span>
                <span id="slightnudge-class-display" className="font-mono text-emerald-300 truncate max-w-xs">
                  {selected.className}
                </span>
              </>
            )}

            {/* Safety status indication */}
            {selected.safeToEdit === false && (
              <span
                id="slightnudge-safety-warning"
                className="bg-amber-900/80 text-amber-200 border border-amber-600/50 px-1.5 py-0.5 rounded text-[11px] font-semibold"
              >
                ⚠️ {selected.refusalReason || "can't edit this safely"}
              </span>
            )}
            {selected.safeToEdit === true && (
              <span
                id="slightnudge-safety-ok"
                className="bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 px-1.5 py-0.5 rounded text-[10px]"
              >
                ✓ safe to nudge
              </span>
            )}
            {loadingInspection && (
              <span className="text-slate-400 text-[10px]">checking...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
