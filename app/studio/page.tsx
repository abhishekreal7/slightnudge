'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Code2,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Check,
  MousePointer2,
  RotateCcw,
  Type,
  ArrowUpDown,
  Laptop2,
  Tablet,
  Smartphone,
  Undo2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  MoreHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pencil,
  Columns2,
  LoaderCircle,
  CircleAlert,
  Trash2,
  Play,
  LayoutGrid,
} from 'lucide-react';
import {
  previewEditAPI,
  applyEditAPI,
  discardEditAPI,
  undoEditAPI,
  inspectElementAPI,
} from '@/lib/slightnudge/client';

interface ElementMeta {
  id: string;
  name: string;
  tag: string;
  filePath: string;
  line: number;
  column: number;
  classes: string;
  text?: string;
  display: string;
  width: string;
  height: string;
  overflow: 'visible' | 'hidden' | 'scroll' | 'auto';
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  paddingTop: string;
  paddingBottom: string;
  paddingLeft: string;
  paddingRight: string;
  typeface: string;
  fontWeight: string;
  textColor: string;
  bgFill: string;
  borderRadius: string;
  borderStroke: string;
  position: string;
}

const defaultElements: Record<string, ElementMeta> = {
  hero: {
    id: '',
    name: 'Hero Content Block',
    tag: 'div.hero-block',
    filePath: 'fixtures/1-plain-static.tsx',
    line: 8,
    column: 19,
    classes: 'sn-playground-content p-3',
    display: 'Block',
    width: 'Auto',
    height: 'Auto',
    overflow: 'visible',
    marginTop: '0',
    marginBottom: '0',
    marginLeft: 'Auto',
    marginRight: 'Auto',
    paddingTop: '12',
    paddingBottom: '12',
    paddingLeft: '12',
    paddingRight: '12',
    typeface: 'Inter',
    fontWeight: 'Regular',
    textColor: '17211f',
    bgFill: 'transparent',
    borderRadius: 'rounded-none',
    borderStroke: 'None',
    position: 'Relative',
  },
  text: {
    id: 'target',
    name: 'Headline Text',
    tag: 'h1.headline',
    filePath: 'fixtures/1-plain-static.tsx',
    line: 8,
    column: 361,
    classes: 'ml-2.5 mt-1 text-2xl',
    text: 'Make room for your best work.',
    display: 'Block',
    width: 'Auto',
    height: 'Auto',
    overflow: 'visible',
    marginTop: '1',
    marginBottom: '0',
    marginLeft: '2.5',
    marginRight: '0',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    typeface: 'Inter',
    fontWeight: 'Semi Bold',
    textColor: '0F172A',
    bgFill: 'transparent',
    borderRadius: 'rounded-none',
    borderStroke: 'None',
    position: 'Relative',
  },
  paragraph: {
    id: '',
    name: 'Subheading Paragraph',
    tag: 'p.subheading',
    filePath: 'fixtures/1-plain-static.tsx',
    line: 8,
    column: 138,
    classes: 'sn-playground-description text-xl',
    text: 'One thoughtful workspace for the people, projects, and plans that move your business forward.',
    display: 'Block',
    width: 'Auto',
    height: 'Auto',
    overflow: 'visible',
    marginTop: '0',
    marginBottom: '0',
    marginLeft: 'Auto',
    marginRight: 'Auto',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    typeface: 'Inter',
    fontWeight: 'Regular',
    textColor: '697571',
    bgFill: 'transparent',
    borderRadius: 'rounded-none',
    borderStroke: 'None',
    position: 'Relative',
  },
  button: {
    id: '',
    name: 'Join Waitlist Button',
    tag: 'a.cta-btn',
    filePath: 'fixtures/1-plain-static.tsx',
    line: 8,
    column: 512,
    classes: 'sn-playground-primary',
    text: 'Get started →',
    display: 'Inline-Block',
    width: 'Auto',
    height: 'Auto',
    overflow: 'visible',
    marginTop: '7',
    marginBottom: '0',
    marginLeft: 'Auto',
    marginRight: 'Auto',
    paddingTop: '10',
    paddingBottom: '10',
    paddingLeft: '24',
    paddingRight: '24',
    typeface: 'Inter',
    fontWeight: 'Medium',
    textColor: 'FFFFFF',
    bgFill: 'slate-900',
    borderRadius: 'rounded-lg',
    borderStroke: 'None',
    position: 'Relative',
  },
  nav: {
    id: 'nav',
    name: 'Nav Menu',
    tag: 'nav.site-nav',
    filePath: 'fixtures/1-plain-static.tsx',
    line: 10,
    column: 7,
    classes: 'w-full px-8 py-6 flex items-center justify-between',
    display: 'Flex',
    width: 'Full',
    height: 'Auto',
    overflow: 'visible',
    marginTop: '0',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    paddingTop: '24',
    paddingBottom: '24',
    paddingLeft: '32',
    paddingRight: '32',
    typeface: 'Inter',
    fontWeight: 'Medium',
    textColor: '1E293B',
    bgFill: 'transparent',
    borderRadius: 'rounded-none',
    borderStroke: 'None',
    position: 'Relative',
  },
  waitlist: {
    id: 'waitlist',
    name: 'Social Proof Stack',
    tag: 'div.social-proof',
    filePath: 'fixtures/1-plain-static.tsx',
    line: 11,
    column: 7,
    classes: 'flex flex-col items-center space-y-2.5',
    text: 'Join a waitlist of 1200+ members!',
    display: 'Flex',
    width: 'Auto',
    height: 'Auto',
    overflow: 'visible',
    marginTop: '8',
    marginBottom: '0',
    marginLeft: 'Auto',
    marginRight: 'Auto',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    typeface: 'Inter',
    fontWeight: 'Regular',
    textColor: '64748B',
    bgFill: 'transparent',
    borderRadius: 'rounded-none',
    borderStroke: 'None',
    position: 'Relative',
  },
};

export interface StudioPageItem {
  id: string;
  title: string;
  route: string;
  file: string;
  type: 'app' | 'fixture';
  isAutoDetected?: boolean;
}

const defaultPages: StudioPageItem[] = [
  { id: 'home', title: 'Home', route: '/', file: 'app/page.tsx', type: 'app', isAutoDetected: true },
  { id: 'pricing', title: 'Pricing', route: '/pricing', file: 'app/pricing/page.tsx', type: 'app', isAutoDetected: true },
  { id: 'workspace', title: 'Workspace', route: '/workspace', file: 'app/workspace/page.tsx', type: 'app', isAutoDetected: true },
  { id: 'how-it-works', title: 'How It Works', route: '/how-it-works', file: 'app/how-it-works/page.tsx', type: 'app', isAutoDetected: true },
  { id: 'privacy', title: 'Privacy Policy', route: '/privacy', file: 'app/privacy/page.tsx', type: 'app', isAutoDetected: true },
  { id: 'terms', title: 'Terms of Service', route: '/terms', file: 'app/terms/page.tsx', type: 'app', isAutoDetected: true },
  { id: 'admin', title: 'Admin', route: '/admin', file: 'app/admin/page.tsx', type: 'app', isAutoDetected: true },
  { id: 'dashboard', title: 'Dashboard', route: '/dashboard', file: 'app/dashboard/page.tsx', type: 'app', isAutoDetected: true },
  { id: 'fixture-1', title: 'Product Overview', route: '/fixtures/1', file: 'fixtures/1-plain-static.tsx', type: 'fixture', isAutoDetected: true },
  { id: 'fixture-2', title: 'Feature Section', route: '/fixtures/2', file: 'fixtures/2-several-utilities.tsx', type: 'fixture', isAutoDetected: true },
  { id: 'fixture-3', title: 'Pricing Panel', route: '/fixtures/3', file: 'fixtures/3-conditional-cn.tsx', type: 'fixture', isAutoDetected: true },
  { id: 'fixture-4', title: 'Customer Cards', route: '/fixtures/4', file: 'fixtures/4-shared-component.tsx', type: 'fixture', isAutoDetected: true },
  { id: 'fixture-5', title: 'Responsive Layout', route: '/fixtures/5', file: 'fixtures/5-responsive-classes.tsx', type: 'fixture', isAutoDetected: true },
];

