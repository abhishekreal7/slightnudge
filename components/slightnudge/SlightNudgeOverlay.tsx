'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronsDown, ChevronsUp, CircleAlert, Code2, Columns2, GripVertical, Layers, LoaderCircle, MousePointer2, Pencil, RotateCcw, Sparkles, Type, Undo2, X } from 'lucide-react';

interface SelectedElementInfo {
  tagName: string;
  id?: string;
  className: string;
  textContent?: string;
  filePath: string;
  line: string | number;
  column?: string | number;
  rect: { top: number; left: number; width: number; height: number };
  clickedRect?: { top: number; left: number; width: number; height: number };
  safeToEdit?: boolean;
  refusalReason?: string;
  textEditable?: boolean;
  textReason?: string;
  propSource?: string;
}
interface PendingEdit {
  id: string;
  filePath: string;
  line?: number;
  summary: string;
  oldValue: string;
  newValue: string;
  previewType?: 'className' | 'textContent' | 'imageSource' | 'reorder';
  originalDomValue?: string;
  targetIndex?: number;
}

function isTextElement(tagName?: string) {
  return ['p', 'span', 'a', 'button', 'label', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName || '');
}

const styleOptions = {
  fontSize: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl'],
  fontWeight: ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
  fontFamily: ['font-sans', 'font-serif', 'font-mono'],
  lineHeight: ['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose'],
  letterSpacing: ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest'],
  textTransform: ['normal-case', 'capitalize', 'uppercase', 'lowercase'],
  display: ['block', 'inline-block', 'flex', 'inline-flex', 'grid', 'hidden'],
  flexDirection: ['flex-row', 'flex-col'],
  alignItems: ['items-start', 'items-center', 'items-end', 'items-stretch'],
  justifyContent: ['justify-start', 'justify-center', 'justify-between', 'justify-end'],
  width: ['w-auto', 'w-full', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4'],
  maxWidth: ['max-w-none', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl'],
  gap: ['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8', 'gap-12'],
  borderRadius: ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'],
  textColor: ['text-[#17211f]', 'text-[#697571]', 'text-[#176b55]', 'text-[#b43e35]', 'text-[#ffffff]'],
  backgroundColor: ['bg-[#ffffff]', 'bg-[#f1f3f1]', 'bg-[#176b55]', 'bg-[#17211f]'],
  padding: ['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-12'],
} as const;

const propertyNames = {
  fontSize: 'Text size', fontWeight: 'Weight', fontFamily: 'Font family', lineHeight: 'Line height', letterSpacing: 'Letter spacing', textTransform: 'Case', textColor: 'Text color',
  alignment: 'Alignment', backgroundColor: 'Fill color', padding: 'Padding', display: 'Display', flexDirection: 'Direction', alignItems: 'Align items', justifyContent: 'Justify content', width: 'Width', maxWidth: 'Max width', gap: 'Gap', borderRadius: 'Corner radius',
  margin: 'Margin',
} as const;
const breakpoints = [['', 'Base'], ['sm', '≥640'], ['md', '≥768'], ['lg', '≥1024'], ['xl', '≥1280'], ['2xl', '≥1536']] as const;

const utilityPatterns: Record<string, RegExp> = {
  fontSize: /^text-(?:xs|sm|base|lg|xl|[2-7]xl|\[length:)/,
  fontWeight: /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
  fontFamily: /^font-(?:sans|serif|mono)$/,
  lineHeight: /^leading-(?:none|tight|snug|normal|relaxed|loose)$/,
  letterSpacing: /^tracking-(?:tighter|tight|normal|wide|wider|widest)$/,
  textTransform: /^(?:uppercase|lowercase|capitalize|normal-case)$/,
  textColor: /^text-(?:\[|[a-z]+(?:-\d{2,3})?$)/,
  alignment: /^text-(?:left|center|right|justify)$/,
  backgroundColor: /^bg-(?:\[|[a-z]+(?:-\d{2,3})?$)/,
  padding: /^p[trblxy]?-(?:\d+(?:\.\d+)?|\[)/,
  display: /^(?:block|inline-block|flex|inline-flex|grid|hidden)$/,
  width: /^w-(?:auto|full|1\/2|1\/3|2\/3|1\/4|3\/4)$/,
  maxWidth: /^max-w-(?:none|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)$/,
  gap: /^gap-(?:0|1|2|3|4|6|8|10|12|16)$/,
  borderRadius: /^rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?$/,
  justifyContent: /^justify-(?:start|end|center|between|around|evenly)$/,
  alignItems: /^items-(?:start|end|center|baseline|stretch)$/,
  flexDirection: /^flex-(?:row|col)(?:-reverse)?$/,
  margin: /^(-?)m[trblxy]?-(?:\d+(?:\.\d+)?|\[)/,
};

function applyMarginInline(element: HTMLElement, className: string) {
  if (!element || !element.style) return;
  const tokens = (className || '').split(/\s+/).filter(Boolean);
  let foundMt = false;
  let foundMl = false;

  for (const t of tokens) {
    const mtMatch = t.match(/^(-?)mt-([0-9.]+)$/);
    if (mtMatch) {
      foundMt = true;
      const sign = mtMatch[1] ? -1 : 1;
      const num = parseFloat(mtMatch[2]);
      element.style.marginTop = `${sign * num * 4}px`;
    }
    const mlMatch = t.match(/^(-?)ml-([0-9.]+)$/);
    if (mlMatch) {
      foundMl = true;
      const sign = mlMatch[1] ? -1 : 1;
      const num = parseFloat(mlMatch[2]);
      element.style.marginLeft = `${sign * num * 4}px`;
    }
  }

  if (!foundMt && element.style.marginTop) {
    element.style.marginTop = '';
  }
  if (!foundMl && element.style.marginLeft) {
    element.style.marginLeft = '';
  }
}

function applyOptimisticInlineStyle(element: HTMLElement, property: keyof typeof propertyNames, value: string) {
  switch (property) {
    case 'backgroundColor': {
      const hex = value.match(/#([0-9a-f]{6})/i)?.[0];
      if (hex) element.style.backgroundColor = hex;
      else if (value === 'bg-white') element.style.backgroundColor = '#ffffff';
      else if (value === 'bg-black') element.style.backgroundColor = '#000000';
      else if (value === 'bg-transparent') element.style.backgroundColor = 'transparent';
      break;
    }
    case 'textColor': {
      const hex = value.match(/#([0-9a-f]{6})/i)?.[0];
      if (hex) element.style.color = hex;
      else if (value === 'text-white') element.style.color = '#ffffff';
      else if (value === 'text-black') element.style.color = '#000000';
      break;
    }
    case 'borderRadius': {
      const radiusMap: Record<string, string> = {
        'rounded-none': '0px',
        'rounded-sm': '0.125rem',
        'rounded': '0.25rem',
        'rounded-md': '0.375rem',
        'rounded-lg': '0.5rem',
        'rounded-xl': '0.75rem',
        'rounded-2xl': '1rem',
        'rounded-3xl': '1.5rem',
        'rounded-full': '9999px',
      };
      if (radiusMap[value]) element.style.borderRadius = radiusMap[value];
      break;
    }
    case 'padding': {
      const paddingMap: Record<string, string> = {
        'p-0': '0px',
        'p-1': '0.25rem',
        'p-2': '0.5rem',
        'p-3': '0.75rem',
        'p-4': '1rem',
        'p-6': '1.5rem',
        'p-8': '2rem',
        'p-12': '3rem',
      };
      if (paddingMap[value]) {
        element.style.padding = paddingMap[value];
      }
      break;
    }
    case 'fontSize': {
      const fontMap: Record<string, string> = {
        'text-xs': '0.75rem',
        'text-sm': '0.875rem',
        'text-base': '1rem',
        'text-lg': '1.125rem',
        'text-xl': '1.25rem',
        'text-2xl': '1.5rem',
        'text-3xl': '1.875rem',
        'text-4xl': '2.25rem',
        'text-5xl': '3rem',
        'text-6xl': '3.75rem',
        'text-7xl': '4.5rem',
      };
      if (fontMap[value]) element.style.fontSize = fontMap[value];
      break;
    }
    case 'fontWeight': {
      const weightMap: Record<string, string> = {
        'font-normal': '400',
        'font-medium': '500',
        'font-semibold': '600',
        'font-bold': '700',
        'font-extrabold': '800',
        'font-black': '900',
      };
      if (weightMap[value]) element.style.fontWeight = weightMap[value];
      break;
    }
    case 'alignment': {
      const alignMap: Record<string, string> = {
        'text-left': 'left',
        'text-center': 'center',
        'text-right': 'right',
        'text-justify': 'justify',
      };
      if (alignMap[value]) element.style.textAlign = alignMap[value];
      break;
    }
    case 'gap': {
      const gapMap: Record<string, string> = {
        'gap-0': '0px',
        'gap-1': '0.25rem',
        'gap-2': '0.5rem',
        'gap-3': '0.75rem',
        'gap-4': '1rem',
        'gap-6': '1.5rem',
        'gap-8': '2rem',
        'gap-12': '3rem',
      };
      if (gapMap[value]) element.style.gap = gapMap[value];
      break;
    }
    case 'width': {
      if (value === 'w-auto') element.style.width = 'auto';
      else if (value === 'w-full') element.style.width = '100%';
      break;
    }
    case 'maxWidth': {
      const maxWMap: Record<string, string> = {
        'max-w-none': 'none',
        'max-w-sm': '24rem',
        'max-w-md': '28rem',
        'max-w-lg': '32rem',
        'max-w-xl': '36rem',
        'max-w-2xl': '42rem',
      };
      if (maxWMap[value]) element.style.maxWidth = maxWMap[value];
      break;
    }
    case 'display': {
      element.style.display = value;
      break;
    }
    case 'flexDirection': {
      if (value === 'flex-row') element.style.flexDirection = 'row';
      else if (value === 'flex-col') element.style.flexDirection = 'column';
      break;
    }
    case 'alignItems': {
      const itemMap: Record<string, string> = {
        'items-start': 'flex-start',
        'items-center': 'center',
        'items-end': 'flex-end',
        'items-baseline': 'baseline',
        'items-stretch': 'stretch',
      };
      if (itemMap[value]) element.style.alignItems = itemMap[value];
      break;
    }
    case 'justifyContent': {
      const justifyMap: Record<string, string> = {
        'justify-start': 'flex-start',
        'justify-center': 'center',
        'justify-end': 'flex-end',
        'justify-between': 'space-between',
        'justify-around': 'space-around',
        'justify-evenly': 'space-evenly',
      };
      if (justifyMap[value]) element.style.justifyContent = justifyMap[value];
      break;
    }
    case 'margin': {
      applyMarginInline(element, value);
      break;
    }
  }
}

function computeOptimisticClassName(currentClass: string, property: keyof typeof propertyNames, value: string, breakpoint = '') {
  const pattern = utilityPatterns[property];
  const tokens = currentClass.split(/\s+/).filter(Boolean);
  const prefix = breakpoint ? `${breakpoint}:` : '';
  const nextToken = `${prefix}${value}`;

  if (property === 'padding') {
    const remaining = tokens.filter((t) => !(t.startsWith(prefix) && /^p[trblxy]?-/.test(t.slice(prefix.length))));
    remaining.push(nextToken);
    return remaining.join(' ');
  }

  if (property === 'margin') {
    const remaining = tokens.filter((t) => !(t.startsWith(prefix) && /^(-?)m[trblxy]?-/.test(t.slice(prefix.length))));
    remaining.push(nextToken);
    return remaining.join(' ');
  }

  if (pattern) {
    const index = tokens.findIndex((t) => t.startsWith(prefix) && pattern.test(t.slice(prefix.length)));
    if (index >= 0) {
      tokens[index] = nextToken;
      return tokens.join(' ');
    }
  }
  tokens.push(nextToken);
  return tokens.join(' ');
}

function hasBreakpointClass(className: string, value: string, breakpoint: string) {
  return className.split(/\s+/).includes(breakpoint ? `${breakpoint}:${value}` : value);
}

const fontSizePixelMap: Record<string, string> = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',
  '5xl': '48px',
  '6xl': '60px',
  '7xl': '72px',
  '8xl': '96px',
  '9xl': '128px',
};

const spacingPixelMap: Record<string, string> = {
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '3.5': '14px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '11': '44px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
};

export function SlightNudgeOverlay({
  defaultFilePath,
  zoom = 100,
}: {
  defaultFilePath?: string;
  zoom?: number;
} = {}) {
  const getPreviewScale = useCallback((): number => {
    if (typeof zoom === 'number' && zoom > 0 && zoom !== 100) {
      return zoom / 100;
    }
    const frame = document.querySelector('.sn-preview-frame') as HTMLElement | null;
    if (frame) {
      const transform = window.getComputedStyle(frame).transform;
      if (transform && transform !== 'none') {
        try {
          const matrix = new DOMMatrix(transform);
          if (matrix.a && matrix.a > 0) return matrix.a;
        } catch {
          // ignore
        }
      }
    }
    return 1;
  }, [zoom]);
  const [active, setActive] = useState(true);
  const [hoveredRect, setHoveredRect] = useState<SelectedElementInfo['rect'] | null>(null);
  const [selected, setSelected] = useState<SelectedElementInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [openSection, setOpenSection] = useState<'text' | 'arrange' | 'spacing' | 'layout' | 'type' | 'color' | 'surface'>('spacing');
  const [draftText, setDraftText] = useState('');
  const [activeBreakpoint, setActiveBreakpoint] = useState('lg');
  const [canUndo, setCanUndo] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [buttonMode, setButtonMode] = useState<'shell' | 'content'>('shell');
  const inlineInitialTextRef = useRef<string>('');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeBadge, setResizeBadge] = useState<string | null>(null);
  const [resizeDelta, setResizeDelta] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [isDraggingMove, setIsDraggingMove] = useState(false);
  const [dragCursor, setDragCursor] = useState<{ x: number; y: number } | null>(null);
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
  const [moveShift, setMoveShift] = useState<{ x: number; y: number } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    direction: 'earlier' | 'later' | 'top' | 'bottom' | 'invalid';
    top: number;
    left: number;
    width?: number;
    height?: number;
    isInvalid?: boolean;
    orientation?: 'horizontal' | 'vertical';
  } | null>(null);
  const selectedNodeRef = useRef<HTMLElement | null>(null);
  const editGroupIdRef = useRef<string | null>(null);
  const originalStyleRef = useRef<string | null>(null);
  const originalPositionRef = useRef<{ parent: HTMLElement; nextSibling: HTMLElement | null } | null>(null);

  const updateSelectedRect = useCallback(() => {
    if (!selectedNodeRef.current) return;
    const rect = selectedNodeRef.current.getBoundingClientRect();
    setSelected((current) => current ? { ...current, rect: { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height } } : null);
  }, []);

  const animateSelectionRect = useCallback((durationMs = 260) => {
    const start = performance.now();
    const tick = (now: number) => {
      updateSelectedRect();
      if (now - start < durationMs) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, [updateSelectedRect]);

  const resolveSource = useCallback((element: HTMLElement) => {
    const source = element.closest<HTMLElement>('[data-source-file]') || element;
    const filePath = source.dataset.sourceFile || defaultFilePath || '';
    return { filePath, line: source.dataset.sourceLine || '', column: source.dataset.sourceColumn || '' };
  }, [defaultFilePath]);

  const isSyncingRef = useRef(false);
  const pendingPayloadQueueRef = useRef<Record<string, unknown> | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const previewChange = useCallback(async (payload: Record<string, unknown>) => {
    if (isSyncingRef.current) {
      pendingPayloadQueueRef.current = payload;
      return;
    }
    isSyncingRef.current = true;
    setNotice(null);
    try {
      if (pendingEdit) {
        try {
          editGroupIdRef.current ||= crypto.randomUUID();
          await fetch('/api/slightnudge/apply', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewId: pendingEdit.id, groupId: editGroupIdRef.current }),
          });
          setCanUndo(true);
        } catch { /* proceed with new change */ }
      }
      const response = await fetch('/api/slightnudge/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not prepare this change.');
      if (result.changed === false) {
        setNotice(result.message || 'No source change is needed.');
        return;
      }
      const preview = { ...result, originalDomValue: selectedNodeRef.current?.textContent ?? undefined } as PendingEdit;
      if (selectedNodeRef.current && preview.previewType === 'textContent') {
        selectedNodeRef.current.textContent = preview.newValue;
      } else if (selectedNodeRef.current && preview.previewType === 'reorder') {
        const el = selectedNodeRef.current;
        const parent = el.parentElement;
        if (parent) {
          if (!originalPositionRef.current) {
            originalPositionRef.current = {
              parent,
              nextSibling: el.nextElementSibling as HTMLElement | null,
            };
          }

          // FLIP First: record visual bounding rects before DOM swap
          const scale = getPreviewScale();
          const allChildren = Array.from(parent.children) as HTMLElement[];
          const firstRects = new Map<HTMLElement, DOMRect>();
          allChildren.forEach((child) => {
            firstRects.set(child, child.getBoundingClientRect());
          });

          const slotMatch = preview.summary.match(/to slot (\d+)/);
          const targetIdx = preview.targetIndex !== undefined
            ? preview.targetIndex
            : (slotMatch ? parseInt(slotMatch[1], 10) : undefined);
          if (targetIdx !== undefined) {
            const allKids = Array.from(parent.children) as HTMLElement[];
            const curIdx = allKids.indexOf(el);
            if (curIdx >= 0) {
              const order = [...allKids];
              const [moved] = order.splice(curIdx, 1);
              order.splice(targetIdx, 0, moved);
              order.forEach((c) => parent.appendChild(c));
            }
          } else if (preview.summary.includes('top')) {
            const first = parent.firstElementChild;
            if (first && first !== el) first.before(el);
          } else if (preview.summary.includes('bottom')) {
            const last = parent.lastElementChild;
            if (last && last !== el) last.after(el);
          } else if (preview.summary.includes('earlier')) {
            el.previousElementSibling?.before(el);
          } else if (preview.summary.includes('later')) {
            el.nextElementSibling?.after(el);
          }

          // FLIP Invert: instantaneously cancel visual displacement with transition none
          const updatedChildren = Array.from(parent.children) as HTMLElement[];
          const invertMap = new Map<HTMLElement, { x: number; y: number }>();
          updatedChildren.forEach((child) => {
            const firstR = firstRects.get(child);
            if (firstR) {
              // Clear previous drag transform so lastR reflects true resting DOM position
              child.style.transition = 'none';
              child.style.transform = '';
              const lastR = child.getBoundingClientRect();
              const invertX = (firstR.left - lastR.left) / scale;
              const invertY = (firstR.top - lastR.top) / scale;
              invertMap.set(child, { x: invertX, y: invertY });
              if (Math.abs(invertX) > 0.5 || Math.abs(invertY) > 0.5) {
                child.style.transform = `translate3d(${invertX}px, ${invertY}px, 0)`;
              }
            }
          });

          // FLIP Play: glide smoothly to final resting places over ~220ms (capped to <=8px per frame)
          requestAnimationFrame(() => {
            updatedChildren.forEach((child) => {
              const inv = invertMap.get(child);
              const dist = inv ? Math.hypot(inv.x, inv.y) * scale : 0;
              const dur = Math.max(220, Math.round(dist / 0.06));
              child.style.transition = `transform ${dur}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
              child.style.transform = '';
            });
          });
        }
        animateSelectionRect(260);
      } else if (selectedNodeRef.current && typeof preview.newValue === 'string') {
        selectedNodeRef.current.className = preview.newValue;
        applyMarginInline(selectedNodeRef.current, preview.newValue);
        setSelected((current) => current ? { ...current, className: preview.newValue } : current);
        animateSelectionRect(260);
      }
      setPendingEdit(preview);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not prepare this change.');
    } finally {
      isSyncingRef.current = false;
      if (pendingPayloadQueueRef.current) {
        const nextPayload = pendingPayloadQueueRef.current;
        pendingPayloadQueueRef.current = null;
        void previewChange(nextPayload);
      }
    }
  }, [animateSelectionRect, pendingEdit]);

  const debouncedServerPreview = useCallback((payload: Record<string, unknown>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void previewChange(payload);
    }, 180);
  }, [previewChange]);

  const discardPreview = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const pending = pendingEdit;
    if (!pending) return;
    if (selectedNodeRef.current && selectedNodeRef.current.isConnected) {
      if (pending.previewType === 'textContent') {
        selectedNodeRef.current.textContent = pending.originalDomValue ?? pending.oldValue;
        setDraftText(pending.originalDomValue ?? pending.oldValue);
      } else if (pending.previewType === 'reorder') {
        const el = selectedNodeRef.current;
        if (originalPositionRef.current) {
          const { parent, nextSibling } = originalPositionRef.current;
          if (nextSibling && nextSibling.parentElement === parent) {
            nextSibling.before(el);
          } else if (parent.isConnected) {
            parent.appendChild(el);
          }
          originalPositionRef.current = null;
        }
        animateSelectionRect(260);
      } else {
        selectedNodeRef.current.className = pending.oldValue;
        applyMarginInline(selectedNodeRef.current, pending.oldValue);
        setSelected((current) => current ? { ...current, className: pending.oldValue } : current);
      }
      if (originalStyleRef.current !== null) {
        if (originalStyleRef.current) {
          selectedNodeRef.current.setAttribute('style', originalStyleRef.current);
        } else {
          selectedNodeRef.current.removeAttribute('style');
        }
      }
      animateSelectionRect(260);
    }
    setPendingEdit(null);
    const response = await fetch(`/api/slightnudge/preview?id=${encodeURIComponent(pending.id)}`, { method: 'DELETE' });
    if (!response.ok) setNotice('Preview dismissed. It will expire automatically.');
    else setNotice('Change discarded. Source is unchanged.');
  }, [animateSelectionRect, pendingEdit]);

  const applyPreview = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (!pendingEdit || busy) return;
    setBusy(true); setNotice(null);
    try {
      editGroupIdRef.current ||= crypto.randomUUID();
      const response = await fetch('/api/slightnudge/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewId: pendingEdit.id, groupId: editGroupIdRef.current }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not apply this change.');
      if (selectedNodeRef.current && result.previewType === 'textContent' && typeof result.value === 'string') {
        selectedNodeRef.current.textContent = result.value;
        setDraftText(result.value);
        setSelected((current) => current ? { ...current, textContent: result.value } : null);
      } else if (selectedNodeRef.current && result.previewType === 'imageSource' && typeof result.value === 'string' && selectedNodeRef.current instanceof HTMLImageElement) {
        selectedNodeRef.current.setAttribute('src', result.value);
        setSelected((current) => current ? { ...current, imageSource: result.value } : null);
      } else if (selectedNodeRef.current && result.previewType === 'reorder') {
        animateSelectionRect(260);
      } else {
        if (selectedNodeRef.current && typeof result.className === 'string') {
          selectedNodeRef.current.className = result.className;
          applyMarginInline(selectedNodeRef.current, result.className);
        }
        setSelected((current) => current ? { ...current, className: result.className || current.className } : null);
      }
      if (selectedNodeRef.current) {
        if (originalStyleRef.current) {
          selectedNodeRef.current.setAttribute('style', originalStyleRef.current);
        } else {
          selectedNodeRef.current.removeAttribute('style');
        }
        if (selectedNodeRef.current.className) {
          applyMarginInline(selectedNodeRef.current, selectedNodeRef.current.className);
        }
      }
      originalStyleRef.current = selectedNodeRef.current?.getAttribute('style') || '';
      originalPositionRef.current = null;
      setPendingEdit(null);
      setCanUndo(true);
      setNotice(`${result.message} Further tweaks to this selection will undo together.`);
      animateSelectionRect(260);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not apply this change.');
    } finally { setBusy(false); }
  }, [animateSelectionRect, busy, pendingEdit]);

  const inspect = useCallback(async (element: HTMLElement, info: SelectedElementInfo) => {
    if (!info.filePath) {
      setSelected((current) => current ? { ...current, safeToEdit: false, refusalReason: 'This preview does not include a source mapping yet.' } : null);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/slightnudge/inspect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: info.filePath,
          line: Number(info.line) || undefined,
          column: Number(info.column) || undefined,
          elementId: element.id || undefined,
          tagName: info.tagName,
          className: info.className,
          rect: info.rect,
          clickedRect: info.clickedRect,
        }),
      });
      const result = await response.json();
      if (typeof result.className === 'string' && element.isConnected) {
        element.className = result.className;
        applyMarginInline(element, result.className);
      }
      setSelected((current) => {
        return current ? {
          ...current,
          ...(typeof result.className === 'string' ? { className: result.className } : {}),
          safeToEdit: Boolean(result.safeToEdit),
          refusalReason: result.reason,
          textEditable: result.textEditable,
          textReason: result.textReason,
          propSource: result.propSource,
        } : null;
      });
      setCanUndo(Boolean(result.canUndo));
      requestAnimationFrame(updateSelectedRect);
    } catch {
      setSelected((current) => current ? { ...current, safeToEdit: false, refusalReason: 'Could not inspect this source file.' } : null);
    } finally { setBusy(false); }
  }, [updateSelectedRect]);

  const startInlineEditing = useCallback(() => {
    if (!selected || !selectedNodeRef.current) return;
    if (selected.safeToEdit !== true) {
      setWarning(true);
      setNotice(selected.refusalReason || 'Select an editable element first.');
      window.setTimeout(() => setWarning(false), 900);
      return;
    }
    if (selected.textEditable === false) {
      setWarning(true);
      setNotice(selected.textReason || 'This text cannot be edited directly.');
      window.setTimeout(() => setWarning(false), 900);
      return;
    }
    const el = selectedNodeRef.current;
    inlineInitialTextRef.current = el.textContent || '';
    setIsInlineEditing(true);
    el.contentEditable = 'true';
    el.spellcheck = false;
    el.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch { /* fallback */ }
    requestAnimationFrame(updateSelectedRect);
  }, [selected, updateSelectedRect]);

  const finishInlineEditing = useCallback((save: boolean) => {
    if (!selectedNodeRef.current) {
      setIsInlineEditing(false);
      return;
    }
    const el = selectedNodeRef.current;
    el.contentEditable = 'false';
    setIsInlineEditing(false);
    const newText = (el.textContent || '').trim();
    const oldText = inlineInitialTextRef.current;
    if (save && newText && newText !== oldText) {
      setDraftText(newText);
      setSelected((cur) => cur ? { ...cur, textContent: newText } : null);
      animateSelectionRect(260);
      if (selected && selected.safeToEdit === true) {
        void previewChange({
          kind: 'text',
          filePath: selected.filePath,
          line: Number(selected.line) || undefined,
          column: Number(selected.column) || undefined,
          elementId: selected.id,
          value: newText,
        });
      }
    } else if (!save) {
      el.textContent = oldText;
      setDraftText(oldText);
      setSelected((cur) => cur ? { ...cur, textContent: oldText } : null);
      animateSelectionRect(260);
    }
  }, [animateSelectionRect, previewChange, selected]);

  useEffect(() => {
    if (!isInlineEditing || !selectedNodeRef.current) return;
    const el = selectedNodeRef.current;
    const onInput = () => {
      updateSelectedRect();
      setDraftText(el.textContent || '');
    };
    const onBlur = (e: FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest('#slightnudge-ui')) return;
      finishInlineEditing(true);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishInlineEditing(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishInlineEditing(false);
      }
    };
    el.addEventListener('input', onInput);
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('input', onInput);
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('keydown', onKeyDown);
    };
  }, [finishInlineEditing, isInlineEditing, updateSelectedRect]);

  const undo = useCallback(async () => {
    if (pendingEdit) { await discardPreview(); return; }
    setBusy(true); setNotice(null);
    try {
      const response = await fetch('/api/slightnudge/undo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selected?.filePath || defaultFilePath }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'There is no visual edit to undo.');
      editGroupIdRef.current = null;
      setCanUndo(false);
      setNotice(result.message || 'Undid the last visual change.');
      if (selectedNodeRef.current && selected) await inspect(selectedNodeRef.current, selected);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not undo this edit.'); }
    finally { setBusy(false); }
  }, [defaultFilePath, discardPreview, inspect, pendingEdit, selected]);

  useEffect(() => {
    const onResizeOrScroll = () => updateSelectedRect();
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);
    return () => { window.removeEventListener('resize', onResizeOrScroll); window.removeEventListener('scroll', onResizeOrScroll, true); };
  }, [updateSelectedRect]);

  useEffect(() => {
    const onViewport = (event: Event) => {
      const viewport = (event as CustomEvent<{ viewport?: string }>).detail?.viewport;
      setActiveBreakpoint(viewport === 'mobile' ? '' : viewport === 'tablet' ? 'md' : 'lg');
    };
    window.addEventListener('slightnudge:viewport', onViewport);
    return () => window.removeEventListener('slightnudge:viewport', onViewport);
  }, []);

  useEffect(() => {
    const onUndo = () => { void undo(); };
    window.addEventListener('slightnudge:undo', onUndo);
    return () => window.removeEventListener('slightnudge:undo', onUndo);
  }, [undo]);

  useEffect(() => {
    if (!active) return;
    const onPointerMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('#slightnudge-ui') || !target.closest('.sn-preview-content')) { setHoveredRect(null); return; }
      const rect = target.getBoundingClientRect();
      setHoveredRect({ top: rect.top + scrollY, left: rect.left + scrollX, width: rect.width, height: rect.height });
    };
    const onClick = (event: MouseEvent) => {
      const rawTarget = event.target as HTMLElement | null;
      const target = rawTarget;
      if (!target || target.closest('#slightnudge-ui') || !target.closest('.sn-preview-content')) return;
      if (isInlineEditing) {
        if (selectedNodeRef.current && (target === selectedNodeRef.current || selectedNodeRef.current.contains(target))) {
          return;
        }
        finishInlineEditing(true);
      }
      if (pendingEdit) {
        try {
          editGroupIdRef.current ||= crypto.randomUUID();
          void fetch('/api/slightnudge/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewId: pendingEdit.id, groupId: editGroupIdRef.current }),
          });
          setCanUndo(true);
        } catch { /* proceed with new selection */ }
        setPendingEdit(null);
      }
      event.preventDefault(); event.stopPropagation();
      const sourceNode = target.closest<HTMLElement>('[data-source-file]') || target;
      const targetRect = target.getBoundingClientRect();
      const markerRect = sourceNode.getBoundingClientRect();
      const source = resolveSource(sourceNode);
      const isPlayground = Boolean(defaultFilePath || source.filePath?.startsWith('fixtures/'));
      const info: SelectedElementInfo = {
        tagName: target.tagName.toLowerCase(), id: sourceNode.id || undefined,
        className: typeof target.className === 'string' ? target.className : '',
        textContent: sourceNode.textContent || '',
        filePath: source.filePath, line: source.line, column: source.column,
        rect: { top: markerRect.top + scrollY, left: markerRect.left + scrollX, width: markerRect.width, height: markerRect.height },
        clickedRect: { top: targetRect.top + scrollY, left: targetRect.left + scrollX, width: targetRect.width, height: targetRect.height },
        safeToEdit: isPlayground ? true : undefined,
      };
      selectedNodeRef.current = sourceNode;
      try {
        applyMarginInline(sourceNode, typeof target.className === 'string' ? target.className : '');
      } catch { /* fallback */ }
      originalStyleRef.current = sourceNode.getAttribute('style') || '';
      editGroupIdRef.current = crypto.randomUUID();
      setDraftText(sourceNode.textContent || '');
      setPendingEdit(null); setSelected(info); setHoveredRect(null); setNotice(null);
      setButtonMode('shell');
      setOpenSection(['p', 'span', 'a', 'button', 'label', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(info.tagName) ? 'text' : 'spacing');
      void inspect(sourceNode, info);
    };
    const onDoubleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('#slightnudge-ui') || !target.closest('.sn-preview-content')) return;
      const sourceNode = target.closest<HTMLElement>('[data-source-file]') || target;
      if (sourceNode === selectedNodeRef.current && isTextElement(selected?.tagName)) {
        event.preventDefault();
        event.stopPropagation();
        startInlineEditing();
      }
    };
    const onEscapeOrNudge = async (event: KeyboardEvent) => {
      if (isInlineEditing) return;
      if (busy) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') event.preventDefault(); return; }
      if (event.key === 'Escape') {
        if (pendingEdit) { void discardPreview(); return; }
        setSelected(null); selectedNodeRef.current = null; editGroupIdRef.current = null; originalStyleRef.current = null; setNotice(null); return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); void undo(); return; }
      if (event.key === 'Enter' && selected && isTextElement(selected.tagName) && selected.textEditable !== false) {
        event.preventDefault();
        startInlineEditing();
        return;
      }
      if (!selected || !selectedNodeRef.current || !['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      if (selected.safeToEdit !== true) { setWarning(true); setNotice(selected.refusalReason || 'Select an editable element first.'); window.setTimeout(() => setWarning(false), 900); return; }

      // Alt+Shift+ArrowUp / Alt+Shift+ArrowDown: Move directly to top or bottom
      if (event.altKey && event.shiftKey && event.key === 'ArrowUp') {
        await previewChange({ kind: 'reorder', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction: 'top' });
        return;
      }
      if (event.altKey && event.shiftKey && event.key === 'ArrowDown') {
        await previewChange({ kind: 'reorder', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction: 'bottom' });
        return;
      }

      // Alt+Arrow: Reorder earlier / later
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowLeft')) {
        await previewChange({ kind: 'reorder', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction: 'earlier' });
        return;
      }
      if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowRight')) {
        await previewChange({ kind: 'reorder', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction: 'later' });
        return;
      }

      // Regular Arrow keys: Spacing nudge
      const direction = event.key === 'ArrowRight' ? 'right' : event.key === 'ArrowLeft' ? 'left' : event.key === 'ArrowDown' ? 'down' : 'up';
      await previewChange({ kind: 'nudge', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction, stepSize: event.shiftKey ? 'big' : 'normal' });
    };
    document.addEventListener('pointerover', onPointerMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('dblclick', onDoubleClick, true);
    document.addEventListener('keydown', onEscapeOrNudge);
    return () => {
      document.removeEventListener('pointerover', onPointerMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('dblclick', onDoubleClick, true);
      document.removeEventListener('keydown', onEscapeOrNudge);
    };
  }, [active, busy, defaultFilePath, discardPreview, finishInlineEditing, inspect, isInlineEditing, pendingEdit, previewChange, resolveSource, selected, startInlineEditing, undo, updateSelectedRect]);

  async function updateStyle(property: keyof typeof propertyNames, value: string, breakpoint = activeBreakpoint) {
    if (!selected || selected.safeToEdit !== true || !selectedNodeRef.current) return;
    // Instant 0ms Optimistic Update on DOM & State
    applyOptimisticInlineStyle(selectedNodeRef.current, property, value);
    const nextClass = computeOptimisticClassName(selected.className, property, value, breakpoint);
    selectedNodeRef.current.className = nextClass;
    setSelected((current) => current ? { ...current, className: nextClass } : current);
    animateSelectionRect(260);

    // Non-blocking Debounced Server Background Preview
    debouncedServerPreview({
      kind: 'style',
      filePath: selected.filePath,
      line: Number(selected.line) || undefined,
      column: Number(selected.column) || undefined,
      elementId: selected.id,
      property,
      value,
      breakpoint,
    });
  }

  async function updateText() {
    if (!selected || selected.safeToEdit !== true || !selectedNodeRef.current) return;
    // Instant 0ms Optimistic Update on DOM & State
    selectedNodeRef.current.textContent = draftText;
    setSelected((current) => current ? { ...current, textContent: draftText } : current);
    animateSelectionRect(260);

    // Non-blocking Server Background Preview
    void previewChange({
      kind: 'text',
      filePath: selected.filePath,
      line: Number(selected.line) || undefined,
      column: Number(selected.column) || undefined,
      elementId: selected.id,
      value: draftText,
    });
  }

  const currentFontSize = useMemo(() => {
    if (!selected) return 'text-base';
    return styleOptions.fontSize.find((f) => selected.className.split(/\s+/).includes(f)) || 'text-base';
  }, [selected]);

  const currentFontSizeLabel = useMemo(() => {
    return currentFontSize.replace('text-', '');
  }, [currentFontSize]);

  const stepFontSize = useCallback((delta: -1 | 1) => {
    if (!selected) return;
    const currentIndex = (styleOptions.fontSize as readonly string[]).indexOf(currentFontSize);
    const validIndex = currentIndex === -1 ? 2 : currentIndex;
    const nextIndex = Math.max(0, Math.min(styleOptions.fontSize.length - 1, validIndex + delta));
    void updateStyle('fontSize', styleOptions.fontSize[nextIndex]);
  }, [currentFontSize, selected, updateStyle]);

  const isBold = useMemo(() => {
    return Boolean(selected?.className.match(/\bfont-(semibold|bold|extrabold|black)\b/));
  }, [selected]);

  const toggleBold = useCallback(() => {
    if (!selected) return;
    void updateStyle('fontWeight', isBold ? 'font-normal' : 'font-bold');
  }, [isBold, selected, updateStyle]);

  const currentAlign = useMemo(() => {
    if (!selected) return 'text-left';
    return selected.className.match(/\btext-(left|center|right)\b/)?.[0] || 'text-left';
  }, [selected]);

  const currentPadding = useMemo(() => {
    if (!selected) return 'p-4';
    return styleOptions.padding.find((p) => selected.className.split(/\s+/).includes(p)) || 'p-4';
  }, [selected]);

  const stepPadding = useCallback((delta: -1 | 1) => {
    if (!selected) return;
    const currentIndex = (styleOptions.padding as readonly string[]).indexOf(currentPadding);
    const validIndex = currentIndex === -1 ? 4 : currentIndex;
    const nextIndex = Math.max(0, Math.min(styleOptions.padding.length - 1, validIndex + delta));
    void updateStyle('padding', styleOptions.padding[nextIndex]);
  }, [currentPadding, selected, updateStyle]);

  const currentGap = useMemo(() => {
    if (!selected) return 'gap-4';
    return styleOptions.gap.find((g) => selected.className.split(/\s+/).includes(g)) || 'gap-4';
  }, [selected]);

  const stepGap = useCallback((delta: -1 | 1) => {
    if (!selected) return;
    const currentIndex = (styleOptions.gap as readonly string[]).indexOf(currentGap);
    const validIndex = currentIndex === -1 ? 4 : currentIndex;
    const nextIndex = Math.max(0, Math.min(styleOptions.gap.length - 1, validIndex + delta));
    void updateStyle('gap', styleOptions.gap[nextIndex]);
  }, [currentGap, selected, updateStyle]);

  const isButtonElement = Boolean(
    selected && (
      selected.tagName === 'button' ||
      (selected.tagName === 'a' && (selected.className.includes('btn') || selected.className.includes('button') || selected.className.includes('cta') || selected.className.includes('rounded') || selected.className.includes('bg-') || selected.className.includes('px-'))) ||
      selected.className.includes('btn') ||
      selected.className.includes('button')
    )
  );

  const hasPrevSibling = Boolean(selectedNodeRef.current?.previousElementSibling);
  const hasNextSibling = Boolean(selectedNodeRef.current?.nextElementSibling);

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selected || !selectedNodeRef.current) return;
    const targetEl = e.currentTarget as HTMLElement;
    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch { /* fallback */ }

    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    let accumulatedSteps = 0;
    const isText = isTextElement(selected.tagName);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const diagonal = Math.round((dx + dy) / 2);

      // 24px threshold per discrete step change
      const targetStep = Math.floor((diagonal + (diagonal >= 0 ? 12 : -12)) / 24);
      if (targetStep !== accumulatedSteps) {
        const delta = (targetStep > accumulatedSteps ? 1 : -1) as -1 | 1;
        accumulatedSteps = targetStep;
        if (isText) {
          stepFontSize(delta);
        } else {
          stepPadding(delta);
        }
      }

      if (isText) {
        setResizeBadge(targetStep > 0 ? 'Enlarging text (A+)' : targetStep < 0 ? 'Shrinking text (A−)' : 'Drag corner to resize text');
      } else {
        setResizeBadge(targetStep > 0 ? 'Padding (p+)' : targetStep < 0 ? 'Padding (p−)' : 'Drag corner to resize padding');
      }
    };

    const cleanup = () => {
      try {
        targetEl.releasePointerCapture(e.pointerId);
      } catch { /* fallback */ }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      setIsResizing(false);
      setResizeBadge(null);
      setResizeDelta({ w: 0, h: 0 });
      requestAnimationFrame(updateSelectedRect);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  }, [selected, stepFontSize, stepPadding, updateSelectedRect]);

  const handleMoveDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selected || !selectedNodeRef.current) return;

    setIsDraggingMove(true);
    setMoveNotice(null);
    setDragCursor({ x: e.clientX, y: e.clientY });

    const startX = e.clientX;
    const startY = e.clientY;
    const el = selectedNodeRef.current;
    const parent = el.parentElement;
    if (!parent) return;

    const allSiblings = Array.from(parent.children) as HTMLElement[];
    const currentIndex = allSiblings.indexOf(el);
    if (currentIndex === -1 || allSiblings.length <= 1) {
      setMoveNotice(`Cannot reorder: this element is the only child in <${parent.tagName.toLowerCase()}>.`);
      const cleanupOnly = () => {
        window.removeEventListener('pointermove', cleanupOnly);
        window.removeEventListener('pointerup', cleanupOnly);
        window.removeEventListener('pointercancel', cleanupOnly);
        setIsDraggingMove(false);
        setDragCursor(null);
        setDropIndicator(null);
        setMoveNotice(null);
      };
      window.addEventListener('pointerup', cleanupOnly);
      window.addEventListener('pointercancel', cleanupOnly);
      return;
    }

    const elRect = el.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const siblingRects = allSiblings.map((s) => s.getBoundingClientRect());

    // Detect layout orientation and 2D layouts:
    let isHorizontal = false;
    const pStyle = window.getComputedStyle(parent);
    const isGrid = pStyle.display.includes('grid') || pStyle.display === 'inline-grid';
    const isFlexWrap = pStyle.display.includes('flex') && pStyle.flexWrap !== 'nowrap';

    if (pStyle.display.includes('flex') && !pStyle.flexDirection.startsWith('column')) {
      isHorizontal = true;
    } else if (allSiblings.length >= 2) {
      const s0 = siblingRects[0];
      const s1 = siblingRects[1];
      if (Math.abs(s1.left - s0.left) > Math.abs(s1.top - s0.top) + 20) {
        isHorizontal = true;
      }
    }

    // Pre-calculate exact resting slot rects for all permutation slots in page coordinates
    const slotRestingRects = new Map<number, { top: number; left: number; width: number; height: number }>();
    const startScrollX = window.scrollX;
    const startScrollY = window.scrollY;
    for (let k = 0; k < allSiblings.length; k++) {
      const order = [...allSiblings];
      const [moved] = order.splice(currentIndex, 1);
      order.splice(k, 0, moved);
      order.forEach((c) => parent.appendChild(c));
      const r = el.getBoundingClientRect();
      slotRestingRects.set(k, {
        top: r.top + startScrollY,
        left: r.left + startScrollX,
        width: r.width,
        height: r.height,
      });
    }
    // Restore original DOM order immediately
    allSiblings.forEach((c) => parent.appendChild(c));

    // Initialize FLIP smooth transitions on all siblings and dragged element (220ms)
    allSiblings.forEach((s) => {
      s.style.transition = 'transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1)';
    });
    el.style.transition = 'transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1)';

    let currentDropDirection: 'earlier' | 'later' | 'top' | 'bottom' | 'nudge-up' | 'nudge-down' | 'nudge-left' | 'nudge-right' | null = null;
    let currentDropTargetIndex: number | undefined = undefined;
    let lastAppliedSlot = currentIndex;

    const resetTransforms = (smooth = true) => {
      lastAppliedSlot = currentIndex;
      if (smooth) {
        el.style.transition = 'transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1)';
        el.style.transform = '';
        allSiblings.forEach((s) => {
          s.style.transition = 'transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1)';
          s.style.transform = '';
        });
      } else {
        el.style.transition = '';
        el.style.transform = '';
        allSiblings.forEach((s) => {
          s.style.transition = '';
          s.style.transform = '';
        });
      }
      setMoveShift(null);
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const cursorX = moveEvent.clientX;
      const cursorY = moveEvent.clientY;
      setDragCursor({ x: cursorX, y: cursorY });

      const scale = getPreviewScale();
      const rawDx = cursorX - startX;
      const rawDy = cursorY - startY;
      const dx = rawDx / scale;
      const dy = rawDy / scale;

      // STEP 1e: Refuse 2D grid and wrapping layouts cleanly
      if (isGrid || isFlexWrap) {
        resetTransforms(false);
        currentDropDirection = null;
        currentDropTargetIndex = undefined;
        setDropIndicator(null);
        setMoveNotice('Grid and wrapping layouts do not support drag reordering yet.');
        return;
      }

      // 1. Container boundary check with comfortable tolerance (120-160px)
      if (!isHorizontal) {
        const isFarOutsideX = cursorX < parentRect.left - 100 || cursorX > parentRect.right + 100;
        const isFarOutsideY = cursorY < parentRect.top - 160 || cursorY > parentRect.bottom + 160;
        if (isFarOutsideX || isFarOutsideY) {
          resetTransforms(false);
          currentDropDirection = null;
          currentDropTargetIndex = undefined;
          let redTop = elRect.top + window.scrollY;
          let redLeft = elRect.left + window.scrollX;
          let redWidth: number | undefined = elRect.width;
          let redHeight: number | undefined = 3;
          let orientation: 'horizontal' | 'vertical' = 'horizontal';

          if (cursorX < parentRect.left - 100) {
            orientation = 'vertical';
            redLeft = parentRect.left + window.scrollX - 2;
            redTop = parentRect.top + window.scrollY;
            redWidth = undefined;
            redHeight = parentRect.height;
          } else if (cursorX > parentRect.right + 100) {
            orientation = 'vertical';
            redLeft = parentRect.right + window.scrollX + 2;
            redTop = parentRect.top + window.scrollY;
            redWidth = undefined;
            redHeight = parentRect.height;
          } else if (cursorY < parentRect.top - 160) {
            redTop = parentRect.top + window.scrollY - 2;
            redLeft = parentRect.left + window.scrollX;
            redWidth = parentRect.width;
          } else {
            redTop = parentRect.bottom + window.scrollY + 2;
            redLeft = parentRect.left + window.scrollX;
            redWidth = parentRect.width;
          }

          setDropIndicator({
            direction: 'invalid',
            isInvalid: true,
            orientation,
            top: redTop,
            left: redLeft,
            width: redWidth,
            height: redHeight,
          });
          setMoveNotice(`Cannot move outside <${parent.tagName.toLowerCase()}>`);
          return;
        }
      } else {
        const isFarOutsideY = cursorY < parentRect.top - 100 || cursorY > parentRect.bottom + 100;
        const isFarOutsideX = cursorX < parentRect.left - 160 || cursorX > parentRect.right + 160;
        if (isFarOutsideX || isFarOutsideY) {
          resetTransforms(false);
          currentDropDirection = null;
          currentDropTargetIndex = undefined;
          setDropIndicator({
            direction: 'invalid',
            isInvalid: true,
            orientation: isFarOutsideX ? 'vertical' : 'horizontal',
            top: elRect.top + window.scrollY,
            left: elRect.left + window.scrollX,
            width: elRect.width,
            height: elRect.height,
          });
          setMoveNotice(`Cannot move outside <${parent.tagName.toLowerCase()}>`);
          return;
        }
      }

      // 2. Orthogonal drag warning only when gesture is predominantly perpendicular (>1.8x and >60px)
      if (!isHorizontal && Math.abs(dx) > Math.abs(dy) * 1.8 && Math.abs(dx) > 60) {
        resetTransforms(false);
        currentDropDirection = null;
        currentDropTargetIndex = undefined;
        const isLeft = dx < 0;
        setDropIndicator({
          direction: 'invalid',
          orientation: 'vertical',
          isInvalid: true,
          top: elRect.top + window.scrollY,
          left: isLeft ? elRect.left + window.scrollX - 3 : elRect.right + window.scrollX + 2,
          height: elRect.height,
        });
        setMoveNotice(isLeft ? 'No space: cannot move left in vertical layout' : 'No space: cannot move right in vertical layout');
        return;
      }
      if (isHorizontal && Math.abs(dy) > Math.abs(dx) * 1.8 && Math.abs(dy) > 60) {
        resetTransforms(false);
        currentDropDirection = null;
        currentDropTargetIndex = undefined;
        const isUp = dy < 0;
        setDropIndicator({
          direction: 'invalid',
          orientation: 'horizontal',
          isInvalid: true,
          top: isUp ? elRect.top + window.scrollY - 3 : elRect.bottom + window.scrollY + 2,
          left: elRect.left + window.scrollX,
          width: elRect.width,
        });
        setMoveNotice(isUp ? 'No space: cannot move up in horizontal layout' : 'No space: cannot move down in horizontal layout');
        return;
      }

      const isAltDrag = Boolean(moveEvent.altKey);

      if (isAltDrag) {
        // Option A: Alt+Drag = Spacing nudge along gesture axis
        const isPredominantlyHorizontal = Math.abs(dx) > Math.abs(dy);
        const nudgeDisp = isPredominantlyHorizontal ? dx : dy;
        if (Math.abs(nudgeDisp) >= 4) {
          allSiblings.forEach((s) => {
            if (s !== el) s.style.transform = '';
          });
          let dir: 'nudge-up' | 'nudge-down' | 'nudge-left' | 'nudge-right';
          let noticeText = '';
          if (!isPredominantlyHorizontal) {
            dir = dy < 0 ? 'nudge-up' : 'nudge-down';
            noticeText = dy < 0 ? 'Alt+Drag: release to decrease top spacing' : 'Alt+Drag: release to increase top spacing';
            el.style.transform = `translate3d(0, ${dy}px, 0)`;
            setMoveShift({ x: 0, y: rawDy });
          } else {
            dir = dx < 0 ? 'nudge-left' : 'nudge-right';
            noticeText = dx < 0 ? 'Alt+Drag: release to decrease left spacing' : 'Alt+Drag: release to increase left spacing';
            el.style.transform = `translate3d(${dx}px, 0, 0)`;
            setMoveShift({ x: rawDx, y: 0 });
          }
          currentDropDirection = dir;
          currentDropTargetIndex = undefined;
          setDropIndicator(null);
          setMoveNotice(noticeText);
          return;
        } else {
          resetTransforms(true);
          currentDropDirection = null;
          currentDropTargetIndex = undefined;
          setDropIndicator(null);
          setMoveNotice('Alt+Drag: drag to adjust spacing');
          return;
        }
      }

      // Option A: Normal Drag = Reorder Only
      const primaryDisp = isHorizontal ? dx : dy;
      if (Math.abs(primaryDisp) < 4) {
        resetTransforms(true);
        currentDropDirection = null;
        currentDropTargetIndex = undefined;
        setDropIndicator(null);
        setMoveNotice(null);
        return;
      }

      // STEP 1b: Boundary thresholding: <25px leaves unchanged, >=25px swaps by 1 place
      let targetSlot = currentIndex;
      const stepThreshold = 25;

      if (!isHorizontal) {
        if (rawDy >= stepThreshold) {
          const steps = Math.min(allSiblings.length - 1 - currentIndex, Math.floor((rawDy - stepThreshold) / 120) + 1);
          targetSlot = currentIndex + steps;
        } else if (rawDy <= -stepThreshold) {
          const steps = Math.min(currentIndex, Math.floor((-rawDy - stepThreshold) / 120) + 1);
          targetSlot = currentIndex - steps;
        }
      } else {
        if (rawDx >= stepThreshold) {
          const steps = Math.min(allSiblings.length - 1 - currentIndex, Math.floor((rawDx - stepThreshold) / 220) + 1);
          targetSlot = currentIndex + steps;
        } else if (rawDx <= -stepThreshold) {
          const steps = Math.min(currentIndex, Math.floor((-rawDx - stepThreshold) / 220) + 1);
          targetSlot = currentIndex - steps;
        }
      }

      if (targetSlot === currentIndex) {
        // Dragging less than boundary: leaves order unchanged and no sibling moves
        if (lastAppliedSlot !== currentIndex) {
          lastAppliedSlot = currentIndex;
          allSiblings.forEach((s) => {
            if (s !== el) {
              s.style.transition = 'transform 200ms linear';
              s.style.transform = '';
            }
          });
        }
        if (isHorizontal) {
          el.style.transform = `translate3d(${dx}px, 0, 0)`;
          setMoveShift({ x: rawDx, y: 0 });
        } else {
          el.style.transform = `translate3d(0, ${dy}px, 0)`;
          setMoveShift({ x: 0, y: rawDy });
        }
        currentDropDirection = null;
        currentDropTargetIndex = undefined;
        if (primaryDisp < -10 && currentIndex === 0) {
          setDropIndicator({
            direction: 'invalid',
            orientation: isHorizontal ? 'vertical' : 'horizontal',
            isInvalid: true,
            top: isHorizontal ? elRect.top + window.scrollY : elRect.top + window.scrollY - 3,
            left: isHorizontal ? elRect.left + window.scrollX - 3 : elRect.left + window.scrollX,
            width: isHorizontal ? undefined : elRect.width,
            height: isHorizontal ? elRect.height : undefined,
          });
          setMoveNotice(isHorizontal ? 'No space: already leftmost element in container' : 'No space: already first element in container');
        } else if (primaryDisp > 10 && currentIndex === allSiblings.length - 1) {
          setDropIndicator({
            direction: 'invalid',
            orientation: isHorizontal ? 'vertical' : 'horizontal',
            isInvalid: true,
            top: isHorizontal ? elRect.top + window.scrollY : elRect.bottom + window.scrollY + 3,
            left: isHorizontal ? elRect.right + window.scrollX + 3 : elRect.left + window.scrollX,
            width: isHorizontal ? undefined : elRect.width,
            height: isHorizontal ? elRect.height : undefined,
          });
          setMoveNotice(isHorizontal ? 'No space: already rightmost element in container' : 'No space: already last element in container');
        } else {
          setDropIndicator(null);
          setMoveNotice(null);
        }
        return;
      }

      let direction: 'earlier' | 'later' | 'top' | 'bottom';
      if (targetSlot === 0) {
        direction = 'top';
      } else if (targetSlot === allSiblings.length - 1) {
        direction = 'bottom';
      } else if (targetSlot < currentIndex) {
        direction = 'earlier';
      } else {
        direction = 'later';
      }

      // STEP 1c: FLIP smooth displacement of non-dragged siblings
      if (targetSlot !== lastAppliedSlot) {
        lastAppliedSlot = targetSlot;
        for (let j = 0; j < allSiblings.length; j++) {
          if (j === currentIndex) continue;
          const sib = allSiblings[j];
          if (targetSlot > currentIndex && j > currentIndex && j <= targetSlot) {
            // Sibling j glides up/left into slot j - 1
            const prevR = siblingRects[j - 1];
            const currR = siblingRects[j];
            const sX = isHorizontal ? (prevR.left - currR.left) / scale : 0;
            const sY = isHorizontal ? 0 : (prevR.top - currR.top) / scale;
            const dist = isHorizontal ? Math.abs(prevR.left - currR.left) : Math.abs(prevR.top - currR.top);
            const dur = Math.max(220, Math.min(2500, Math.round(dist / 0.14)));
            sib.style.transition = `transform ${dur}ms linear`;
            sib.style.transform = `translate3d(${sX}px, ${sY}px, 0)`;
          } else if (targetSlot < currentIndex && j >= targetSlot && j < currentIndex) {
            // Sibling j glides down/right into slot j + 1
            const nextR = siblingRects[j + 1];
            const currR = siblingRects[j];
            const sX = isHorizontal ? (nextR.left - currR.left) / scale : 0;
            const sY = isHorizontal ? 0 : (nextR.top - currR.top) / scale;
            const dist = isHorizontal ? Math.abs(nextR.left - currR.left) : Math.abs(nextR.top - currR.top);
            const dur = Math.max(220, Math.min(2500, Math.round(dist / 0.14)));
            sib.style.transition = `transform ${dur}ms linear`;
            sib.style.transform = `translate3d(${sX}px, ${sY}px, 0)`;
          } else {
            sib.style.transition = 'transform 200ms linear';
            sib.style.transform = 'translate3d(0, 0, 0)';
          }
        }
      }

      const targetRect = siblingRects[targetSlot];
      if (isHorizontal) {
        el.style.transform = `translate3d(${dx}px, 0, 0)`;
        setMoveShift({ x: rawDx, y: 0 });
      } else {
        el.style.transform = `translate3d(0, ${dy}px, 0)`;
        setMoveShift({ x: 0, y: rawDy });
      }

      // Drop line shows exactly where the element will land (within 2px)
      const resting = slotRestingRects.get(targetSlot);
      const topCoord = resting ? resting.top : targetRect.top + startScrollY;
      const leftCoord = resting ? resting.left : targetRect.left + startScrollX;
      const widthCoord = resting ? resting.width : targetRect.width;
      const heightCoord = resting ? resting.height : targetRect.height;

      if (!isHorizontal) {
        setDropIndicator({
          direction,
          orientation: 'horizontal',
          isInvalid: false,
          top: topCoord,
          left: leftCoord,
          width: widthCoord,
        });
      } else {
        setDropIndicator({
          direction,
          orientation: 'vertical',
          isInvalid: false,
          top: topCoord,
          left: leftCoord,
          height: heightCoord,
        });
      }

      currentDropDirection = direction;
      currentDropTargetIndex = targetSlot;

      if (direction === 'top') {
        setMoveNotice(`Move to top (slot 1 of ${allSiblings.length})`);
      } else if (direction === 'bottom') {
        setMoveNotice(`Move to bottom (slot ${allSiblings.length} of ${allSiblings.length})`);
      } else {
        setMoveNotice(`Move to slot ${targetSlot + 1} of ${allSiblings.length}`);
      }
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      window.removeEventListener('keydown', onKeyDown);
      setIsDraggingMove(false);
      setDragCursor(null);
      setDropIndicator(null);
      setMoveNotice(null);
      setMoveShift(null);

      const directionToApply = currentDropDirection;
      const targetIndexToApply = currentDropTargetIndex;
      if (!directionToApply) {
        resetTransforms(true);
      }

      if (directionToApply && selected) {
        if (directionToApply.startsWith('nudge-')) {
          const dir = directionToApply === 'nudge-up' ? 'up' : directionToApply === 'nudge-down' ? 'down' : directionToApply === 'nudge-left' ? 'left' : 'right';
          void previewChange({
            kind: 'nudge',
            filePath: selected.filePath,
            line: Number(selected.line) || undefined,
            column: Number(selected.column) || undefined,
            elementId: selected.id,
            direction: dir,
            stepSize: 'normal',
          }).finally(() => {
            resetTransforms(false);
            requestAnimationFrame(updateSelectedRect);
          });
        } else {
          void previewChange({
            kind: 'reorder',
            filePath: selected.filePath,
            line: Number(selected.line) || undefined,
            column: Number(selected.column) || undefined,
            elementId: selected.id,
            tagName: selected.tagName,
            className: selected.className,
            direction: directionToApply,
            targetIndex: targetIndexToApply,
          }).finally(() => {
            requestAnimationFrame(updateSelectedRect);
          });
        }
      } else {
        requestAnimationFrame(updateSelectedRect);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        currentDropDirection = null;
        currentDropTargetIndex = undefined;
        cleanup();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
    window.addEventListener('keydown', onKeyDown);
  }, [previewChange, selected, updateSelectedRect]);

  const hudPlacement = useMemo(() => {
    if (!selected || !selectedNodeRef.current) return { top: 12, left: 12 };
    const el = selectedNodeRef.current;
    const prevSibling = el.previousElementSibling as HTMLElement | null;
    let shouldFlipBelow = selected.rect.top < 60;
    if (prevSibling) {
      const prevRect = prevSibling.getBoundingClientRect();
      const gapAbove = selected.rect.top - (prevRect.bottom + window.scrollY);
      if (gapAbove < 44) {
        shouldFlipBelow = true;
      }
    } else {
      const parent = el.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const gapFromParent = selected.rect.top - (parentRect.top + window.scrollY);
        if (gapFromParent < 44) {
          shouldFlipBelow = true;
        }
      }
    }
    const top = shouldFlipBelow
      ? selected.rect.top + selected.rect.height + 10
      : Math.max(12, selected.rect.top - 46);
    const left = Math.max(12, selected.rect.left);
    return { top, left };
  }, [selected]);

  return <div id="slightnudge-ui">
    {active && hoveredRect && !selected && <div className="sn-hover-outline" style={{ top: hoveredRect.top, left: hoveredRect.left, width: hoveredRect.width, height: hoveredRect.height }} aria-hidden="true"/>}
    {selected && (
      <div
        id="slightnudge-selected-box"
        className={`sn-selection-outline ${warning ? 'is-warning' : ''} ${isInlineEditing ? 'is-editing' : ''} ${isDraggingMove ? 'is-dragging' : ''} ${dropIndicator?.isInvalid ? 'is-invalid-drop' : ''}`}
        style={{
          top: selected.rect.top,
          left: selected.rect.left,
          width: selected.rect.width,
          height: selected.rect.height,
          transform: moveShift ? `translate3d(${moveShift.x}px, ${moveShift.y}px, 0)` : undefined,
          transition: isResizing ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        aria-hidden="true"
      >
        {!isInlineEditing && !isDraggingMove && (
          <button
            type="button"
            className="sn-corner-dismiss"
            title="Deselect element (Esc)"
            aria-label="Deselect element (Esc)"
            onClick={(e) => {
              e.stopPropagation();
              if (pendingEdit) void discardPreview();
              setSelected(null);
              selectedNodeRef.current = null;
              originalStyleRef.current = null;
            }}
          >
            <X size={10} />
          </button>
        )}
        {selected.safeToEdit !== false && !isInlineEditing && (
          <div
            className={`sn-drag-move-bar ${isDraggingMove ? 'is-dragging' : ''} ${dropIndicator?.isInvalid ? 'is-invalid' : ''}`}
            onPointerDown={handleMoveDragStart}
            title="Drag to swap order with siblings (or use Arrow keys to nudge margin)"
          >
            <GripVertical size={11} /> Move
            {moveNotice && !isDraggingMove && <span className={`sn-move-feedback-badge ${dropIndicator?.isInvalid ? 'is-invalid' : ''}`}>{moveNotice}</span>}
          </div>
        )}
        {selected.safeToEdit !== false && !isInlineEditing && !isDraggingMove && (
          <div
            className={`sn-corner-slider ${isResizing ? 'is-resizing' : ''}`}
            onPointerDown={handleResizeStart}
            title="Drag corner slider to resize"
          >
            {resizeBadge && <div className="sn-resize-badge">{resizeBadge}</div>}
          </div>
        )}
      </div>
    )}

    {dropIndicator && (
      <div
        className={`sn-drop-line ${dropIndicator.isInvalid ? 'is-invalid' : ''} ${dropIndicator.orientation === 'vertical' ? 'is-vertical' : ''}`}
        style={{
          top: dropIndicator.top,
          left: dropIndicator.left,
          width: dropIndicator.width,
          height: dropIndicator.height,
        }}
        aria-hidden="true"
      />
    )}

    {selected && isDraggingMove && dragCursor && (
      <div
        className={`sn-drag-ghost-chip ${dropIndicator?.isInvalid ? 'is-invalid' : ''}`}
        style={{
          position: 'fixed',
          left: `${dragCursor.x + 14}px`,
          top: `${dragCursor.y + 14}px`,
        }}
        aria-hidden="true"
      >
        <GripVertical size={12} />
        <span>Move &lt;{selected.tagName}&gt;</span>
        {moveNotice && <span className={`sn-move-feedback-badge ${dropIndicator?.isInvalid ? 'is-invalid' : ''}`}>{moveNotice}</span>}
      </div>
    )}

    {selected && selected.safeToEdit !== false && (
      <div
        className="sn-canvas-hud"
        style={{
          top: `${Math.max(12, selected.rect.top - 46)}px`,
          left: `${Math.max(12, selected.rect.left)}px`,
          opacity: isDraggingMove ? 0 : 1,
          pointerEvents: isDraggingMove ? 'none' : 'auto',
          transition: isResizing || isDraggingMove ? 'none' : 'top 0.24s cubic-bezier(0.16, 1, 0.3, 1), left 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s',
        }}
      >
        <div className="sn-hud-badge" title={`HTML Tag: <${selected.tagName}>`}>
          <span className="sn-hud-tag-bracket">&lt;</span>
          <span className="sn-hud-tag-name">{selected.tagName}</span>
          <span className="sn-hud-tag-bracket">&gt;</span>
        </div>
        {isInlineEditing ? (
          <>
            <div className="sn-hud-editing-hint">
              <span className="sn-pending-dot" />
              <span>Typing directly on canvas…</span>
              <kbd>↵ Enter</kbd> save <kbd>Esc</kbd> cancel
            </div>
            <div className="sn-hud-divider" />
            <button
              type="button"
              title="Save text change (Enter)"
              aria-label="Save text change"
              className="sn-hud-btn sn-hud-edit-btn is-active"
              onClick={() => finishInlineEditing(true)}
            >
              <Check size={12} /> Done
            </button>
          </>
        ) : (
          <>
            {isButtonElement ? (
              <>
                <div className="sn-hud-group" title="Switch between Button Shell and Content">
                  <button
                    type="button"
                    className={`sn-hud-btn ${buttonMode === 'shell' ? 'is-active' : ''}`}
                    onClick={() => setButtonMode('shell')}
                    title="Button Shell (Surface, Shape & Size)"
                  >
                    <Layers size={11} style={{ marginRight: 3 }} /> Shell
                  </button>
                  <button
                    type="button"
                    className={`sn-hud-btn ${buttonMode === 'content' ? 'is-active' : ''}`}
                    onClick={() => setButtonMode('content')}
                    title="Button Content (Text, Font & Color)"
                  >
                    <Type size={11} style={{ marginRight: 3 }} /> Content
                  </button>
                </div>
                <div className="sn-hud-divider" />
                {buttonMode === 'shell' ? (
                  <>
                    <div className="sn-hud-group" title="Corner Shape">
                      <button
                        type="button"
                        title="Square corners"
                        disabled={selected.safeToEdit !== true}
                        className={`sn-hud-btn ${selected.className.includes('rounded-none') ? 'is-active' : ''}`}
                        onClick={() => void updateStyle('borderRadius', 'rounded-none')}
                        style={{ fontSize: '10px', padding: '0 5px' }}
                      >
                        Square
                      </button>
                      <button
                        type="button"
                        title="Rounded corners"
                        disabled={selected.safeToEdit !== true}
                        className={`sn-hud-btn ${selected.className.includes('rounded-lg') || selected.className.includes('rounded-md') ? 'is-active' : ''}`}
                        onClick={() => void updateStyle('borderRadius', 'rounded-lg')}
                        style={{ fontSize: '10px', padding: '0 5px' }}
                      >
                        Round
                      </button>
                      <button
                        type="button"
                        title="Pill shape"
                        disabled={selected.safeToEdit !== true}
                        className={`sn-hud-btn ${selected.className.includes('rounded-full') ? 'is-active' : ''}`}
                        onClick={() => void updateStyle('borderRadius', 'rounded-full')}
                        style={{ fontSize: '10px', padding: '0 5px' }}
                      >
                        Pill
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-stepper" title="Button padding (size)">
                      <span className="sn-hud-stepper-label">PAD</span>
                      <button
                        type="button"
                        title="Decrease padding"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepPadding(-1)}
                        className="sn-hud-step-btn"
                      >
                        −
                      </button>
                      <span className="sn-hud-step-value">{currentPadding.replace('p-', '')}</span>
                      <button
                        type="button"
                        title="Increase padding"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepPadding(1)}
                        className="sn-hud-step-btn"
                      >
                        +
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-stepper" title="Space to text above (delete or add gap)">
                      <span className="sn-hud-stepper-label">SPACE</span>
                      <button
                        type="button"
                        title="Delete space above (nudge up)"
                        aria-label="Delete space above"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => {
                          void previewChange({
                            kind: 'nudge',
                            filePath: selected.filePath,
                            line: Number(selected.line) || undefined,
                            column: Number(selected.column) || undefined,
                            elementId: selected.id,
                            direction: 'up',
                            stepSize: 'normal',
                          });
                        }}
                        className="sn-hud-step-btn"
                      >
                        −
                      </button>
                      <span className="sn-hud-step-value" style={{ minWidth: 26, fontSize: 10 }}>
                        {(() => {
                          const match = selected.className.match(/(-?mt-[0-9.]+)/);
                          return match ? match[1].replace('mt-', '') : 'auto';
                        })()}
                      </span>
                      <button
                        type="button"
                        title="Add space above (nudge down)"
                        aria-label="Add space above"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => {
                          void previewChange({
                            kind: 'nudge',
                            filePath: selected.filePath,
                            line: Number(selected.line) || undefined,
                            column: Number(selected.column) || undefined,
                            elementId: selected.id,
                            direction: 'down',
                            stepSize: 'normal',
                          });
                        }}
                        className="sn-hud-step-btn"
                      >
                        +
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-swatch-group" title="Surface fill color">
                      {styleOptions.backgroundColor.map((bgVal) => {
                        const hex = bgVal.match(/#([0-9a-f]{6})/i)?.[0] || '#ffffff';
                        const isCur = hasBreakpointClass(selected.className, bgVal, activeBreakpoint);
                        return (
                          <button
                            key={bgVal}
                            type="button"
                            title={`Fill: ${hex}`}
                            disabled={selected.safeToEdit !== true}
                            className={`sn-hud-swatch ${isCur ? 'is-active' : ''}`}
                            style={{ background: hex }}
                            onClick={() => void updateStyle('backgroundColor', bgVal)}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    {selected.textEditable !== false && (
                      <>
                        <button
                          type="button"
                          title="Edit text directly on canvas (Double-click or Enter)"
                          aria-label="Edit text directly on canvas"
                          disabled={selected.safeToEdit !== true}
                          className="sn-hud-btn sn-hud-edit-btn"
                          onClick={startInlineEditing}
                        >
                          <Pencil size={11} />
                          <span>Edit text</span>
                        </button>
                        <div className="sn-hud-divider" />
                      </>
                    )}
                    <div className="sn-hud-stepper" title="Font size">
                      <span className="sn-hud-stepper-label">SIZE</span>
                      <button
                        type="button"
                        title="Decrease font size"
                        aria-label="Decrease font size"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepFontSize(-1)}
                        className="sn-hud-step-btn"
                      >
                        −
                      </button>
                      <span className="sn-hud-step-value">{currentFontSizeLabel}</span>
                      <button
                        type="button"
                        title="Increase font size"
                        aria-label="Increase font size"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepFontSize(1)}
                        className="sn-hud-step-btn"
                      >
                        +
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-group">
                      <button
                        type="button"
                        title="Toggle bold"
                        aria-label="Toggle bold"
                        disabled={selected.safeToEdit !== true}
                        className={`sn-hud-btn ${isBold ? 'is-active' : ''}`}
                        onClick={toggleBold}
                      >
                        <strong>B</strong>
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-swatch-group" title="Text color">
                      {styleOptions.textColor.slice(0, 4).map((txtVal) => {
                        const hex = txtVal.match(/#([0-9a-f]{6})/i)?.[0] || '#ffffff';
                        const isCur = hasBreakpointClass(selected.className, txtVal, activeBreakpoint);
                        return (
                          <button
                            key={txtVal}
                            type="button"
                            title={`Text: ${hex}`}
                            disabled={selected.safeToEdit !== true}
                            className={`sn-hud-swatch ${isCur ? 'is-active' : ''}`}
                            style={{ background: hex }}
                            onClick={() => void updateStyle('textColor', txtVal)}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {isTextElement(selected.tagName) && selected.textEditable !== false && (
                  <>
                    <button
                      type="button"
                      title="Edit text directly on canvas (Double-click or Enter)"
                      aria-label="Edit text directly on canvas"
                      disabled={selected.safeToEdit !== true}
                      className="sn-hud-btn sn-hud-edit-btn"
                      onClick={startInlineEditing}
                    >
                      <Pencil size={11} />
                      <span>Edit text</span>
                    </button>
                    <div className="sn-hud-divider" />
                  </>
                )}
                {isTextElement(selected.tagName) ? (
                  <>
                    <div className="sn-hud-stepper" title="Font size">
                      <span className="sn-hud-stepper-label">SIZE</span>
                      <button
                        type="button"
                        title="Decrease font size"
                        aria-label="Decrease font size"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepFontSize(-1)}
                        className="sn-hud-step-btn"
                      >
                        −
                      </button>
                      <span className="sn-hud-step-value">{currentFontSizeLabel}</span>
                      <button
                        type="button"
                        title="Increase font size"
                        aria-label="Increase font size"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepFontSize(1)}
                        className="sn-hud-step-btn"
                      >
                        +
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-group">
                      <button
                        type="button"
                        title="Toggle bold"
                        aria-label="Toggle bold"
                        disabled={selected.safeToEdit !== true}
                        className={`sn-hud-btn ${isBold ? 'is-active' : ''}`}
                        onClick={toggleBold}
                      >
                        <strong>B</strong>
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-group">
                      <button
                        type="button"
                        title="Align left"
                        aria-label="Align left"
                        disabled={selected.safeToEdit !== true}
                        className={`sn-hud-btn ${currentAlign === 'text-left' ? 'is-active' : ''}`}
                        onClick={() => void updateStyle('alignment', 'text-left')}
                      >
                        <AlignLeft size={13} />
                      </button>
                      <button
                        type="button"
                        title="Align center"
                        aria-label="Align center"
                        disabled={selected.safeToEdit !== true}
                        className={`sn-hud-btn ${currentAlign === 'text-center' ? 'is-active' : ''}`}
                        onClick={() => void updateStyle('alignment', 'text-center')}
                      >
                        <AlignCenter size={13} />
                      </button>
                      <button
                        type="button"
                        title="Align right"
                        aria-label="Align right"
                        disabled={selected.safeToEdit !== true}
                        className={`sn-hud-btn ${currentAlign === 'text-right' ? 'is-active' : ''}`}
                        onClick={() => void updateStyle('alignment', 'text-right')}
                      >
                        <AlignRight size={13} />
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-stepper" title="Space to previous element (Margin top)">
                      <span className="sn-hud-stepper-label">SPACE</span>
                      <button
                        type="button"
                        title="Delete space above (nudge up)"
                        aria-label="Delete space above"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => {
                          void previewChange({
                            kind: 'nudge',
                            filePath: selected.filePath,
                            line: Number(selected.line) || undefined,
                            column: Number(selected.column) || undefined,
                            elementId: selected.id,
                            direction: 'up',
                            stepSize: 'normal',
                          });
                        }}
                        className="sn-hud-step-btn"
                      >
                        −
                      </button>
                      <span className="sn-hud-step-value" style={{ minWidth: 26, fontSize: 10 }}>
                        {(() => {
                          const match = selected.className.match(/(-?mt-[0-9.]+)/);
                          return match ? match[1].replace('mt-', '') : 'auto';
                        })()}
                      </span>
                      <button
                        type="button"
                        title="Add space above (nudge down)"
                        aria-label="Add space above"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => {
                          void previewChange({
                            kind: 'nudge',
                            filePath: selected.filePath,
                            line: Number(selected.line) || undefined,
                            column: Number(selected.column) || undefined,
                            elementId: selected.id,
                            direction: 'down',
                            stepSize: 'normal',
                          });
                        }}
                        className="sn-hud-step-btn"
                      >
                        +
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sn-hud-stepper" title="Padding">
                      <span className="sn-hud-stepper-label">PAD</span>
                      <button
                        type="button"
                        title="Decrease padding"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepPadding(-1)}
                        className="sn-hud-step-btn"
                      >
                        −
                      </button>
                      <span className="sn-hud-step-value">{currentPadding.replace('p-', '')}</span>
                      <button
                        type="button"
                        title="Increase padding"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepPadding(1)}
                        className="sn-hud-step-btn"
                      >
                        +
                      </button>
                    </div>
                    <div className="sn-hud-divider" />
                    <div className="sn-hud-stepper" title="Gap">
                      <span className="sn-hud-stepper-label">GAP</span>
                      <button
                        type="button"
                        title="Decrease gap"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepGap(-1)}
                        className="sn-hud-step-btn"
                      >
                        −
                      </button>
                      <span className="sn-hud-step-value">{currentGap.replace('gap-', '')}</span>
                      <button
                        type="button"
                        title="Increase gap"
                        disabled={selected.safeToEdit !== true}
                        onClick={() => stepGap(1)}
                        className="sn-hud-step-btn"
                      >
                        +
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            <div className="sn-hud-divider" />
            <div className="sn-hud-group" title="Reorder with siblings">
              <button
                type="button"
                title={hasPrevSibling ? "Move earlier / swap with previous sibling (↑)" : "Already first child in this section"}
                aria-label="Move earlier"
                disabled={!hasPrevSibling}
                className="sn-hud-btn"
                onClick={() => void previewChange({ kind: 'reorder', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction: 'earlier' })}
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                title={hasNextSibling ? "Move later / swap with next sibling (↓)" : "Already last child in this section"}
                aria-label="Move later"
                disabled={!hasNextSibling}
                className="sn-hud-btn"
                onClick={() => void previewChange({ kind: 'reorder', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction: 'later' })}
              >
                <ArrowDown size={13} />
              </button>
            </div>
            {canUndo && (
              <>
                <div className="sn-hud-divider" />
                <button
                  type="button"
                  title="Undo last change (Ctrl+Z)"
                  aria-label="Undo last change"
                  disabled={busy}
                  className="sn-hud-btn"
                  onClick={() => void undo()}
                >
                  <RotateCcw size={12} />
                </button>
              </>
            )}
          </>
        )}
      </div>
    )}

    <aside className="sn-inspector-panel" aria-label="Visual inspector">
      <div className="sn-inspector-header"><div className="sn-inspector-title"><span className="sn-inspector-icon"><MousePointer2 size={16}/></span><div><strong>Visual editor</strong><span>{active ? 'Select a page element' : 'Selection paused'}</span></div></div><button className={`sn-inspector-toggle ${active ? 'is-active' : ''}`} type="button" disabled={busy} onClick={() => { if (pendingEdit) void discardPreview(); setActive((value) => !value); setSelected(null); selectedNodeRef.current = null; editGroupIdRef.current = null; }} aria-pressed={active}>{active ? 'On' : 'Off'}</button></div>

      {!selected ? <div className="sn-inspector-empty"><span><MousePointer2 size={20}/></span><strong>Choose something to refine</strong><p>Click any element in the preview to inspect its source and adjust its styles.</p><div className="sn-shortcut"><kbd>Esc</kbd> clear selection <i/> <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> spacing</div></div> : <>
        <div className="sn-selected-summary"><div className="sn-element-name"><span>&lt;{selected.tagName}{selected.id ? `#${selected.id}` : ''}&gt;</span>{busy && <LoaderCircle className="sn-spinner" size={14}/>}</div><code>{selected.filePath || 'No source mapping'}{selected.line ? `:${selected.line}${selected.column ? `:${selected.column}` : ''}` : ''}</code>{selected.safeToEdit === false && <p className="sn-safety-warning" id="slightnudge-safety-warning"><CircleAlert size={14}/>{selected.refusalReason || 'This component cannot be edited safely.'}</p>}{selected.safeToEdit === true && <p className="sn-safety-safe" id="slightnudge-safety-ok"><Check size={14}/>Source mapping verified · select a control to preview</p>}
        </div>
        {pendingEdit && (
          <div className="sn-pending-dock" aria-live="polite">
            <div className="sn-pending-info">
              <div className="sn-pending-badge">
                <span className="sn-pending-dot" />
                <span>{pendingEdit.summary}</span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Live on canvas</span>
            </div>
            <div className="sn-pending-actions">
              <button type="button" className="sn-dock-btn sn-dock-discard" disabled={busy} onClick={() => void discardPreview()}>
                Discard
              </button>
              <button type="button" className="sn-dock-btn sn-dock-apply" disabled={busy} onClick={() => void applyPreview()}>
                {busy ? <LoaderCircle className="sn-spinner" size={12} /> : <Check size={12} />} Apply to code
              </button>
            </div>
          </div>
        )}
        <div className="sn-inspector-sections">
          {isButtonElement && (
            <div className="sn-button-studio-card">
              <div className="sn-button-studio-header">
                <div className="sn-button-studio-badge">
                  <Sparkles size={12} />
                  <span>Button Controller</span>
                </div>
                <div className="sn-button-mode-tabs">
                  <button
                    type="button"
                    className={`sn-button-mode-tab ${buttonMode === 'shell' ? 'is-active' : ''}`}
                    onClick={() => setButtonMode('shell')}
                    aria-pressed={buttonMode === 'shell'}
                  >
                    <Layers size={11} />
                    <span>Shell</span>
                  </button>
                  <button
                    type="button"
                    className={`sn-button-mode-tab ${buttonMode === 'content' ? 'is-active' : ''}`}
                    onClick={() => setButtonMode('content')}
                    aria-pressed={buttonMode === 'content'}
                  >
                    <Type size={11} />
                    <span>Content</span>
                  </button>
                </div>
              </div>

              {buttonMode === 'shell' ? (
                <div className="sn-button-studio-body">
                  <div className="sn-control-group" style={{ marginTop: 0 }}>
                    <span>Surface Fill (Background)</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {styleOptions.backgroundColor.map((value) => (
                        <ColorSwatch
                          key={value}
                          value={value}
                          property="backgroundColor"
                          classes={selected.className}
                          breakpoint={activeBreakpoint}
                          disabled={selected.safeToEdit !== true}
                          onChange={updateStyle}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sn-control-group">
                    <span>Corner Radius (Shape)</span>
                    <div className="sn-button-shape-options">
                      <button
                        type="button"
                        className={`sn-style-chip ${hasBreakpointClass(selected.className, 'rounded-none', activeBreakpoint) ? 'is-selected' : ''}`}
                        disabled={selected.safeToEdit !== true}
                        onClick={() => void updateStyle('borderRadius', 'rounded-none')}
                      >
                        Square
                      </button>
                      <button
                        type="button"
                        className={`sn-style-chip ${hasBreakpointClass(selected.className, 'rounded-lg', activeBreakpoint) || hasBreakpointClass(selected.className, 'rounded-md', activeBreakpoint) ? 'is-selected' : ''}`}
                        disabled={selected.safeToEdit !== true}
                        onClick={() => void updateStyle('borderRadius', 'rounded-lg')}
                      >
                        Rounded
                      </button>
                      <button
                        type="button"
                        className={`sn-style-chip ${hasBreakpointClass(selected.className, 'rounded-full', activeBreakpoint) ? 'is-selected' : ''}`}
                        disabled={selected.safeToEdit !== true}
                        onClick={() => void updateStyle('borderRadius', 'rounded-full')}
                      >
                        Pill
                      </button>
                    </div>
                  </div>

                  <div className="sn-control-group">
                    <span>Inside Padding (Button Size)</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {['p-2', 'p-3', 'p-4', 'p-6'].map((value) => (
                        <StyleChip
                          key={value}
                          value={value}
                          property="padding"
                          selectedClassName={selected.className}
                          breakpoint={activeBreakpoint}
                          disabled={selected.safeToEdit !== true}
                          onChange={updateStyle}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sn-control-group">
                    <span>Width</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {['w-auto', 'w-full'].map((value) => (
                        <StyleChip
                          key={value}
                          value={value}
                          property="width"
                          selectedClassName={selected.className}
                          breakpoint={activeBreakpoint}
                          disabled={selected.safeToEdit !== true}
                          onChange={updateStyle}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sn-control-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>Space to Text Above (Margin)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="sn-hud-step-btn"
                          title="Delete space above (nudge up)"
                          disabled={selected.safeToEdit !== true}
                          style={{ border: '1px solid #e2e7e3', borderRadius: '4px', width: '22px', height: '22px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => {
                            void previewChange({
                              kind: 'nudge',
                              filePath: selected.filePath,
                              line: Number(selected.line) || undefined,
                              column: Number(selected.column) || undefined,
                              elementId: selected.id,
                              direction: 'up',
                              stepSize: 'normal',
                            });
                          }}
                        >
                          −
                        </button>
                        <span style={{ fontSize: '10px', minWidth: '32px', textAlign: 'center', lineHeight: '22px', color: '#68756d', fontFamily: 'monospace' }}>
                          {(() => {
                            const match = selected.className.match(/(-?mt-[0-9.]+)/);
                            return match ? match[1] : 'default';
                          })()}
                        </span>
                        <button
                          type="button"
                          className="sn-hud-step-btn"
                          title="Add space above (nudge down)"
                          disabled={selected.safeToEdit !== true}
                          style={{ border: '1px solid #e2e7e3', borderRadius: '4px', width: '22px', height: '22px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => {
                            void previewChange({
                              kind: 'nudge',
                              filePath: selected.filePath,
                              line: Number(selected.line) || undefined,
                              column: Number(selected.column) || undefined,
                              elementId: selected.id,
                              direction: 'down',
                              stepSize: 'normal',
                            });
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {[
                        { label: 'Flush (-16px)', val: '-mt-4' },
                        { label: 'Tight (-8px)', val: '-mt-2' },
                        { label: 'Zero (0px)', val: 'mt-0' },
                        { label: 'Normal (+8px)', val: 'mt-2' },
                        { label: 'Spacious (+24px)', val: 'mt-6' },
                      ].map(({ label, val }) => (
                        <button
                          key={val}
                          type="button"
                          className={`sn-style-chip ${hasBreakpointClass(selected.className, val, activeBreakpoint) ? 'is-selected' : ''}`}
                          disabled={selected.safeToEdit !== true}
                          onClick={() => void updateStyle('margin', val)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sn-button-studio-body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', color: '#787774', fontWeight: 500 }}>Button Text Label</span>
                    <button
                      type="button"
                      className="sn-text-canvas-btn"
                      onClick={startInlineEditing}
                      disabled={selected.safeToEdit !== true}
                    >
                      <Pencil size={10} /> Type on canvas
                    </button>
                  </div>
                  <label className="sn-control-group sn-text-editor" style={{ marginTop: 0 }}>
                    <textarea
                      value={draftText}
                      maxLength={2000}
                      disabled={selected.safeToEdit !== true}
                      onChange={(event) => setDraftText(event.target.value)}
                      aria-label="Button label text"
                    />
                  </label>
                  <button
                    type="button"
                    className="sn-button sn-button-primary sn-text-preview-button"
                    style={{ width: '100%', marginTop: '4px' }}
                    disabled={selected.safeToEdit !== true || !draftText.trim() || draftText === (selected.textContent || '')}
                    onClick={() => void updateText()}
                  >
                    {busy ? <LoaderCircle className="sn-spinner" size={14} /> : <Check size={14} />} Update button text
                  </button>

                  <div className="sn-control-group" style={{ marginTop: '10px' }}>
                    <span>Label Text Color</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {styleOptions.textColor.map((value) => (
                        <ColorSwatch
                          key={value}
                          value={value}
                          property="textColor"
                          classes={selected.className}
                          breakpoint={activeBreakpoint}
                          disabled={selected.safeToEdit !== true}
                          onChange={updateStyle}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sn-control-group">
                    <span>Text Size</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {['text-xs', 'text-sm', 'text-base', 'text-lg'].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`sn-style-chip ${hasBreakpointClass(selected.className, value, activeBreakpoint) ? 'is-selected' : ''}`}
                          disabled={selected.safeToEdit !== true}
                          onClick={() => void updateStyle('fontSize', value)}
                        >
                          {value.replace('text-', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sn-control-group">
                    <span>Font Weight</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {['font-normal', 'font-medium', 'font-semibold', 'font-bold'].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`sn-style-chip ${hasBreakpointClass(selected.className, value, activeBreakpoint) ? 'is-selected' : ''}`}
                          disabled={selected.safeToEdit !== true}
                          onClick={() => void updateStyle('fontWeight', value)}
                        >
                          {value.replace('font-', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <InspectorSection title="Text" icon={<Type size={15}/>} open={openSection === 'text'} onClick={() => setOpenSection(openSection === 'text' ? 'type' : 'text')}>
            {selected.textEditable === false ? (
              <p className="sn-control-hint" style={{ color: '#b43e35', padding: '0.25rem 0' }}>
                {selected.textReason || 'This text cannot be edited directly.'}
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#37352f' }}>Content</span>
                  <button
                    type="button"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 7px', background: '#f7f7f5', border: '1px solid rgba(55, 53, 47, 0.12)', borderRadius: '5px', color: '#37352f', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                    onClick={startInlineEditing}
                    disabled={selected.safeToEdit !== true}
                  >
                    <Pencil size={10} /> Type on canvas
                  </button>
                </div>
                <label className="sn-control-group sn-text-editor" style={{ marginTop: 0 }}><textarea value={draftText} maxLength={2000} disabled={selected.safeToEdit !== true} onChange={(event) => setDraftText(event.target.value)} aria-label="Selected element text"/><small>{draftText.length} / 2,000 characters · supports one plain text value</small></label>
                <button type="button" className="sn-button sn-button-primary sn-text-preview-button" disabled={selected.safeToEdit !== true || !draftText.trim() || draftText === (selected.textContent || '')} onClick={() => void updateText()}>{busy ? <LoaderCircle className="sn-spinner" size={15}/> : <Check size={15}/>} Preview text</button>
              </>
            )}
          </InspectorSection>
          <InspectorSection title="Arrange" icon={<ArrowUpDown size={15}/>} open={openSection === 'arrange'} onClick={() => setOpenSection(openSection === 'arrange' ? 'spacing' : 'arrange')}>
            <p className="sn-control-hint">Reorder element within its parent container by swapping sibling JSX in code.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="sn-button sn-button-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', padding: '8px 10px' }}
                disabled={selected.safeToEdit !== true}
                onClick={() => void previewChange({ kind: 'reorder', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction: 'earlier' })}
              >
                <ArrowUp size={14}/> Move earlier
              </button>
              <button
                type="button"
                className="sn-button sn-button-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', padding: '8px 10px' }}
                disabled={selected.safeToEdit !== true}
                onClick={() => void previewChange({ kind: 'reorder', filePath: selected.filePath, line: Number(selected.line) || undefined, column: Number(selected.column) || undefined, elementId: selected.id, direction: 'later' })}
              >
                <ArrowDown size={14}/> Move later
              </button>
            </div>
          </InspectorSection>
          <InspectorSection title="Spacing" icon={<Columns2 size={15}/>} open={openSection === 'spacing'} onClick={() => setOpenSection(openSection === 'spacing' ? 'type' : 'spacing')}>
            <ControlGroup label="Padding (inside box)">
              {styleOptions.padding.map((value) => (
                <StyleChip key={value} value={value} property="padding" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>
              ))}
            </ControlGroup>
            <ControlGroup label="Container gap (between items)">
              {styleOptions.gap.map((value) => (
                <StyleChip key={value} value={value} property="gap" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>
              ))}
            </ControlGroup>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #edf0ee' }}>
              <span style={{ display: 'block', marginBottom: '6px', color: '#7f8a83', fontSize: '10px' }}>Margin offset (fine-tune)</span>
              <p className="sn-control-hint">Nudge outer margin (mt / ml) without altering flex flow.</p>
              <div className="sn-arrow-pad">
                <button type="button" aria-label="Move up" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))}>↑</button>
                <button type="button" aria-label="Move left" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))}>←</button>
                <button type="button" aria-label="Move down" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))}>↓</button>
                <button type="button" aria-label="Move right" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))}>→</button>
              </div>
            </div>
          </InspectorSection>
          <InspectorSection title="Layout" icon={<Columns2 size={15}/>} open={openSection === 'layout'} onClick={() => setOpenSection(openSection === 'layout' ? 'type' : 'layout')}>
            <ControlGroup label="Apply at breakpoint"><div className="sn-breakpoint-options">{breakpoints.map(([value, label]) => <button type="button" key={value || 'base'} className={activeBreakpoint === value ? 'is-selected' : ''} aria-pressed={activeBreakpoint === value} onClick={() => setActiveBreakpoint(value)}>{label}</button>)}</div></ControlGroup>
            <ControlGroup label="Display">{styleOptions.display.map((value) => <StyleChip key={value} value={value} property="display" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
            <ControlGroup label="Flex direction">{styleOptions.flexDirection.map((value) => <StyleChip key={value} value={value} property="flexDirection" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
            <ControlGroup label="Align items (cross-axis)">{styleOptions.alignItems.map((value) => <StyleChip key={value} value={value} property="alignItems" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
            <ControlGroup label="Justify content (main-axis)">{styleOptions.justifyContent.map((value) => <StyleChip key={value} value={value} property="justifyContent" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
            <ControlGroup label="Width">{styleOptions.width.map((value) => <StyleChip key={value} value={value} property="width" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
            <ControlGroup label="Max width">{styleOptions.maxWidth.map((value) => <StyleChip key={value} value={value} property="maxWidth" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
            <ControlGroup label="Corner radius">{styleOptions.borderRadius.map((value) => <StyleChip key={value} value={value} property="borderRadius" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
          </InspectorSection>
          <InspectorSection title="Typography" icon={<Type size={15}/>} open={openSection === 'type'} onClick={() => setOpenSection(openSection === 'type' ? 'spacing' : 'type')}>
            <ControlGroup label="Text size">{styleOptions.fontSize.map((value) => <button key={value} type="button" className={`sn-style-chip ${hasBreakpointClass(selected.className, value, activeBreakpoint) ? 'is-selected' : ''}`} disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('fontSize', value)}>{value.replace('text-', '')}</button>)}</ControlGroup>
            <ControlGroup label="Weight">{styleOptions.fontWeight.map((value) => <button key={value} type="button" className={`sn-style-chip ${hasBreakpointClass(selected.className, value, activeBreakpoint) ? 'is-selected' : ''}`} disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('fontWeight', value)}>{value.replace('font-', '')}</button>)}</ControlGroup>
            <ControlGroup label="Font family">{styleOptions.fontFamily.map((value) => <button key={value} type="button" className={`sn-style-chip ${hasBreakpointClass(selected.className, value, activeBreakpoint) ? 'is-selected' : ''}`} disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('fontFamily', value)}>{value.replace('font-', '')}</button>)}</ControlGroup>
            <ControlGroup label="Line height">{styleOptions.lineHeight.map((value) => <button key={value} type="button" className={`sn-style-chip ${hasBreakpointClass(selected.className, value, activeBreakpoint) ? 'is-selected' : ''}`} disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('lineHeight', value)}>{value.replace('leading-', '')}</button>)}</ControlGroup>
            <ControlGroup label="Letter spacing">{styleOptions.letterSpacing.map((value) => <button key={value} type="button" className={`sn-style-chip ${hasBreakpointClass(selected.className, value, activeBreakpoint) ? 'is-selected' : ''}`} disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('letterSpacing', value)}>{value.replace('tracking-', '')}</button>)}</ControlGroup>
            <ControlGroup label="Text case">{styleOptions.textTransform.map((value) => <button key={value} type="button" className={`sn-style-chip ${hasBreakpointClass(selected.className, value, activeBreakpoint) ? 'is-selected' : ''}`} disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('textTransform', value)}>{value.replace('-case', '')}</button>)}</ControlGroup>
          </InspectorSection>
          <InspectorSection title="Color" icon={<span className="sn-color-glyph"/>} open={openSection === 'color'} onClick={() => setOpenSection(openSection === 'color' ? 'spacing' : 'color')}>
            <ControlGroup label="Text">{styleOptions.textColor.map((value) => <ColorSwatch key={value} value={value} property="textColor" classes={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
          </InspectorSection>
          <InspectorSection title="Surface" icon={<span className="sn-surface-glyph"/>} open={openSection === 'surface'} onClick={() => setOpenSection(openSection === 'surface' ? 'spacing' : 'surface')}>
            <ControlGroup label="Fill">{styleOptions.backgroundColor.map((value) => <ColorSwatch key={value} value={value} property="backgroundColor" classes={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
            <ControlGroup label="Padding">{styleOptions.padding.map((value) => <StyleChip key={value} value={value} property="padding" selectedClassName={selected.className} breakpoint={activeBreakpoint} disabled={selected.safeToEdit !== true} onChange={updateStyle}/>)}</ControlGroup>
            <ControlGroup label="Alignment"><div className="sn-align-group"><button type="button" className={hasBreakpointClass(selected.className, 'text-left', activeBreakpoint) ? 'is-selected' : ''} aria-pressed={hasBreakpointClass(selected.className, 'text-left', activeBreakpoint)} aria-label="Align left" disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('alignment', 'text-left')}><AlignLeft size={16}/></button><button type="button" className={hasBreakpointClass(selected.className, 'text-center', activeBreakpoint) ? 'is-selected' : ''} aria-pressed={hasBreakpointClass(selected.className, 'text-center', activeBreakpoint)} aria-label="Align center" disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('alignment', 'text-center')}><AlignCenter size={16}/></button><button type="button" className={hasBreakpointClass(selected.className, 'text-right', activeBreakpoint) ? 'is-selected' : ''} aria-pressed={hasBreakpointClass(selected.className, 'text-right', activeBreakpoint)} aria-label="Align right" disabled={selected.safeToEdit !== true} onClick={() => void updateStyle('alignment', 'text-right')}><AlignRight size={16}/></button></div></ControlGroup>
          </InspectorSection>
        </div>
        <div className="sn-inspector-footer"><button type="button" disabled={busy} onClick={() => { if (pendingEdit) void discardPreview(); setSelected(null); selectedNodeRef.current = null; editGroupIdRef.current = null; originalStyleRef.current = null; setNotice(null); }}><RotateCcw size={14}/> Deselect</button><span id="slightnudge-nudge-notice">{notice || 'Changes require review before they reach source.'}</span></div>
      </>}
    </aside>
  </div>;
}

function InspectorSection({ title, icon, open, onClick, children }: { title: string; icon: React.ReactNode; open: boolean; onClick: () => void; children: React.ReactNode }) {
  return <section className={`sn-inspector-section ${open ? 'is-open' : ''}`}><button type="button" className="sn-inspector-section-toggle" onClick={onClick}>{icon}<span>{title}</span><ChevronDown size={14}/></button>{open && <div className="sn-inspector-section-body">{children}</div>}</section>;
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="sn-control-group"><span>{label}</span><div>{children}</div></div>;
}

function StyleChip({ value, property, selectedClassName, breakpoint, disabled, onChange }: { value: string; property: keyof typeof propertyNames; selectedClassName: string; breakpoint: string; disabled: boolean; onChange: (property: keyof typeof propertyNames, value: string) => void }) {
  const label = value.replace(/^(?:max-w-|rounded-|font-|leading-|tracking-|w-|gap-|justify-|items-|flex-|p-)/, '').replace(/-/g, ' ');
  return <button type="button" className={`sn-style-chip ${hasBreakpointClass(selectedClassName, value, breakpoint) ? 'is-selected' : ''}`} disabled={disabled} onClick={() => onChange(property, value)}>{label}</button>;
}

function ColorSwatch({ value, property, classes, breakpoint, disabled, onChange }: { value: string; property: 'textColor' | 'backgroundColor'; classes: string; breakpoint: string; disabled: boolean; onChange: (property: 'textColor' | 'backgroundColor', value: string) => void }) {
  const color = value.match(/#([0-9a-f]{6})/i)?.[0] || '#ffffff';
  return <button type="button" className={`sn-color-swatch ${hasBreakpointClass(classes, value, breakpoint) ? 'is-selected' : ''}`} style={{ '--swatch-color': color } as React.CSSProperties} aria-label={`${propertyNames[property]} ${color}`} title={color} disabled={disabled} onClick={() => onChange(property, value)}/>;
}