interface PendingEdit {
  id: string;
  summary: string;
  oldValue: string;
  newValue: string;
  filePath: string;
  line: number;
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

const breakpoints = [
  ['', 'Base'],
  ['sm', '≥640'],
  ['md', '≥768'],
  ['lg', '≥1024'],
  ['xl', '≥1280'],
  ['2xl', '≥1536'],
] as const;

export default function StudioPage() {
  // Selection State: Default to null (shows Image 2 empty state when nothing is selected)
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [inspectorActive, setInspectorActive] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'layers' | 'pages'>('layers');
  const [pages, setPages] = useState<StudioPageItem[]>(defaultPages);
  const [selectedPage, setSelectedPage] = useState<StudioPageItem>(defaultPages[0]);
  const [breakpoint, setBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeBreakpoint, setActiveBreakpoint] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'design' | 'settings'>('design');

  // Accordion Sections State matching Image 2 (Layout, Size, Spacing, Text, Background, Borders, Position)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    layout: true,
    size: true,
    spacing: true,
    text: true,
    background: false,
    borders: false,
    position: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Elements State
  const [elements, setElements] = useState<Record<string, ElementMeta>>(defaultElements);
  const activeElement = (selectedLayer && elements[selectedLayer]) ? elements[selectedLayer] : elements.hero;

  // Text Draft & Inline Canvas Editing
  const [draftText, setDraftText] = useState<string>(activeElement.text || '');
  const [isInlineEditing, setIsInlineEditing] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [showExploreMore, setShowExploreMore] = useState<boolean>(false);
  const [exploreTab, setExploreTab] = useState<'text' | 'media' | 'columns' | 'box' | 'code' | 'inspect'>('box');

  useEffect(() => {
    if (selectedLayer && elements[selectedLayer]) {
      setDraftText(elements[selectedLayer].text || '');
    }
  }, [selectedLayer, elements]);

  // Auto-detect project routes from Next.js filesystem
  const autoDetectPages = useCallback(async (notify = false) => {
    try {
      const res = await fetch('/api/slightnudge/pages');
      if (res.ok) {
        const data = await res.json();
        if (data.allPages && data.allPages.length > 0) {
          setPages(data.allPages);
          if (notify) {
            showToast(`Auto-detected ${data.allPages.length} routes from Next.js project`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-detect routes:', err);
    }
  }, []);

  useEffect(() => {
    autoDetectPages(false);
  }, [autoDetectPages]);

  // Pending Source Edits (SaaS Backend Integration)
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Backend Integration: Trigger Preview on Style/Text/Nudge/Reorder
  const triggerBackendPreview = useCallback(
    async (kind: 'style' | 'text' | 'nudge' | 'reorder', payload: Record<string, any>) => {
      if (!selectedLayer) return;
      setBusy(true);
      try {
        const result = await previewEditAPI({
          kind,
          filePath: activeElement.filePath,
          line: activeElement.line,
          column: activeElement.column,
          elementId: activeElement.id,
          tagName: activeElement.tag.split('.')[0],
          className: activeElement.classes,
          breakpoint: activeBreakpoint,
          ...payload,
        });

        if (result.success && result.id) {
          setPendingEdit({
            id: result.id,
            summary: result.summary || `${payload.property || kind} modified`,
            oldValue: result.oldValue || '',
            newValue: result.newValue || '',
            filePath: result.filePath,
            line: result.line || activeElement.line,
          });
        } else {
          // Backend refusal - never create fake client edits!
          setPendingEdit(null);
          showToast(`⚠️ ${result.refusalReason || result.error || 'Edit refused'}`);
        }
      } catch (err: any) {
        setPendingEdit(null);
        showToast(`⚠️ ${err?.message || 'Could not prepare preview'}`);
      } finally {
        setBusy(false);
      }
    },
    [activeBreakpoint, activeElement, selectedLayer]
  );

  // Apply Pending Edit to Source Disk
  const applySourceEdit = async () => {
    if (!pendingEdit) return;
    setIsApplying(true);
    try {
      const result = await applyEditAPI(pendingEdit.id);
      if (result.success) {
        showToast(`✓ Applied change to ${pendingEdit.filePath}`);
        setPendingEdit(null);
      } else {
        showToast(`⚠️ ${result.error || 'Could not apply change'}`);
      }
    } catch {
      showToast('⚠️ Could not apply change to disk');
    } finally {
      setIsApplying(false);
    }
  };

  // Discard Pending Edit
  const discardPendingEdit = async () => {
    if (!pendingEdit) return;
    await discardEditAPI(pendingEdit.id);
    setPendingEdit(null);
    showToast('Discarded visual adjustment');
  };

  // Undo Source Edit
  const handleUndo = async () => {
    try {
      const result = await undoEditAPI(activeElement.filePath);
      if (result.success) {
        showToast(`✓ ${result.message || 'Restored previous source state'}`);
      } else {
        showToast(`Notice: ${result.error || 'No more undo history'}`);
      }
    } catch {
      showToast('Undo request completed');
    }
  };

  // Keyboard shortcut Ctrl+Z / Cmd+Z and Escape to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Escape') {
        setSelectedLayer(null);
      } else if (selectedLayer && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right';
        nudgeMargin(dir);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeElement.filePath, selectedLayer]);

  // Update property helper
  const updateStyle = (property: string, value: string) => {
    if (!selectedLayer) return;
    setElements((prev) => {
      const el = prev[selectedLayer];
      if (!el) return prev;
      const updated = { ...el };
      if (property === 'padding') {
        const padNum = value.replace('p-', '');
        updated.paddingLeft = padNum;
        updated.paddingRight = padNum;
        updated.paddingTop = padNum;
        updated.paddingBottom = padNum;
      } else if (property === 'fontSize') {
        updated.classes = updated.classes.replace(/text-(xs|sm|base|lg|xl|[2-7]xl)/, value);
      } else if (property === 'fontWeight') {
        updated.fontWeight = value.replace('font-', '');
      } else if (property === 'textColor') {
        const hex = value.match(/#([0-9a-f]{6})/i)?.[1] || '0F172A';
        updated.textColor = hex;
      } else if (property === 'backgroundColor') {
        const hex = value.match(/#([0-9a-f]{6})/i)?.[1] || 'transparent';
        updated.bgFill = hex;
      } else if (property === 'display') {
        updated.display = value;
      } else if (property === 'width') {
        updated.width = value;
      } else if (property === 'borderRadius') {
        updated.borderRadius = value;
      }
      return { ...prev, [selectedLayer]: updated };
    });
    void triggerBackendPreview('style', { property, value, breakpoint: activeBreakpoint });
  };

  const updateElementProp = (
    key: string,
    val: string,
    backendChange?: { kind: 'style' | 'text' | 'reorder' | 'nudge'; prop?: string; val?: string }
  ) => {
    if (!selectedLayer) return;
    setElements((prev) => {
      const el = prev[selectedLayer];
      if (!el) return prev;
      return {
        ...prev,
        [selectedLayer]: {
          ...el,
          [key]: val,
        },
      };
    });

    if (backendChange) {
      if (backendChange.kind === 'style' && backendChange.prop && backendChange.val) {
        void triggerBackendPreview('style', {
          property: backendChange.prop,
          value: backendChange.val,
          breakpoint: activeBreakpoint,
        });
      } else if (backendChange.kind === 'text') {
        void triggerBackendPreview('text', { value: val });
      }
    }
  };

  const updateText = (newVal?: string) => {
    const textVal = newVal !== undefined ? newVal : draftText;
    if (!selectedLayer || !textVal.trim()) return;
    setElements((prev) => {
      const el = prev[selectedLayer];
      if (!el) return prev;
      return { ...prev, [selectedLayer]: { ...el, text: textVal } };
    });
    void triggerBackendPreview('text', { value: textVal });
  };

  const reorderSibling = (direction: 'earlier' | 'later') => {
    if (!selectedLayer) return;
    void triggerBackendPreview('reorder', { direction });
  };

  const nudgeMargin = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedLayer) return;
    setElements((prev) => {
      const el = prev[selectedLayer];
      if (!el) return prev;
      const curTop = parseInt(el.marginTop || '0', 10) || 0;
      const curLeft = parseInt(el.marginLeft || '0', 10) || 0;
      let nextTop = curTop;
      let nextLeft = curLeft;
      if (direction === 'up') nextTop = Math.max(0, curTop - 1);
      if (direction === 'down') nextTop = curTop + 1;
      if (direction === 'left') nextLeft = Math.max(0, curLeft - 1);
      if (direction === 'right') nextLeft = curLeft + 1;
      return {
        ...prev,
        [selectedLayer]: {
          ...el,
          marginTop: String(nextTop),
          marginLeft: String(nextLeft),
        },
      };
    });
    void triggerBackendPreview('nudge', { direction, stepSize: 'normal', breakpoint: activeBreakpoint });
  };

  const stepFontSize = (delta: number) => {
    const currentClass = activeElement.classes.match(/text-(xs|sm|base|lg|xl|[2-7]xl)/)?.[0] || 'text-base';
    const curIdx = (styleOptions.fontSize as readonly string[]).indexOf(currentClass);
    const nextIdx = Math.max(0, Math.min(styleOptions.fontSize.length - 1, (curIdx >= 0 ? curIdx : 2) + delta));
    const nextVal = styleOptions.fontSize[nextIdx];
    updateStyle('fontSize', nextVal);
  };

  const stepPadding = (delta: number) => {
    const currentClass = `p-${activeElement.paddingLeft || '4'}`;
    const curIdx = (styleOptions.padding as readonly string[]).indexOf(currentClass);
    const nextIdx = Math.max(0, Math.min(styleOptions.padding.length - 1, (curIdx >= 0 ? curIdx : 4) + delta));
    const nextVal = styleOptions.padding[nextIdx];
    updateStyle('padding', nextVal);
  };

  const stepGap = (delta: number) => {
    const currentClass = activeElement.classes.match(/gap-(\d+)/)?.[0] || 'gap-2';
    const curIdx = (styleOptions.gap as readonly string[]).indexOf(currentClass);
    const nextIdx = Math.max(0, Math.min(styleOptions.gap.length - 1, (curIdx >= 0 ? curIdx : 2) + delta));
    const nextVal = styleOptions.gap[nextIdx];
    updateStyle('gap', nextVal);
  };

  const toggleBold = () => {
    const isBold = activeElement.fontWeight === 'Bold' || activeElement.fontWeight === 'Extra Bold' || activeElement.classes.includes('font-bold') || activeElement.classes.includes('font-extrabold');
    const nextVal = isBold ? 'font-normal' : 'font-bold';
    updateStyle('fontWeight', nextVal);
  };

  const isTextElement = ['text', 'paragraph', 'button', 'waitlist'].includes(selectedLayer || '') || activeElement.tag.startsWith('h') || activeElement.tag.startsWith('p') || activeElement.tag.startsWith('button');
  const currentFontSizeClass = activeElement.classes.match(/text-(xs|sm|base|lg|xl|[2-7]xl)/)?.[0] || 'text-base';
  const currentFontSizeLabel = currentFontSizeClass.replace('text-', '');
  const currentGapClass = activeElement.classes.match(/gap-(\d+)/)?.[0] || 'gap-2';
  const currentGapLabel = currentGapClass.replace('gap-', '');
  const isBold = activeElement.fontWeight === 'Bold' || activeElement.fontWeight === 'Extra Bold' || activeElement.classes.includes('font-bold') || activeElement.classes.includes('font-extrabold');

  // Responsive artboard width
  const artboardWidth = breakpoint === 'mobile' ? '375px' : breakpoint === 'tablet' ? '768px' : '940px';

  return (
    <>
      {/* Google Fonts: Manrope & Inter */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <style jsx global>{`
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: #F8F9FA;
          color: #1E293B;
          overflow: hidden;
        }
        .font-manrope {
          font-family: 'Manrope', 'Inter', sans-serif;
        }
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>

      {/* Main Studio Shell: Fullscreen SlightNudge SaaS Environment */}
      <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-[#F8F9FA] select-none text-slate-800 text-xs overflow-hidden">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center space-x-2 border border-slate-700 animate-fade-in">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Workspace Body: Left Sidebar + Center Canvas + Right Inspector */}
        <div className="flex-1 flex overflow-hidden">

          {/* ======================================================== */}
          {/* LEFT SIDEBAR: Layers & Pages (SaaS Theme)                */}
          {/* ======================================================== */}
          <aside className="w-60 bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 z-20">
            {/* 1. Left Sidebar Brand Header (h-10 aligns with canvas and inspector top bar) */}
            <div className="h-10 px-3 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-white select-none">
              <Link href="/workspace" className="flex items-center space-x-2 text-slate-900 hover:opacity-85 transition" title="Back to workspace">
                <Image
                  src="/icon.svg"
                  alt="SlightNudge"
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-md shadow-2xs object-contain"
                  unoptimized
                />
                <span className="font-semibold text-xs tracking-tight text-[#26342C]">SlightNudge</span>
              </Link>

              <Link
                href="/workspace"
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-50 transition"
                title="Back to workspace"
              >
                <ArrowLeft size={13} />
              </Link>
            </div>

            {/* 2. Sidebar Tabs: Layers & Pages */}
            <div className="h-9 px-3 border-b border-[#F1F5F9] flex items-center justify-between text-xs shrink-0 bg-[#FBFDFB]">
              <div className="flex items-center space-x-3 h-full">
                <button
                  onClick={() => setSidebarTab('layers')}
                  className={`h-full flex items-center space-x-1.5 font-medium border-b-2 transition ${
                    sidebarTab === 'layers'
                      ? 'border-[#059669] text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                  <span>Layers</span>
                </button>

                <button
                  onClick={() => setSidebarTab('pages')}
                  className={`h-full flex items-center space-x-1.5 font-medium border-b-2 transition ${
                    sidebarTab === 'pages'
                      ? 'border-[#059669] text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>Pages</span>
                </button>
              </div>

              {/* Active Route */}
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[85px] px-1">
                {selectedPage.route}
              </span>
            </div>

            {/* Sidebar Content: Layers Tree OR Pages List */}
            {sidebarTab === 'layers' ? (
              /* Tree View DOM Hierarchy */
              <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-xs text-slate-700">
                
                {/* Root: Body */}
                <div>
                  <div
                    onClick={() => setSelectedLayer('body')}
                    className={`flex items-center space-x-1.5 px-2 py-1.5 rounded cursor-pointer transition ${
                      selectedLayer === 'body'
                        ? 'bg-[#EFF5F0] text-[#1B5E3B] font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <svg className={`w-3.5 h-3.5 shrink-0 ${selectedLayer === 'body' ? 'text-[#059669]' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                    </svg>
                    <span className="font-medium text-[11.5px]">Body</span>
                  </div>

                  {/* Body Children */}
                  <div className="ml-3 pl-2 border-l border-slate-100 space-y-0.5 mt-0.5">
                    
                    {/* Nav Menu */}
                    <div
                      onClick={() => setSelectedLayer('nav')}
                      className={`flex items-center space-x-1.5 px-2 py-1.5 rounded cursor-pointer transition ${
                        selectedLayer === 'nav'
                          ? 'bg-[#EFF5F0] text-[#1B5E3B] font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <svg className={`w-3.5 h-3.5 shrink-0 ${selectedLayer === 'nav' ? 'text-[#059669]' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                      </svg>
                      <span className="text-[11.5px]">Nav Menu</span>
                    </div>

                    {/* Hero Content Block */}
                    <div>
                      <div
                        onClick={() => setSelectedLayer('hero')}
                        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-md cursor-pointer transition ${
                          selectedLayer === 'hero'
                            ? 'bg-[#EFF5F0] text-[#1B5E3B] font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <svg
                          className={`w-3 h-3 shrink-0 ${selectedLayer === 'hero' ? 'text-[#059669]' : 'text-slate-400'}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <svg
                          className={`w-3.5 h-3.5 shrink-0 ${selectedLayer === 'hero' ? 'text-[#059669]' : 'text-slate-400'}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                        </svg>
                        <span className="text-[11.5px] truncate">Hero Content Block</span>
                      </div>

                      {/* Sub-items under Hero Content Block */}
                      <div className="ml-5 space-y-0.5 mt-0.5">
                        {/* Text */}
                        <div
                          onClick={() => setSelectedLayer('text')}
                          className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition ${
                            selectedLayer === 'text'
                              ? 'bg-[#EFF5F0] text-[#1B5E3B] font-medium'
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <svg
                            className={`w-3.5 h-3.5 shrink-0 ${selectedLayer === 'text' ? 'text-[#059669]' : 'text-slate-400'}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="4 7 4 4 20 4 20 7" />
                            <line x1="12" y1="4" x2="12" y2="20" />
                          </svg>
                          <span className="text-[11px]">Text</span>
                        </div>

                        {/* Paragraph */}
                        <div
                          onClick={() => setSelectedLayer('paragraph')}
                          className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition ${
                            selectedLayer === 'paragraph'
                              ? 'bg-[#EFF5F0] text-[#1B5E3B] font-medium'
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <svg
                            className={`w-3.5 h-3.5 shrink-0 ${selectedLayer === 'paragraph' ? 'text-[#059669]' : 'text-slate-400'}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="3" y1="5.5" x2="21" y2="5.5" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                            <line x1="3" y1="14.5" x2="21" y2="14.5" />
                            <line x1="3" y1="19" x2="13" y2="19" />
                          </svg>
                          <span className="text-[11px]">Paragraph</span>
                        </div>

                        {/* Button */}
                        <div
                          onClick={() => setSelectedLayer('button')}
                          className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition ${
                            selectedLayer === 'button'
                              ? 'bg-[#EFF5F0] text-[#1B5E3B] font-medium'
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <svg
                            className={`w-3.5 h-3.5 shrink-0 ${selectedLayer === 'button' ? 'text-[#059669]' : 'text-slate-400'}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
                            <path d="M8.5 12h7m-2.5-2.5l2.5 2.5-2.5 2.5" strokeWidth="1.8" />
                          </svg>
                          <span className="text-[11px]">Button</span>
                        </div>
                      </div>
                    </div>

                    {/* Waitlist Wrapper */}
                    <div
                      onClick={() => setSelectedLayer('waitlist')}
                      className={`flex items-center space-x-1.5 px-2 py-1.5 rounded cursor-pointer transition ${
                        selectedLayer === 'waitlist'
                          ? 'bg-[#EFF5F0] text-[#1B5E3B] font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <svg className={`w-3.5 h-3.5 shrink-0 ${selectedLayer === 'waitlist' ? 'text-[#059669]' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                      </svg>
                      <span className="text-[11.5px]">Waitlist Wrapper</span>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              /* Pages Selection Panel: Pure Native List */
              <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-xs text-slate-700">
                {pages.map((page) => {
                  const isSelected = selectedPage.id === page.id;
                  return (
                    <div
                      key={page.id}
                      onClick={() => {
                        setSelectedPage(page);
                        showToast(`Opened ${page.title}`);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition ${
                        isSelected
                          ? 'bg-[#EFF5F0] text-[#1B5E3B] font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <svg
                          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#059669]' : 'text-slate-400'}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="text-[11.5px] truncate">{page.title}</span>
                      </div>

                      <span className={`text-[10px] font-mono shrink-0 ml-2 ${isSelected ? 'text-[#059669]' : 'text-slate-400'}`}>
                        {page.route}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions: Undo & Source Location */}
            <div className="border-t border-[#F1F5F9] p-2.5 shrink-0 space-y-2">
              <button
                onClick={handleUndo}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition"
                title="Undo last source edit (Ctrl+Z)"
              >
                <span className="flex items-center space-x-1.5">
                  <Undo2 size={13} className="text-slate-500" />
                  <span>Undo edit</span>
                </span>
                <span className="text-[9px] font-mono text-slate-400">Ctrl+Z</span>
              </button>

              <div className="bg-[#FAFBFA] border border-[#E5E7EB] rounded-md p-2 text-[10.5px]">
                <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Source</div>
                <div className="flex items-center space-x-1.5 text-slate-700 font-mono truncate">
                  <Code2 size={12} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{activeElement.filePath}</span>
                </div>
                <p className="text-[9.5px] text-slate-400 mt-1 leading-tight">Changes are written to this local source file.</p>
              </div>
            </div>
          </aside>

          {/* ======================================================== */}
          {/* CENTER CANVAS COLUMN                                     */}
          {/* ======================================================== */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
            {/* Unified Canvas Top Bar (h-10) */}
            <div className="h-10 bg-white border-b border-[#E5E7EB] px-3.5 flex items-center justify-between shrink-0 z-10 select-none">
              {/* Left: Project title & route */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
                  <span>vibecheck</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-normal text-slate-500 font-mono text-[11px]">
                    {selectedPage.title.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Center: Viewport Switcher & Undo */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200/70 text-slate-600">
                  <button
                    onClick={() => setBreakpoint('desktop')}
                    className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1.5 transition cursor-pointer ${
                      breakpoint === 'desktop' ? 'bg-white text-slate-900 shadow-2xs font-medium' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Desktop"
                  >
                    <Laptop2 size={12} />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setBreakpoint('tablet')}
                    className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1.5 transition cursor-pointer ${
                      breakpoint === 'tablet' ? 'bg-white text-slate-900 shadow-2xs font-medium' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tablet"
                  >
                    <Tablet size={12} />
                    <span>Tablet</span>
                  </button>
                  <button
                    onClick={() => setBreakpoint('mobile')}
                    className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1.5 transition cursor-pointer ${
                      breakpoint === 'mobile' ? 'bg-white text-slate-900 shadow-2xs font-medium' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Mobile"
                  >
                    <Smartphone size={12} />
                    <span>Mobile</span>
                  </button>
                </div>

                <button
                  onClick={handleUndo}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded-md border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-medium transition shadow-2xs cursor-pointer"
                  title="Undo visual adjustment (Ctrl+Z)"
                >
                  <Undo2 size={12} />
                  <span>Undo</span>
                </button>
              </div>

              {/* Right: Source status pill & Projects link */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="hidden xl:inline">Local source</span>
                </div>

                <Link
                  href="/workspace"
                  className="flex items-center space-x-1 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                >
                  <span>Projects</span>
                  <ArrowUpRight size={11} />
                </Link>
              </div>
            </div>

            {/* Canvas Main Scroll Area */}
            <main
              onClick={() => setSelectedLayer(null)}
              className="flex-1 overflow-auto bg-[#F8F9FA] relative flex flex-col justify-between p-6 md:p-12 items-center"
            >
            {/* Centered Artboard Container */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.04)] border border-[#EAECEF] overflow-hidden my-auto min-h-[720px] flex flex-col justify-between transition-all duration-300"
              style={{ maxWidth: artboardWidth }}
            >
              
              {/* Artboard Nav Header */}
              <nav
                onClick={(e) => {
                  e.stopPropagation();
                  if (inspectorActive) setSelectedLayer('nav');
                }}
                className={`w-full px-8 py-6 flex items-center justify-between transition cursor-pointer ${
                  selectedLayer === 'nav' ? 'ring-2 ring-[#059669] ring-inset' : ''
                }`}
              >
                {/* Brand Logo & Links */}
                <div className="flex items-center space-x-8">
                  {/* Geometric Origami Logo Mark (Cyan to Purple Gradient) */}
                  <div className="flex items-center space-x-2.5">
                    <div className="h-7 w-7 rounded-md bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600 shadow-sm flex items-center justify-center transform rotate-6">
                      <div className="h-4 w-4 bg-white/20 backdrop-blur-xs rounded-sm transform -rotate-6"></div>
                    </div>
                  </div>

                  {/* Nav Links */}
                  <div className="flex items-center space-x-6 text-[13px] font-medium text-slate-800">
                    <a href="#home" className="hover:text-purple-600 transition">Home</a>
                    <a href="#pricing" className="hover:text-purple-600 transition">Pricing</a>
                  </div>
                </div>

                {/* Right Nav Actions */}
                <div className="flex items-center space-x-4">
                  <a href="#learn-more" className="text-[13px] font-medium text-slate-700 hover:text-slate-900 transition">
                    Learn more
                  </a>
                  <button className="text-[12px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-lg transition shadow-sm">
                    Join the waitlist
                  </button>
                </div>
              </nav>

              {/* Artboard Hero Section */}
              <section className="relative px-8 pt-10 pb-16 flex-1 flex flex-col items-center justify-center text-center">
                
                {/* ======================================================== */}
                {/* ACTIVE VISUAL SELECTION BOX (Hero Content Block)         */}
                {/* ======================================================== */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (inspectorActive) setSelectedLayer('hero');
                  }}
                  className={`relative w-full max-w-[780px] rounded-sm p-8 transition-all cursor-pointer bg-transparent ${
                    selectedLayer === 'hero' ? 'border border-[#059669]' : 'border border-transparent hover:border-slate-200'
                  }`}
                  style={{
                    paddingTop: `${elements.hero.paddingTop}px`,
                    paddingBottom: `${elements.hero.paddingBottom}px`,
                    paddingLeft: `${elements.hero.paddingLeft}px`,
                    paddingRight: `${elements.hero.paddingRight}px`,
                  }}
                >
                  {/* Selection Badge Tag (Top-Left attached pill in SlightNudge Emerald) */}
                  {selectedLayer === 'hero' && (
                    <div className="absolute -top-[19px] -left-[1px] bg-[#059669] text-white font-sans text-[10px] font-medium px-2 py-0.5 rounded-t-sm flex items-center space-x-1 shadow-sm">
                      <svg className="w-2.5 h-2.5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                      </svg>
                      <span>Hero Content Block</span>
                    </div>
                  )}

                  {/* Floating In-Situ Canvas HUD Dock & Explore More Popover (Image 1 & Image 2) */}
                  {selectedLayer && (
                    <div
                      className="absolute -top-14 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center select-none"
                      style={{ minWidth: 'max-content' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Neatly arranged primary HUD bar (Image 1) */}
                      <div className="bg-[#0F172A]/95 backdrop-blur-md text-white rounded-full px-3 py-1.5 flex items-center space-x-2 shadow-2xl border border-slate-700/80 animate-fade-in">
                        {isTextElement ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsInlineEditing(true)}
                              title="Edit text directly on canvas"
                              className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                            >
                              <Pencil size={12} className="text-emerald-400" />
                              <span>Edit text</span>
                            </button>

                            <div className="h-3.5 w-[1px] bg-slate-700/80" />

                            {/* Clean Size Stepper */}
                            <div className="flex items-center space-x-1 text-xs">
                              <span className="text-slate-400 font-mono text-[10px] tracking-wider font-semibold mr-0.5">SIZE</span>
                              <button
                                type="button"
                                onClick={() => stepFontSize(-1)}
                                className="w-5 h-5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer transition"
                                title="Decrease font size"
                              >−</button>
                              <span className="px-1 text-xs font-mono font-bold text-white min-w-[32px] text-center">
                                {currentFontSizeLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => stepFontSize(1)}
                                className="w-5 h-5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer transition"
                                title="Increase font size"
                              >+</button>
                            </div>

                            <div className="h-3.5 w-[1px] bg-slate-700/80" />

                            {/* Quick Bold Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleBold()}
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-extrabold transition cursor-pointer ${
                                isBold ? 'bg-emerald-500 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
                              }`}
                              title="Toggle bold"
                            >
                              B
                            </button>

                            <div className="h-3.5 w-[1px] bg-slate-700/80" />

                            {/* Clean Alignment */}
                            <div className="flex items-center space-x-0.5">
                              <button
                                type="button"
                                onClick={() => updateStyle('alignment', 'text-left')}
                                className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                                  activeElement.classes.includes('text-left') ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Align left"
                              >
                                <AlignLeft size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStyle('alignment', 'text-center')}
                                className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                                  activeElement.classes.includes('text-center') ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Align center"
                              >
                                <AlignCenter size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStyle('alignment', 'text-right')}
                                className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                                  activeElement.classes.includes('text-right') ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Align right"
                              >
                                <AlignRight size={13} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Element Badge */}
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10.5px] font-mono font-semibold text-emerald-400 border border-slate-700/60">
                              {activeElement.tag}
                            </span>

                            <div className="h-3.5 w-[1px] bg-slate-700/80" />

                            {/* Pad Stepper */}
                            <div className="flex items-center space-x-1 text-xs">
                              <span className="text-slate-400 font-mono text-[10px] tracking-wider font-semibold mr-0.5">PAD</span>
                              <button
                                type="button"
                                onClick={() => stepPadding(-1)}
                                className="w-5 h-5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer transition"
                              >−</button>
                              <span className="px-1 text-xs font-mono font-bold text-white min-w-[24px] text-center">
                                {activeElement.paddingLeft || '16'}
                              </span>
                              <button
                                type="button"
                                onClick={() => stepPadding(1)}
                                className="w-5 h-5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer transition"
                              >+</button>
                            </div>
                          </>
                        )}

                        <div className="h-3.5 w-[1px] bg-slate-700/80" />

                        {/* Undo button */}
                        <button
                          type="button"
                          onClick={handleUndo}
                          className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                          title="Undo last change (Ctrl+Z)"
                        >
                          <RotateCcw size={12} />
                        </button>

                        <div className="h-3.5 w-[1px] bg-slate-700/80" />

                        {/* Three Dots Button: Explore More (Image 2) */}
                        <button
                          type="button"
                          onClick={() => setShowExploreMore((prev) => !prev)}
                          className={`p-1.5 rounded-full transition cursor-pointer flex items-center justify-center ${
                            showExploreMore
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                          title="Explore more properties"
                          aria-expanded={showExploreMore}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>

                      {/* Explore More Floating Card (Image 2 Style) */}
                      {showExploreMore && (
                        <div className="mt-2.5 w-[350px] bg-white rounded-xl shadow-2xl border border-slate-200/90 overflow-hidden text-slate-800 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                          {/* Top Dark Header Bar with Icon Tabs (Image 2) */}
                          <div className="bg-[#0B0F17] text-white px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-slate-400">
                              <button
                                type="button"
                                onClick={() => setExploreTab('text')}
                                className={`p-1 rounded hover:text-white transition cursor-pointer ${
                                  exploreTab === 'text' ? 'text-white font-bold' : ''
                                }`}
                                title="Typography & Text"
                              >
                                <Type size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExploreTab('media')}
                                className={`p-1 rounded hover:text-white transition cursor-pointer ${
                                  exploreTab === 'media' ? 'text-white' : ''
                                }`}
                                title="Media & Actions"
                              >
                                <Play size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExploreTab('columns')}
                                className={`p-1 rounded hover:text-white transition cursor-pointer ${
                                  exploreTab === 'columns' ? 'text-white' : ''
                                }`}
                                title="Columns & Layout"
                              >
                                <Columns2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExploreTab('box')}
                                className={`p-1 rounded hover:text-white transition cursor-pointer ${
                                  exploreTab === 'box' ? 'text-white' : ''
                                }`}
                                title="Box Model"
                              >
                                <LayoutGrid size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExploreTab('code')}
                                className={`p-1 rounded hover:text-white transition cursor-pointer ${
                                  exploreTab === 'code' ? 'text-white' : ''
                                }`}
                                title="JSX & Code"
                              >
                                <Code2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExploreTab('inspect')}
                                className={`p-1 rounded hover:text-white transition cursor-pointer ${
                                  exploreTab === 'inspect' ? 'text-white' : ''
                                }`}
                                title="Inspect Element"
                              >
                                <Laptop2 size={13} />
                              </button>
                            </div>

                            {/* Delete Element Action */}
                            <button
                              type="button"
                              onClick={() => {
                                showToast(`Element ${activeElement.id} removed`);
                                setSelectedLayer(null);
                                setShowExploreMore(false);
                              }}
                              className="text-slate-400 hover:text-rose-400 p-1 transition cursor-pointer"
                              title="Delete element"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Body Content matching Image 2 */}
                          <div className="bg-white divide-y divide-slate-100">
                            {/* Row 1: Box Name */}
                            <div className="px-4 py-2 flex items-center justify-between">
                              <span className="text-slate-500 font-medium text-[11px]">Box Name</span>
                              <input
                                type="text"
                                value={activeElement.name || activeElement.tag}
                                onChange={(e) => updateElementProp('name', e.target.value)}
                                className="font-semibold text-slate-900 text-xs text-right bg-transparent border-0 p-0 focus:ring-0 cursor-text hover:bg-slate-50 rounded px-1 max-w-[190px] truncate"
                              />
                            </div>

                            {/* Row 2: Radius */}
                            <div className="px-4 py-2 flex items-center justify-between">
                              <span className="text-slate-500 font-medium text-[11px]">Radius</span>
                              <div className="flex items-center space-x-3">
                                <input
                                  type="range"
                                  min="0"
                                  max="24"
                                  value={
                                    activeElement.borderRadius === 'rounded-none' ? 0 :
                                    activeElement.borderRadius === 'rounded-sm' ? 2 :
                                    activeElement.borderRadius === 'rounded-md' ? 6 :
                                    activeElement.borderRadius === 'rounded-lg' ? 8 :
                                    activeElement.borderRadius === 'rounded-xl' ? 12 :
                                    activeElement.borderRadius === 'rounded-full' ? 24 :
                                    parseInt(activeElement.borderRadius?.replace(/\D/g, '') || '6', 10) || 6
                                  }
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const radClass = val === 0 ? 'rounded-none' : val <= 3 ? 'rounded-sm' : val <= 7 ? 'rounded-md' : val <= 10 ? 'rounded-lg' : val <= 16 ? 'rounded-xl' : 'rounded-full';
                                    updateElementProp('borderRadius', radClass, { kind: 'style', prop: 'borderRadius', val: radClass });
                                  }}
                                  className="w-28 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                                />
                                <span className="font-mono text-slate-800 font-semibold text-[11px] w-4 text-right">
                                  {
                                    activeElement.borderRadius === 'rounded-none' ? 0 :
                                    activeElement.borderRadius === 'rounded-sm' ? 2 :
                                    activeElement.borderRadius === 'rounded-md' ? 6 :
                                    activeElement.borderRadius === 'rounded-lg' ? 8 :
                                    activeElement.borderRadius === 'rounded-xl' ? 12 :
                                    activeElement.borderRadius === 'rounded-full' ? 24 :
                                    parseInt(activeElement.borderRadius?.replace(/\D/g, '') || '6', 10) || 6
                                  }
                                </span>
                              </div>
                            </div>

                            {/* Row 3: Width & Height */}
                            <div className="px-4 py-2 grid grid-cols-2 gap-4">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium text-[11px]">Width</span>
                                <input
                                  type="text"
                                  value={activeElement.width || '540'}
                                  onChange={(e) => updateElementProp('width', e.target.value, { kind: 'style', prop: 'width', val: e.target.value })}
                                  className="font-semibold text-slate-900 text-xs text-right w-16 bg-transparent border-0 p-0 focus:ring-0 hover:bg-slate-50 rounded px-1"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium text-[11px]">Height</span>
                                <span className="font-semibold text-slate-900 text-xs">
                                  {activeElement.height || 'Relative'}
                                </span>
                              </div>
                            </div>

                            {/* Row 4: Fills & Style */}
                            <div className="px-4 py-2.5 grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-500 font-medium text-[11px] block mb-1.5">Fills</span>
                                <div className="flex items-center space-x-1.5">
                                  {/* Transparent */}
                                  <button
                                    type="button"
                                    onClick={() => updateElementProp('bgFill', 'transparent', { kind: 'style', prop: 'backgroundColor', val: 'bg-transparent' })}
                                    className={`w-4 h-4 rounded-full border border-slate-300 relative overflow-hidden transition cursor-pointer ${
                                      activeElement.bgFill === 'transparent' ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                                    }`}
                                    title="Transparent"
                                  >
                                    <div className="w-full h-full bg-white relative">
                                      <div className="absolute inset-0 border-t border-rose-500 rotate-45 top-1.5" />
                                    </div>
                                  </button>
                                  {/* Black */}
                                  <button
                                    type="button"
                                    onClick={() => updateElementProp('bgFill', '000000', { kind: 'style', prop: 'backgroundColor', val: 'bg-slate-900' })}
                                    className={`w-4 h-4 rounded-full bg-slate-900 border border-slate-300 transition cursor-pointer ${
                                      activeElement.bgFill === '000000' || activeElement.bgFill === 'slate-900' ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                                    }`}
                                    title="Solid Black"
                                  />
                                  {/* White */}
                                  <button
                                    type="button"
                                    onClick={() => updateElementProp('bgFill', 'ffffff', { kind: 'style', prop: 'backgroundColor', val: 'bg-white' })}
                                    className={`w-4 h-4 rounded-full bg-white border border-slate-300 transition cursor-pointer ${
                                      activeElement.bgFill === 'ffffff' ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                                    }`}
                                    title="Solid White"
                                  />
                                  {/* Pink */}
                                  <button
                                    type="button"
                                    onClick={() => updateElementProp('bgFill', 'ec4899', { kind: 'style', prop: 'backgroundColor', val: 'bg-pink-500' })}
                                    className={`w-4 h-4 rounded-full bg-pink-500 transition cursor-pointer ${
                                      activeElement.bgFill === 'ec4899' ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                                    }`}
                                    title="Hot Pink"
                                  />
                                  {/* Blue */}
                                  <button
                                    type="button"
                                    onClick={() => updateElementProp('bgFill', '2563eb', { kind: 'style', prop: 'backgroundColor', val: 'bg-blue-600' })}
                                    className={`w-4 h-4 rounded-full bg-blue-600 transition cursor-pointer ${
                                      activeElement.bgFill === '2563eb' ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                                    }`}
                                    title="Electric Blue"
                                  />
                                  <ChevronDown size={10} className="text-slate-400" />
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-500 font-medium text-[11px] block mb-1">Style</span>
                                <div className="relative">
                                  <select
                                    value={activeElement.bgFill === 'transparent' ? 'None' : 'Flat Colour'}
                                    onChange={(e) => {
                                      if (e.target.value === 'None') {
                                        updateElementProp('bgFill', 'transparent', { kind: 'style', prop: 'backgroundColor', val: 'bg-transparent' });
                                      } else {
                                        updateElementProp('bgFill', 'ffffff', { kind: 'style', prop: 'backgroundColor', val: 'bg-white' });
                                      }
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-medium text-slate-800 appearance-none focus:outline-none focus:border-emerald-500"
                                  >
                                    <option>Flat Colour</option>
                                    <option>Linear Gradient</option>
                                    <option>None</option>
                                  </select>
                                  <ChevronDown size={10} className="text-slate-400 absolute right-2 top-2 pointer-events-none" />
                                </div>
                              </div>
                            </div>

                            {/* Row 5: Borders */}
                            <div className="px-4 py-2.5 grid grid-cols-3 gap-3 items-end">
                              <div>
                                <span className="text-slate-500 font-medium text-[11px] block mb-1.5">Borders</span>
                                <div className="flex items-center space-x-1.5">
                                  <div className="w-4 h-4 rounded-full border border-slate-300 bg-white relative">
                                    <div className="absolute inset-0 border-t border-rose-500 rotate-45 top-1.5" />
                                  </div>
                                  <ChevronDown size={10} className="text-slate-400" />
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-500 font-medium text-[11px] block mb-1">Width</span>
                                <span className="text-xs font-semibold text-slate-900">0 px</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-medium text-[11px] block mb-1">Width</span>
                                <div className="relative">
                                  <select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-medium text-slate-800 appearance-none focus:outline-none focus:border-emerald-500">
                                    <option>Solid</option>
                                    <option>Dashed</option>
                                    <option>Dotted</option>
                                  </select>
                                  <ChevronDown size={10} className="text-slate-400 absolute right-2 top-2 pointer-events-none" />
                                </div>
                              </div>
                            </div>

                            {/* Row 6: Padding & Margin */}
                            <div className="px-4 py-2.5 grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-500 font-medium text-[11px] block mb-1.5">Padding</span>
                                <div className="grid grid-cols-4 gap-1">
                                  <input
                                    type="text"
                                    value={activeElement.paddingTop || '40'}
                                    onChange={(e) => updateElementProp('paddingTop', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-[10.5px] text-slate-700 focus:outline-none focus:border-emerald-500"
                                    title="Padding Top"
                                  />
                                  <input
                                    type="text"
                                    value={activeElement.paddingRight || '40'}
                                    onChange={(e) => updateElementProp('paddingRight', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-[10.5px] text-slate-700 focus:outline-none focus:border-emerald-500"
                                    title="Padding Right"
                                  />
                                  <input
                                    type="text"
                                    value={activeElement.paddingBottom || '40'}
                                    onChange={(e) => updateElementProp('paddingBottom', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-[10.5px] text-slate-700 focus:outline-none focus:border-emerald-500"
                                    title="Padding Bottom"
                                  />
                                  <input
                                    type="text"
                                    value={activeElement.paddingLeft || '40'}
                                    onChange={(e) => updateElementProp('paddingLeft', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-[10.5px] text-slate-700 focus:outline-none focus:border-emerald-500"
                                    title="Padding Left"
                                  />
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-500 font-medium text-[11px] block mb-1.5">Margin</span>
                                <div className="grid grid-cols-4 gap-1">
                                  <input
                                    type="text"
                                    value={activeElement.marginTop || '0'}
                                    onChange={(e) => updateElementProp('marginTop', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-[10.5px] text-slate-700 focus:outline-none focus:border-emerald-500"
                                    title="Margin Top"
                                  />
                                  <input
                                    type="text"
                                    value={activeElement.marginRight || '0'}
                                    onChange={(e) => updateElementProp('marginRight', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-[10.5px] text-slate-700 focus:outline-none focus:border-emerald-500"
                                    title="Margin Right"
                                  />
                                  <input
                                    type="text"
                                    value={activeElement.marginBottom || '0'}
                                    onChange={(e) => updateElementProp('marginBottom', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-[10.5px] text-slate-700 focus:outline-none focus:border-emerald-500"
                                    title="Margin Bottom"
                                  />
                                  <input
                                    type="text"
                                    value={activeElement.marginLeft || '0'}
                                    onChange={(e) => updateElementProp('marginLeft', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-[10.5px] text-slate-700 focus:outline-none focus:border-emerald-500"
                                    title="Margin Left"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Row 7: Opacity */}
                            <div className="px-4 py-2 flex items-center justify-between opacity-60">
                              <span className="text-slate-500 font-medium text-[11px]">Opacity</span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  defaultValue="100"
                                  disabled
                                  title="Opacity: not supported in source editor"
                                  className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-not-allowed accent-slate-400"
                                />
                                <span className="font-mono text-slate-400 font-semibold text-[11px] w-8 text-right">100%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Headline with soft ambient magenta/purple glow behind "business" */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (inspectorActive) setSelectedLayer('text');
                    }}
                    className={`relative cursor-pointer rounded p-1 transition ${
                      selectedLayer === 'text' ? 'ring-2 ring-[#059669]' : ''
                    }`}
                  >
                    {/* Pink/Magenta to Violet Radial Mesh Glow behind 'business' */}
                    <div
                      className="absolute top-0 right-14 w-64 h-24 rounded-full pointer-events-none opacity-80"
                      style={{
                        background: 'radial-gradient(circle, rgba(244, 114, 182, 0.45) 0%, rgba(192, 132, 252, 0.4) 40%, rgba(255, 255, 255, 0) 75%)',
                        filter: 'blur(22px)',
                      }}
                    ></div>

                    {/* Headline Text */}
                    {isInlineEditing && selectedLayer === 'text' ? (
                      <input
                        type="text"
                        autoFocus
                        value={draftText}
                        onChange={(e) => {
                          setDraftText(e.target.value);
                          setElements((prev) => ({
                            ...prev,
                            text: { ...prev.text, text: e.target.value },
                          }));
                        }}
                        onBlur={() => {
                          setIsInlineEditing(false);
                          updateText(draftText);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsInlineEditing(false);
                            updateText(draftText);
                          } else if (e.key === 'Escape') {
                            setIsInlineEditing(false);
                          }
                        }}
                        className="relative font-manrope text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.14] max-w-2xl mx-auto bg-transparent border-b-2 border-emerald-500 text-center focus:outline-none w-full"
                        style={{
                          color: `#${elements.text.textColor}`,
                        }}
                      />
                    ) : (
                      <h1
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inspectorActive) setSelectedLayer('text');
                        }}
                        onDoubleClick={() => setIsInlineEditing(true)}
                        className="relative font-manrope text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.14] max-w-2xl mx-auto cursor-pointer"
                        style={{
                          color: `#${elements.text.textColor}`,
                          fontFamily: elements.text.typeface === 'Manrope' ? 'Manrope, sans-serif' : 'Inter, sans-serif',
                          fontWeight: elements.text.fontWeight === 'Bold' ? 700 : elements.text.fontWeight === 'Extra Bold' ? 800 : 600,
                        }}
                      >
                        {elements.text.text || 'Make room for your best work.'}
                      </h1>
                    )}
                  </div>

                  {/* Subtitle Paragraph */}
                  <p
                    onClick={(e) => {
                      e.stopPropagation();
                      if (inspectorActive) setSelectedLayer('paragraph');
                    }}
                    className={`mt-5 text-[13.5px] max-w-xl mx-auto leading-relaxed cursor-pointer rounded p-1 transition ${
                      selectedLayer === 'paragraph' ? 'ring-2 ring-[#059669]' : ''
                    }`}
                    style={{
                      color: `#${elements.paragraph.textColor}`,
                    }}
                  >
                    {elements.paragraph.text || 'Welcome to the future of business management! Our cutting-edge platform is here to revolutionize the way you run your company.'}
                  </p>

                  {/* CTA Button inside block */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (inspectorActive) setSelectedLayer('button');
                    }}
                    className={`mt-7 inline-block rounded-lg p-0.5 transition cursor-pointer ${
                      selectedLayer === 'button' ? 'ring-2 ring-[#059669]' : ''
                    }`}
                  >
                    <button
                      className="px-6 py-2.5 rounded-lg bg-slate-900 text-white font-medium text-xs shadow-md hover:bg-slate-800 transition"
                      style={{
                        backgroundColor: elements.button.bgFill === 'slate-900' ? '#0F172A' : `#${elements.button.bgFill}`,
                        color: `#${elements.button.textColor}`,
                      }}
                    >
                      {elements.button.text || 'Join the waitlist'}
                    </button>
                  </div>
                </div>

                {/* Social Proof Stack under block */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (inspectorActive) setSelectedLayer('waitlist');
                  }}
                  className={`mt-8 flex flex-col items-center space-y-2.5 cursor-pointer rounded p-2 transition ${
                    selectedLayer === 'waitlist' ? 'ring-2 ring-[#059669]' : ''
                  }`}
                >
                  {/* Overlapping member avatars */}
                  <div className="flex items-center -space-x-2">
                    <img
                      className="h-7 w-7 rounded-full ring-2 ring-white object-cover shadow-xs"
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Member 1"
                    />
                    <img
                      className="h-7 w-7 rounded-full ring-2 ring-white object-cover shadow-xs"
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Member 2"
                    />
                    <img
                      className="h-7 w-7 rounded-full ring-2 ring-white object-cover shadow-xs"
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Member 3"
                    />
                    <img
                      className="h-7 w-7 rounded-full ring-2 ring-white object-cover shadow-xs"
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Member 4"
                    />
                    <img
                      className="h-7 w-7 rounded-full ring-2 ring-white object-cover shadow-xs"
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Member 5"
                    />
                  </div>
                  <span className="text-[11.5px] text-slate-500 font-normal">
                    {elements.waitlist.text || 'Join a waitlist of 1200+ members!'}
                  </span>
                </div>
              </section>

              {/* Bottom empty spacing */}
              <div className="h-6"></div>
            </div>

            {/* Bottom Breadcrumb Bar */}
            <div className="w-full flex items-center justify-between text-[11px] text-slate-500 font-normal mt-4 px-2">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 hover:text-slate-800 cursor-pointer">
                  <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                  </svg>
                  <span>Body</span>
                </div>
                <span className="text-slate-300">›</span>
                <div className="flex items-center space-x-1 text-slate-800 font-medium cursor-pointer">
                  <svg className="w-3 h-3 text-[#059669]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                  </svg>
                  <span>{selectedLayer ? activeElement.name : 'Canvas'}</span>
                </div>
                {selectedLayer && (
                  <>
                    <span className="text-slate-300">›</span>
                    <span className="text-slate-400 font-mono text-[10px]">{activeElement.tag}</span>
                  </>
                )}
              </div>

              {/* Source Mapping Pill */}
              <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{activeElement.filePath}:{activeElement.line}</span>
              </div>
            </div>

            {/* Floating Source Review Bar (Appears when an edit is made) */}
            {pendingEdit && (
              <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center space-x-4 border border-slate-700 animate-slide-up">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <div>
                    <div className="text-xs font-semibold text-emerald-300">Review Source Edit</div>
                    <div className="text-[11px] text-slate-300 font-mono">{pendingEdit.summary}</div>
                  </div>
                </div>

                <div className="h-6 w-[1px] bg-slate-700"></div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={applySourceEdit}
                    disabled={isApplying}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                  >
                    {isApplying ? 'Applying...' : 'Apply to Source'}
                  </button>
                  <button
                    onClick={discardPendingEdit}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

          {/* ======================================================== */}
          {/* RIGHT INSPECTOR PANEL: SlightNudge Visual Editor         */}
          {/* ======================================================== */}
          <aside className="w-[315px] bg-white border-l border-[#E5E7EB] flex flex-col shrink-0 z-20 overflow-hidden shadow-xs">
            {/* Visual Editor Header (Compact 40px SlightNudge SaaS Style) */}
            <div className="h-10 px-3.5 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-[#EFF5F0] text-[#247253] border border-[#E1EBE4] flex items-center justify-center shrink-0">
                  <MousePointer2 size={12} className="text-[#247253]" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-[#26342C] block leading-tight">Visual editor</span>
                </div>
                {selectedLayer && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[85px]">
                    &lt;{activeElement.tag.split('.')[0]}&gt;
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setInspectorActive((prev) => !prev);
                  if (inspectorActive) setSelectedLayer(null);
                }}
                className={`px-2 py-0.5 rounded text-[10.5px] font-medium border transition cursor-pointer ${
                  inspectorActive
                    ? 'border-[#D8E6DC] bg-[#F0F6F1] text-[#35734F]'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {inspectorActive ? 'On' : 'Off'}
              </button>
            </div>

            {/* Inspector Content */}
            {!selectedLayer ? (
              /* DEFAULT UNSELECTED STATE (Image 2 empty state) */
              <div className="flex-1 flex flex-col items-center justify-center p-5 text-center select-none">
                <div className="w-12 h-12 rounded-2xl border border-slate-200/90 bg-[#FAFBFA] flex items-center justify-center text-slate-400 mb-3.5 shadow-2xs">
                  <MousePointer2 size={20} className="text-slate-400" />
                </div>

                <strong className="text-slate-900 font-semibold text-[13px] tracking-tight">
                  Choose something to refine
                </strong>

                <p className="text-slate-500 text-[11px] mt-1.5 max-w-[200px] leading-relaxed">
                  Click any element in the preview to inspect its source and adjust its styles.
                </p>

                <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 mt-6 whitespace-nowrap">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-2xs text-slate-600 text-[10px] font-mono">Esc</kbd>
                  <span className="text-slate-500 text-[11px] font-sans">clear selection</span>
                  <span className="inline-block w-1.5"></span>
                  <div className="flex space-x-0.5">
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded shadow-2xs text-slate-600 text-[10px] font-mono">↑</kbd>
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded shadow-2xs text-slate-600 text-[10px] font-mono">↓</kbd>
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded shadow-2xs text-slate-600 text-[10px] font-mono">←</kbd>
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded shadow-2xs text-slate-600 text-[10px] font-mono">→</kbd>
                  </div>
                  <span className="text-slate-500 text-[11px] font-sans">spacing</span>
                </div>
              </div>
            ) : (
              /* SELECTED ELEMENT STATE (Clean SaaS Design Inspector) */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Pending Edit Review Dock in Inspector (When edit is active) */}
                {pendingEdit && (
                  <div className="p-3 bg-emerald-50/70 border-b border-emerald-100 flex flex-col space-y-2 shrink-0 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-950">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="truncate max-w-[185px]">{pendingEdit.summary}</span>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                        Live on canvas
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 pt-0.5">
                      <button
                        type="button"
                        onClick={applySourceEdit}
                        disabled={isApplying}
                        className="flex-1 h-7 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-semibold flex items-center justify-center space-x-1 shadow-2xs transition cursor-pointer"
                      >
                        <Check size={12} />
                        <span>{isApplying ? 'Applying...' : 'Apply to code'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={discardPendingEdit}
                        className="px-2.5 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition cursor-pointer shadow-2xs"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}

                {/* Top Tabs: Design | Settings (with emerald SaaS active line) */}
                <div className="flex border-b border-[#E5E7EB] px-3 shrink-0 bg-white sticky top-0 z-10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('design')}
                    className={`py-2 px-3 text-xs font-semibold relative transition cursor-pointer ${
                      activeTab === 'design' ? 'text-[#059669]' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Design
                    {activeTab === 'design' && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#059669] rounded-full"></span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`py-2 px-3 text-xs font-medium relative transition cursor-pointer ${
                      activeTab === 'settings' ? 'text-[#059669]' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Settings
                    {activeTab === 'settings' && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#059669] rounded-full"></span>
                    )}
                  </button>
                </div>

                {/* Inspector Content */}
                <div className="flex-1 overflow-y-auto">
                  {activeTab === 'design' ? (
                    <div className="p-3.5 space-y-4 text-xs text-slate-700">

                      {/* ---------------------------------------------------- */}
                      {/* Section: Layout                                      */}
                      {/* ---------------------------------------------------- */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSection('layout')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            {openSections.layout ? (
                              <ChevronDown size={13} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span>Layout</span>
                          </span>
                        </button>

                        {openSections.layout && (
                          <div className="space-y-2 pt-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Display</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.display}
                                  onChange={(e) =>
                                    updateElementProp('display', e.target.value, {
                                      kind: 'style',
                                      prop: 'display',
                                      val: e.target.value.toLowerCase(),
                                    })
                                  }
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-emerald-500/20"
                                >
                                  <option>Block</option>
                                  <option>Flex</option>
                                  <option>Grid</option>
                                  <option>Inline-Block</option>
                                  <option>None</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Size                                        */}
                      {/* ---------------------------------------------------- */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSection('size')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            {openSections.size ? (
                              <ChevronDown size={13} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span>Size</span>
                          </span>
                        </button>

                        {openSections.size && (
                          <div className="space-y-2.5 pt-0.5 text-xs">
                            {/* Width */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Width</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.width}
                                  onChange={(e) => updateElementProp('width', e.target.value)}
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-emerald-500/20"
                                >
                                  <option>Auto</option>
                                  <option>Full</option>
                                  <option>1/2</option>
                                  <option>Fit</option>
                                  <option>Custom</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Height */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Height</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.height}
                                  onChange={(e) => updateElementProp('height', e.target.value)}
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-emerald-500/20"
                                >
                                  <option>Auto</option>
                                  <option>Fit</option>
                                  <option>Full</option>
                                  <option>Custom</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Overflow Segmented Control */}
                            <div className="flex items-center justify-between pt-0.5 opacity-60">
                              <span className="text-slate-500 text-[11px]">Overflow</span>
                              <div className="flex items-center border border-[#E2E8F0] rounded-md overflow-hidden p-0.5 bg-[#F8FAFC]">
                                <button
                                  type="button"
                                  disabled
                                  className="p-1 rounded text-xs transition cursor-not-allowed text-slate-300"
                                  title="Overflow: not supported in source editor"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  className="p-1 rounded text-xs transition cursor-not-allowed text-slate-300"
                                  title="Overflow: not supported in source editor"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  className="p-1 rounded text-xs transition cursor-not-allowed text-slate-300"
                                  title="Overflow: not supported in source editor"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="2" x2="12" y2="22" />
                                    <polyline points="8 6 12 2 16 6" />
                                    <polyline points="8 18 12 22 16 18" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-not-allowed text-slate-300"
                                  title="Overflow: not supported in source editor"
                                >
                                  Auto
                                </button>
                              </div>
                            </div>

                            {/* Object */}
                            <div className="flex items-center justify-between opacity-60">
                              <span className="text-slate-500 text-[11px]">Object</span>
                              <div className="flex items-center space-x-1">
                                <div className="relative w-28">
                                  <select
                                    disabled
                                    title="Object styles: not supported in source editor"
                                    className="w-full bg-slate-50 border border-[#E2E8F0] rounded-md px-2 py-1.5 text-xs text-slate-400 appearance-none focus:outline-none cursor-not-allowed"
                                  >
                                    <option>Fill</option>
                                    <option>Fit</option>
                                    <option>Contain</option>
                                    <option>Cover</option>
                                    <option>None</option>
                                  </select>
                                  <ChevronDown size={11} className="text-slate-300 absolute right-2 top-2.5 pointer-events-none" />
                                </div>
                                <button
                                  type="button"
                                  disabled
                                  className="p-1 rounded text-slate-300 cursor-not-allowed"
                                  title="Object styles: not supported in source editor"
                                >
                                  <MoreHorizontal size={13} />
                                </button>
                              </div>
                            </div>

                            {/* More options button */}
                            <div className="pt-1 flex justify-center opacity-60">
                              <button
                                type="button"
                                disabled
                                title="Dimensions options: not supported in source editor"
                                className="w-full py-1.5 rounded-md border border-[#E2E8F0] bg-slate-50 text-[11px] text-slate-400 font-medium transition text-center shadow-2xs cursor-not-allowed"
                              >
                                More options
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Spacing (The Box Model Diagram)             */}
                      {/* ---------------------------------------------------- */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSection('spacing')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            {openSections.spacing ? (
                              <ChevronDown size={13} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span>Spacing</span>
                          </span>
                        </button>

                        {openSections.spacing && (
                          <div className="pt-1">
                            {/* Outer Box Model Canvas */}
                            <div className="relative bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col items-center">
                              
                              {/* Margin Top */}
                              <input
                                type="text"
                                value={activeElement.marginTop}
                                onChange={(e) => updateElementProp('marginTop', e.target.value)}
                                className="w-10 text-center bg-transparent border-0 p-0 text-slate-500 text-[11px] font-mono focus:ring-0 mb-1 hover:bg-slate-200/50 rounded cursor-text"
                              />

                              <div className="w-full flex items-center justify-between">
                                {/* Margin Left */}
                                <input
                                  type="text"
                                  value={activeElement.marginLeft}
                                  onChange={(e) => updateElementProp('marginLeft', e.target.value)}
                                  className="w-10 text-center bg-transparent border-0 p-0 text-slate-500 text-[11px] font-mono focus:ring-0 hover:bg-slate-200/50 rounded cursor-text"
                                />

                                {/* Inner Padding Dashed Box */}
                                <div className="w-36 bg-white border border-dashed border-[#CBD5E1] rounded-lg p-2.5 relative flex flex-col items-center shadow-2xs">
                                  {/* Padding Top */}
                                  <input
                                    type="text"
                                    value={activeElement.paddingTop}
                                    onChange={(e) =>
                                      updateElementProp('paddingTop', e.target.value, {
                                        kind: 'style',
                                        prop: 'padding',
                                        val: `p-${Math.round(Number(e.target.value) / 4) || 0}`,
                                      })
                                    }
                                    className="w-8 text-center bg-transparent border-0 p-0 text-slate-600 text-[11px] font-mono font-medium focus:ring-0 mb-1 hover:bg-slate-100 rounded cursor-text"
                                  />

                                  <div className="w-full flex items-center justify-between px-1">
                                    {/* Padding Left */}
                                    <input
                                      type="text"
                                      value={activeElement.paddingLeft}
                                      onChange={(e) =>
                                        updateElementProp('paddingLeft', e.target.value, {
                                          kind: 'style',
                                          prop: 'padding',
                                          val: `p-${Math.round(Number(e.target.value) / 4) || 0}`,
                                        })
                                      }
                                      className="w-6 text-center bg-transparent border-0 p-0 text-slate-600 text-[11px] font-mono font-medium focus:ring-0 hover:bg-slate-100 rounded cursor-text"
                                    />

                                    {/* Core Element Square */}
                                    <div className="h-5 w-6 bg-[#E2E8F0] rounded flex items-center justify-center"></div>

                                    {/* Padding Right */}
                                    <input
                                      type="text"
                                      value={activeElement.paddingRight}
                                      onChange={(e) =>
                                        updateElementProp('paddingRight', e.target.value, {
                                          kind: 'style',
                                          prop: 'padding',
                                          val: `p-${Math.round(Number(e.target.value) / 4) || 0}`,
                                        })
                                      }
                                      className="w-6 text-center bg-transparent border-0 p-0 text-slate-600 text-[11px] font-mono font-medium focus:ring-0 hover:bg-slate-100 rounded cursor-text"
                                    />
                                  </div>

                                  {/* Padding Bottom */}
                                  <input
                                    type="text"
                                    value={activeElement.paddingBottom}
                                    onChange={(e) =>
                                      updateElementProp('paddingBottom', e.target.value, {
                                        kind: 'style',
                                        prop: 'padding',
                                        val: `p-${Math.round(Number(e.target.value) / 4) || 0}`,
                                      })
                                    }
                                    className="w-8 text-center bg-transparent border-0 p-0 text-slate-600 text-[11px] font-mono font-medium focus:ring-0 mt-1 hover:bg-slate-100 rounded cursor-text"
                                  />
                                </div>

                                {/* Margin Right */}
                                <input
                                  type="text"
                                  value={activeElement.marginRight}
                                  onChange={(e) => updateElementProp('marginRight', e.target.value)}
                                  className="w-10 text-center bg-transparent border-0 p-0 text-slate-500 text-[11px] font-mono focus:ring-0 hover:bg-slate-200/50 rounded cursor-text"
                                />
                              </div>

                              {/* Margin Bottom */}
                              <input
                                type="text"
                                value={activeElement.marginBottom}
                                onChange={(e) => updateElementProp('marginBottom', e.target.value)}
                                className="w-10 text-center bg-transparent border-0 p-0 text-slate-500 text-[11px] font-mono focus:ring-0 mt-1 hover:bg-slate-200/50 rounded cursor-text"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Text                                        */}
                      {/* ---------------------------------------------------- */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSection('text')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            {openSections.text ? (
                              <ChevronDown size={13} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span>Text</span>
                          </span>
                        </button>

                        {openSections.text && (
                          <div className="space-y-2.5 pt-0.5 text-xs">
                            {/* Typeface */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Typeface</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.typeface}
                                  onChange={(e) =>
                                    updateElementProp('typeface', e.target.value, {
                                      kind: 'style',
                                      prop: 'fontFamily',
                                      val: e.target.value === 'Manrope' ? 'font-sans' : 'font-mono',
                                    })
                                  }
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option>Manrope</option>
                                  <option>Inter</option>
                                  <option>System UI</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Weight */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Weight</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.fontWeight}
                                  onChange={(e) => {
                                    const weightMap: Record<string, string> = {
                                      'Regular': 'font-normal',
                                      'Medium': 'font-medium',
                                      'Semi Bold': 'font-semibold',
                                      'Bold': 'font-bold',
                                      'Extra Bold': 'font-extrabold',
                                    };
                                    updateElementProp('fontWeight', e.target.value, {
                                      kind: 'style',
                                      prop: 'fontWeight',
                                      val: weightMap[e.target.value] || 'font-semibold',
                                    });
                                  }}
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option>Regular</option>
                                  <option>Medium</option>
                                  <option>Semi Bold</option>
                                  <option>Bold</option>
                                  <option>Extra Bold</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Color */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Color</span>
                              <div className="flex items-center space-x-1.5 w-36 bg-white border border-[#E2E8F0] rounded-md px-2 py-1 focus-within:border-[#059669]">
                                <div
                                  className="h-4 w-4 rounded-sm shadow-2xs border border-black/10 shrink-0"
                                  style={{ backgroundColor: `#${activeElement.textColor}` }}
                                ></div>
                                <input
                                  type="text"
                                  value={activeElement.textColor}
                                  onChange={(e) =>
                                    updateElementProp('textColor', e.target.value.replace('#', ''), {
                                      kind: 'style',
                                      prop: 'textColor',
                                      val: `text-[#${e.target.value.replace('#', '')}]`,
                                    })
                                  }
                                  className="w-full bg-transparent p-0 border-none text-[11px] font-mono text-slate-800 focus:ring-0"
                                />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Content</span>
                              <input
                                type="text"
                                value={activeElement.text || ''}
                                onChange={(e) =>
                                  updateElementProp('text', e.target.value, {
                                    kind: 'text',
                                  })
                                }
                                placeholder="Edit text content..."
                                className="w-36 bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#059669]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Background (Collapsible)                    */}
                      {/* ---------------------------------------------------- */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleSection('background')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            {openSections.background ? (
                              <ChevronDown size={13} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span>Background</span>
                          </span>
                        </button>
                        {openSections.background && (
                          <div className="pt-2 text-xs text-slate-500 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Fill</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.bgFill}
                                  onChange={(e) =>
                                    updateElementProp('bgFill', e.target.value, {
                                      kind: 'style',
                                      prop: 'backgroundColor',
                                      val: `bg-${e.target.value}`,
                                    })
                                  }
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option value="transparent">Transparent</option>
                                  <option value="white">White</option>
                                  <option value="slate-50">Slate 50</option>
                                  <option value="slate-900">Slate 900</option>
                                  <option value="emerald-50">Emerald 50</option>
                                </select>
                                <ChevronDown size={11} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Borders (Collapsible)                       */}
                      {/* ---------------------------------------------------- */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleSection('borders')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            {openSections.borders ? (
                              <ChevronDown size={13} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span>Borders</span>
                          </span>
                        </button>
                        {openSections.borders && (
                          <div className="pt-2 text-xs text-slate-500 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Radius</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.borderRadius}
                                  onChange={(e) =>
                                    updateElementProp('borderRadius', e.target.value, {
                                      kind: 'style',
                                      prop: 'borderRadius',
                                      val: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option value="rounded-none">Square (0)</option>
                                  <option value="rounded-sm">Small (2px)</option>
                                  <option value="rounded-md">Medium (6px)</option>
                                  <option value="rounded-lg">Large (8px)</option>
                                  <option value="rounded-xl">Extra Large (12px)</option>
                                  <option value="rounded-full">Pill (Full)</option>
                                </select>
                                <ChevronDown size={11} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Position (Collapsible)                      */}
                      {/* ---------------------------------------------------- */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleSection('position')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            {openSections.position ? (
                              <ChevronDown size={13} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span>Position</span>
                          </span>
                        </button>
                        {openSections.position && (
                          <div className="pt-2 text-xs text-slate-500 space-y-2 opacity-60">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Mode</span>
                              <div className="relative w-36">
                                <select
                                  disabled
                                  value={activeElement.position}
                                  title="Position modes: not supported in source editor"
                                  className="w-full bg-slate-50 border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-400 appearance-none focus:outline-none cursor-not-allowed"
                                >
                                  <option>Relative</option>
                                  <option>Absolute</option>
                                  <option>Fixed</option>
                                  <option>Static</option>
                                </select>
                                <ChevronDown size={11} className="text-slate-300 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* SETTINGS TAB */
                    <div className="p-3.5 space-y-3.5 text-xs text-slate-700">
                      <div className="space-y-1">
                        <div className="text-[11.5px] font-semibold text-slate-900">Element & Workspace Metadata</div>
                        <div className="text-[10.5px] text-slate-500">Connected AST nudger and local source adapter.</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-[10.5px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Tag / Name:</span>
                          <span className="text-slate-900 font-semibold">{activeElement.tag}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Element ID:</span>
                          <span className="text-slate-700 font-mono">{activeElement.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Source File:</span>
                          <span className="text-slate-900 truncate max-w-[130px]">{activeElement.filePath}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Target Line:</span>
                          <span className="text-emerald-700 font-bold">{activeElement.line}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">AST Status:</span>
                          <span className="text-emerald-600 font-semibold">Verified AST Node</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1 text-[11px]">
                        <div className="font-semibold text-slate-800">Element Tailwind Classes</div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-600 break-all leading-relaxed">
                          {activeElement.classes}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link
                          href="/workspace"
                          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-2xs"
                        >
                          <span>Switch Repository / Project</span>
                          <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: Deselect action */}
                <div className="h-10 px-3.5 border-t border-[#F1F5F9] bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedLayer(null)}
                    className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 font-medium px-1.5 py-1 rounded hover:bg-slate-50 transition cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Deselect</span>
                  </button>
                  <span className="text-[10px] text-slate-400 truncate max-w-[155px]" title="Changes require review before they reach source.">
                    Changes require review before source
                  </span>
                </div>
              </div>
            )}
          </aside>

        </div>
      </div>
    </>
  );
}
