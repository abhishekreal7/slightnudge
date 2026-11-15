'use client';
import { readApiJson } from '@/lib/slightnudge/api-response';

import { AppearanceControls } from './AppearanceControls';
import { ConstraintControls } from './ConstraintControls';
import { LeftToolDock, type LeftTool } from './LeftToolDock';
import { RightToolDock, type DockTool } from './RightToolDock';


import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { EditorSurface, type EditorMode } from './EditorSurface';
import { EditorDraftControls, EditorDraftStatus, EditorHistoryControls, EditorViewportControls } from './EditorSessionControls';
import { useWindowDock } from '@/components/slightnudge/useWindowDock';
import { ChangeHistory } from '@/components/slightnudge/ChangeHistory';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { EditorView } from '@/lib/slightnudge/editor-route';
import { SourceProjectCanvas, type SourceCanvasHandle, type SourceSelection } from '@/components/slightnudge/SourceProjectCanvas';
import type { CanvasZoom } from './CanvasStage';
import { SourceLayers } from '@/components/slightnudge/SourceLayers';
import { LayoutControls } from '@/components/slightnudge/LayoutControls';
import { IconControls } from '@/components/slightnudge/IconControls';
import { ComponentProps } from '@/components/slightnudge/ComponentProps';
import { ActionControls } from '@/components/slightnudge/ActionControls';
import { ImageContent } from '@/components/slightnudge/ImageContent';
import { ImageFraming } from '@/components/slightnudge/ImageFraming';
import type { CanvasLayer, CanvasRenderPatch, SerializedTransformFrame } from '@/lib/slightnudge/source-canvas-contract';
import Image from 'next/image';
import reviewStyles from './editor-workspace.module.css';
import type { ChangeSetResult } from '@/lib/slightnudge/client';
import { interactionControls, interactionValue } from '@/lib/slightnudge/interaction-controls';
import type { ResponsiveScope } from '@/lib/slightnudge/tailwind-verifier';
import { resolveResponsiveScopes, sourceClassesMatch } from '@/lib/slightnudge/source-canvas-contract';
import { readStudioRecovery, saveStudioRecovery, clearStudioRecovery, type StudioRecoveryRecord } from '@/lib/slightnudge/studio-recovery';
import { snapWidth, stepWidth, widthFromPointer } from '@/lib/slightnudge/direct-manipulation';
import { readTranslation, snappedMove, type Translation } from '@/lib/slightnudge/translation';
import {
  Code2,
  SlidersHorizontal,
  Hand,
  Scan,
  Layers2,
  FileText,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Check,
  MousePointer2,
  RotateCcw,
  Type,
  ArrowUpDown,
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
  X,
  GripVertical,
  Move,
  Maximize2,
  Sparkles,
  Copy,
  Palette,
  SquareDashed,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  selectionStyleFor,
  computeSelectionChromeGeometry,
  buildRoundedRectPath,
  buildCornerArcPath,
  buildCircleArcPath,
  parseBorderRadius,
  RADIUS_SCALE_STEPS,
  findNearestRadiusStep,
  type SelectionVariant,
  type SelectionChromeStyle,
  type SelectionChromeGeometry,
  type NamedRadiusStep,
} from '@/components/slightnudge/selection-style';
import {
  changeSetAPI,
  previewEditAPI,
  applyEditAPI,
  checkApplyOutcomeAPI,
  discardEditAPI,
  undoEditAPI,
  checkUndoOutcomeAPI,
  inspectElementAPI,
  getClientSessionToken,
  inspectComponentPropsAPI,
  enqueueFileOperation,
  subscribeQueueState,
  cancelPendingFileOperations,
  type QueueNotification,
} from '@/lib/slightnudge/client';
import {
  IDENTITY_MATRIX,
  buildElementToScreenMatrix,
  canvasToScreenMatrix,
  getHandleLocalPoint,
  matMultiply,
  roundValue,
  screenDeltaToElementLocalDelta,
  transformPoint,
  transformRectToQuad,
  vecAdd,
  type CanvasSpace,
  type ElementTransformFrame,
  type Matrix2D,
} from '@/lib/editor/geometry';
import {
  buildArtboardToContainerMatrix,
  buildQuadOutlinePath,
  createDirectSnapSession,
  extractElementTransformChain,
  findSourceElementInDocument,
  hydrateSerializedTransformChain,
  isAffineNonTrivial,
  roundMoveTranslation,
  snapRectInSession,
  snapResizeInSession,
  transformGuideLineToContainer,
  transformQuadByOffset,
  type ContainerRect,
  type DirectSnapSession,
  type GuideLine,
  type HandleDirection,
  type SiblingRect,
} from '@/components/slightnudge/direct-manipulation-engine';

interface ElementMeta {
  instance?: string;
  translation?: Translation;
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
  maxWidth?: string;
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
  previewStyle?: React.CSSProperties;
  stateStyles?: Record<string, React.CSSProperties>;
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
    maxWidth: 'max-w-2xl',
  },
  paragraph: {
    id: '',
    name: 'Subheading Paragraph',
    tag: 'p.subheading',
    filePath: 'fixtures/1-plain-static.tsx',
    line: 8,
    column: 138,
    classes: 'sn-playground-description text-xl max-w-sm',
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
    maxWidth: 'max-w-xl',
  },
  button: {
    id: '',
    name: 'Get started link',
    tag: 'a.cta-btn',
    filePath: 'fixtures/1-plain-static.tsx',
    line: 8,
    column: 512,
    classes: 'sn-playground-primary lg:text-lg',
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
  ownerPath?: string;
  heads?: Record<string, PendingEdit>;
  groupTransactionId?: string;
  renderPatches?: CanvasRenderPatch[];
  sourceTargets?: { before: { line: number; column: number }; after: { line: number; column: number }; tag: string }[];
  draftBase?: Record<string, ElementMeta>;
  editId?: string;
  sourceSelection?: SourceSelection;
  sourceText?: boolean;
  layerKey: string;
  snapshot: { element: ElementMeta; order: string[] };
  id: string;
  summary: string;
  oldValue: string;
  newValue: string;
  oldClassName?: string;
  newClassName?: string;
  filePath: string;
  line: number;
}

interface DraftFrame { elements: Record<string, ElementMeta>; order: string[]; edit: PendingEdit | null }
interface StudioDraft { version: 1; pageId?: string; frames: DraftFrame[]; cursor: number; viewport?: { width: number | null; scope: string; preset: 'desktop' | 'tablet' | 'mobile' } }
const draftStorageKey = 'slightnudge:studio:continuous-draft:v1';
function editPath(edit: PendingEdit) { return edit.ownerPath || edit.snapshot.element.filePath; }
function draftIds(edit: PendingEdit | null) { return Object.fromEntries(Object.entries(draftHeads(edit)).map(([file, head]) => [file, head.id])); }
function draftHeads(edit: PendingEdit | null): Record<string, PendingEdit> { return edit ? edit.heads || { [editPath(edit)]: edit } : {}; }
function draftPatches(edit: PendingEdit | null): CanvasRenderPatch[] { return Object.values(draftHeads(edit)).flatMap(head => head.renderPatches || []); }
function composeDraft(previous: PendingEdit | null, file: string, next: PendingEdit | null): PendingEdit | null {
  const heads = { ...draftHeads(previous) }; if (next) heads[file] = next; else delete heads[file];
  const latest = next || Object.values(heads).at(-1); return latest ? { ...latest, heads, renderPatches: Object.values(heads).flatMap(head => head.renderPatches || []) } : null;
}
function rebaseDraftElements(elements: Record<string, ElementMeta>, edit: PendingEdit) {
  return Object.fromEntries(Object.entries(elements).map(([key, element]) => {
    const head = draftHeads(edit)[element.filePath];
    const mapping = head?.sourceTargets?.find(target => target.before.line === element.line && target.before.column === element.column && target.tag === element.tag.split('.')[0]);
    return [key, mapping ? { ...element, line: mapping.after.line, column: mapping.after.column } : element];
  }));
}

interface StudioRecoveryView {
  edit: PendingEdit;
  elements: Record<string, ElementMeta>;
  order: string[];
  accepted: PendingEdit[];
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  activeBreakpoint: string;
  activeVariant: string;
  viewportWidth?: number | null;
}

function isRecoveryElement(value: unknown): value is ElementMeta {
  if (!value || typeof value !== 'object') return false;
  const element = value as ElementMeta;
  return ['filePath', 'classes', 'tag', 'name', 'id'].every(key => typeof element[key as keyof ElementMeta] === 'string') &&
    Number.isSafeInteger(element.line) && element.line > 0 && Number.isSafeInteger(element.column) && element.column > 0 &&
    (element.text === undefined || typeof element.text === 'string');
}

function sourceKey(selection: SourceSelection) { return selection.key || (selection.elementId ? `${selection.path}#${selection.elementId}` : `${selection.path}:${selection.line}:${selection.column}:${selection.tagName}`); }
function elementFromSource(selection: SourceSelection): ElementMeta {
  const c = selection.computed, tokens = selection.className.split(/\s+/).map(token => token.replace(/^!|!$/g, ''));
  return {
    ...defaultElements.hero, id: selection.elementId || '', name: selection.name || selection.textContent.trim().slice(0, 60) || selection.tagName,
    instance: selection.instance, tag: selection.tagName, filePath: selection.path, line: selection.line, column: selection.column, classes: selection.className, text: selection.textContent,
    display: c.display || '', width: tokens.find(token => /^w-/.test(token)) || '', maxWidth: tokens.find(token => /^max-w-/.test(token)) || '', height: c.height || '',
    fontWeight: c.fontWeight || '', typeface: c.fontFamily || '', textColor: c.color || '', bgFill: tokens.find(token => /^bg-/.test(token))?.slice(3) || c.backgroundColor || '',
    paddingTop: c.paddingTop || '', paddingRight: c.paddingRight || '', paddingBottom: c.paddingBottom || '', paddingLeft: c.paddingLeft || '',
    marginTop: c.marginTop || '', marginRight: c.marginRight || '', marginBottom: c.marginBottom || '', marginLeft: c.marginLeft || '',
    borderRadius: tokens.find(token => /^rounded(?:-|$)/.test(token)) || '',
    previewStyle: { fontSize: c.fontSize, fontWeight: c.fontWeight, fontFamily: c.fontFamily, fontStyle: c.fontStyle, textAlign: c.textAlign as React.CSSProperties['textAlign'], lineHeight: c.lineHeight, letterSpacing: c.letterSpacing, color: c.color, backgroundColor: c.backgroundColor, borderRadius: c.borderRadius },
  };
}

function isRecoveryEdit(value: unknown): value is PendingEdit {
  if (!value || typeof value !== 'object') return false;
  const edit = value as PendingEdit;
  return ['id', 'filePath', 'summary', 'oldValue', 'newValue', 'layerKey'].every(key => typeof edit[key as keyof PendingEdit] === 'string') &&
    Boolean(edit.id && edit.filePath && edit.snapshot) && isRecoveryElement(edit.snapshot.element) &&
    (edit.ownerPath === undefined || typeof edit.ownerPath === 'string' && edit.ownerPath.length > 0 && edit.ownerPath.length <= 1000 && !edit.ownerPath.startsWith('/') && !/^[a-z]:/i.test(edit.ownerPath) && !edit.ownerPath.split('/').includes('..')) &&
    (!edit.groupTransactionId || /^[0-9a-f-]{36}$/i.test(edit.groupTransactionId)) &&
    (!edit.heads || Object.keys(edit.heads).length <= 16 && Object.entries(edit.heads).every(([file, head]) => !head.heads && isRecoveryEdit(head) && editPath(head) === file)) &&
    Array.isArray(edit.snapshot.order) && edit.snapshot.order.every(key => typeof key === 'string') &&
    (!edit.sourceSelection || (typeof edit.sourceSelection.path === 'string' && typeof edit.sourceSelection.className === 'string'));
}

function isStudioDraft(value: unknown): value is StudioDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as StudioDraft;
  return draft.version === 1 && Array.isArray(draft.frames) && draft.frames.length > 0 && draft.frames.length <= 51 && Number.isInteger(draft.cursor) && draft.cursor >= 0 && draft.cursor < draft.frames.length && draft.frames.every(frame => frame && frame.elements && Object.keys(frame.elements).length <= 500 && Object.values(frame.elements).every(isRecoveryElement) && Array.isArray(frame.order) && frame.order.every(key => typeof key === 'string') && (!frame.edit || isRecoveryEdit(frame.edit)));
}

function isRecoveryView(value: unknown, record: StudioRecoveryRecord): value is StudioRecoveryView {
  if (!value || typeof value !== 'object') return false;
  const view = value as StudioRecoveryView;
  return isRecoveryEdit(view.edit) && view.edit.id === record.previewId && view.edit.filePath === record.filePath &&
    (!record.repositoryId || editPath(view.edit) === record.sourcePath) &&
    Boolean(view.elements && typeof view.elements === 'object' && !Array.isArray(view.elements)) && Object.keys(view.elements).length <= 500 &&
    Boolean(view.elements[view.edit.layerKey]) &&
    Object.entries(view.elements).every(([key, element]) => !['__proto__', 'constructor', 'prototype'].includes(key) && isRecoveryElement(element)) &&
    Array.isArray(view.order) && view.order.length <= 20 && view.order.every(key => typeof key === 'string') &&
    Array.isArray(view.accepted) && view.accepted.length <= 20 && view.accepted.every(isRecoveryEdit) &&
    ['desktop', 'tablet', 'mobile'].includes(view.breakpoint) && typeof view.activeBreakpoint === 'string' && typeof view.activeVariant === 'string';
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

/** One editing session implementation; mode controls the workspace presentation. */
export function EditorWorkspace({ mode, unified = false, view = 'full', projectId, initialPanel = null }: { mode: EditorMode; unified?: boolean; view?: EditorView; projectId?: string; initialPanel?: 'layers' | 'inspector' | null }) {
  const windowMode = unified || mode === 'window';
  const sourceWindowMode = unified ? view === 'full' : windowMode;
  const router = useRouter();
  const changeView = (next: EditorView) => { const url = new URL(location.href); url.searchParams.set('view', next); router.replace(url.pathname + url.search, { scroll: false }); };
  const routeParams = useParams<{ repoId?: string }>();
  const repositoryId = projectId ?? routeParams?.repoId;
  const usesDrafts = true;
  const projectDraftStorageKey = repositoryId ? `${draftStorageKey}:${repositoryId}` : draftStorageKey;
  const [windowPanel, setWindowPanel] = useState<'layers' | 'inspector' | null>(initialPanel);
  const [leftDockTool, setLeftDockTool] = useState<LeftTool>(initialPanel === 'layers' ? 'layers' : null);
  const [leftDockVisible, setLeftDockVisible] = useState<boolean>(initialPanel === 'layers');
  const [rightDockTool, setRightDockTool] = useState<DockTool>(initialPanel === 'inspector' ? 'layout' : null);
  const [rightDockVisible, setRightDockVisible] = useState<boolean>(true);
  const [browseMode, setBrowseMode] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState<CanvasZoom>(unified && view === 'full' ? 1 : 'fit');
  useEffect(() => { if (unified) setCanvasZoom(view === 'fit' ? 'fit' : 1); }, [unified, view]);
  const [outlineDrag, setOutlineDrag] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('slightnudge:outline-drag') === '1';
      } catch { }
    }
    return false;
  });
  useEffect(() => {
    try {
      localStorage.setItem('slightnudge:outline-drag', outlineDrag ? '1' : '0');
    } catch { }
  }, [outlineDrag]);
  const [canvasReset, setCanvasReset] = useState(0);
  const [canvasPan, setCanvasPan] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState(288);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const workspaceMenuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      const menu = workspaceMenuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      const menu = workspaceMenuRef.current;
      if (event.key === 'Escape' && menu?.open) { event.preventDefault(); event.stopPropagation(); menu.open = false; menu.querySelector('summary')?.focus(); }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('slightnudge:workspace-layout') || 'null');
      if (saved && Number.isFinite(saved.width)) setInspectorWidth(Math.min(360, Math.max(272, saved.width)));
      if (saved?.collapsed === true) setInspectorCollapsed(true);
    } catch { /* Layout preferences are optional. */ }
    setLayoutReady(true);
  }, []);
  useEffect(() => {
    if (layoutReady) try { localStorage.setItem('slightnudge:workspace-layout', JSON.stringify({ width: inspectorWidth, collapsed: inspectorCollapsed })); } catch { /* Editing works without storage. */ }
  }, [layoutReady, inspectorWidth, inspectorCollapsed]);
  const inspectorResize = useRef<{ x: number; width: number } | null>(null);
  const resizeInspector = (clientX: number) => {
    const gesture = inspectorResize.current;
    if (gesture) setInspectorWidth(Math.max(272, Math.min(360, gesture.width + gesture.x - clientX)));
  };
  const sourceCanvas = useRef<SourceCanvasHandle>(null);
  const sourceSelection = useRef<SourceSelection | null>(null);
  const sourceSelections = useRef<Record<string, SourceSelection>>({});
  const [sourceLayers, setSourceLayers] = useState<CanvasLayer[]>([]);
  const [sourceReady, setSourceReady] = useState(false);
  const [destinationMode, setDestinationMode] = useState(false);
  const destinationSource = useRef<string | null>(null);
  const cancelDestination = () => { destinationSource.current = null; setDestinationMode(false); };
  const needsDraftReplay = useRef(false);

  // Selection State: Default to null (shows Image 2 empty state when nothing is selected)
  const [selectedLayer, setSelectedLayerState] = useState<string | null>(null);
  const [definitionStyleKey, setDefinitionStyleKey] = useState<string | null>(null);
  useEffect(() => { setDefinitionStyleKey(null); }, [selectedLayer]);
  const reviewRef = useRef<PendingEdit | null>(null);
  const operationRef = useRef(true);
  const recoveryRecordRef = useRef<StudioRecoveryRecord | null>(null);
  const [recoveryBooting, setRecoveryBooting] = useState(true);
  const [restoredOperation, setRestoredOperation] = useState<StudioRecoveryRecord | null>(null);
  const [recoveryError, setRecoveryError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recoveryChecking, setRecoveryChecking] = useState(false);
  const recoverySequenceRef = useRef(0);
  const [uncertainApplyId, setUncertainApplyId] = useState<string | null>(null);
  const undoRecoveryRef = useRef<PendingEdit | null>(null);
  const [uncertainUndoId, setUncertainUndoId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const moveControlRef = useRef<HTMLDivElement>(null);
  const appliedSnapshots = useRef<PendingEdit[]>([]);
  const inlineSessionRef = useRef<string | null>(null);
  const inlinePropRef = useRef<{ key: string; property: string; owner?: import('@/lib/slightnudge/component-ownership').ComponentOwner; definition?: { filePath: string; line: number; column: number; instance?: string } } | null>(null);
  const inlineCommittingRef = useRef(false);
  const textInspectionCache = useRef<Partial<Record<string, Promise<{ safe: boolean; prop?: { key: string; property: string; owner?: import('@/lib/slightnudge/component-ownership').ComponentOwner; definition?: { filePath: string; line: number; column: number; instance?: string } }; error?: string }>>>>({});
  const activeInlineInspection = useRef<Promise<{ safe: boolean; prop?: { key: string; property: string; owner?: import('@/lib/slightnudge/component-ownership').ComponentOwner; definition?: { filePath: string; line: number; column: number; instance?: string } }; error?: string }> | null>(null);
  const deferredInlineCommit = useRef<{ key: string; text: string } | null>(null);
  const queuedSelectionRef = useRef<string | null | undefined>(undefined);
  const reviewNotice = repositoryId ? 'Apply or discard the current preview before making another change. Source has not been changed.' : 'Finishing the current edit…';
  const setSelectedLayer = (key: string | null) => {
    if (moveGesture.current) { showToast('Release the Move handle or press Escape to cancel.'); return; }
    if (resizeGesture.current) { showToast('Release the width handle or press Escape to cancel resizing.'); return; }
    if (inlineSessionRef.current && inlineSessionRef.current !== key) {
      queuedSelectionRef.current = key;
      void sourceCanvas.current?.command('finish-text', sourceSelections.current[inlineSessionRef.current]).then(() => {
        if (!operationRef.current && queuedSelectionRef.current !== undefined) { const next = queuedSelectionRef.current; queuedSelectionRef.current = undefined; setSelectedLayer(next); }
      }).catch(() => { });
      return;
    }
    if (operationRef.current && usesDrafts) { queuedSelectionRef.current = key; return; }
    if (operationRef.current || blocksReview() || undoRecoveryRef.current) { showToast(undoRecoveryRef.current ? 'Check Undo status before making another change.' : reviewNotice); return; }
    setSelectedLayerState(key);
    if (key && sourceSelections.current[key]) {
      sourceSelection.current = sourceSelections.current[key];
      void sourceCanvas.current?.command('select', sourceSelection.current).catch(() => { });
    }
  };
  const inspectorActive = true;
  useEffect(() => {
    setMoveOpen(false);
    pendingOverlayResetKeyRef.current = null;
    if (guideVRef.current) guideVRef.current.style.display = 'none';
    if (guideHRef.current) guideHRef.current.style.display = 'none';
    if (cursorTagRef.current) cursorTagRef.current.style.display = 'none';
  }, [selectedLayer]);
  useEffect(() => {
    if (!moveOpen) return;
    const outside = (event: PointerEvent) => { if (!moveControlRef.current?.contains(event.target as Node)) setMoveOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); setMoveOpen(false);
      moveControlRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
  }, [moveOpen]);
  const [sidebarTab, setSidebarTab] = useState<'layers' | 'pages'>('layers');
  const [pages, setPages] = useState<StudioPageItem[]>(defaultPages);
  const [selectedPage, setSelectedPage] = useState<StudioPageItem>(defaultPages.find(page => page.id === 'fixture-1')!);
  const [breakpoint, setBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeBreakpoint, setActiveBreakpoint] = useState<string>('');
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [actualViewportWidth, setActualViewportWidth] = useState(0);
  const viewportChanging = viewportWidth !== null && actualViewportWidth > 0 && viewportWidth !== actualViewportWidth;
  const [initialMediaFontSize, setInitialMediaFontSize] = useState(16);
  const [responsiveScopes, setResponsiveScopes] = useState<ResponsiveScope[]>([]);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [scopeError, setScopeError] = useState('');
  const resolvedResponsiveScopes = resolveResponsiveScopes(responsiveScopes, initialMediaFontSize);
  const [responsivePreferencesReady, setResponsivePreferencesReady] = useState(false);
  const hasResponsivePreferences = useRef(false);
  const responsivePreferenceKey = `slightnudge:responsive:${repositoryId || 'local'}${repositoryId && !windowMode ? ':setup' : ''}`;
  useEffect(() => {
    hasResponsivePreferences.current = false;
    try {
      const saved = JSON.parse(localStorage.getItem(responsivePreferenceKey) || 'null');
      if (saved && (saved.width === null || Number.isInteger(saved.width) && saved.width >= 240 && saved.width <= 3840) && typeof saved.scope === 'string' && (!saved.scope || /^[a-z0-9][a-z0-9-]{0,31}$/i.test(saved.scope))) { hasResponsivePreferences.current = true; setViewportWidth(saved.width); setActiveBreakpoint(usesDrafts ? saved.scope : ''); }
    } catch { /* A malformed preference does not affect source or drafts. */ }
    setResponsivePreferencesReady(true);
  }, [responsivePreferenceKey]);
  useEffect(() => { if (responsivePreferencesReady) try { localStorage.setItem(responsivePreferenceKey, JSON.stringify({ width: viewportWidth, scope: activeBreakpoint })); } catch { /* Preview preferences are optional. */ } }, [viewportWidth, activeBreakpoint, responsivePreferencesReady, responsivePreferenceKey]);
  const [activeVariant, setActiveVariant] = useState<string>(''); // '', 'hover', 'focus-visible'
  const [showInteractions, setShowInteractions] = useState(false);

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
  const editingDefinitionStyles = Boolean(selectedLayer && definitionStyleKey === selectedLayer);
  const previewStyleFor = (element: ElementMeta): React.CSSProperties => ({
    ...element.previewStyle,
    ...(activeVariant ? element.stateStyles?.[activeVariant] : {}),
  });
  const editScope = activeBreakpoint || activeVariant;
  const scopeTokens = (classes: string) => classes.split(/\s+/).filter(token => editScope ? token.startsWith(`${editScope}:`) : !token.includes(':')).map(token => (editScope ? token.slice(editScope.length + 1) : token).replace(/^!|!$/g, ''));
  const responsiveSourcePath = repositoryId && !selectedLayer ? sourceLayers[0]?.path : activeElement.filePath;
  useEffect(() => {
    let cancelled = false; setScopeLoading(true); setScopeError(''); setResponsiveScopes([]);
    if (!sourceReady) return;
    if (!responsiveSourcePath) { setScopeLoading(false); return; }
    void (async () => {
      try {
        const token = await getClientSessionToken();
        const response = await fetch('/api/slightnudge/responsive', { method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ repositoryId, filePath: responsiveSourcePath }) });
        const result = await readApiJson(response); if (!response.ok) throw new Error(result.error || 'Project breakpoints are unavailable.');
        if (!cancelled) setResponsiveScopes(result.breakpoints);
      } catch (error) { if (!cancelled) setScopeError(error instanceof Error ? error.message : 'Project breakpoints are unavailable.'); }
      finally { if (!cancelled) setScopeLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [repositoryId, responsiveSourcePath, sourceReady]);


  // Text Draft & Inline Canvas Editing
  const [draftText, setDraftText] = useState<string>(activeElement.text || '');
  const [preparingInlineText, setPreparingInlineText] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState<boolean>(false);
  const [inlineCommitKey, setInlineCommitKey] = useState<string | null>(null);
  const [operationBusy, setBusy] = useState<boolean>(false);
  const [draftReplaying, setDraftReplaying] = useState(false);
  const draftReplayPromise = useRef<Promise<boolean> | null>(null);
  const busy = operationBusy || draftReplaying;
  const [showQuickActions, setShowQuickActions] = useState<boolean>(false);
  const formattingRef = useRef<HTMLDivElement>(null);
  const formattingMoreRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setShowQuickActions(false); }, [selectedLayer, breakpoint, activeVariant]);
  useEffect(() => {
    if (!showQuickActions) return;
    const firstOption = formattingRef.current?.querySelector<HTMLElement>('[data-formatting-details] select') || formattingRef.current?.querySelector<HTMLElement>('[data-formatting-details] button:not([aria-label="Close formatting options"])');
    firstOption?.focus();
    const outside = (event: PointerEvent) => { if (!formattingRef.current?.contains(event.target as Node)) setShowQuickActions(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); setShowQuickActions(false); formattingMoreRef.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
  }, [showQuickActions]);

  useEffect(() => {
    if (!isInlineEditing && !inlineCommitKey && selectedLayer && elements[selectedLayer]) {
      setDraftText(elements[selectedLayer].text || '');
    }
  }, [selectedLayer, elements, isInlineEditing, inlineCommitKey]);

  // Auto-detect project routes from Next.js filesystem
  const autoDetectPages = useCallback(async (notify = false) => {
    try {
      const res = await fetch('/api/slightnudge/pages');
      if (res.ok) {
        const data = await readApiJson(res);
        if (data.allPages && data.allPages.length > 0) {
          setPages(data.allPages);
          if (notify) {
            showToast(`Auto-detected ${data.allPages.length} routes from Next.js project`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-detect routes:', err);
      showToast(err instanceof Error ? err.message : 'Could not load project routes.');
    }
  }, []);

  const initialPageDiscovery = useRef(false);
  useEffect(() => {
    if (!sourceReady || initialPageDiscovery.current) return;
    initialPageDiscovery.current = true;
    void autoDetectPages(false);
  }, [autoDetectPages, sourceReady]);

  // Pending Source Edits (SaaS Backend Integration)
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [groupProgress, setGroupProgress] = useState<ChangeSetResult | null>(null);
  const [draft, setDraftState] = useState<StudioDraft | null>(null);
  const draftRef = useRef<StudioDraft | null>(null);
  const captureDraftRef = useRef(false);
  const [draftStored, setDraftStored] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saveRequested, setSaveRequested] = useState(false);
  const saveTextRef = useRef<{ key: string; text: string } | null>(null);
  const reviewBlocking = Boolean(!usesDrafts && pendingEdit) || Boolean(uncertainApplyId);
  const blocksReview = () => Boolean(!usesDrafts && reviewRef.current) || Boolean(uncertainApplyId);
  const storeDraft = (value: StudioDraft | null) => {
    if (value) value = { ...value, pageId: selectedPage.id, viewport: { width: viewportWidth, scope: activeBreakpoint, preset: breakpoint } };
    draftRef.current = value; setDraftState(value);
    try {
      if (value) localStorage.setItem(projectDraftStorageKey, JSON.stringify(value));
      else localStorage.removeItem(projectDraftStorageKey);
      setDraftStored(true);
    } catch { setDraftStored(false); }
  };
  useEffect(() => {
    const current = draftRef.current;
    if (recoveryBooting || recoveryChecking || !current) return;
    if (current.viewport?.width === viewportWidth && current.viewport.scope === activeBreakpoint && current.viewport.preset === breakpoint) return;
    storeDraft(current);
  }, [viewportWidth, activeBreakpoint, breakpoint, recoveryBooting, recoveryChecking]);
  useLayoutEffect(() => {
    if (!captureDraftRef.current || busy || !usesDrafts) return;
    captureDraftRef.current = false;
    const previous = draftRef.current;
    if (!previous) return;
    const frames = [...previous.frames.slice(0, previous.cursor + 1), { elements, order: childOrder, edit: pendingEdit }];
    // Keep the original baseline plus the most recent gestures.
    if (frames.length > 51) frames.splice(1, frames.length - 51);
    storeDraft({ version: 1, frames, cursor: frames.length - 1 });
  }, [elements, pendingEdit, busy]);
  const setReview = (edit: PendingEdit | null) => {
    reviewRef.current = edit;
    setPendingEdit(edit);
  };
  const [isApplying, setIsApplying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Child layer ordering on artboard canvas (iOS style direct reordering)
  const [childOrder, setChildOrder] = useState<string[]>(['text', 'paragraph', 'button']);
  const [isDraggingMove, setIsDraggingMove] = useState<boolean>(false);
  const [dragLayerKey, setDragLayerKey] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dropSlotIndex, setDropSlotIndex] = useState<number | null>(null);
  const moveGesture = useRef<{ key: string; pointerId: number; capture: HTMLElement; x: number; y: number; base: Translation; scale: number; bounds: { minX: number; maxX: number; minY: number; maxY: number }; next: Translation; moved: boolean } | null>(null);
  const [liveMove, setLiveMove] = useState<({ key: string } & Translation) | null>(null);
  const [moveArmed, setMoveArmed] = useState(false);
  const moveClickSuppressed = useRef(false);

  // Precision Drag to Resize State
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<'e' | 'w' | 's' | 'se' | 'sw' | 'nw' | 'ne' | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartY, setResizeStartY] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);
  const [resizeStartHeight, setResizeStartHeight] = useState<number>(0);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const suppressResizeClick = useRef(false);
  const resizeGesture = useRef<{ key: string; handle: string; pointerId: number; capture: HTMLElement; x: number; width: number; scale: number; rem: number; nextWidth: number; token: string; moved: boolean } | null>(null);
  const [dimensionTooltip, setDimensionTooltip] = useState<string | null>(null);

  // Save Queue State
  const [saveQueueState, setSaveQueueState] = useState<QueueNotification>({
    status: 'idle',
    isSaving: false,
    activeCount: 0,
    pendingCount: 0,
  });
  useEffect(() => {
    return subscribeQueueState(setSaveQueueState);
  }, []);

  // Direct Manipulation & Overlay Refs (60fps rAF DOM writes)
  const eventShieldRef = useRef<HTMLDivElement | null>(null);
  const cursorTagRef = useRef<HTMLDivElement | null>(null);
  const guideVRef = useRef<HTMLDivElement | null>(null);
  const guideHRef = useRef<HTMLDivElement | null>(null);
  const previousVariantRef = useRef<Record<string, SelectionVariant>>({});
  const aspectLockOverrides = useRef<Record<string, boolean>>({});
  const outlineHaloRef = useRef<Record<string, SVGPathElement | null>>({});
  const outlineAccentRef = useRef<Record<string, SVGPathElement | null>>({});
  const handleButtonRefs = useRef<Record<string, Partial<Record<HandleDirection, HTMLButtonElement | null>>>>({});
  const cornerArcRefs = useRef<
    Record<string, Partial<Record<'nw' | 'ne' | 'se' | 'sw', { halo: SVGPathElement | null; accent: SVGPathElement | null }>>>
  >({});
  const radiusGripRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const radiusGripInsetRef = useRef<Record<string, number>>({});

  const directDragRef = useRef<{
    type: 'resize' | 'move' | 'radius';
    handle?: HandleDirection;
    pointerId: number;
    capture: HTMLElement;
    key: string;
    filePath: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
    baseTranslation: Translation;
    zoom: number;
    siblings: SiblingRect[];
    containerRect?: ContainerRect;
    snapSession?: DirectSnapSession;
    artboardToMain: Matrix2D;
    elementToScreen: Matrix2D;
    elementToArtboard?: Matrix2D;
    wrapperLeft?: number;
    wrapperTop?: number;
    isNonTrivialTransform?: boolean;
    isCircleVariant?: boolean;
    radiusGripInset?: number;
    targetEl: HTMLElement | null;
    initialTargetStyle: string | null;
    outlineOnly?: boolean;
    widthOnlyHeight?: boolean;
    lockedAspect?: boolean;
    initialRadius?: number;
    maxRadius?: number;
    nextRadiusStep?: NamedRadiusStep;
    latestPointer: { x: number; y: number; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey?: boolean };
    rafPending: boolean;
    moved: boolean;
    nextWidth: number;
    nextHeight: number;
    nextLeft: number;
    nextTop: number;
    nextTranslation: Translation;
    token: string;
    lastClassEstimateTime: number;
  } | null>(null);
  const cancelActiveDragRef = useRef<(() => void) | null>(null);
  const windowDock = useWindowDock(windowMode, () => Boolean(directDragRef.current), isResizing || isDraggingMove);

  // Dynamic DOM refs & element bounding dimensions
  const elementRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingOverlayResetKeyRef = useRef<string | null>(null);
  const pendingDirectStyleRef = useRef<Record<string, { targetEl: HTMLElement | null; initialStyle: string | null }>>({});
  const inFlightMoveRef = useRef<Record<string, Translation>>({});
  const [overlayResetTick, setOverlayResetTick] = useState(0);
  const resetOverlayNode = useCallback((key: string | null | undefined, bumpTick = true) => {
    if (!key) return;
    const node = elementRefs.current[key];
    if (node) {
      node.style.width = '100%';
      node.style.height = '100%';
      node.style.transform = '';
    }
    const keyHandles = handleButtonRefs.current[key];
    if (keyHandles) {
      for (const btn of Object.values(keyHandles)) {
        if (!btn) continue;
        btn.style.left = btn.dataset.baseLeft || '';
        btn.style.top = btn.dataset.baseTop || '';
      }
    }
    const gripBtn = radiusGripRef.current[key];
    if (gripBtn) {
      gripBtn.style.left = gripBtn.dataset.baseLeft || '';
      gripBtn.style.top = gripBtn.dataset.baseTop || '';
    }
    if (bumpTick) setOverlayResetTick(tick => tick + 1);
  }, []);
  const restorePendingDirectStyle = useCallback((key: string | null | undefined) => {
    if (!key) return;
    const pending = pendingDirectStyleRef.current[key];
    if (!pending) return;
    delete pendingDirectStyleRef.current[key];
    if (pending.targetEl) {
      if (pending.initialStyle === null) pending.targetEl.removeAttribute('style');
      else pending.targetEl.setAttribute('style', pending.initialStyle);
    }
  }, []);
  const [formattingPosition, setFormattingPosition] = useState<{ left: number; top: number; visible: boolean; menuSide: 'above' | 'below'; menuAlign?: 'left' | 'right' } | null>(null);
  const [elementDimensions, setElementDimensions] = useState<Record<string, { w: number; h: number }>>({
    text: { w: 672, h: 114 },
    paragraph: { w: 576, h: 48 },
    button: { w: 146, h: 40 },
    waitlist: { w: 260, h: 54 },
    hero: { w: 780, h: 360 },
  });

  const receiveSourceLayers = (layers: CanvasLayer[]) => {
    const valid = layers.filter(layer => layer && typeof layer.key === 'string' && typeof layer.path === 'string' && typeof layer.className === 'string' && typeof layer.tagName === 'string' && layer.computed && Number.isSafeInteger(layer.line) && Number.isSafeInteger(layer.column));
    setSourceLayers(valid);
    for (const layer of valid) sourceSelections.current[layer.key] = layer;
    const meaningful = valid.filter(layer => /^(main|section|nav|header|footer|article|aside|h[1-6]|p|a|button|input|img|form)$/.test(layer.tagName) || layer.className.includes('sn-playground-content') || layer.key === selectedLayer);
    setElements(previous => ({ ...previous, ...Object.fromEntries(meaningful.map(layer => [layer.key, { ...elementFromSource(layer), ...(inlineSessionRef.current === layer.key && previous[layer.key] ? { text: previous[layer.key].text } : {}) }])) }));
  };
  const prefetchTextInspection = (selection: SourceSelection) => {
    if (!usesDrafts || !/^(h[1-6]|p|a|button|span|label)$/.test(selection.tagName)) return;
    const key = sourceKey(selection);
    if (textInspectionCache.current[key]) return;
    const stableLocalId = !repositoryId ? selection.elementId : undefined;
    textInspectionCache.current[key] = (async () => {
      try {
        const inspection = await inspectElementAPI({ repositoryId, filePath: selection.path, line: selection.line, column: selection.column, elementId: stableLocalId, tagName: selection.tagName });
        const exactLocation = Boolean(stableLocalId) || (inspection.line === selection.line && inspection.column === selection.column);
        if (!inspection.found || inspection.tagName !== selection.tagName || !exactLocation) {
          return { safe: false, error: inspection.textReason || inspection.reason || 'This text is generated by the project and cannot be edited directly. Nothing was changed.' };
        }
        if (!inspection.textEditable || (selection.instance && definitionStyleKey !== key)) {
          if (activeBreakpoint || activeVariant) {
            return { safe: false, error: 'Choose All sizes and Default to edit component text.' };
          }
          const info = await inspectComponentPropsAPI({ repositoryId, filePath: selection.path, line: selection.line, column: selection.column, elementId: stableLocalId, instance: selection.instance, tagName: selection.tagName, parentPreviewId: draftHeads(reviewRef.current)[selection.path]?.id, drafts: draftIds(reviewRef.current) });
          const field = info.fields.find(f => f.type === 'text' && (!f.target || f.target === 'text'));
          if (!field) {
            return { safe: false, error: info.reason || inspection.textReason || 'This text is controlled by its source provider.' };
          }
          if (field.value !== selection.textContent) {
            return { safe: false, error: 'Rendered text differs from its prop. Let the page settle or edit its provider in source.' };
          }
          return {
            safe: true,
            prop: { key, property: field.name, owner: info.owner, ...(info.owner ? { definition: { filePath: selection.path, line: selection.line, column: selection.column, instance: selection.instance } } : {}) }
          };
        }
        return { safe: true };
      } catch (err) {
        return { safe: false, error: err instanceof Error ? err.message : 'The text source could not be inspected.' };
      }
    })();
  };
  const receiveSourceSelection = (selection: SourceSelection) => {
    const key = sourceKey(selection); sourceSelections.current[key] = selection;
    setElements(previous => ({ ...previous, [key]: elementFromSource(selection) }));
    if (operationRef.current || draftReplayPromise.current) { if (usesDrafts) queuedSelectionRef.current = key; return; }
    if (blocksReview() || undoRecoveryRef.current) return;
    sourceSelection.current = selection; setSelectedLayerState(key); setActiveVariant('');
    prefetchTextInspection(selection);
  };
  const receiveSourceGeometry = (selection: SourceSelection) => {
    const key = sourceKey(selection); sourceSelections.current[key] = selection;
    if (selectedLayer === key) sourceSelection.current = selection;
    const newW = Math.round(selection.rect.width);
    const newH = Math.round(selection.rect.height);
    setElementDimensions(previous => {
      const prev = previous[key];
      if (prev && prev.w === newW && prev.h === newH) return previous;
      return { ...previous, [key]: { w: newW, h: newH } };
    });
    if (pendingOverlayResetKeyRef.current === key) {
      setOverlayResetTick(tick => tick + 1);
    }
  };
  useLayoutEffect(() => {
    if (pendingOverlayResetKeyRef.current && pendingOverlayResetKeyRef.current === selectedLayer) {
      const key = pendingOverlayResetKeyRef.current;
      pendingOverlayResetKeyRef.current = null;
      resetOverlayNode(key, false);
    }
  }, [elementDimensions, overlayResetTick, selectedLayer, resetOverlayNode]);
  const replaySourceDraft = (edit: PendingEdit | null): Promise<boolean> => {
    if (!sourceReady) { needsDraftReplay.current = true; return Promise.resolve(false); }
    if (draftReplayPromise.current) return draftReplayPromise.current;
    setDraftReplaying(true);
    const replay = (async () => {
      try {
        const patches: CanvasRenderPatch[] = [];
        for (const head of Object.values(draftHeads(edit))) {
          const token = await getClientSessionToken();
          const response = await fetch('/api/slightnudge/draft-view', { signal: AbortSignal.timeout(30000), method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ previewId: head.id, filePath: head.filePath, repositoryId, sourcePath: editPath(head) }) });
          const result = await readApiJson(response); if (!response.ok) throw new Error(result.error); patches.push(...result.renderPatches);
        }
        await sourceCanvas.current?.command('restore', null, { patches }); needsDraftReplay.current = false; return true;
      } catch (error) { showToast(error instanceof Error ? error.message : 'The draft could not be rendered.'); return false; }
      finally { draftReplayPromise.current = null; setDraftReplaying(false); }
    })();
    draftReplayPromise.current = replay;
    return replay;
  };
  useEffect(() => {
    if (!sourceReady || recoveryBooting || recoveryChecking || operationBusy || isApplying || !needsDraftReplay.current) return;
    if (!draftRef.current) { needsDraftReplay.current = false; return; }
    void replaySourceDraft(reviewRef.current);
  }, [sourceReady, recoveryBooting, recoveryChecking, operationBusy, isApplying]);
  useEffect(() => {
    if (!usesDrafts || busy || isApplying || operationRef.current || inlineSessionRef.current || inlineCommittingRef.current || deferredInlineCommit.current || queuedSelectionRef.current === undefined) return;
    const key = queuedSelectionRef.current; queuedSelectionRef.current = undefined;
    setSelectedLayerState(key);
    if (key && sourceSelections.current[key]) {
      sourceSelection.current = sourceSelections.current[key];
      void sourceCanvas.current?.command('select', sourceSelections.current[key]).catch(() => setSelectedLayerState(null));
    }
  }, [busy, isApplying, repositoryId]);

  // Keep dimensions up-to-date
  useEffect(() => {
    const nextDims: Record<string, { w: number; h: number }> = {};
    for (const key of Object.keys(elementRefs.current)) {
      const el = elementRefs.current[key];
      if (el) {
        nextDims[key] = {
          w: Math.round(el.offsetWidth),
          h: Math.round(el.offsetHeight),
        };
      }
    }
    setElementDimensions((prev) => ({ ...prev, ...nextDims }));
  }, [selectedLayer, elements, childOrder]);

  useLayoutEffect(() => {
    if (!selectedLayer || liveMove || isResizing || isDraggingMove) {
      setFormattingPosition(null);
      return;
    }

    let animation = 0;
    let observer: ResizeObserver | null = null;
    let observedNode: HTMLElement | null = null;
    let observedToolbar: HTMLElement | null = null;
    let iframeWin: Window | null = null;
    let retries = 0;

    const update = () => {
      const node = elementRefs.current[selectedLayer] || document.querySelector<HTMLElement>('[aria-label="Selected source element"]');
      const toolbar = formattingRef.current || document.querySelector<HTMLElement>('[role="toolbar"][aria-label="Selection formatting"]');
      const canvas = node?.closest('main') || document.querySelector<HTMLElement>('main[data-editor-canvas]');

      if (!node || !toolbar || !canvas) {
        if (retries++ < 12) {
          animation = requestAnimationFrame(update);
        }
        return;
      }

      const selection = node.getBoundingClientRect();
      if (selection.width === 0 && selection.height === 0) {
        if (retries++ < 12) {
          animation = requestAnimationFrame(update);
        }
        return;
      }
      retries = 0;

      if (!observer) {
        observer = new ResizeObserver(() => {
          cancelAnimationFrame(animation);
          animation = requestAnimationFrame(update);
        });
        observer.observe(canvas);
      }
      if (node !== observedNode) {
        if (observedNode) observer.unobserve(observedNode);
        observer.observe(node);
        observedNode = node;
      }
      if (toolbar !== observedToolbar) {
        if (observedToolbar) observer.unobserve(observedToolbar);
        observer.observe(toolbar);
        observedToolbar = toolbar;
      }

      const frame = canvas.getBoundingClientRect();
      const width = toolbar.offsetWidth || 284;
      const height = toolbar.offsetHeight || 33;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      // Absolute safe boundaries: the toolbar must NEVER clip outside viewport or docks/panels
      let safeTop = 14;
      const headerEl = document.querySelector('header');
      if (headerEl) {
        const hRect = headerEl.getBoundingClientRect();
        if (hRect.bottom > 0 && hRect.top < viewportH * 0.3) {
          safeTop = Math.max(safeTop, Math.round(hRect.bottom) + 8);
        }
      }
      if (frame.top > safeTop && frame.top < viewportH * 0.3) {
        safeTop = Math.max(safeTop, Math.round(frame.top) + 8);
      }

      let safeBottom = viewportH - 14;
      // Bottom dock check: ONLY apply if an element is actually docked at the bottom half of the screen
      const bottomDockEl = document.querySelector('[data-dock-position="bottom"], [data-editor-dock="bottom"]');
      if (bottomDockEl) {
        const bRect = bottomDockEl.getBoundingClientRect();
        if (bRect.top > viewportH * 0.5 && bRect.top < viewportH) {
          safeBottom = Math.min(safeBottom, Math.round(bRect.top) - 10);
        }
      }
      if (frame.bottom < safeBottom && frame.bottom > viewportH * 0.7) {
        safeBottom = Math.min(safeBottom, Math.round(frame.bottom) - 8);
      }

      let safeLeft = 14;
      let safeRight = viewportW - 14;
      for (const panel of document.querySelectorAll('[data-editor-rail], [data-editor-panel]')) {
        const pRect = panel.getBoundingClientRect();
        if (pRect.width > 0 && pRect.height > 0) {
          if (pRect.left < viewportW * 0.4) {
            safeLeft = Math.max(safeLeft, Math.round(pRect.right) + 12);
          } else if (pRect.right > viewportW * 0.6) {
            safeRight = Math.min(safeRight, Math.round(pRect.left) - 12);
          }
        }
      }
      if (frame.left > safeLeft && frame.left < viewportW * 0.5) {
        safeLeft = Math.max(safeLeft, Math.round(frame.left) + 8);
      }
      if (frame.right < safeRight && frame.right > viewportW * 0.5) {
        safeRight = Math.min(safeRight, Math.round(frame.right) - 8);
      }

      // Hard clamp bounds to guarantee window boundaries are strictly respected under all screen sizes & panel states
      safeLeft = Math.max(14, Math.min(safeLeft, viewportW - width - 14));
      safeRight = Math.min(viewportW - 14, Math.max(safeRight, safeLeft + width));
      safeTop = Math.max(14, Math.min(safeTop, viewportH - height - 14));
      safeBottom = Math.max(safeTop + height + 10, Math.min(viewportH - 14, safeBottom));

      const bounds = { left: safeLeft, right: safeRight, top: safeTop, bottom: safeBottom };

      const visible = selection.bottom > bounds.top && selection.top < bounds.bottom && selection.right > bounds.left && selection.left < bounds.right;
      const clampLeft = (left: number) => Math.max(bounds.left, Math.min(left, bounds.right - width));
      const clampTop = (top: number) => Math.max(bounds.top, Math.min(top, bounds.bottom - height));

      const move = node.querySelector('[aria-label="Move element"]')?.getBoundingClientRect() || document.querySelector('.moveAnchor')?.getBoundingClientRect() || null;
      const overlap = (left: number, top: number, rect: DOMRect) =>
        Math.max(0, Math.min(left + width, rect.right) - Math.max(left, rect.left)) *
        Math.max(0, Math.min(top + height, rect.bottom) - Math.max(top, rect.top));

      const isActionEl = ['button', 'a'].includes((elements[selectedLayer]?.tag || '').toLowerCase());
      const clearAboveTop = selection.top - height - 8;
      const clearBelowTop = selection.bottom + 8;

      const rawCandidates: [number, number][] = [];
      if (isActionEl) {
        const hasSpaceBelow = clearBelowTop + height <= bounds.bottom;
        const hasSpaceAbove = clearAboveTop >= bounds.top;
        if (hasSpaceBelow) {
          rawCandidates.push(
            [selection.left + (selection.width - width) / 2, clearBelowTop],
            [selection.left, clearBelowTop],
            [selection.right - width, clearBelowTop]
          );
          if (hasSpaceAbove) {
            rawCandidates.push(
              [selection.left + (selection.width - width) / 2, clearAboveTop],
              [selection.left, clearAboveTop]
            );
          }
        } else if (hasSpaceAbove) {
          rawCandidates.push(
            [selection.left + (selection.width - width) / 2, clearAboveTop],
            [selection.left, clearAboveTop],
            [selection.right - width, clearAboveTop]
          );
        } else {
          rawCandidates.push(
            [selection.left + (selection.width - width) / 2, bounds.top + 8],
            [selection.left, bounds.top + 8]
          );
        }
      } else {
        // Text elements (h1-h6, p, span, etc.):
        // Standard studio behavior (Figma, Framer, Docs):
        // 1. Prefer ABOVE the text layer when space allows (clearing the top move handle).
        // 2. If scrolled near the top edge and space above is insufficient, cleanly place BELOW.
        const hasSpaceAbove = clearAboveTop >= bounds.top;
        const hasSpaceBelow = clearBelowTop + height <= bounds.bottom;
        const aboveMoveTop = move ? move.top - height - 8 : clearAboveTop;

        if (hasSpaceAbove) {
          rawCandidates.push(
            [selection.left, clearAboveTop],
            [selection.left, aboveMoveTop],
            [selection.left + (selection.width - width) / 2, aboveMoveTop],
            [selection.right - width, clearAboveTop]
          );
        } else if (hasSpaceBelow) {
          // Scrolled right against the top of the canvas: place below to avoid clipping/overlapping header
          rawCandidates.push(
            [selection.left, clearBelowTop],
            [selection.left + (selection.width - width) / 2, clearBelowTop],
            [selection.right - width, clearBelowTop]
          );
        } else {
          // Tall block covering viewport: pin inside safely
          rawCandidates.push(
            [selection.left, bounds.top + 8],
            [selection.left + (selection.width - width) / 2, bounds.top + 8]
          );
        }
      }

      const candidates = rawCandidates.map(([x, y], index) => {
        const left = clampLeft(x), top = clampTop(y);
        const selOverlap = isActionEl ? overlap(left, top, selection) : 0;
        const moveOverlap = move ? overlap(left, top, move) : 0;
        const score = selOverlap * 50
          + moveOverlap * 60
          + (Math.abs(left - x) + Math.abs(top - y)) * 10
          + index;
        return { left, top, score };
      });

      const best = candidates.reduce((a, b) => a.score <= b.score ? a : b);
      const menu = toolbar.querySelector<HTMLElement>('[data-formatting-details]');
      const menuW = menu?.offsetWidth || 276;
      const menuH = menu?.offsetHeight || 220;
      const menuSide: 'above' | 'below' =
        best.top + height + 8 + menuH > bounds.bottom && best.top - menuH - 8 >= bounds.top
          ? 'above'
          : 'below';
      const menuAlign: 'left' | 'right' =
        best.left + width - menuW < bounds.left
          ? 'left'
          : 'right';

      setFormattingPosition(previous =>
        previous &&
          previous.left === best.left &&
          previous.top === best.top &&
          previous.visible === visible &&
          previous.menuSide === menuSide &&
          previous.menuAlign === menuAlign
          ? previous
          : { left: best.left, top: best.top, visible, menuSide, menuAlign }
      );
    };

    const schedule = () => { cancelAnimationFrame(animation); animation = requestAnimationFrame(update); };
    update();

    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const canvas = document.querySelector('main[data-editor-canvas]');
    if (canvas) canvas.addEventListener('scroll', schedule, { passive: true });

    const iframeEl = document.querySelector('iframe');
    try {
      iframeWin = iframeEl?.contentWindow || null;
      if (iframeWin) iframeWin.addEventListener('scroll', schedule, { passive: true });
    } catch { }

    return () => {
      cancelAnimationFrame(animation);
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      if (canvas) canvas.removeEventListener('scroll', schedule);
      if (iframeWin) {
        try { iframeWin.removeEventListener('scroll', schedule); } catch { }
      }
    };
  }, [selectedLayer, repositoryId, elements, breakpoint, showQuickActions, liveMove, isResizing, isDraggingMove, childOrder, elementDimensions, sourceLayers, sourceSelection.current?.rect?.left, sourceSelection.current?.rect?.top, windowMode, windowPanel, windowDock.position, definitionStyleKey]);

  const resolveStageScale = (layerKey?: string): number => {
    if (typeof canvasZoom === 'number' && Number.isFinite(canvasZoom) && canvasZoom > 0) {
      return canvasZoom;
    }
    const iframeEl = sourceCanvas.current?.getFrame?.();
    if (iframeEl && iframeEl.clientWidth > 0) {
      const boxW = iframeEl.getBoundingClientRect().width;
      if (boxW > 0 && Number.isFinite(boxW)) return boxW / iframeEl.clientWidth;
    }
    const host = layerKey ? elementRefs.current[layerKey]?.closest('[data-zoom]') : null;
    const attrZoom = host ? Number(host.getAttribute('data-zoom')) : NaN;
    return Number.isFinite(attrZoom) && attrZoom > 0 ? attrZoom : 1;
  };

  const collectSiblingSnapRects = (excludeKey: string): SiblingRect[] => {
    const siblings: SiblingRect[] = [];
    if (!sourceLayers || sourceLayers.length === 0) return siblings;
    for (const layer of sourceLayers) {
      if (layer.key !== excludeKey && layer.rect) {
        siblings.push({
          left: layer.rect.left,
          top: layer.rect.top,
          right: layer.rect.left + layer.rect.width,
          bottom: layer.rect.top + layer.rect.height,
          width: layer.rect.width,
          height: layer.rect.height,
          centerX: layer.rect.left + layer.rect.width / 2,
          centerY: layer.rect.top + layer.rect.height / 2,
        });
      }
    }
    return siblings;
  };

  const captureGestureMatrices = (
    layerKey: string,
    targetEl: HTMLElement | null,
    scale: number,
    serializedChain?: readonly SerializedTransformFrame[]
  ): {
    artboardToMain: Matrix2D;
    stageToScreen: Matrix2D;
    elementToScreen: Matrix2D;
    elementToArtboard: Matrix2D;
    chain: ElementTransformFrame[];
  } => {
    const stageToScreen = canvasToScreenMatrix({ originX: 0, originY: 0, panX: 0, panY: 0, zoom: scale });
    const iframeEl = sourceCanvas.current?.getFrame?.();
    const mainEl = elementRefs.current[layerKey]?.closest('[data-editor-canvas]') as HTMLElement | null;
    let artboardToMain = IDENTITY_MATRIX;
    if (iframeEl && mainEl) {
      const iframeBox = iframeEl.getBoundingClientRect();
      const mainBox = mainEl.getBoundingClientRect();
      artboardToMain = buildArtboardToContainerMatrix(
        iframeBox.left,
        iframeBox.top,
        mainBox.left,
        mainBox.top,
        mainEl.clientLeft,
        mainEl.clientTop,
        mainEl.scrollLeft,
        mainEl.scrollTop,
        scale
      );
    }
    let elementToArtboard = IDENTITY_MATRIX;
    let linearLocal = IDENTITY_MATRIX;
    let chain: ElementTransformFrame[] = [];
    try {
      chain = targetEl
        ? extractElementTransformChain(targetEl)
        : hydrateSerializedTransformChain(serializedChain);
      if (chain.length > 0) {
        const artboardSpace: CanvasSpace = { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1 };
        elementToArtboard = buildElementToScreenMatrix(chain, artboardSpace);
        linearLocal = [
          elementToArtboard[0],
          elementToArtboard[1],
          elementToArtboard[2],
          elementToArtboard[3],
          0,
          0,
        ];
      }
    } catch { }
    const elementToScreen = matMultiply(stageToScreen, linearLocal);
    return { artboardToMain, stageToScreen, elementToScreen, elementToArtboard, chain };
  };

  // Position movement preserves document flow and never reorders siblings.
  const startDragMove = (layerKey: string, e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    if (e.button !== 0 || blocksReview() || undoRecoveryRef.current || directDragRef.current) return;
    if (!usesDrafts || !/^(h[1-6]|p|section|div|article|aside|header|footer|nav|main|a|button|img)$/.test(elements[layerKey]?.tag || '') || activeVariant || activeBreakpoint) {
      showToast('To move an element, choose All sizes and the Default state.');
      return;
    }
    const node = elementRefs.current[layerKey];
    const frame = node?.closest('[data-selection-artboard]');
    if (!node || !frame) return;

    try {
      const base = inFlightMoveRef.current[layerKey] ?? readTranslation(elements[layerKey].classes);
      const targetElem = elements[layerKey] || activeElement;
      const actualSelection = sourceSelections.current[layerKey] || sourceSelection.current;
      const zoom = resolveStageScale(layerKey);

      // Check same-origin iframe target element
      const iframeDoc = sourceCanvas.current?.getDocument?.();
      const targetEl = findSourceElementInDocument(iframeDoc, actualSelection);
      const initialTargetStyle =
        pendingDirectStyleRef.current[layerKey]?.initialStyle ?? (targetEl?.getAttribute('style') || null);

      const siblings = collectSiblingSnapRects(layerKey);
      const snapSession = createDirectSnapSession(siblings);
      const { artboardToMain, stageToScreen } = captureGestureMatrices(layerKey, targetEl, zoom, actualSelection?.transformChain);

      e.preventDefault();
      try {
        e.currentTarget.focus({ preventScroll: true });
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch { }

      moveClickSuppressed.current = false;
      setMoveArmed(true);
      setIsDraggingMove(true);
      if (typeof window !== 'undefined') (window as any).__slightnudge_gesture_active = true;

      if (eventShieldRef.current) {
        eventShieldRef.current.style.display = 'block';
        eventShieldRef.current.style.cursor = 'move';
      }

      directDragRef.current = {
        type: 'move',
        pointerId: e.pointerId,
        capture: e.currentTarget as HTMLElement,
        key: layerKey,
        filePath: targetElem.filePath,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: actualSelection?.rect?.left || 0,
        startTop: actualSelection?.rect?.top || 0,
        startWidth: node.offsetWidth,
        startHeight: node.offsetHeight,
        baseTranslation: base,
        zoom,
        siblings,
        snapSession,
        artboardToMain,
        elementToScreen: stageToScreen,
        targetEl,
        initialTargetStyle,
        outlineOnly: outlineDrag,
        latestPointer: { x: e.clientX, y: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey || e.metaKey, metaKey: e.metaKey },
        rafPending: false,
        moved: false,
        nextWidth: node.offsetWidth,
        nextHeight: node.offsetHeight,
        nextLeft: actualSelection?.rect?.left || 0,
        nextTop: actualSelection?.rect?.top || 0,
        nextTranslation: base,
        token: '',
        lastClassEstimateTime: 0,
      };
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'This element cannot be moved safely.');
    }
  };

  // Direct 60fps 8-Handle Resize
  const startResize = (handle: HandleDirection, e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (blocksReview() || undoRecoveryRef.current || directDragRef.current) return;
    if (e.button !== 0) return;

    const key = selectedLayer || 'text';
    const renderedElement = elements[key] || activeElement;
    const targetElem = renderedElement;
    const actualSelection = sourceSelections.current[key] || sourceSelection.current;

    const zoom = resolveStageScale(key);
    const wrapperLeft = actualSelection?.rect?.left || 0;
    const wrapperTop = actualSelection?.rect?.top || 0;

    // Check same-origin iframe target element
    const iframeDoc = sourceCanvas.current?.getDocument?.();
    const targetEl = findSourceElementInDocument(iframeDoc, actualSelection);
    const initialTargetStyle =
      pendingDirectStyleRef.current[key]?.initialStyle ?? (targetEl?.getAttribute('style') || null);

    const siblings = collectSiblingSnapRects(key);
    const snapSession = createDirectSnapSession(siblings);
    const { artboardToMain, elementToScreen, elementToArtboard, chain } = captureGestureMatrices(
      key,
      targetEl,
      zoom,
      actualSelection?.transformChain
    );
    const localFrame = chain.length > 0 ? chain[chain.length - 1] : null;
    const isNonTrivialTransform = isAffineNonTrivial(elementToArtboard);
    const elRect = targetEl?.getBoundingClientRect();
    const currentW =
      (isNonTrivialTransform
        ? targetEl
          ? targetEl.offsetWidth
          : localFrame?.width
        : elRect ? elRect.width : elementRefs.current[key]?.offsetWidth) ||
      actualSelection?.rect?.width ||
      672;
    const currentH =
      (isNonTrivialTransform
        ? targetEl
          ? targetEl.offsetHeight
          : localFrame?.height
        : elRect ? elRect.height : elementRefs.current[key]?.offsetHeight) ||
      actualSelection?.rect?.height ||
      114;
    const startLeft = isNonTrivialTransform ? 0 : (elRect ? elRect.left : wrapperLeft);
    const startTop = isNonTrivialTransform ? 0 : (elRect ? elRect.top : wrapperTop);

    try {
      e.currentTarget.focus({ preventScroll: true });
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { }

    if (eventShieldRef.current) {
      eventShieldRef.current.style.display = 'block';
      eventShieldRef.current.style.cursor = getComputedStyle(e.currentTarget).cursor;
    }

    setIsResizing(true);
    setResizeHandle(handle as any);
    setResizeStartX(e.clientX);
    setResizeStartY(e.clientY);
    setResizeStartWidth(currentW);
    setResizeStartHeight(currentH);
    if (typeof window !== 'undefined') (window as any).__slightnudge_gesture_active = true;

    directDragRef.current = {
      type: 'resize',
      handle,
      pointerId: e.pointerId,
      capture: e.currentTarget as HTMLElement,
      key,
      filePath: targetElem.filePath,
      startX: e.clientX,
      startY: e.clientY,
      startLeft,
      startTop,
      startWidth: currentW,
      startHeight: currentH,
      baseTranslation: { x: 0, y: 0 },
      zoom,
      siblings,
      snapSession,
      artboardToMain,
      elementToScreen,
      elementToArtboard,
      wrapperLeft,
      wrapperTop,
      isNonTrivialTransform,
      isCircleVariant: previousVariantRef.current[key] === 'circle',
      radiusGripInset: radiusGripInsetRef.current[key],
      targetEl,
      initialTargetStyle,
      outlineOnly: outlineDrag,
      widthOnlyHeight: !isNonTrivialTransform && !/^(img|video|svg|canvas)$/i.test(renderedElement.tag || actualSelection?.tagName || ''),
      lockedAspect: aspectLockOverrides.current[key] ?? /^(img|video|svg|canvas)$/i.test(renderedElement.tag || actualSelection?.tagName || ''),
      latestPointer: { x: e.clientX, y: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey || e.metaKey, metaKey: e.metaKey },
      rafPending: false,
      moved: false,
      nextWidth: currentW,
      nextHeight: currentH,
      nextLeft: startLeft,
      nextTop: startTop,
      nextTranslation: { x: 0, y: 0 },
      token: '',
      lastClassEstimateTime: 0,
    };
  };

  // Direct 60fps Corner Radius Dragging
  const startRadiusDrag = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (blocksReview() || undoRecoveryRef.current || directDragRef.current) return;
    if (e.button !== 0) return;

    const key = selectedLayer || 'text';
    const renderedElement = elements[key] || activeElement;
    const targetElem = renderedElement;
    const actualSelection = sourceSelections.current[key] || sourceSelection.current;

    const zoom = resolveStageScale(key);
    const currentW = elementRefs.current[key]?.offsetWidth || actualSelection?.rect?.width || 200;
    const currentH = elementRefs.current[key]?.offsetHeight || actualSelection?.rect?.height || 100;
    const startLeft = actualSelection?.rect?.left || 0;
    const startTop = actualSelection?.rect?.top || 0;

    const iframeDoc = sourceCanvas.current?.getDocument?.();
    const targetEl = findSourceElementInDocument(iframeDoc, actualSelection);

    const initialTargetStyle =
      pendingDirectStyleRef.current[key]?.initialStyle ?? (targetEl?.getAttribute('style') || null);
    const parsedRadii = parseBorderRadius(renderedElement.borderRadius || actualSelection?.computed?.borderRadius, currentW, currentH);
    const initialR = Math.max(parsedRadii.tl, parsedRadii.tr, parsedRadii.br, parsedRadii.bl);
    const maxRadius = Math.min(currentW, currentH) / 2;

    try {
      e.currentTarget.focus({ preventScroll: true });
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { }

    if (eventShieldRef.current) {
      eventShieldRef.current.style.display = 'block';
      eventShieldRef.current.style.cursor = 'crosshair';
    }
    if (typeof window !== 'undefined') (window as any).__slightnudge_gesture_active = true;

    directDragRef.current = {
      type: 'radius',
      pointerId: e.pointerId,
      capture: e.currentTarget as HTMLElement,
      key,
      filePath: targetElem.filePath,
      startX: e.clientX,
      startY: e.clientY,
      startLeft,
      startTop,
      startWidth: currentW,
      startHeight: currentH,
      baseTranslation: { x: 0, y: 0 },
      zoom,
      siblings: [],
      artboardToMain: IDENTITY_MATRIX,
      elementToScreen: IDENTITY_MATRIX,
      targetEl,
      initialTargetStyle,
      outlineOnly: outlineDrag,
      initialRadius: initialR,
      maxRadius,
      nextRadiusStep: findNearestRadiusStep(initialR, maxRadius),
      latestPointer: { x: e.clientX, y: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey || e.metaKey, metaKey: e.metaKey },
      rafPending: false,
      moved: false,
      nextWidth: currentW,
      nextHeight: currentH,
      nextLeft: startLeft,
      nextTop: startTop,
      nextTranslation: { x: 0, y: 0 },
      token: '',
      lastClassEstimateTime: 0,
    };
  };

  const handleRadiusKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat || directDragRef.current || blocksReview() || !selectedLayer) return;

    const key = selectedLayer;
    const currentToken = elements[key]?.borderRadius || 'rounded-none';
    const currentIndex = RADIUS_SCALE_STEPS.findIndex(s => s.token === currentToken);
    const idx = currentIndex >= 0 ? currentIndex : 0;

    let nextIdx = idx;
    if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = RADIUS_SCALE_STEPS.length - 1;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      nextIdx = Math.min(RADIUS_SCALE_STEPS.length - 1, idx + 1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      nextIdx = Math.max(0, idx - 1);
    }

    const nextStep = RADIUS_SCALE_STEPS[nextIdx];
    updateStyle('borderRadius', nextStep.token);
  };

  // Backend Integration: Trigger Preview on Style/Text/Nudge/Reorder
  const latestElementsRef = useRef(elements);
  latestElementsRef.current = elements;
  const triggerBackendPreview = useCallback(
    async (
      kind: 'style' | 'text' | 'nudge' | 'reorder' | 'reparent' | 'move' | 'image' | 'action' | 'icon' | 'component',
      payload: Record<string, any>,
      layerKeyOverride?: string,
      commitVisual?: () => void,
      background = false,
      beforeBridgePreview?: () => void
    ) => {
      if (directDragRef.current) return;
      if (!background && (operationRef.current || draftReplayPromise.current || blocksReview() || undoRecoveryRef.current)) {
        showToast(undoRecoveryRef.current ? 'Check Undo status before making another change.' : reviewNotice);
        return;
      }
      if ((kind === 'reorder' || kind === 'reparent') && !usesDrafts) {
        showToast('Open the editing window to arrange source elements.');
        return;
      }
      const activeKey = layerKeyOverride || selectedLayer;
      if (!activeKey) return;
      const renderedElement = latestElementsRef.current[activeKey] || elements[activeKey] || activeElement;
      const owner = kind === 'component' ? payload.owner as import('@/lib/slightnudge/component-ownership').ComponentOwner | undefined : undefined;
      let targetElem = owner ? { ...renderedElement, filePath: owner.filePath, line: owner.line, column: owner.column, tag: owner.tagName, id: '' } : renderedElement;
      const fileHead = draftHeads(reviewRef.current)[targetElem.filePath];
      if (usesDrafts && !fileHead && Object.keys(draftHeads(reviewRef.current)).length >= 16) {
        showToast('This change set already contains 16 files. Save it before editing another source file.');
        return;
      }
      const snapshot = { element: { ...renderedElement }, order: [...childOrder] };
      if (!background) {
        operationRef.current = true;
        setBusy(true);
      }
      try {
        const inspection = { found: true, safeToEdit: true, textEditable: true, tagName: targetElem.tag.split('.')[0], line: targetElem.line, column: targetElem.column, reason: undefined, textReason: undefined };
        if (!repositoryId && targetElem.id && inspection.found && inspection.safeToEdit && inspection.tagName === targetElem.tag.split('.')[0]) {
          targetElem = { ...targetElem, line: inspection.line!, column: inspection.column! };
        }
        if (!inspection.found || !inspection.safeToEdit ||
          inspection.tagName !== targetElem.tag.split('.')[0] ||
          inspection.line !== targetElem.line || inspection.column !== targetElem.column) {
          showToast(inspection.reason || 'The source target could not be verified. Nothing was changed.');
          return;
        }
        if (kind === 'text' && !inspection.textEditable) {
          showToast(inspection.textReason || 'This text is not a literal at this source location. Nothing was changed.');
          return;
        }
        const state = kind === 'text' ? '' : typeof payload.breakpoint === 'string' ? payload.breakpoint : activeBreakpoint || activeVariant;
        if (!['', 'hover', 'focus-visible', 'active'].includes(state) && !responsiveScopes.some(scope => scope.name === state)) {
          showToast('This breakpoint cannot yet be previewed precisely. Nothing was changed.');
          return;
        }
        if (state && kind !== 'style') {
          showToast('Text and spacing edits use the Default state. Select Default first.');
          return;
        }
        const importedScopeSupported = !state || usesDrafts && responsiveScopes.some(scope => scope.name === state);
        if (repositoryId && (!importedScopeSupported || kind === 'nudge' || kind === 'move' && !usesDrafts)) {
          showToast('This live-page operation is not yet visually verified. Nothing was changed.');
          return;
        }
        let result = await previewEditAPI({
          ...(usesDrafts ? { draft: true, parentPreviewId: fileHead?.id } : {}),
          ...(repositoryId ? { repositoryId, sourcePath: targetElem.filePath } : {}),
          kind,
          important: kind === 'style' && ['a', 'button'].includes(targetElem.tag) && ['textColor', 'backgroundColor'].includes(payload.property),
          filePath: targetElem.filePath,
          instance: definitionStyleKey === activeKey && ['style', 'text', 'nudge', 'move'].includes(kind) ? undefined : renderedElement.instance,
          line: targetElem.line,
          column: targetElem.column,
          elementId: targetElem.id,
          tagName: targetElem.tag.split('.')[0],
          className: targetElem.classes,
          ...payload,
          breakpoint: state,
        });

        if (!result.success && fileHead?.id && (result.code === 'SOURCE_CHANGED' || result.error?.includes('source changed outside') || result.error?.includes('source changed after') || result.error?.includes('source changed while'))) {
          result = await previewEditAPI({
            ...(usesDrafts ? { draft: true } : {}),
            ...(repositoryId ? { repositoryId, sourcePath: targetElem.filePath } : {}),
            kind,
            important: kind === 'style' && ['a', 'button'].includes(targetElem.tag) && ['textColor', 'backgroundColor'].includes(payload.property),
            filePath: targetElem.filePath,
            instance: definitionStyleKey === activeKey && ['style', 'text', 'nudge', 'move'].includes(kind) ? undefined : renderedElement.instance,
            line: targetElem.line,
            column: targetElem.column,
            elementId: targetElem.id,
            tagName: targetElem.tag.split('.')[0],
            className: targetElem.classes,
            ...payload,
            breakpoint: state,
          });
          if (result.success) {
            showToast('Draft re-baselined to current source.');
          }
        }

        if (result.responsiveScopes) setResponsiveScopes(result.responsiveScopes);
        if (result.success && result.changed === false) {
          beforeBridgePreview?.();
          if (pendingOverlayResetKeyRef.current === activeKey) {
            pendingOverlayResetKeyRef.current = null;
          }
          resetOverlayNode(activeKey);
          showToast('This value is already applied.');
          return true;
        }
        if (result.success && (result.id || result.draftClean)) {
          if (kind !== 'text' && kind !== 'image' && kind !== 'action' && kind !== 'icon' && kind !== 'component' && kind !== 'reorder' && kind !== 'reparent' && typeof result.newClassName !== 'string') {
            if (result.id) await discardEditAPI(result.id);
            showToast('The complete source styles could not be verified. Nothing was changed.');
            return;
          }
          const actualSelection = sourceSelections.current[activeKey] || sourceSelection.current;
          const otherPatches = Object.values(draftHeads(reviewRef.current)).filter(head => editPath(head) !== targetElem.filePath).flatMap(head => head.renderPatches || []);
          const composedPatches = [...otherPatches, ...(result.renderPatches || [])];
          let rendered: SourceSelection | undefined;
          try {
            if (!sourceCanvas.current || !actualSelection) throw new Error('Select the actual source element again.');
            if (kind !== 'text' && typeof result.oldClassName === 'string' && !sourceClassesMatch(actualSelection.className, result.oldClassName)) throw new Error('Rendered classes differ from the source. Select a stable source element.');
            beforeBridgePreview?.();
            rendered = kind === 'image' || kind === 'action' || kind === 'icon' || kind === 'component' || (kind === 'reorder' || kind === 'reparent') && result.draftClean ? await sourceCanvas.current.command('restore', null, { patches: kind === 'image' || kind === 'action' || kind === 'icon' || kind === 'component' ? composedPatches : otherPatches }) : await sourceCanvas.current.command('preview', actualSelection, {
              kind, property: kind === 'nudge' ? (payload.direction === 'left' || payload.direction === 'right' ? 'marginLeft' : 'marginTop') : payload.property,
              utility: kind === 'nudge' || kind === 'style' ? result.newValue || payload.value : payload.value,
              value: kind === 'text' ? payload.value : result.newClassName,
              x: payload.x, y: payload.y, css: usesDrafts && result.renderPatches ? composedPatches.map(patch => patch.css || '').join('\n') : result.css,
              probeCss: result.css,
              replaceCss: usesDrafts && Boolean(result.renderPatches),
              responsiveMedia: result.responsiveMedia,
              patches: composedPatches,
            });
            if (usesDrafts && result.renderPatches) {
              const checked = await sourceCanvas.current.command('check', actualSelection, { patches: composedPatches });
              if (checked?.renderPatches) { const owned = result.renderPatches; result.renderPatches = checked.renderPatches.filter(patch => owned.some(candidate => candidate.before.path === patch.before.path && candidate.before.line === patch.before.line && candidate.before.column === patch.before.column && candidate.before.elementId === patch.before.elementId)); }
            }
          } catch (error) {
            if (result.id) await discardEditAPI(result.id);
            if (!usesDrafts) { sourceCanvas.current?.reload(); setSelectedLayerState(null); }
            throw error;
          }
          if (!state) commitVisual?.();
          if (rendered) {
            sourceSelections.current[activeKey] = rendered;
            if (selectedLayer === activeKey) sourceSelection.current = rendered;
            sourceCanvas.current?.updateSelectionRect?.(rendered.rect);
          }
          setElements(previous => ({
            ...previous, [activeKey]: {
              ...previous[activeKey], ...(rendered ? elementFromSource(rendered) : {}),
              classes: result.newClassName || previous[activeKey].classes,
              text: kind === 'text' ? payload.value : previous[activeKey].text,
            }
          }));
          if (pendingOverlayResetKeyRef.current === activeKey) {
            setOverlayResetTick(tick => tick + 1);
          }
          if (usesDrafts && !draftRef.current) storeDraft({ version: 1, frames: [{ elements, order: childOrder, edit: null }], cursor: 0 });
          if (usesDrafts) captureDraftRef.current = true;
          const touchedKeys = new Set([activeKey, ...(draftRef.current?.frames.slice(1).flatMap(frame => frame.edit ? [frame.edit.layerKey] : []) || [])]);
          const draftBase = Object.fromEntries([...touchedKeys].map(key => [key, draftRef.current?.frames[0].elements[key] || elements[key]]).filter(([, value]) => Boolean(value)));
          const nextHead: PendingEdit | null = result.draftClean ? null : {
            ownerPath: result.ownerPath || (owner ? owner.filePath : undefined),
            renderPatches: result.renderPatches,
            sourceTargets: result.sourceTargets,
            draftBase: usesDrafts ? draftBase : undefined,
            sourceSelection: actualSelection || undefined,
            sourceText: kind === 'text',
            layerKey: activeKey,
            snapshot,
            id: result.id!,
            summary: result.summary || `${payload.property || kind} modified`,
            oldValue: result.oldValue || '',
            newValue: result.newValue || '',
            oldClassName: result.oldClassName,
            newClassName: result.newClassName,
            filePath: result.filePath,
            line: result.line || targetElem.line,
          };
          setReview(usesDrafts ? composeDraft(reviewRef.current, targetElem.filePath, nextHead) : nextHead);
          return true;
        } else {
          showToast(`⚠️ ${result.refusalReason || result.error || 'Edit refused'}`);
        }
      } catch (err: any) {
        showToast(`⚠️ ${err?.message || 'Could not prepare preview'}`);
      } finally {
        if (!background) {
          setBusy(false);
          operationRef.current = false;
        }
        if (queuedSelectionRef.current !== undefined) {
          const key = queuedSelectionRef.current; queuedSelectionRef.current = undefined;
          setSelectedLayerState(key);
          if (key && sourceSelections.current[key]) { sourceSelection.current = sourceSelections.current[key]; void sourceCanvas.current?.command('select', sourceSelections.current[key]).catch(() => { }); }
        }
      }
    },
    [activeBreakpoint, activeVariant, activeElement, elements, selectedLayer, childOrder, repositoryId, usesDrafts, responsiveScopes, definitionStyleKey]
  );
  const triggerBackendPreviewRef = useRef(triggerBackendPreview);
  triggerBackendPreviewRef.current = triggerBackendPreview;

  // 60fps Unified Direct Manipulation Pointer Engine
  useEffect(() => {
    let animationId = 0;

    const applyGuidesToOverlay = (_guides: readonly GuideLine[], _artboardToMain: Matrix2D, _moved: boolean) => {
      if (guideVRef.current) guideVRef.current.style.display = 'none';
      if (guideHRef.current) guideHRef.current.style.display = 'none';
    };

    const onTick = () => {
      const gesture = directDragRef.current;
      if (!gesture) return;
      gesture.rafPending = false;

      const p = gesture.latestPointer;
      const overlayNode = elementRefs.current[gesture.key];

      if (gesture.type === 'resize' && gesture.handle) {
        const deltaScreen = { x: p.x - gesture.startX, y: p.y - gesture.startY };
        if (Math.hypot(deltaScreen.x, deltaScreen.y) >= 3) {
          gesture.moved = true;
        }

        const effectiveShift = gesture.lockedAspect ? !p.shiftKey : p.shiftKey;
        const session = gesture.snapSession ?? createDirectSnapSession(gesture.siblings);
        gesture.snapSession = session;

        const solved = snapResizeInSession(
          session,
          {
            left: gesture.startLeft,
            top: gesture.startTop,
            width: gesture.startWidth,
            height: gesture.startHeight,
          },
          gesture.handle,
          deltaScreen,
          gesture.elementToScreen,
          {
            thresholdScreenPx: 4,
            zoom: gesture.zoom,
            disabled: p.ctrlKey || Boolean(gesture.isNonTrivialTransform),
            fromCenter: p.altKey,
            aspectRatio: effectiveShift,
            minWidth: 1,
            minHeight: 1,
          }
        );

        let res = solved.resize.rect;
        const preserveAutoHeight = Boolean(gesture.widthOnlyHeight && !effectiveShift);
        gesture.nextWidth = Math.max(1, res.width);
        gesture.nextHeight = preserveAutoHeight ? gesture.startHeight : Math.max(1, res.height);
        gesture.nextLeft = res.left;
        gesture.nextTop = preserveAutoHeight ? gesture.startTop : res.top;

        // Apply continuous width to target element immediately so text reflows smoothly in the iframe at 60fps
        if (gesture.targetEl && !gesture.outlineOnly) {
          gesture.targetEl.style.maxWidth = `${roundValue(gesture.nextWidth, 'nearest', 1)}px`;
          // If resizing horizontally (e or w handle) or non-aspect-locked elements, measure the actual rendered geometry as text wraps
          if (gesture.handle === 'e' || gesture.handle === 'w' || gesture.widthOnlyHeight || !gesture.lockedAspect) {
            const elBox = gesture.targetEl.getBoundingClientRect();
            if (elBox && elBox.width > 0 && elBox.height > 0) {
              const liveLeft = elBox.left;
              const liveTop = elBox.top;
              const liveW = elBox.width;
              const liveH = elBox.height;
              gesture.nextWidth = liveW;
              gesture.nextHeight = liveH;
              gesture.nextLeft = liveLeft;
              gesture.nextTop = liveTop;
              res = {
                left: liveLeft,
                top: liveTop,
                width: liveW,
                height: liveH,
                right: liveLeft + liveW,
                bottom: liveTop + liveH,
              };
            } else {
              const liveH = gesture.targetEl.offsetHeight;
              if (liveH && liveH > 0) {
                gesture.nextHeight = liveH;
                res = { ...res, height: liveH };
              }
            }
          }
        } else if (sourceCanvas.current && gesture.moved && !gesture.outlineOnly) {
          const selection = sourceSelections.current[gesture.key];
          if (selection) {
            void sourceCanvas.current.command('gesture', selection, { maxWidth: roundValue(gesture.nextWidth, 'nearest', 1) });
          }
        }

        // 1. Direct overlay write (transform + width/height for axis-aligned; oriented Quad for rotated/flipped/skewed)
        const haloEl = outlineHaloRef.current[gesture.key];
        const accentEl = outlineAccentRef.current[gesture.key];
        if (haloEl && accentEl) {
          haloEl.style.transition = 'none';
          accentEl.style.transition = 'none';
        }
        if (gesture.isNonTrivialTransform && gesture.elementToArtboard) {
          const wrapperOffX = -(gesture.wrapperLeft ?? 0);
          const wrapperOffY = -(gesture.wrapperTop ?? 0);
          if (haloEl && accentEl) {
            const artboardQuad = transformRectToQuad(gesture.elementToArtboard, res);
            const wrapperQuad = transformQuadByOffset(artboardQuad, wrapperOffX, wrapperOffY);
            const d = buildQuadOutlinePath(wrapperQuad, 2);
            haloEl.setAttribute('d', d);
            accentEl.setAttribute('d', d);
          }
          const keyRefs = handleButtonRefs.current[gesture.key];
          if (keyRefs) {
            const dirs: HandleDirection[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
            for (const dir of dirs) {
              const btn = keyRefs[dir];
              if (!btn) continue;
              const ptArtboard = transformPoint(
                gesture.elementToArtboard,
                getHandleLocalPoint(res, dir)
              );
              btn.style.left = `${ptArtboard.x + wrapperOffX}px`;
              btn.style.top = `${ptArtboard.y + wrapperOffY}px`;
            }
          }
          const gripBtn = radiusGripRef.current[gesture.key];
          if (gripBtn) {
            const gripInset = gesture.radiusGripInset ?? Math.max(14 / Math.max(0.25, gesture.zoom), 14);
            const gripPt = transformPoint(gesture.elementToArtboard, {
              x: res.left + gripInset,
              y: res.top + gripInset,
            });
            gripBtn.style.left = `${gripPt.x + wrapperOffX}px`;
            gripBtn.style.top = `${gripPt.y + wrapperOffY}px`;
          }
        } else {
          if (overlayNode) {
            overlayNode.style.width = `${roundValue(gesture.nextWidth, 'nearest', 1)}px`;
            overlayNode.style.height = `${roundValue(gesture.nextHeight, 'nearest', 1)}px`;
            const dx = gesture.nextLeft - gesture.startLeft;
            const dy = gesture.nextTop - gesture.startTop;
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
              overlayNode.style.transform = `translate3d(${roundValue(dx, 'nearest', 1)}px, ${roundValue(dy, 'nearest', 1)}px, 0)`;
            } else {
              overlayNode.style.transform = '';
            }
          }

          // Direct SVG outline & corner arc update
          const renderedElem = elements[gesture.key] || activeElement;
          const radii = parseBorderRadius(renderedElem.borderRadius, gesture.nextWidth, gesture.nextHeight);
          if (haloEl && accentEl) {
            const d = buildRoundedRectPath(-2, -2, gesture.nextWidth + 4, gesture.nextHeight + 4, {
              tl: radii.tl + (radii.tl > 0 ? 2 : 0),
              tr: radii.tr + (radii.tr > 0 ? 2 : 0),
              br: radii.br + (radii.br > 0 ? 2 : 0),
              bl: radii.bl + (radii.bl > 0 ? 2 : 0),
            });
            haloEl.setAttribute('d', d);
            accentEl.setAttribute('d', d);
          }
          const arcMap = cornerArcRefs.current[gesture.key];
          if (arcMap) {
            const maxR = Math.min(gesture.nextWidth, gesture.nextHeight) / 2;
            const clampedRadii = {
              tl: Math.min(radii.tl, maxR),
              tr: Math.min(radii.tr, maxR),
              br: Math.min(radii.br, maxR),
              bl: Math.min(radii.bl, maxR),
            };
            const corners: readonly ('nw' | 'ne' | 'se' | 'sw')[] = ['nw', 'ne', 'se', 'sw'];
            for (const corner of corners) {
              const pair = arcMap[corner];
              if (!pair || (!pair.halo && !pair.accent)) continue;
              const arc = gesture.isCircleVariant
                ? buildCircleArcPath(corner, gesture.nextWidth, gesture.zoom)
                : buildCornerArcPath(corner, gesture.nextWidth, gesture.nextHeight, clampedRadii, gesture.zoom);
              if (pair.halo) {
                pair.halo.style.transition = 'none';
                pair.halo.setAttribute('d', arc.path);
              }
              if (pair.accent) {
                pair.accent.style.transition = 'none';
                pair.accent.setAttribute('d', arc.path);
              }
              const btn = handleButtonRefs.current[gesture.key]?.[corner];
              if (btn) {
                btn.style.left = `${arc.center.x}px`;
                btn.style.top = `${arc.center.y}px`;
              }
            }
          }
        }

        // 3. Smart 1px guides transformed into <main> coordinate space (keep hidden for width-only CTA drags)
        applyGuidesToOverlay(
          preserveAutoHeight ? [] : solved.guides,
          gesture.artboardToMain,
          gesture.moved
        );

        // 4. Live cursor W x H tag
        if (cursorTagRef.current && gesture.moved) {
          cursorTagRef.current.style.display = 'block';
          cursorTagRef.current.textContent = `W: ${roundValue(gesture.nextWidth, 'nearest', 1)}px × H: ${roundValue(gesture.nextHeight, 'nearest', 1)}px`;
          cursorTagRef.current.style.transform = `translate3d(${p.x + 14}px, ${p.y + 14}px, 0)`;
        }
      } else if (gesture.type === 'move') {
        const deltaScreen = { x: p.x - gesture.startX, y: p.y - gesture.startY };
        if (Math.hypot(deltaScreen.x, deltaScreen.y) >= 3) {
          gesture.moved = true;
        }

        const localDelta =
          screenDeltaToElementLocalDelta(deltaScreen, gesture.elementToScreen) ?? {
            x: deltaScreen.x / gesture.zoom,
            y: deltaScreen.y / gesture.zoom,
          };

        let nextX = gesture.baseTranslation.x + localDelta.x;
        let nextY = gesture.baseTranslation.y + localDelta.y;

        const session = gesture.snapSession ?? createDirectSnapSession(gesture.siblings);
        gesture.snapSession = session;

        const snap = snapRectInSession(
          session,
          {
            left: gesture.startLeft + nextX - gesture.baseTranslation.x,
            top: gesture.startTop + nextY - gesture.baseTranslation.y,
            width: gesture.startWidth,
            height: gesture.startHeight,
          },
          {
            thresholdScreenPx: 4,
            zoom: gesture.zoom,
            disabled: p.ctrlKey,
          }
        );

        if (snap.snappedX) nextX += snap.dx;
        if (snap.snappedY) nextY += snap.dy;

        const roundedPos = roundMoveTranslation(nextX, nextY, snap.snappedX && !p.ctrlKey, snap.snappedY && !p.ctrlKey);
        const snappedX = roundedPos.x;
        const snappedY = roundedPos.y;
        gesture.nextTranslation = { x: snappedX, y: snappedY };

        if (overlayNode) {
          overlayNode.style.transform = `translate3d(${snappedX - gesture.baseTranslation.x}px, ${snappedY - gesture.baseTranslation.y}px, 0)`;
        }

        if (gesture.targetEl && !gesture.outlineOnly) {
          gesture.targetEl.style.translate = `${snappedX}px ${snappedY}px`;
        } else if (sourceCanvas.current && gesture.moved && !gesture.outlineOnly) {
          const selection = sourceSelections.current[gesture.key];
          if (selection) {
            void sourceCanvas.current.command('gesture', selection, { x: snappedX, y: snappedY });
          }
        }

        // Keep smart guide lines hidden during Move so laser crosshairs never slice across canvas elements
        if (guideVRef.current) guideVRef.current.style.display = 'none';
        if (guideHRef.current) guideHRef.current.style.display = 'none';

        if (cursorTagRef.current && gesture.moved) {
          cursorTagRef.current.style.display = 'block';
          cursorTagRef.current.textContent = `X: ${snappedX}px  Y: ${snappedY}px Snapped`;
          cursorTagRef.current.style.transform = `translate3d(${p.x + 14}px, ${p.y + 14}px, 0)`;
        }
      } else if (gesture.type === 'radius') {
        const deltaScreenX = p.x - gesture.startX;
        const deltaScreenY = p.y - gesture.startY;
        if (Math.hypot(deltaScreenX, deltaScreenY) >= 2) {
          gesture.moved = true;
        }

        const localDelta =
          screenDeltaToElementLocalDelta({ x: deltaScreenX, y: deltaScreenY }, canvasToScreenMatrix({ originX: 0, originY: 0, panX: 0, panY: 0, zoom: gesture.zoom })) ?? {
            x: deltaScreenX / gesture.zoom,
            y: deltaScreenY / gesture.zoom,
          };
        const deltaR = (localDelta.x + localDelta.y) / 2;
        const rawRadius = Math.max(0, Math.min(gesture.maxRadius || 50, (gesture.initialRadius || 0) + deltaR));
        const snapped = findNearestRadiusStep(rawRadius, gesture.maxRadius || 50);
        gesture.nextRadiusStep = snapped;

        const targetRadiusPx = snapped.token === 'rounded-full' ? (gesture.maxRadius || 50) : snapped.px;

        if (gesture.targetEl && !gesture.outlineOnly) {
          gesture.targetEl.style.borderRadius = `${targetRadiusPx}px`;
        }

        const haloEl = outlineHaloRef.current[gesture.key];
        const accentEl = outlineAccentRef.current[gesture.key];
        if (haloEl && accentEl) {
          const r = targetRadiusPx;
          const d = buildRoundedRectPath(-2, -2, gesture.startWidth + 4, gesture.startHeight + 4, {
            tl: r + (r > 0 ? 2 : 0),
            tr: r + (r > 0 ? 2 : 0),
            br: r + (r > 0 ? 2 : 0),
            bl: r + (r > 0 ? 2 : 0),
          });
          haloEl.setAttribute('d', d);
          accentEl.setAttribute('d', d);
        }

        if (cursorTagRef.current && gesture.moved) {
          cursorTagRef.current.style.display = 'block';
          const tagText = p.altKey
            ? `Radius: ${snapped.name} (${targetRadiusPx}px) [Alt per-corner not supported]`
            : `Radius: ${snapped.name} (${targetRadiusPx}px)`;
          cursorTagRef.current.textContent = tagText;
          cursorTagRef.current.style.transform = `translate3d(${p.x + 14}px, ${p.y + 14}px, 0)`;
        }
      }
    };

    const cleanupVisuals = () => {
      cancelAnimationFrame(animationId);
      if (typeof window !== 'undefined') (window as any).__slightnudge_gesture_active = false;
      if (eventShieldRef.current) eventShieldRef.current.style.display = 'none';
      if (guideVRef.current) guideVRef.current.style.display = 'none';
      if (guideHRef.current) guideHRef.current.style.display = 'none';
      if (cursorTagRef.current) cursorTagRef.current.style.display = 'none';
      for (const el of Object.values(outlineHaloRef.current)) {
        if (el) el.style.transition = '';
      }
      for (const el of Object.values(outlineAccentRef.current)) {
        if (el) el.style.transition = '';
      }
      for (const map of Object.values(cornerArcRefs.current)) {
        for (const pair of Object.values(map)) {
          if (pair?.halo) pair.halo.style.transition = '';
          if (pair?.accent) pair.accent.style.transition = '';
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const gesture = directDragRef.current;
      if (!gesture || e.pointerId !== gesture.pointerId) return;

      const events = (e as any).getCoalescedEvents ? (e as any).getCoalescedEvents() : [e];
      const last = events[events.length - 1];
      gesture.latestPointer = {
        x: last.clientX,
        y: last.clientY,
        shiftKey: last.shiftKey,
        altKey: last.altKey,
        ctrlKey: last.ctrlKey || last.metaKey,
      };

      if (!gesture.rafPending) {
        gesture.rafPending = true;
        animationId = requestAnimationFrame(onTick);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const gesture = directDragRef.current;
      if (!gesture || e.pointerId !== gesture.pointerId) return;
      directDragRef.current = null;
      cleanupVisuals();

      try {
        if (gesture.capture.hasPointerCapture(gesture.pointerId)) {
          gesture.capture.releasePointerCapture(gesture.pointerId);
        }
      } catch { }

      const overlayNode = elementRefs.current[gesture.key];

      if (gesture.type === 'resize') {
        setIsResizing(false);
        setResizeHandle(null);

        if (gesture.moved && Math.abs(gesture.nextWidth - gesture.startWidth) > 0.5) {
          if (gesture.outlineOnly) {
            if (gesture.targetEl) {
              gesture.targetEl.style.maxWidth = `${Math.round(gesture.nextWidth)}px`;
            } else if (sourceCanvas.current) {
              const selection = sourceSelections.current[gesture.key];
              if (selection) {
                void sourceCanvas.current.command('gesture', selection, { maxWidth: Math.round(gesture.nextWidth) });
              }
            }
          }
          const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          const snapped = snapWidth(gesture.nextWidth, rem);
          const token = snapped.token;
          const prevMaxWidth = latestElementsRef.current[gesture.key]?.maxWidth;

          if (!gesture.outlineOnly && gesture.targetEl) {
            gesture.targetEl.style.maxWidth = `${snapped.width}px`;
            const elBox = gesture.targetEl.getBoundingClientRect();

            if (elBox && elBox.width > 0 && elBox.height > 0) {
              const updatedRect = {
                left: elBox.left,
                top: elBox.top,
                width: elBox.width,
                height: elBox.height,
              };
              sourceCanvas.current?.updateSelectionRect?.(updatedRect);
              if (sourceSelections.current[gesture.key]) {
                sourceSelections.current[gesture.key] = {
                  ...sourceSelections.current[gesture.key],
                  rect: updatedRect,
                };
              }
              if (sourceSelection.current && sourceKey(sourceSelection.current) === gesture.key) {
                sourceSelection.current = {
                  ...sourceSelection.current,
                  rect: updatedRect,
                };
              }
            }
          }
          pendingDirectStyleRef.current[gesture.key] = {
            targetEl: gesture.targetEl,
            initialStyle: gesture.initialTargetStyle,
          };
          pendingOverlayResetKeyRef.current = gesture.key;
          resetOverlayNode(gesture.key);

          // Optimistic update immediately
          setElements(prev => ({
            ...prev,
            [gesture.key]: { ...prev[gesture.key], maxWidth: token },
          }));

          // Background save via client-side queue (never blocking input)
          void enqueueFileOperation(
            gesture.filePath,
            async () => {
              const ok = await triggerBackendPreviewRef.current(
                'style',
                { property: 'maxWidth', value: token },
                gesture.key,
                undefined,
                true,
                () => restorePendingDirectStyle(gesture.key)
              );
              if (!ok) throw new Error('Resize preview refused');
              return ok;
            },
            {
              onRollback: () => {
                restorePendingDirectStyle(gesture.key);
                if (!gesture.targetEl && sourceCanvas.current) {
                  const selection = sourceSelections.current[gesture.key];
                  if (selection) void sourceCanvas.current.command('cancel-gesture', selection);
                }
                if (pendingOverlayResetKeyRef.current === gesture.key) {
                  pendingOverlayResetKeyRef.current = null;
                }
                resetOverlayNode(gesture.key);
                setElements(prev =>
                  prev[gesture.key] ? { ...prev, [gesture.key]: { ...prev[gesture.key], maxWidth: prevMaxWidth } } : prev
                );
              },
            }
          ).catch(() => { });
        } else {
          if (gesture.targetEl) {
            if (gesture.initialTargetStyle === null) gesture.targetEl.removeAttribute('style');
            else gesture.targetEl.setAttribute('style', gesture.initialTargetStyle);
          } else if (gesture.moved && sourceCanvas.current) {
            const selection = sourceSelections.current[gesture.key];
            if (selection) void sourceCanvas.current.command('cancel-gesture', selection);
          }
          if (pendingOverlayResetKeyRef.current === gesture.key) {
            pendingOverlayResetKeyRef.current = null;
          }
          resetOverlayNode(gesture.key);
        }
      } else if (gesture.type === 'move') {
        setIsDraggingMove(false);
        setMoveArmed(false);
        if (gesture.moved) {
          moveClickSuppressed.current = true;
        }

        const changed = gesture.moved && (gesture.nextTranslation.x !== gesture.baseTranslation.x || gesture.nextTranslation.y !== gesture.baseTranslation.y);
        if (changed) {
          if (gesture.outlineOnly) {
            if (gesture.targetEl) {
              gesture.targetEl.style.translate = `${gesture.nextTranslation.x}px ${gesture.nextTranslation.y}px`;
            } else if (sourceCanvas.current) {
              const selection = sourceSelections.current[gesture.key];
              if (selection) {
                void sourceCanvas.current.command('gesture', selection, { x: gesture.nextTranslation.x, y: gesture.nextTranslation.y });
              }
            }
          }
          if (overlayNode) {
            overlayNode.style.width = '100%';
            overlayNode.style.height = '100%';
          }
          pendingDirectStyleRef.current[gesture.key] = {
            targetEl: gesture.targetEl,
            initialStyle: gesture.initialTargetStyle,
          };
          inFlightMoveRef.current[gesture.key] = gesture.nextTranslation;
          pendingOverlayResetKeyRef.current = gesture.key;

          void enqueueFileOperation(
            gesture.filePath,
            async () => {
              try {
                const ok = await triggerBackendPreviewRef.current(
                  'move',
                  gesture.nextTranslation,
                  gesture.key,
                  undefined,
                  true,
                  () => restorePendingDirectStyle(gesture.key)
                );
                if (!ok) throw new Error('Move preview refused');
                return ok;
              } finally {
                if (inFlightMoveRef.current[gesture.key] === gesture.nextTranslation) {
                  delete inFlightMoveRef.current[gesture.key];
                }
              }
            },
            {
              onRollback: () => {
                restorePendingDirectStyle(gesture.key);
                if (!gesture.targetEl && sourceCanvas.current) {
                  const selection = sourceSelections.current[gesture.key];
                  if (selection) void sourceCanvas.current.command('cancel-gesture', selection);
                }
                if (inFlightMoveRef.current[gesture.key] === gesture.nextTranslation) {
                  delete inFlightMoveRef.current[gesture.key];
                }
                if (pendingOverlayResetKeyRef.current === gesture.key) {
                  pendingOverlayResetKeyRef.current = null;
                }
                resetOverlayNode(gesture.key);
              },
            }
          ).catch(() => { });
        } else {
          if (gesture.targetEl) {
            if (gesture.initialTargetStyle === null) gesture.targetEl.removeAttribute('style');
            else gesture.targetEl.setAttribute('style', gesture.initialTargetStyle);
          } else if (gesture.moved && sourceCanvas.current) {
            const selection = sourceSelections.current[gesture.key];
            if (selection) void sourceCanvas.current.command('cancel-gesture', selection);
          }
          delete pendingDirectStyleRef.current[gesture.key];
          delete inFlightMoveRef.current[gesture.key];
          if (pendingOverlayResetKeyRef.current === gesture.key) {
            pendingOverlayResetKeyRef.current = null;
          }
          resetOverlayNode(gesture.key);
        }
      } else if (gesture.type === 'radius') {
        resetOverlayNode(gesture.key);
        if (gesture.moved && gesture.nextRadiusStep) {
          const step = gesture.nextRadiusStep;
          if (gesture.targetEl) {
            if (gesture.initialTargetStyle === null) gesture.targetEl.removeAttribute('style');
            else gesture.targetEl.setAttribute('style', gesture.initialTargetStyle);
          }
          updateStyle('borderRadius', step.token);
        } else {
          if (gesture.targetEl) {
            if (gesture.initialTargetStyle === null) gesture.targetEl.removeAttribute('style');
            else gesture.targetEl.setAttribute('style', gesture.initialTargetStyle);
          }
        }
      }
    };

    const cancelDrag = () => {
      const gesture = directDragRef.current;
      if (!gesture) return;
      directDragRef.current = null;
      cleanupVisuals();

      try {
        if (gesture.capture.hasPointerCapture(gesture.pointerId)) {
          gesture.capture.releasePointerCapture(gesture.pointerId);
        }
      } catch { }

      delete pendingDirectStyleRef.current[gesture.key];
      delete inFlightMoveRef.current[gesture.key];
      if (pendingOverlayResetKeyRef.current === gesture.key) {
        pendingOverlayResetKeyRef.current = null;
      }

      if (gesture.targetEl) {
        if (gesture.initialTargetStyle === null) gesture.targetEl.removeAttribute('style');
        else gesture.targetEl.setAttribute('style', gesture.initialTargetStyle);
      } else if (sourceCanvas.current) {
        const selection = sourceSelections.current[gesture.key];
        if (selection) void sourceCanvas.current.command('cancel-gesture', selection);
      }

      resetOverlayNode(gesture.key);

      if (gesture.type === 'resize') {
        setIsResizing(false);
        setResizeHandle(null);
      } else if (gesture.type === 'move') {
        setIsDraggingMove(false);
        setMoveArmed(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && directDragRef.current) {
        e.preventDefault();
        e.stopImmediatePropagation();
        cancelDrag();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('blur', cancelDrag);
    window.addEventListener('keydown', onKeyDown, true);
    cancelActiveDragRef.current = cancelDrag;

    return () => {
      cancelActiveDragRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', cancelDrag);
      window.removeEventListener('blur', cancelDrag);
      window.removeEventListener('keydown', onKeyDown, true);
      cleanupVisuals();
    };
  }, [triggerBackendPreview]);

  const resizeWithKeyboard = (event: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat || directDragRef.current || blocksReview() || undoRecoveryRef.current || !selectedLayer) return;
    const current = elementRefs.current[selectedLayer]?.offsetWidth;
    if (!current) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const step = event.shiftKey ? 10 : 1;
    const nextWidth = event.key === 'Home'
      ? 1
      : event.key === 'End'
        ? 2048
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? current + step
          : Math.max(1, current - step);
    const next = snapWidth(nextWidth, rem);
    const key = selectedLayer;
    const targetElem = elements[key] || activeElement;

    // Optimistic update immediately
    setElements(previous => ({ ...previous, [key]: { ...previous[key], maxWidth: next.token } }));

    // Non-blocking background save
    enqueueFileOperation(
      targetElem.filePath,
      async () => {
        return triggerBackendPreview('style', { property: 'maxWidth', value: next.token }, key, undefined, true);
      },
      {
        onRollback: () => {
          showToast('Could not save keyboard resize.');
        },
      }
    );
  };

  // Cancel manipulation or clear selection on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'Escape') {
        if (destinationSource.current) { cancelDestination(); return; }
        if (windowMode && (windowPanel || (leftDockVisible && leftDockTool !== null) || (rightDockVisible && rightDockTool !== null)) && !isDraggingMove && !isResizing) {
          setWindowPanel(null);
          if (leftDockVisible) setLeftDockVisible(false);
          if (rightDockVisible) setRightDockTool(null);
          return;
        }
        if (isDraggingMove) {
          setIsDraggingMove(false);
          setDragLayerKey(null);
          setDragOffset(0);
          setDropSlotIndex(null);
        } else if (isResizing) {
          setIsResizing(false);
          setResizeHandle(null);
          setLiveWidth(null);
          setDimensionTooltip(null);
        } else {
          setSelectedLayer(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDraggingMove, isResizing, windowMode, windowPanel, leftDockVisible, leftDockTool, rightDockVisible, rightDockTool]);

  const restoreSnapshot = (edit: PendingEdit) => {
    inlineSessionRef.current = null;
    if (edit.draftBase) setElements(previous => ({ ...previous, ...edit.draftBase }));
    else setElements(prev => ({ ...prev, [edit.layerKey]: { ...edit.snapshot.element } }));
    setChildOrder([...edit.snapshot.order]);
    setDraftText(edit.snapshot.element.text || '');
    setIsInlineEditing(false);
    setLiveWidth(null);
  };

  const navigateDraft = (direction: -1 | 1) => {
    const current = draftRef.current;
    if (!usesDrafts || !current || operationRef.current || draftReplayPromise.current || busy || uncertainApplyId || undoRecoveryRef.current || moveGesture.current || resizeGesture.current) return false;
    const cursor = current.cursor + direction;
    if (cursor < 0 || cursor >= current.frames.length) return true;
    const frame = current.frames[cursor];
    operationRef.current = true; setBusy(true);
    void replaySourceDraft(frame.edit).then(success => {
      if (!success) return;
      inlineSessionRef.current = null;
      setElements(frame.elements); setChildOrder(frame.order); setReview(frame.edit);
      if (selectedLayer && !frame.elements[selectedLayer]) setSelectedLayerState(null);
      setLiveWidth(null); setIsInlineEditing(false); storeDraft({ ...current, cursor });
    }).finally(() => { operationRef.current = false; setBusy(false); });
    return true;
  };

  const restoreStoredDraft = async () => {
    if (!usesDrafts) return false;
    try {
      const raw = localStorage.getItem(projectDraftStorageKey);
      if (!raw) return false;
      const value = JSON.parse(raw) as StudioDraft;
      if (!isStudioDraft(value)) throw new Error('The saved draft could not be restored.');
      const frame = value.frames[value.cursor];
      const viewport = value.viewport;
      if (viewport && (viewport.width === null || Number.isInteger(viewport.width) && viewport.width >= 240 && viewport.width <= 3840) && typeof viewport.scope === 'string' && (!viewport.scope || /^[a-z0-9][a-z0-9-]{0,31}$/i.test(viewport.scope)) && ['desktop', 'tablet', 'mobile'].includes(viewport.preset)) {
        setViewportWidth(viewport.width); setActiveBreakpoint(viewport.scope); setBreakpoint(viewport.preset);
      }
      const file = ((frame.edit || value.frames.find(value => value.edit)?.edit) ? editPath((frame.edit || value.frames.find(value => value.edit)?.edit)!) : undefined);
      const page = defaultPages.find(page => page.id === value.pageId) || defaultPages.find(page => page.file === file);
      if (!repositoryId && page && page.id !== selectedPage.id) { setSourceReady(false); setSelectedPage(page); }
      needsDraftReplay.current = true;
      setElements(frame.elements); setChildOrder(frame.order); setReview(frame.edit);
      draftRef.current = value; setDraftState(value);
      if (frame.edit) {
        if (frame.edit.groupTransactionId) {
          const group = await changeSetAPI('status', frame.edit.groupTransactionId, [], repositoryId);
          if (group.success && ['saved', 'undone'].includes(group.state || '')) { setElements(rebaseDraftElements(frame.elements, frame.edit)); storeDraft(null); setReview(null); }
          else { setUncertainApplyId(frame.edit.id); showToast(group.error || 'This change set needs recovery. Use Resume Save.'); }
          return true;
        }
        if (Object.keys(draftHeads(frame.edit)).length > 1) return true;
        const outcome = await checkApplyOutcomeAPI(frame.edit.id, repositoryId ? { repositoryId, sourcePath: editPath(frame.edit) } : {});
        if (outcome.success) { setElements(rebaseDraftElements(frame.elements, frame.edit)); storeDraft(null); setReview(null); }
        else if (outcome.code === 'SOURCE_CHANGED') showToast('Previous draft restored. Source was updated outside — click Save to re-sync or Discard.');
        else if (outcome.code !== 'APPLY_NOT_APPLIED') showToast('Your draft is restored. The source needs checking before Save.');
      }
      return true;
    } catch (error) { setDraftStored(false); showToast(error instanceof Error ? error.message : 'Draft recovery is unavailable.'); return false; }
  };

  const preserveOperation = (kind: 'apply' | 'undo', edit: PendingEdit) => {
    const compact = (value: PendingEdit): PendingEdit => !usesDrafts ? value : { ...value, draftBase: undefined, sourceTargets: undefined, heads: value.heads ? Object.fromEntries(Object.entries(value.heads).map(([file, head]) => [file, { ...head, draftBase: undefined, sourceTargets: undefined, renderPatches: undefined }])) : undefined };
    const view: StudioRecoveryView = {
      edit: compact(edit), elements: !usesDrafts ? elements : { hero: defaultElements.hero, [edit.layerKey]: elements[edit.layerKey] || edit.snapshot.element }, order: childOrder,
      accepted: appliedSnapshots.current.slice(repositoryId ? -20 : -5).map(compact),
      breakpoint, activeBreakpoint, activeVariant, viewportWidth,
    };
    const record = saveStudioRecovery({
      kind, previewId: edit.id, editId: edit.editId, filePath: edit.filePath,
      repositoryId, sourcePath: repositoryId ? editPath(edit) : undefined, view
    });
    recoveryRecordRef.current = record;
    return record;
  };
  const finishOperationRecovery = (retainCheckpoint = false) => {
    if (!retainCheckpoint) {
      if (recoveryRecordRef.current) clearStudioRecovery(recoveryRecordRef.current);
      recoveryRecordRef.current = null;
    }
  };

  async function reconcileRestoredOperation(record: StudioRecoveryRecord) {
    if (recoveryChecking || !isRecoveryView(record.view, record)) return;
    const sequence = ++recoverySequenceRef.current;
    setRecoveryChecking(true); setRecoveryError('');
    const view = record.view;
    try {
      if (view.edit.groupTransactionId) {
        const group = await changeSetAPI('status', view.edit.groupTransactionId, [], record.repositoryId);
        setGroupProgress(group.success ? null : group);
        if (sequence !== recoverySequenceRef.current || recoveryRecordRef.current?.operationId !== record.operationId) return;
        const expected = record.kind === 'apply' ? 'saved' : 'undone';
        if (group.success && group.state === expected) {
          // A retained receipt can predate a new unsaved draft. Confirming that
          // older operation must never delete the newer browser draft.
          let newerDraft = false;
          try {
            const stored = JSON.parse(localStorage.getItem(projectDraftStorageKey) || 'null');
            if (stored !== null && !isStudioDraft(stored)) throw new Error('Invalid saved draft');
            newerDraft = Boolean(stored && stored.frames[stored.cursor].edit?.groupTransactionId !== view.edit.groupTransactionId);
          } catch { setRecoveryError('The source operation is confirmed, but the saved draft could not be read. Its browser data has been preserved.'); return; }
          if (newerDraft) {
            if (!await restoreStoredDraft()) { setRecoveryError('The newer draft could not be restored. Its browser data has been preserved.'); return; }
            appliedSnapshots.current = [...view.accepted.filter(edit => edit.groupTransactionId !== view.edit.groupTransactionId), ...(record.kind === 'apply' ? [{ ...view.edit, editId: view.edit.groupTransactionId }] : [])];
            setRestoredOperation(null); finishOperationRecovery(true); operationRef.current = false;
            showToast('Your current draft is restored. The earlier change-set operation is confirmed.'); return;
          }
        }
        if (!group.success || group.state !== expected || group.sourceCurrent === false) {
          setRecoveryError(group.error || `This change set needs explicit ${record.kind === 'apply' ? 'Save' : 'Undo'} recovery. No source write was retried.`);
          return;
        }
        appliedSnapshots.current = [...view.accepted.filter(edit => edit.groupTransactionId !== view.edit.groupTransactionId), ...(record.kind === 'apply' ? [{ ...view.edit, editId: view.edit.groupTransactionId }] : [])];
        setReview(null); storeDraft(null); setSelectedLayerState(null);
        setUncertainApplyId(null); setUncertainUndoId(null); undoRecoveryRef.current = null;
        finishOperationRecovery(true); setRestoredOperation(null); operationRef.current = false;
        showToast('Change-set recovery confirmed. Reconnect the preview if needed.');
        return;
      }
      const context = record.repositoryId ? { repositoryId: record.repositoryId, sourcePath: record.sourcePath } : {};
      const result = record.kind === 'apply'
        ? await checkApplyOutcomeAPI(record.previewId, context)
        : await checkUndoOutcomeAPI(record.filePath, { ...context, previewId: record.previewId, editId: record.editId });
      if (sequence !== recoverySequenceRef.current || recoveryRecordRef.current?.operationId !== record.operationId) return;
      const historicalConflict = !result.success && ['SOURCE_CHANGED', 'APPLY_ALREADY_UNDONE'].includes(result.code || '') || result.success && 'sourceCurrent' in result && result.sourceCurrent === false;
      if (historicalConflict && usesDrafts && await restoreStoredDraft()) {
        appliedSnapshots.current = [...view.accepted];
        finishOperationRecovery(); setRestoredOperation(null); operationRef.current = false;
        showToast('Your draft is restored. Source changes need resolving before Save.'); return;
      }
      if (!result.success && result.code !== 'APPLY_NOT_APPLIED' && result.code !== 'UNDO_NOT_APPLIED') {
        setRecoveryError(result.error || 'The operation is still unconfirmed. Checking again will only read its status.');
        return;
      }
      if (result.success && 'sourceCurrent' in result && result.sourceCurrent === false) {
        setRecoveryError('Undo is recorded, but the source changed afterward. Inspect the current source before restoring this editing view.');
        return;
      }
      appliedSnapshots.current = [...view.accepted];
      if (record.kind === 'apply') {
        if (result.success) {
          appliedSnapshots.current = [...view.accepted.filter(edit => edit.id !== record.previewId), { ...view.edit, editId: result.editId }];
          if (usesDrafts) setElements(rebaseDraftElements(view.elements, view.edit));
          setReview(null);
        } else if (usesDrafts) {
          // Local review can be restored without writing. Apply is still an
          // explicit action against the server's frozen proposal and source.
          setReview(view.edit); setSelectedLayerState(view.edit.layerKey);
        } else {
          restoreSnapshot(view.edit); setReview(null); setSelectedLayerState(null);
        }
      } else if (result.success) {
        appliedSnapshots.current = view.accepted.filter(edit => edit.id !== record.previewId);
        if (!('sourceCurrent' in result) || result.sourceCurrent !== false) restoreSnapshot(view.edit);
      }
      setUncertainApplyId(null); setUncertainUndoId(null); undoRecoveryRef.current = null;
      finishOperationRecovery(true); setRestoredOperation(null); operationRef.current = false;
      if (usesDrafts) await restoreStoredDraft();
      showToast(result.success
        ? `${record.kind === 'apply' ? 'Save' : 'Undo'} confirmed after reconnecting.${repositoryId ? ' Connect the project preview to continue.' : ''}`
        : record.kind === 'apply'
          ? repositoryId ? 'The save did not run. Reconnect and preview the change again.' : 'The save did not run. Your review is restored; Apply or Discard when ready.'
          : 'Undo did not run. Explicitly choose Undo when you are ready.');
    } finally { if (sequence === recoverySequenceRef.current) setRecoveryChecking(false); }
  }

  useEffect(() => {
    recoverySequenceRef.current++;
    operationRef.current = true;
    recoveryRecordRef.current = null;
    setRestoredOperation(null); setRecoveryError(''); setRecoveryChecking(false);
    const recovered = readStudioRecovery(repositoryId);
    if (recovered.status === 'empty') { void restoreStoredDraft().finally(() => { operationRef.current = false; setRecoveryBooting(false); }); return; }
    if (recovered.status === 'unavailable' || !isRecoveryView(recovered.record.view, recovered.record)) {
      setRecoveryError(recovered.status === 'unavailable' ? recovered.error : 'The saved editing view is incomplete. Inspect the current source before starting another session.');
      setRecoveryBooting(false); return;
    }
    const record = recovered.record;
    const view = record.view as StudioRecoveryView;
    const restoredPage = defaultPages.find(page => page.file === editPath(view.edit));
    if (!repositoryId && restoredPage) setSelectedPage(restoredPage);
    recoveryRecordRef.current = record;
    setElements(view.elements); setChildOrder(view.order); appliedSnapshots.current = view.accepted;
    if (!hasResponsivePreferences.current) {
      setBreakpoint(view.breakpoint); setActiveBreakpoint(usesDrafts ? view.activeBreakpoint : '');
      setViewportWidth(typeof view.viewportWidth === 'number' && Number.isInteger(view.viewportWidth) && view.viewportWidth >= 240 && view.viewportWidth <= 3840 ? view.viewportWidth : null);
    }
    setActiveVariant(view.activeVariant);
    setSelectedLayerState(repositoryId ? null : view.edit.layerKey);
    setRestoredOperation(record); setRecoveryBooting(false);
    // Restoring a tab only checks status. It cannot send Apply or Undo.
    void reconcileRestoredOperation(record);
    return () => { recoverySequenceRef.current++; };
    // Restore once for this project. Later interaction uses the explicit check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryId]);

  const runGroupOperation = async (kind: 'save' | 'undo', initial: PendingEdit, recovering = false) => {
    if ((operationRef.current || busy || isApplying) && !recovering) return;
    operationRef.current = true; setIsApplying(true);
    let edit = initial, committed = false;
    const newTransaction = !initial.groupTransactionId;
    try {
      if (!edit.groupTransactionId) {
        if (!sourceCanvas.current) throw new Error('Reconnect the source preview before saving.');
        const checked = await sourceCanvas.current.command('check', edit.sourceSelection, { patches: draftPatches(edit) });
        edit = { ...edit, groupTransactionId: crypto.randomUUID(), renderPatches: checked?.renderPatches || draftPatches(edit) };
        setReview(edit);
        const current = draftRef.current;
        if (current) storeDraft({ ...current, frames: current.frames.map((frame, index) => index === current.cursor ? { ...frame, edit } : frame) });
      }
      preserveOperation(kind === 'save' ? 'apply' : 'undo', edit);
      if (kind === 'save' && !recovering && !uncertainApplyId && edit.renderPatches?.some(patch => patch.order)) await sourceCanvas.current?.command('restore', null, { patches: [] });
      const result = await changeSetAPI(kind, edit.groupTransactionId!, Object.values(draftHeads(edit)).map(head => ({ previewId: head.id, filePath: editPath(head) })), repositoryId);
      if (!result.success || result.state !== (kind === 'save' ? 'saved' : 'undone')) {
        if (kind === 'save' && newTransaction && ['GROUP_REFUSED', 'GROUP_AUTH_DENIED'].includes(result.code || '')) {
          const unbound = { ...edit, groupTransactionId: undefined };
          setReview(unbound); finishOperationRecovery(); setUncertainApplyId(null); setGroupProgress(result);
          const current = draftRef.current;
          if (current) storeDraft({ ...current, frames: current.frames.map((frame, index) => index === current.cursor ? { ...frame, edit: unbound } : frame) });
          showToast(result.error || 'The change set was refused before source writes. Your draft is preserved.'); return;
        }
        if (kind === 'save') { setReview(edit); setUncertainApplyId(edit.id); }
        else { undoRecoveryRef.current = edit; setUncertainUndoId(edit.id); }
        setGroupProgress(result);
        setRecoveryError(recovering ? result.error || 'This change set still needs recovery.' : '');
        showToast(result.error || 'The change set is incomplete. Check its status or explicitly resume it.');
        return;
      }
      committed = true; setGroupProgress(null);
      if (kind === 'save') appliedSnapshots.current.push({ ...edit, editId: edit.groupTransactionId });
      else { appliedSnapshots.current = appliedSnapshots.current.filter(value => value.groupTransactionId !== edit.groupTransactionId); restoreSnapshot(edit); }
      setUncertainApplyId(null); setUncertainUndoId(null); undoRecoveryRef.current = null;
      setReview(null); storeDraft(null); setReviewOpen(false); setSelectedLayerState(null);
      if (kind === 'save') setElements(previous => rebaseDraftElements(previous, edit));
      setRecoveryError(''); setRestoredOperation(null); finishOperationRecovery(true);
      const expected = kind === 'save' ? edit.renderPatches : edit.renderPatches?.map(patch => ({ ...patch, after: patch.before, icon: patch.icon ? { before: patch.icon.after, after: patch.icon.before, beforeClassName: patch.icon.afterClassName, afterClassName: patch.icon.beforeClassName } : undefined, attributes: patch.beforeAttributes, className: patch.beforeClassName, text: patch.beforeText, orderAfter: patch.beforeOrder, computed: undefined }));
      if (result.sourceCurrent === false) { showToast('The change set is recorded, but source changed afterward. Reconnect and inspect the current source.'); return; }
      await sourceCanvas.current?.reload(undefined, undefined, undefined, expected);
      showToast(kind === 'save' ? 'Change set saved' : 'Change set undone');
    } catch (error) {
      if (committed) showToast('The source operation is recorded. Reconnect the preview to verify its rendered state.');
      else { showToast(error instanceof Error ? error.message : 'The change-set operation could not be confirmed.'); if (edit.groupTransactionId && recoveryRecordRef.current) { if (kind === 'save') setUncertainApplyId(edit.id); else { undoRecoveryRef.current = edit; setUncertainUndoId(edit.id); } } }
    } finally { operationRef.current = false; setIsApplying(false); }
  };

  const applySourceEdit = async () => {
    let edit = reviewRef.current;
    if (!edit || operationRef.current) return;
    if (edit.groupTransactionId || Object.keys(draftHeads(edit)).length > 1) { await runGroupOperation('save', edit); return; }
    let restoredForWrite = false;
    operationRef.current = true;
    setIsApplying(true);
    try {
      if (edit.sourceSelection && uncertainApplyId !== edit.id) {
        if (!sourceCanvas.current) throw new Error('Reconnect the actual project before applying.');
        const rendered = await sourceCanvas.current.command('check', edit.sourceSelection, { patches: edit.renderPatches });
        if (rendered?.renderPatches) { edit = { ...edit, renderPatches: rendered.renderPatches }; setReview(edit); }
      }
      const context = repositoryId ? { repositoryId, sourcePath: editPath(edit) } : {};
      if (uncertainApplyId !== edit.id) preserveOperation('apply', edit);
      if (usesDrafts && uncertainApplyId !== edit.id && edit.renderPatches?.some(patch => patch.order)) {
        // React still owns the pre-save host parents. Restore those nodes before
        // HMR reconciles the new source, then verify the saved revision below.
        await sourceCanvas.current?.command('restore', null, { patches: [] }); restoredForWrite = true;
      }
      const result = uncertainApplyId === edit.id
        ? await checkApplyOutcomeAPI(edit.id, context)
        : await applyEditAPI(edit.id, context);
      if (result.success) {
        setUncertainApplyId(null);
        appliedSnapshots.current.push({ ...edit, editId: result.editId });
        setReview(null);
        if (usesDrafts) {
          const savedEdit = edit;
          setElements(previous => rebaseDraftElements(previous, savedEdit));
          storeDraft(null); setReviewOpen(false);
          setSelectedLayerState(null); await sourceCanvas.current?.reload(undefined, undefined, undefined, edit.renderPatches);
        }
        if (!usesDrafts) { setSelectedLayerState(null); await sourceCanvas.current?.reload(edit.sourceSelection, edit.sourceText ? undefined : edit.newClassName, edit.sourceText ? edit.newValue : undefined, edit.renderPatches); }
        finishOperationRecovery(true);
        showToast('Changes saved');
      } else if (result.code === 'APPLY_NOT_APPLIED') {
        finishOperationRecovery(true);
        setUncertainApplyId(null);
        showToast(result.error || 'The original source is unchanged. Apply this reviewed change again, or discard it.');
      } else if (result.code === 'SOURCE_CHANGED' || result.code === 'APPLY_ALREADY_UNDONE' || result.code === 'PREVIEW_EXPIRED') {
        finishOperationRecovery();
        setUncertainApplyId(null);
        if (usesDrafts && edit && result.code === 'SOURCE_CHANGED') {
          try {
            const targetElem = edit.snapshot?.element;
            if (targetElem) {
              const rebaseKind = edit.sourceText ? 'text' : 'style';
              const rebasePayload = edit.sourceText
                ? { value: edit.newValue }
                : (edit.newClassName && edit.oldClassName)
                  ? { property: 'className', value: edit.newClassName }
                  : { property: edit.summary?.split(' ')[0] || 'maxWidth', value: edit.newValue || edit.newClassName };

              const freshPreview = await previewEditAPI({
                draft: true,
                kind: rebaseKind as any,
                filePath: edit.filePath,
                line: targetElem.line,
                column: targetElem.column,
                elementId: targetElem.id,
                tagName: targetElem.tag?.split('.')[0],
                className: targetElem.classes,
                ...(repositoryId ? { repositoryId, sourcePath: editPath(edit) } : {}),
                ...rebasePayload,
              });

              if (freshPreview.success && freshPreview.id) {
                const freshId = freshPreview.id;
                const retryApply = await applyEditAPI(freshId, context);
                if (retryApply.success) {
                  const updatedPending: PendingEdit = { ...edit, id: freshId, editId: retryApply.editId, layerKey: edit.layerKey || '' };
                  appliedSnapshots.current.push(updatedPending);
                  setReview(null);
                  setElements(previous => rebaseDraftElements(previous, updatedPending));
                  storeDraft(null);
                  setReviewOpen(false);
                  setSelectedLayerState(null);
                  await sourceCanvas.current?.reload(undefined, undefined, undefined, freshPreview.renderPatches);
                  finishOperationRecovery(true);
                  showToast('Draft re-synced with latest source and saved successfully.');
                  return;
                }
              }
            }
          } catch { /* Fallback to manual resolution */ }

          setReviewOpen(true);
          showToast(result.error || 'The source file changed outside this draft. Review changes or discard draft.');
          return;
        }
        if (usesDrafts && edit.draftBase) { showToast(result.error || 'Source changed. Your draft is preserved.'); return; }
        if (repositoryId) sourceCanvas.current?.reload();
        restoreSnapshot(edit);
        setReview(null);
        setSelectedLayerState(null);
        showToast(result.error || 'Source changed after preview. Select again.');
      } else {
        if (result.code === 'APPLY_UNCERTAIN' || result.code === 'SOURCE_RECOVERY_REQUIRED' || uncertainApplyId === edit.id) setUncertainApplyId(edit.id);
        else finishOperationRecovery();
        showToast(result.error || 'Could not apply change. Your review is still available.');
      }
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not apply change. Your review is still available.');
    } finally {
      if (restoredForWrite && reviewRef.current?.id === edit.id && !uncertainApplyId) { await sourceCanvas.current?.command('restore', null, { patches: edit.renderPatches || [] }).catch(() => { needsDraftReplay.current = true; }); }
      operationRef.current = false;
      setIsApplying(false);
    }
  };

  const requestSave = () => {
    if (!usesDrafts || uncertainApplyId) { void applySourceEdit(); return; }
    if (operationRef.current || moveGesture.current || resizeGesture.current) return;
    if (inlineSessionRef.current) {
      void sourceCanvas.current?.command('finish-text', sourceSelections.current[inlineSessionRef.current]).then(() => { saveTextRef.current = null; setSaveRequested(true); }).catch(error => showToast(error.message));
      return;
    }
    saveTextRef.current = selectedLayer && typeof activeElement.text === 'string' && draftText !== activeElement.text ? { key: selectedLayer, text: draftText } : null;
    inlineSessionRef.current = null; setIsInlineEditing(false);
    if (saveTextRef.current) {
      setInlineCommitKey(saveTextRef.current.key);
      void updateText(saveTextRef.current.text)?.finally(() => setInlineCommitKey(null));
    }
    setSaveRequested(true);
  };
  useEffect(() => {
    if (!saveRequested || busy || operationRef.current || deferredInlineCommit.current) return;
    setSaveRequested(false);
    const text = saveTextRef.current; saveTextRef.current = null;
    if (text && elements[text.key]?.text !== text.text) { showToast('The text could not be added to your draft. Nothing was saved.'); return; }
    void applySourceEdit();
  }, [saveRequested, busy, elements, pendingEdit, isInlineEditing]);

  const discardPendingEdit = async () => {
    if (usesDrafts && draftRef.current && !uncertainApplyId && !operationRef.current) {
      inlineSessionRef.current = null; setIsInlineEditing(false);
      const baseline = draftRef.current.frames[0];
      void replaySourceDraft(null);
      setElements(baseline.elements); setChildOrder(baseline.order); setReview(null); storeDraft(null); setReviewOpen(false);
      showToast('Draft discarded'); return;
    }
    const edit = reviewRef.current;
    if (!edit || operationRef.current) return;
    if (uncertainApplyId === edit.id) { showToast('Check save status before discarding. The source may already contain this change.'); return; }
    operationRef.current = true;
    setIsApplying(true);
    try {
      const discarded = await discardEditAPI(edit.id);
      if (!discarded) { showToast('Could not discard the preview. Please try again.'); return; }
      if (edit.sourceSelection) {
        try { await sourceCanvas.current?.command('discard', edit.sourceSelection); }
        catch { sourceCanvas.current?.reload(); }
        setSelectedLayerState(null);
      }
      restoreSnapshot(edit);
      if (recoveryRecordRef.current?.previewId === edit.id) finishOperationRecovery();
      setReview(null);
      showToast('Discarded visual adjustment');
    } finally {
      operationRef.current = false;
      setIsApplying(false);
    }
  };

  const handleUndo = async () => {
    if (moveGesture.current) { showToast('Release the Move handle or press Escape to cancel.'); return; }
    if (resizeGesture.current) { showToast('Release the width handle or press Escape to cancel resizing.'); return; }
    if (navigateDraft(-1)) return;
    if (operationRef.current || blocksReview()) { showToast(reviewNotice); return; }
    const last = undoRecoveryRef.current || appliedSnapshots.current.at(-1);
    if (!last) { showToast('There is no applied edit from this Studio session to undo.'); return; }
    if (last.groupTransactionId) { await runGroupOperation('undo', last); return; }
    if (!repositoryId && editPath(last) !== selectedPage.file) {
      const page = defaultPages.find(page => page.file === editPath(last));
      showToast(`Open ${page?.title || 'the last saved page'} before undoing its source change.`);
      return;
    }
    operationRef.current = true;
    setBusy(true);
    try {
      const context = { previewId: last.id, editId: last.editId, ...(repositoryId ? { repositoryId, sourcePath: editPath(last) } : {}) };
      if (!undoRecoveryRef.current) preserveOperation('undo', last);
      const result = undoRecoveryRef.current ? await checkUndoOutcomeAPI(last.filePath, context) : await undoEditAPI(last.filePath, context);
      if (result.success) {
        undoRecoveryRef.current = null; setUncertainUndoId(null);
        appliedSnapshots.current.pop();
        if (result.sourceCurrent !== false) restoreSnapshot(last);
        if (!usesDrafts) { setSelectedLayerState(null); await sourceCanvas.current?.reload(result.sourceCurrent === false ? undefined : last.sourceSelection, result.sourceCurrent === false || last.sourceText ? undefined : last.oldClassName, result.sourceCurrent === false ? undefined : last.sourceText ? last.sourceSelection?.textContent : undefined); }
        else {
          setSelectedLayerState(null);
          const expected = last.renderPatches?.map(patch => ({ ...patch, after: patch.before, icon: patch.icon ? { before: patch.icon.after, after: patch.icon.before, beforeClassName: patch.icon.afterClassName, afterClassName: patch.icon.beforeClassName } : undefined, attributes: patch.beforeAttributes, className: patch.beforeClassName, text: patch.beforeText, orderAfter: patch.beforeOrder, computed: undefined }));
          await sourceCanvas.current?.reload(undefined, undefined, undefined, expected);
        }
        finishOperationRecovery(true);
        showToast(result.message || 'Restored previous source state');
      } else {
        if (result.code === 'UNDO_NOT_APPLIED') { finishOperationRecovery(true); undoRecoveryRef.current = null; setUncertainUndoId(null); }
        else if (['UNDO_UNCERTAIN', 'UNDO_RECOVERY_REQUIRED', 'OUTCOME_SCOPE_MISMATCH', 'UNDO_UNKNOWN', 'UNDO_TARGET_CHANGED'].includes(result.code || '') && (undoRecoveryRef.current || result.code === 'UNDO_UNCERTAIN' || result.code === 'UNDO_RECOVERY_REQUIRED')) { undoRecoveryRef.current = last; setUncertainUndoId(last.id); }
        else finishOperationRecovery();
        showToast(result.error || 'Could not confirm Undo. Check its status before continuing.');
      }
    } catch (cause) { showToast(cause instanceof Error ? cause.message : 'Undo could not be verified. Reconnect the project before editing again.'); }
    finally { operationRef.current = false; setBusy(false); }
  };

  // Undo and spacing shortcuts. Escape is owned by the gesture/selection handler.
  useEffect(() => {
    const handleSave = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!(e.target instanceof Element && e.target.closest('dialog[open]'))) requestSave(); }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('dialog[open], input, textarea, select, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault(); navigateDraft(1);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (selectedLayer && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Controls own their arrow keys. The Move handle has its own handler;
        // navigating toolbar buttons or menus must never move source content.
        if (e.defaultPrevented || e.target instanceof Element && e.target.closest('button, a, summary, [role="separator"], [role="menu"], [role="dialog"], [role="slider"], [role="tablist"]')) return;
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right';
        nudgeTranslation(dir);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleSave, true);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keydown', handleSave, true); };
  }, [activeElement.filePath, selectedLayer, elements, pendingEdit, activeBreakpoint, activeVariant, draft, uncertainApplyId, isApplying, draftText]);

  // Update property helper
  const updateStyle = (property: string, value: string) => {
    if (!selectedLayer) return;
    const propKey = property === 'textAlign' ? 'alignment' : property;
    const commitVisual = () => setElements((prev) => {
      const el = prev[selectedLayer];
      if (!el) return prev;
      const updated = { ...el };
      let newClasses = updated.classes;
      if (property === 'padding') {
        const padNum = value.replace('p-', '');
        updated.paddingLeft = padNum;
        updated.paddingRight = padNum;
        updated.paddingTop = padNum;
        updated.paddingBottom = padNum;
        newClasses = newClasses.replace(/\bp-\d+\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'fontSize') {
        newClasses = newClasses.replace(/\btext-(xs|sm|base|lg|xl|[2-7]xl)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'fontWeight') {
        updated.fontWeight = ({ 'font-normal': 'Regular', 'font-semibold': 'Semi Bold', 'font-bold': 'Bold', 'font-extrabold': 'Extra Bold' } as Record<string, string>)[value] || value.replace('font-', '');
        newClasses = newClasses.replace(/\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (propKey === 'alignment') {
        newClasses = newClasses.replace(/\btext-(left|center|right|justify)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'textColor') {
        const hex = value.match(/#([0-9a-f]{6})/i)?.[1] || (value.includes('text-slate-900') ? '0F172A' : value.includes('text-white') ? 'FFFFFF' : value.includes('text-emerald-600') ? '059669' : value.includes('text-blue-600') ? '2563EB' : value.includes('text-rose-600') ? 'E11D48' : '0F172A');
        updated.textColor = hex;
        newClasses = newClasses.replace(/\btext-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b|\btext-(white|black)\b|\btext-\[#[0-9a-fA-F]{3,8}\]\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'backgroundColor') {
        updated.bgFill = value.replace('bg-', '');
        newClasses = newClasses.replace(/\bbg-(transparent|white|black|slate-\d+|emerald-\d+|blue-\d+|rose-\d+|pink-\d+)\b|\bbg-\[#[0-9a-fA-F]{3,8}\]\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'display') {
        updated.display = value;
        newClasses = newClasses.replace(/\b(block|inline-block|inline|flex|inline-flex|grid|hidden)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'flexDirection') {
        newClasses = newClasses.replace(/\b(flex-row|flex-col|flex-row-reverse|flex-col-reverse)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'justifyContent') {
        newClasses = newClasses.replace(/\bjustify-(start|end|center|between|around|evenly)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'alignItems') {
        newClasses = newClasses.replace(/\bitems-(start|end|center|baseline|stretch)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'gap') {
        newClasses = newClasses.replace(/\bgap-\d+\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'borderRadius') {
        updated.borderRadius = value;
        newClasses = newClasses.replace(/\brounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'borderWidth') {
        newClasses = newClasses.replace(/\bborder(-[0248])?\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'borderColor') {
        newClasses = newClasses.replace(/\bborder-(slate|emerald|blue|rose|transparent)-\d+\b|\bborder-(transparent|white|black)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'fontFamily') {
        updated.typeface = value === 'font-sans' ? 'Inter' : value === 'font-mono' ? 'Mono' : 'Inter';
        newClasses = newClasses.replace(/\bfont-(sans|serif|mono)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'fontStyle') {
        newClasses = newClasses.replace(/\b(italic|not-italic)\b/, '').trim();
        if (value === 'italic') newClasses = `${newClasses} italic`.trim();
      } else if (property === 'textDecoration') {
        newClasses = newClasses.replace(/\b(underline|no-underline|line-through)\b/, '').trim();
        if (value === 'underline') newClasses = `${newClasses} underline`.trim();
      } else if (property === 'width') {
        updated.width = value;
        newClasses = newClasses.replace(/\bw-(auto|full|1\/2|1\/3|2\/3|1\/4|3\/4|fit)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      } else if (property === 'maxWidth') {
        updated.maxWidth = value;
        newClasses = newClasses.replace(/\bmax-w-(none|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)\b/, '').trim();
        newClasses = `${newClasses} ${value}`.trim();
      }
      updated.classes = newClasses;
      return { ...prev, [selectedLayer]: updated };
    });
    void triggerBackendPreview('style', {
      property: propKey,
      value,
      breakpoint: activeBreakpoint || activeVariant || '',
    }, undefined, commitVisual);
  };

  const updateElementProp = (
    key: string, val: string,
    backendChange?: { kind: 'style' | 'text' | 'reorder' | 'nudge'; prop?: string; val?: string }
  ) => {
    if (!selectedLayer) return;
    if (!backendChange) {
      showToast('This control cannot yet write a verified source change. Nothing was changed.');
      return;
    }
    if (backendChange.kind === 'text') { updateText(val); return; }
    if (backendChange.kind === 'style' && backendChange.prop && backendChange.val) {
      updateStyle(backendChange.prop, backendChange.val);
    }
  };

  const updateText = (newVal?: string) => {
    const entered = newVal !== undefined ? newVal : draftText;
    const textVal = ['a', 'button'].includes(activeElement.tag) ? entered.trim() : entered;
    if (!selectedLayer || !textVal.trim() || textVal === activeElement.text) return;
    const key = selectedLayer;
    return triggerBackendPreview('text', { value: textVal }, key, () => {
      setElements(prev => ({ ...prev, [key]: { ...prev[key], text: textVal } }));
    });
  };

  const beginInlineText = (key: string) => {
    if (!usesDrafts || operationRef.current || draftReplayPromise.current || busy || blocksReview() || undoRecoveryRef.current) return;
    const selection = sourceSelections.current[key]; if (!selection || !/^(h[1-6]|p|a|button|span|label)$/.test(selection.tagName)) return;

    // Immediately enter inline text editing mode with zero latency (0ms)
    inlineSessionRef.current = key;
    setSelectedLayerState(key);
    setDraftText(selection.textContent || '');
    setIsInlineEditing(true);
    setShowQuickActions(false);
    inlinePropRef.current = null;

    void sourceCanvas.current?.command('begin-text', selection).catch(error => {
      inlineSessionRef.current = null;
      setIsInlineEditing(false);
      showToast(error.message);
    });

    if (!textInspectionCache.current[key]) {
      prefetchTextInspection(selection);
    }
    const inspectPromise = textInspectionCache.current[key];
    activeInlineInspection.current = inspectPromise || null;
    if (inspectPromise) {
      void inspectPromise.then(res => {
        if (!res.safe) {
          if (inlineSessionRef.current === key) {
            cancelInlineText(key);
            if (res.error) showToast(res.error);
          }
        } else if (res.prop) {
          inlinePropRef.current = res.prop;
        }
      });
    }
  };
  const finishInlineText = async (key: string, text: string) => {
    if (inlineSessionRef.current !== key) return;
    if (['a', 'button'].includes(elements[key]?.tag)) text = text.trim();
    if (!text.trim()) { cancelInlineText(key); showToast('Empty text was not applied. The previous wording is restored.'); return; }
    if (operationRef.current) { deferredInlineCommit.current = { key, text }; return; }
    inlineSessionRef.current = null; setIsInlineEditing(false); setDraftText(text);
    if (text === elements[key]?.text) return;

    if (activeInlineInspection.current) {
      const res = await activeInlineInspection.current;
      activeInlineInspection.current = null;
      if (!res.safe) return;
      if (res.prop) inlinePropRef.current = res.prop;
    }
    delete textInspectionCache.current[key];

    inlineCommittingRef.current = true; setInlineCommitKey(key);
    const prop = inlinePropRef.current?.key === key ? inlinePropRef.current : null; inlinePropRef.current = null;
    void triggerBackendPreview(prop ? 'component' : 'text', { value: text, ...(prop ? { property: prop.property, owner: prop.owner, definition: prop.definition } : {}) }, key, () => setElements(previous => ({ ...previous, [key]: { ...previous[key], text } }))).then(async success => {
      if (!success) await sourceCanvas.current?.command('cancel-text', sourceSelections.current[key]);
    }).catch(error => showToast(error.message)).finally(() => {
      inlineCommittingRef.current = false; setInlineCommitKey(null);
      if (queuedSelectionRef.current !== undefined) { setSelectedLayerState(queuedSelectionRef.current); queuedSelectionRef.current = undefined; }
    });
  };
  const cancelInlineText = (key: string) => {
    inlinePropRef.current = null;
    activeInlineInspection.current = null;
    deferredInlineCommit.current = null;
    inlineSessionRef.current = null; setIsInlineEditing(false); setDraftText(elements[key]?.text || '');
    void sourceCanvas.current?.command('cancel-text', sourceSelections.current[key]).catch(() => { });
  };
  useEffect(() => {
    if (busy || operationRef.current || !deferredInlineCommit.current) return;
    const commit = deferredInlineCommit.current; deferredInlineCommit.current = null;
    finishInlineText(commit.key, commit.text);
  }, [busy]);
  const receiveSourceText = (type: string, selection?: SourceSelection, text?: string, shift?: boolean) => {
    if (type === 'text-draft') { setDraftText(text || ''); return; }
    if (type === 'text-commit' && selection) { finishInlineText(sourceKey(selection), text || ''); return; }
    if (type === 'text-cancel' && selection) { cancelInlineText(sourceKey(selection)); return; }
    if (type === 'text-request' && selection) { sourceSelections.current[sourceKey(selection)] = selection; receiveSourceSelection(selection); beginInlineText(sourceKey(selection)); return; }
    if (type === 'save-request') { saveTextRef.current = null; setSaveRequested(true); return; }
    if (type === 'shortcut') { if (text === 'Escape') { if (directDragRef.current) { cancelActiveDragRef.current?.(); return; } if (destinationSource.current) cancelDestination(); else if (windowMode && windowPanel) setWindowPanel(null); else setSelectedLayer(null); } else if (text?.toLowerCase() === 's') requestSave(); else if (text?.toLowerCase() === 'y' || shift) navigateDraft(1); else void handleUndo(); }
  };

  const reorderSibling = (direction: 'earlier' | 'later') => {
    if (!selectedLayer) return;
    const selection = sourceSelections.current[selectedLayer]; if (!selection?.parentKey) return;
    const all = sourceLayers.filter(layer => layer.parentKey === selection.parentKey && layer.path === selection.path);
    const siblings = all.filter(layer => (layer.computed.order || '0') === (selection.computed.order || '0'));
    const index = siblings.findIndex(layer => layer.key === selectedLayer), next = siblings[index + (direction === 'earlier' ? -1 : 1)];
    if (!next) return;
    void triggerBackendPreview('reorder', { targetIndex: all.findIndex(layer => layer.key === next.key) });
  };

  const nudgeTranslation = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedLayer) return;
    if (!usesDrafts || !/^(h[1-6]|p|section|div|article|aside|header|footer|nav|main|a|button|img)$/.test(activeElement.tag) || activeVariant || activeBreakpoint) { showToast('To move an element, choose All sizes and the Default state.'); return; }
    try {
      const base = readTranslation(activeElement.classes);
      const next = vecAdd(base, {
        x: direction === 'left' ? -4 : direction === 'right' ? 4 : 0,
        y: direction === 'up' ? -4 : direction === 'down' ? 4 : 0,
      });
      void triggerBackendPreview('move', next);
    } catch (error) { showToast(error instanceof Error ? error.message : 'This element cannot be moved safely.'); }
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

  const FONT_SIZE_TO_PX: Record<string, number> = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
    '7xl': 72,
  };

  const toggleBold = () => {
    const isBold = Number(previewStyleFor(activeElement).fontWeight) >= 700 || (!activeVariant && ['Bold', 'Extra Bold'].includes(activeElement.fontWeight)) || scopeTokens(activeElement.classes).some(token => ['font-bold', 'font-extrabold', 'font-black'].includes(token));
    const nextVal = isBold ? 'font-normal' : 'font-bold';
    updateStyle('fontWeight', nextVal);
  };

  const toggleItalic = () => {
    const isItalic = scopeTokens(activeElement.classes).includes('italic');
    const nextVal = isItalic ? 'not-italic' : 'italic';
    updateStyle('fontStyle', nextVal);
  };

  const toggleUnderline = () => {
    const isUnderline = scopeTokens(activeElement.classes).includes('underline');
    const nextVal = isUnderline ? 'no-underline' : 'underline';
    updateStyle('textDecoration', nextVal);
  };

  const isTextElement = ['a', 'span', 'label'].includes(activeElement.tag) || ['text', 'paragraph', 'button', 'waitlist'].includes(selectedLayer || '') || activeElement.tag.startsWith('h') || activeElement.tag.startsWith('p') || activeElement.tag.startsWith('button');
  const openDefinitionStyles = async () => {
    const key = selectedLayer, selection = key ? sourceSelections.current[key] : undefined;
    if (!key || !selection?.instance || operationRef.current || busy || isApplying || blocksReview() || moveGesture.current || resizeGesture.current) return;
    operationRef.current = true; setBusy(true);
    try {
      const inspection = await inspectElementAPI({ repositoryId, filePath: selection.path, line: selection.line, column: selection.column, elementId: selection.elementId, tagName: selection.tagName });
      if (!inspection.found || !inspection.safeToEdit) { showToast(inspection.reason || 'This definition cannot be edited safely. Nothing was changed.'); return; }
      if (sourceSelection.current && sourceKey(sourceSelection.current) === key) setDefinitionStyleKey(key);
    } catch (error) { showToast(error instanceof Error ? error.message : 'The definition could not be inspected.'); }
    finally { operationRef.current = false; setBusy(false); }
  };
  const currentGapClass = activeElement.classes.match(/gap-(\d+)/)?.[0] || 'gap-2';
  const currentGapLabel = currentGapClass.replace('gap-', '');
  const isBold = Number(previewStyleFor(activeElement).fontWeight) >= 700 || (!activeVariant && ['Bold', 'Extra Bold'].includes(activeElement.fontWeight)) || scopeTokens(activeElement.classes).some(token => ['font-bold', 'font-extrabold', 'font-black'].includes(token));
  const isItalic = scopeTokens(activeElement.classes).includes('italic');
  const isUnderline = scopeTokens(activeElement.classes).includes('underline');

  // Responsive artboard width
  const artboardWidth = viewportWidth ? `${viewportWidth}px` : breakpoint === 'mobile' ? '375px' : breakpoint === 'tablet' ? '768px' : '100%';

  // Contextual formatting controls share the inspector's neutral surfaces.
  const renderMoveControl = () => {
    const supported = usesDrafts && /^(h[1-6]|p|section|div|article|aside|header|footer|nav|main|a|button|img)$/.test(activeElement.tag) && !activeVariant && !activeBreakpoint;
    const disabled = busy || isApplying || isResizing || reviewBlocking || Boolean(uncertainUndoId) || !supported;
    return (
      <div ref={moveControlRef} className={reviewStyles.moveControl} onClick={event => event.stopPropagation()}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setMoveOpen(false); }}>
        <button type="button" className={reviewStyles.moveTrigger} aria-label="Move element" aria-expanded={moveOpen}
          aria-pressed={moveArmed || Boolean(liveMove)} onPointerDown={event => { if (selectedLayer) startDragMove(selectedLayer, event); }}
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" aria-describedby="selection-move-hint"
          onKeyDown={event => {
            const directions: Record<string, 'up' | 'down' | 'left' | 'right'> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
            const direction = directions[event.key];
            if (!direction) return;
            event.preventDefault(); event.stopPropagation();
            if (!event.repeat && !disabled) { setMoveOpen(false); nudgeTranslation(direction); }
          }}
          aria-controls="selection-move-controls" disabled={disabled} onClick={() => { if (moveClickSuppressed.current) { moveClickSuppressed.current = false; return; } setMoveOpen(value => !value); }}>
          <Move size={15} /><span className="sr-only">Move</span>
        </button>
        <span id="selection-move-hint" className="sr-only">{!supported ? 'Move is available with All sizes and the Default state' : 'Drag to move this element and its contents. Click for arrow controls. Shift locks an axis. Escape cancels.'}</span>
        {moveOpen && <div id="selection-move-controls" className={reviewStyles.movePopover} role="group" aria-label="Move selected element">
          <div className={reviewStyles.moveHeading}><span>Move element</span><span>4 px steps</span></div>
          <div className={reviewStyles.movePad}>
            {([
              ['up', ArrowUp, 'Move up'], ['left', ArrowLeft, 'Move left'],
              ['down', ArrowDown, 'Move down'], ['right', ArrowRight, 'Move right'],
            ] as const).map(([direction, Icon, label]) => <button type="button" key={direction} aria-label={label}
              data-direction={direction} disabled={disabled} onClick={() => { setMoveOpen(false); nudgeTranslation(direction); }}><Icon size={16} /></button>)}
          </div>
          <p>Preview a step. Apply when it feels right.</p>
        </div>}
      </div>
    );
  };

  const renderHUDBar = () => {
    if (!selectedLayer || activeElement.tag === 'svg') return null;
    const locked = busy || isApplying || reviewBlocking || Boolean(uncertainUndoId) || destinationMode || viewportChanging || Boolean(activeBreakpoint) && scopeLoading;
    if (activeElement.instance && !editingDefinitionStyles) return createPortal(<div ref={formattingRef} role="toolbar" aria-label="Selection formatting" className={reviewStyles.floatingFormatting} data-menu-side={formattingPosition?.menuSide} data-menu-align={formattingPosition?.menuAlign} style={{ position: 'fixed', left: formattingPosition?.left || 0, top: formattingPosition?.top || 0, visibility: formattingPosition?.visible ? 'visible' : 'hidden' }} onClick={event => event.stopPropagation()}><div className={reviewStyles.formattingBar}>
      {isTextElement && <button type="button" className={reviewStyles.editTextControl} disabled={locked} onClick={() => beginInlineText(selectedLayer)}><Pencil size={13} /><span>Edit text</span></button>}
      <button type="button" className={reviewStyles.editTextControl} disabled={locked} onClick={() => { setWindowPanel('inspector'); setRightDockVisible(true); setRightDockTool('inspect'); requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="Component properties"] textarea, [aria-label="Component properties"] select')?.focus()) }}><SlidersHorizontal size={13} /><span>Instance props</span></button>
    </div></div>, document.body);
    const parentKey = sourceSelections.current[selectedLayer]?.parentKey;
    const siblings = parentKey ? sourceLayers.filter(layer => layer.parentKey === parentKey && layer.path === activeElement.filePath && (layer.computed.order || '0') === (sourceSelections.current[selectedLayer]?.computed.order || '0')) : [];
    const siblingIndex = siblings.findIndex(layer => layer.key === selectedLayer);
    const canArrange = usesDrafts && !activeElement.instance && !activeVariant && !activeBreakpoint && siblingIndex >= 0 && siblings.length > 1;
    const tokens = scopeTokens(activeElement.classes);
    const alignmentToken = tokens.find(token => ['text-left', 'text-center', 'text-right'].includes(token)) || '';
    const selectedNode = elementRefs.current[selectedLayer];
    const alignment = alignmentToken.slice(5) || (selectedNode ? getComputedStyle(selectedNode.querySelector('h1, p, button, a') || selectedNode).textAlign : 'left');
    const AlignmentIcon = alignment === 'center' ? AlignCenter : alignment === 'right' || alignment === 'end' ? AlignRight : AlignLeft;
    const sizes = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72];
    const authoredSize = tokens.find(token => (styleOptions.fontSize as readonly string[]).includes(token));
    const renderedSize = Number.parseFloat(String(activeElement.previewStyle?.fontSize || ''));
    const customSize = Number.isFinite(renderedSize) && (!authoredSize || Math.abs(renderedSize - sizes[(styleOptions.fontSize as readonly string[]).indexOf(authoredSize)]) > .1);
    const textColors = [
      ['Charcoal', 'text-slate-900', '#0f172a'], ['Gray', 'text-slate-600', '#475569'],
      ['Green', 'text-emerald-600', '#059669'], ['Blue', 'text-blue-600', '#2563eb'],
      ['Rose', 'text-rose-600', '#e11d48'], ['White', 'text-white', '#ffffff'], ['Black', 'text-black', '#000000'],
    ];
    const fills = [
      ['None', 'bg-transparent', 'transparent'], ['White', 'bg-white', '#ffffff'],
      ['Mist', 'bg-slate-50', '#f8fafc'], ['Charcoal', 'bg-slate-900', '#0f172a'],
      ['Green', 'bg-emerald-600', '#059669'], ['Blue', 'bg-blue-600', '#2563eb'],
      ['Rose', 'bg-rose-500', '#f43f5e'], ['Pink', 'bg-pink-500', '#ec4899'],
    ];
    const colorSections: { label: string; property: string; colors: string[][] }[] = [
      ...(isTextElement ? [{ label: 'Text color', property: 'textColor', colors: textColors }] : []),
      { label: 'Fill', property: 'backgroundColor', colors: fills },
    ];
    const isActionElement = ['button', 'a'].includes(activeElement.tag.toLowerCase());
    const hud = (
      <div ref={formattingRef} role="toolbar" aria-label="Selection formatting"
        className={reviewStyles.floatingFormatting} data-menu-side={formattingPosition?.menuSide} data-menu-align={formattingPosition?.menuAlign}
        style={{ position: 'fixed', left: formattingPosition?.left || 0, top: formattingPosition?.top || 0, visibility: formattingPosition?.visible ? 'visible' : 'hidden' }}
        onClick={event => event.stopPropagation()}
        onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setShowQuickActions(false); }}>
        <div className={reviewStyles.formattingBar}>
          {isActionElement ? (
            <button type="button" className={reviewStyles.editTextControl} disabled={locked} onClick={() => {
              setShowQuickActions(false);
              if (usesDrafts && selectedLayer) beginInlineText(selectedLayer);
              else {
                setOpenSections(previous => ({ ...previous, text: true }));
                requestAnimationFrame(() => {
                  const input = document.querySelector<HTMLInputElement>('input[aria-label="Content"]');
                  input?.focus(); input?.select();
                });
              }
            }}><Pencil size={13} strokeWidth={1.7} /><span>Edit text</span></button>
          ) : isTextElement ? <>
            <button type="button" className={reviewStyles.editTextControl} disabled={locked} onClick={() => {
              setShowQuickActions(false);
              if (usesDrafts && selectedLayer) beginInlineText(selectedLayer);
              else {
                setOpenSections(previous => ({ ...previous, text: true }));
                requestAnimationFrame(() => {
                  const input = document.querySelector<HTMLInputElement>('input[aria-label="Content"]');
                  input?.focus(); input?.select();
                });
              }
            }}><Pencil size={13} strokeWidth={1.7} /><span>Edit text</span></button>
            <span className={reviewStyles.formatDivider} aria-hidden="true" />
            <label className={reviewStyles.primaryFormatSelect}>
              <span aria-hidden="true">Aa<ChevronDown size={10} /></span>
              <select aria-label="Typeface" disabled={locked} value={tokens.find(token => ['font-sans', 'font-serif', 'font-mono'].includes(token)) || ''}
                onChange={event => updateStyle('fontFamily', event.target.value)}>
                <option value="" disabled>Inherited typeface</option><option value="font-sans">Project sans</option>
                <option value="font-serif">Project serif</option><option value="font-mono">Project mono</option>
              </select>
            </label>
            <label className={reviewStyles.fontSizeControl}>
              <span className="sr-only">Font size</span>
              <select disabled={locked} value={customSize ? '__computed' : authoredSize || ''}
                onChange={event => updateStyle('fontSize', event.target.value)}>
                <option value="" disabled>Auto</option>
                {customSize && <option value="__computed" disabled>{Math.round(renderedSize * 10) / 10}</option>}
                {styleOptions.fontSize.map((value, index) => <option key={value} value={value}>{sizes[index]}</option>)}
              </select><ChevronDown size={10} aria-hidden="true" />
            </label>
            <button type="button" className={reviewStyles.formatIcon} aria-label="Toggle bold" title="Bold"
              disabled={locked} aria-pressed={isBold} onClick={toggleBold}><strong>B</strong></button>
            <label className={reviewStyles.primaryFormatSelect}>
              <span aria-hidden="true"><AlignmentIcon size={14} /><ChevronDown size={10} /></span>
              <select aria-label="Text alignment" disabled={locked} value={alignmentToken} onChange={event => updateStyle('alignment', event.target.value)}>
                <option value="" disabled>Inherited alignment</option><option value="text-left">Align left</option>
                <option value="text-center">Align center</option><option value="text-right">Align right</option>
              </select>
            </label>
          </> : <>
            <span className={reviewStyles.elementTag}>{activeElement.tag}</span>
            <label className={reviewStyles.paddingControl}><span>Padding</span>
              <select aria-label="Padding" disabled={locked} value={tokens.find(token => (styleOptions.padding as readonly string[]).includes(token)) || ''}
                onChange={event => updateStyle('padding', event.target.value)}>
                <option value="" disabled>Auto</option>
                {styleOptions.padding.map(value => <option key={value} value={value}>{value.slice(2)}</option>)}
              </select>
            </label>
          </>}
          <span className={reviewStyles.formatDivider} aria-hidden="true" />
          <button ref={formattingMoreRef} type="button" className={reviewStyles.formatIcon} aria-label="More formatting options"
            aria-haspopup="dialog" aria-expanded={showQuickActions} aria-controls={showQuickActions ? 'selection-formatting-details' : undefined}
            onClick={() => setShowQuickActions(value => !value)}
            onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); event.stopPropagation(); setShowQuickActions(true); } }}>
            <MoreHorizontal size={16} />
          </button>
        </div>
        {showQuickActions && <div id="selection-formatting-details" role="dialog" aria-label="More formatting options"
          data-formatting-details className={reviewStyles.formatDetails}>
          <div className={reviewStyles.formatDetailsHeading}><span>{isTextElement ? 'Text options' : 'Element options'}</span>
            <button type="button" aria-label="Close formatting options" onClick={() => { setShowQuickActions(false); formattingMoreRef.current?.focus(); }}><X size={13} /></button>
          </div>
          {isTextElement && <>
            <div className={reviewStyles.formatOptionRow}><span>Style</span><div className={reviewStyles.formatButtonGroup}>
              <button type="button" aria-label="Toggle italic" aria-pressed={isItalic} disabled={locked} onClick={toggleItalic}><i>I</i><span>Italic</span></button>
              <button type="button" aria-label="Toggle underline" aria-pressed={isUnderline} disabled={locked} onClick={toggleUnderline}><u>U</u><span>Underline</span></button>
            </div></div>
          </>}
          {colorSections.map(({ label, property, colors }) => (
            <div className={reviewStyles.formatColorSection} key={label}>
              <span>{label}</span><div className={reviewStyles.formatSwatches} role="group" aria-label={label}>
                {colors.map(([name, value, color]) => <button type="button" key={value} disabled={locked}
                  aria-label={`${label}: ${name}`} title={name} aria-pressed={tokens.includes(value)}
                  onClick={() => updateStyle(property, value)}>
                  <span style={{ background: color }} className={value === 'bg-transparent' ? reviewStyles.noFill : undefined} />
                </button>)}
              </div>
            </div>
          ))}
          {canArrange && <div className={reviewStyles.arrangeOptions} role="group" aria-label="Order in container">
            <span>Order in container</span><div>
              <button type="button" disabled={locked || siblingIndex === 0} onClick={() => { setShowQuickActions(false); reorderSibling('earlier'); }}><ArrowUp size={13} /><span>Move earlier</span></button>
              <button type="button" disabled={locked || siblingIndex === siblings.length - 1} onClick={() => { setShowQuickActions(false); reorderSibling('later'); }}><ArrowDown size={13} /><span>Move later</span></button>
            </div>
          </div>}
          <div className={reviewStyles.formatMenuFooter}>
            {usesDrafts && !activeVariant && !activeBreakpoint && <button type="button" disabled={locked} onClick={() => { if (!selectedLayer) return; destinationSource.current = selectedLayer; setDestinationMode(true); setShowQuickActions(false); }}><ArrowUpRight size={13} /><span>Move to…</span></button>}
            <button type="button" onClick={async () => {
              try { await navigator.clipboard.writeText(activeElement.classes); showToast('Styles copied'); }
              catch { showToast('Could not copy styles. Check browser clipboard access.'); }
              setShowQuickActions(false); formattingMoreRef.current?.focus();
            }}><Copy size={13} /><span>Copy styles</span></button>
            <button type="button" disabled={locked} onClick={() => { setSelectedLayer(null); setShowQuickActions(false); }}><X size={13} /><span>Deselect</span></button>
          </div>
        </div>}
      </div>
    );
    return createPortal(hud, document.body);
  };

  const ALL_8_HANDLES: { dir: HandleDirection; label: string; title: string; styleClass: string }[] = [
    { dir: 'nw', label: 'Resize width from top left', title: 'Drag corner to resize width', styleClass: reviewStyles.handleNw },
    { dir: 'n', label: 'Resize width from top', title: 'Drag side to resize width', styleClass: reviewStyles.handleN },
    { dir: 'ne', label: 'Resize width from top right', title: 'Drag corner to resize width', styleClass: reviewStyles.handleNe },
    { dir: 'e', label: 'Resize width from right', title: 'Drag side to resize width', styleClass: reviewStyles.handleE },
    { dir: 'se', label: 'Resize width from bottom right', title: 'Drag corner to resize width', styleClass: reviewStyles.handleSe },
    { dir: 's', label: 'Resize width from bottom', title: 'Drag side to resize width', styleClass: reviewStyles.handleS },
    { dir: 'sw', label: 'Resize width from bottom left', title: 'Drag corner to resize width', styleClass: reviewStyles.handleSw },
    { dir: 'w', label: 'Resize width from left', title: 'Drag side to resize width', styleClass: reviewStyles.handleW },
  ];

  const renderSourceSelection = (selection: SourceSelection) => {
    const layerKey = sourceKey(selection);
    if (selectedLayer !== layerKey || !elements[layerKey]) return null;
    const zoomVal = resolveStageScale(layerKey);
    const renderedElem = elements[layerKey] || activeElement;
    const currentW = selection.rect.width;
    const currentH = selection.rect.height;
    const currentRadius = renderedElem.borderRadius || selection.computed.borderRadius || '0px';

    const iframeDoc = sourceCanvas.current?.getDocument?.();
    const targetEl = findSourceElementInDocument(iframeDoc, selection);
    const transformChain = targetEl
      ? extractElementTransformChain(targetEl)
      : hydrateSerializedTransformChain(selection.transformChain);
    const lastFrame = transformChain.length > 0 ? transformChain[transformChain.length - 1] : null;
    const boxW = lastFrame && lastFrame.width > 0 ? lastFrame.width : currentW;
    const boxH = lastFrame && lastFrame.height > 0 ? lastFrame.height : currentH;

    const isMediaEl = /^(img|video|svg|canvas|picture)$/i.test(renderedElem.tag || selection.tagName);
    const aspectLocked = aspectLockOverrides.current[layerKey] ?? isMediaEl;

    const tagLower = (renderedElem.tag || selection.tagName).toLowerCase();
    const isAct =
      ['button', 'input', 'select'].includes(tagLower) ||
      (tagLower === 'a' &&
        Boolean(
          (selection.computed.backgroundColor &&
            selection.computed.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
            selection.computed.backgroundColor !== 'transparent') ||
          selection.attributes?.role === 'button' ||
          /\b(btn|button|bg-|rounded-)\b/.test(renderedElem.classes || '')
        ));

    const chrome = selectionStyleFor({
      tag: renderedElem.tag || selection.tagName,
      role: undefined,
      display: undefined,
      width: boxW,
      height: boxH,
      borderRadius: currentRadius,
      isText: !isAct && /^(h[1-6]|p|span|a|label|strong|em|b|i|small)$/i.test(tagLower),
      isMedia: isMediaEl,
      isControl: isAct,
      zoom: zoomVal,
      lockedAspect: aspectLocked,
      currentVariant: previousVariantRef.current[layerKey],
    });
    previousVariantRef.current[layerKey] = chrome.variant;
    radiusGripInsetRef.current[layerKey] = chrome.radiusGrip.inset;

    const chromeGeom: SelectionChromeGeometry | null =
      transformChain.length > 0
        ? computeSelectionChromeGeometry(
          transformChain,
          { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1 },
          chrome.visibleHandles
        )
        : null;
    const isOriented = Boolean(chromeGeom?.isNonTrivialTransform);

    // SVG outline path offset 2px outside
    const outlinePath =
      chromeGeom && isOriented
        ? buildQuadOutlinePath(
          transformQuadByOffset(chromeGeom.prediction.quad, -selection.rect.left, -selection.rect.top),
          2
        )
        : buildRoundedRectPath(
          -2,
          -2,
          currentW + 4,
          currentH + 4,
          {
            tl: chrome.outlineRadii.tl + (chrome.outlineRadii.tl > 0 ? 2 : 0),
            tr: chrome.outlineRadii.tr + (chrome.outlineRadii.tr > 0 ? 2 : 0),
            br: chrome.outlineRadii.br + (chrome.outlineRadii.br > 0 ? 2 : 0),
            bl: chrome.outlineRadii.bl + (chrome.outlineRadii.bl > 0 ? 2 : 0),
          }
        );

    const toggleAspectLock = (e: React.MouseEvent) => {
      e.stopPropagation();
      aspectLockOverrides.current[layerKey] = !aspectLocked;
      setElements(prev => ({ ...prev }));
    };

    return (
      <div
        key={layerKey}
        ref={element => { elementRefs.current[layerKey] = element; }}
        className={`${reviewStyles.sourceSelection} ${outlineDrag ? reviewStyles.sourceSelectionOutline : ''}`}
        aria-label="Selected source element"
        data-selection-variant={chrome.variant}
        data-selection-oriented={isOriented ? 'true' : undefined}
        style={{
          width: '100%',
          height: '100%',
          fontSize: selection.computed.fontSize,
          textAlign: selection.computed.textAlign as React.CSSProperties['textAlign'],
        }}
      >
        {/* SVG Overlay layer with dual-stroke 1.5px accent over 1px white halo */}
        <svg
          key={overlayResetTick}
          className={reviewStyles.selectionSvg}
          style={{ inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* 1. Halo outline */}
          <path
            ref={el => { outlineHaloRef.current[layerKey] = el; }}
            d={outlinePath}
            className={reviewStyles.outlineHalo}
          />
          {/* 2. Accent outline */}
          <path
            ref={el => { outlineAccentRef.current[layerKey] = el; }}
            d={outlinePath}
            className={`${reviewStyles.outlineAccent} ${outlineDrag ? reviewStyles.outlineDashed : ''}`}
          />

          {/* Corner arcs for arc or circle variant */}
          {!isOriented &&
            (chrome.variant === 'arc' || chrome.variant === 'circle') &&
            (['nw', 'ne', 'se', 'sw'] as const).map(corner => {
              if (!chrome.visibleHandles.includes(corner)) return null;
              const arc = chrome.variant === 'circle'
                ? buildCircleArcPath(corner, currentW, zoomVal)
                : buildCornerArcPath(corner, currentW, currentH, chrome.outlineRadii, zoomVal);
              return (
                <g key={`arc-group-${corner}`}>
                  <path
                    ref={el => {
                      if (!cornerArcRefs.current[layerKey]) cornerArcRefs.current[layerKey] = {};
                      cornerArcRefs.current[layerKey][corner] = {
                        halo: el,
                        accent: cornerArcRefs.current[layerKey][corner]?.accent ?? null,
                      };
                    }}
                    d={arc.path}
                    className={reviewStyles.handleArcHalo}
                  />
                  <path
                    ref={el => {
                      if (!cornerArcRefs.current[layerKey]) cornerArcRefs.current[layerKey] = {};
                      cornerArcRefs.current[layerKey][corner] = {
                        halo: cornerArcRefs.current[layerKey][corner]?.halo ?? null,
                        accent: el,
                      };
                    }}
                    d={arc.path}
                    className={`${reviewStyles.handleArc} ${isResizing && resizeHandle === corner ? reviewStyles.handleArcActive : ''}`}
                  />
                </g>
              );
            })}
        </svg>

        {/* Move anchor */}
        {usesDrafts && (!selection.instance || definitionStyleKey === layerKey) && !isInlineEditing && (
          <div className={reviewStyles.moveAnchor}>{renderMoveControl()}</div>
        )}

        {/* Media Aspect Lock Toggle Badge */}
        {chrome.variant === 'media' && !isInlineEditing && !isDraggingMove && (
          <button
            type="button"
            role="button"
            aria-label={aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio free'}
            title={aspectLocked ? 'Aspect ratio locked (Click to unlock, or hold Shift while dragging)' : 'Aspect ratio free (Click to lock)'}
            className={reviewStyles.aspectLockBadge}
            onClick={toggleAspectLock}
          >
            {aspectLocked ? <Lock size={10} strokeWidth={2} /> : <Unlock size={10} strokeWidth={2} />}
            <span>{aspectLocked ? 'Locked' : 'Free'}</span>
          </button>
        )}

        {/* Radius Grip */}
        {chrome.radiusGrip.visible && !isInlineEditing && !isDraggingMove && (() => {
          let gripLeft = chrome.radiusGrip.inset;
          let gripTop = chrome.radiusGrip.inset;
          if (isOriented && chromeGeom) {
            const gripPt = transformPoint(chromeGeom.prediction.matrix, {
              x: chrome.radiusGrip.inset,
              y: chrome.radiusGrip.inset,
            });
            gripLeft = gripPt.x - selection.rect.left;
            gripTop = gripPt.y - selection.rect.top;
          }
          return (
            <button
              ref={el => { radiusGripRef.current[layerKey] = el; }}
              type="button"
              role="slider"
              data-base-left={`${gripLeft}px`}
              data-base-top={`${gripTop}px`}
              aria-label="Adjust corner radius"
              title="Drag to adjust corner radius (Arrow keys to change step)"
              aria-valuemin={0}
              aria-valuemax={Math.round(Math.min(boxW, boxH) / 2)}
              aria-valuenow={Math.round(chrome.effectiveRadius)}
              aria-valuetext={`${Math.round(chrome.effectiveRadius)}px radius`}
              className={reviewStyles.radiusGrip}
              style={{
                left: `${gripLeft}px`,
                top: `${gripTop}px`,
              }}
              onPointerDown={startRadiusDrag}
              onKeyDown={handleRadiusKeyDown}
              onClick={e => e.stopPropagation()}
            >
              <span className={reviewStyles.radiusGripDot} />
            </button>
          );
        })()}

        {/* Interactive Resize Handles */}
        {!isInlineEditing && !isDraggingMove && (
          <>
            {ALL_8_HANDLES.map(h => {
              if (!chrome.visibleHandles.includes(h.dir)) return null;
              const isCorner = ['nw', 'ne', 'se', 'sw'].includes(h.dir);
              const isArc = !isOriented && (chrome.variant === 'arc' || chrome.variant === 'circle') && isCorner;

              let customStyle: React.CSSProperties | undefined = undefined;
              const orientedPt = isOriented ? chromeGeom?.handleScreenPoints[h.dir] : undefined;
              if (orientedPt) {
                customStyle = {
                  left: `${orientedPt.x - selection.rect.left}px`,
                  top: `${orientedPt.y - selection.rect.top}px`,
                  transform: 'translate(-50%, -50%)',
                  cursor: chromeGeom?.edgeCursors[h.dir],
                };
              } else if (isArc) {
                const corner = h.dir as 'nw' | 'ne' | 'se' | 'sw';
                const arc = chrome.variant === 'circle'
                  ? buildCircleArcPath(corner, currentW, zoomVal)
                  : buildCornerArcPath(corner, currentW, currentH, chrome.outlineRadii, zoomVal);
                customStyle = {
                  left: `${arc.center.x}px`,
                  top: `${arc.center.y}px`,
                  transform: 'translate(-50%, -50%)',
                };
              }

              const cursorClass = isOriented
                ? ''
                : h.dir === 'ne' || h.dir === 'sw'
                  ? reviewStyles.westCorner
                  : h.dir === 'nw' || h.dir === 'se'
                    ? reviewStyles.eastCorner
                    : '';

              return (
                <button
                  key={h.dir}
                  data-resize-handle={h.dir}
                  data-base-left={customStyle?.left !== undefined ? String(customStyle.left) : ''}
                  data-base-top={customStyle?.top !== undefined ? String(customStyle.top) : ''}
                  ref={el => {
                    if (!handleButtonRefs.current[layerKey]) handleButtonRefs.current[layerKey] = {};
                    handleButtonRefs.current[layerKey][h.dir] = el;
                  }}
                  type="button"
                  role="slider"
                  aria-label={h.label}
                  title={h.title}
                  aria-pressed={isResizing && resizeHandle === h.dir}
                  className={`${reviewStyles.resizeHandle} ${h.styleClass} ${cursorClass}`}
                  style={customStyle}
                  onPointerDown={e => startResize(h.dir, e)}
                  onKeyDown={resizeWithKeyboard}
                  onClick={e => e.stopPropagation()}
                >
                  {isArc ? (
                    <span className={reviewStyles.handleHitArea} />
                  ) : (
                    <span className={reviewStyles.handleDot} />
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>
    );
  };


  const renderHistoryControls = () => <EditorHistoryControls
    historyDisabled={busy || isApplying || isInlineEditing || isResizing || moveArmed}
    undoDisabled={busy || isApplying || moveArmed || isResizing || Boolean(uncertainApplyId)}
    redoDisabled={!draft || draft.cursor >= draft.frames.length - 1 || busy || isApplying || Boolean(uncertainApplyId) || moveArmed || isResizing}
    undoLabel={uncertainUndoId ? undoRecoveryRef.current?.groupTransactionId ? 'Resume Undo' : 'Check Undo status' : 'Undo'}
    showRedo={usesDrafts} onHistory={() => setHistoryOpen(true)} onUndo={handleUndo} onRedo={() => navigateDraft(1)}
  />;
  const draftStatus = isApplying ? 'Saving…' : uncertainApplyId ? 'Check save status' : draftReplaying ? 'Restoring draft…' : busy ? 'Updating draft…' : selectedLayer && typeof activeElement.text === 'string' && draftText !== activeElement.text ? 'Editing text…' : draft ? (draftStored ? `Draft saved · ${draft.cursor} ${draft.cursor === 1 ? 'change' : 'changes'}${Object.keys(draftHeads(pendingEdit)).length > 1 ? ' · ' + Object.keys(draftHeads(pendingEdit)).length + ' files' : ''}` : 'Draft in memory') : 'All changes saved';
  const renderDraftControls = () => (
    <div className="flex items-center gap-2">
      {saveQueueState.status === 'saving' && (
        <span className={reviewStyles.saveBadgeSaving} aria-live="polite">
          <LoaderCircle size={12} className="animate-spin text-emerald-500" />
          <span>Saving…</span>
        </span>
      )}
      {saveQueueState.status === 'saved' && (
        <span className={reviewStyles.saveBadgeSaved} aria-live="polite">
          <Check size={12} />
          <span>Saved</span>
        </span>
      )}
      {saveQueueState.status === 'error' && (
        <span className={reviewStyles.saveBadgeError} role="alert">
          <CircleAlert size={12} />
          <span>{saveQueueState.message || 'Save error'}</span>
        </span>
      )}
      {usesDrafts && <EditorDraftControls
        saveLabel={uncertainApplyId ? pendingEdit?.groupTransactionId ? 'Resume Save' : 'Check save' : 'Save changes'}
        disabled={(!pendingEdit && draftText === activeElement.text) || busy || isApplying || moveArmed || isResizing || destinationMode}
        onSave={requestSave}
        onDiscard={discardPendingEdit}
        hasDraft={Boolean(pendingEdit)}
      />}
    </div>
  );
  const renderCanvasControls = () => <EditorViewportControls
    viewport={breakpoint} requestedWidth={viewportWidth}
    disabled={busy || isApplying || isInlineEditing || isResizing || moveArmed || Boolean(liveMove)}
    onViewport={(value, width) => { setBreakpoint(value); setViewportWidth(width); }}
    responsive={{
      width: actualViewportWidth, requestedWidth: viewportWidth, scope: activeBreakpoint, scopes: resolvedResponsiveScopes, loading: scopeLoading, error: scopeError, scopeDisabled: !usesDrafts,
      disabled: !sourceReady || busy || isApplying || isInlineEditing || isResizing || moveArmed || destinationMode || Boolean(liveMove) || Boolean(uncertainApplyId) || Boolean(uncertainUndoId),
      onWidth: setViewportWidth,
      onScope: name => { setActiveBreakpoint(name); setActiveVariant(''); const scope = resolvedResponsiveScopes.find(item => item.name === name); if (scope) setViewportWidth(Math.ceil(scope.minWidth)); }
    }}
  >{windowMode && renderHistoryControls()}</EditorViewportControls>;

  const renderGroupProgress = () => groupProgress && <section className={reviewStyles.groupProgress} aria-label="Change-set recovery">
    <strong>{groupProgress.state === 'undoing' ? 'Undo needs recovery' : 'Save needs recovery'}</strong>
    <p>{groupProgress.error || 'This operation has not completed. Explicitly resume it before editing.'}</p>
    {!!groupProgress.members?.length && <ul>{groupProgress.members.map(member => <li key={member.previewId}><span title={member.sourcePath || member.filePath}>{member.sourcePath || member.filePath}</span><small>{member.written ? 'Written' : 'Needs confirmation'}</small></li>)}</ul>}
  </section>;

  return (
    <>
      <style jsx global>{`
        body {
          font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: #F8F9FA;
          color: #1E293B;
          overflow: hidden;
        }
        .font-manrope {
          font-family: var(--font-manrope), var(--font-inter), sans-serif;
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
      <div aria-label="Visual editing workspace" aria-busy={busy || isApplying || recoveryBooting || recoveryChecking} data-editor-view={unified ? view : undefined} data-editor-legacy={!unified || undefined} data-window-panel={windowPanel || ''} data-focus-mode={!windowMode && focusMode || undefined} data-inspector-collapsed={!windowMode && inspectorCollapsed || undefined} data-selected-source={repositoryId && selectedLayer ? `${activeElement.filePath}:${activeElement.line}:${activeElement.column}:${activeElement.tag}` : undefined} className={`${reviewStyles.studioShell} ${windowMode ? reviewStyles.windowShell : reviewStyles.classicShell} fixed inset-0 z-50 flex flex-col h-screen w-screen bg-[#F8F9FA] select-none text-slate-800 text-xs overflow-hidden`}>
        {historyOpen && createPortal(<ChangeHistory repositoryId={repositoryId} draft={draft?.frames.slice(1).map((frame, index) => ({ summary: frame.edit?.summary || 'Restored original value', state: index < draft.cursor ? 'draft' as const : 'redo' as const })) || []} recovery={Boolean(uncertainApplyId || uncertainUndoId || restoredOperation || recoveryError)} onClose={() => setHistoryOpen(false)} />, document.body)}
        {recoveryBooting && <p role="status" className={reviewStyles.recoveryBootStatus}>Checking your saved draft…</p>}
        {(restoredOperation || recoveryError) && <div className={reviewStyles.recoveryOverlay}>
          <section className={reviewStyles.recoveryCard} role="dialog" aria-modal="true" aria-label="Recover previous source operation">
            <span className={reviewStyles.recoveryIcon}><RotateCcw size={19} /></span>
            <h2>{restoredOperation ? `Confirm your last ${restoredOperation.kind === 'apply' ? 'save' : 'Undo'}` : 'Your editing session needs attention'}</h2>
            <p>The editor reopened before this operation was fully confirmed. Check its status to continue safely.</p>
            {restoredOperation && <code>{restoredOperation.sourcePath || restoredOperation.filePath}</code>}
            {recoveryError && <p role="alert" className={reviewStyles.recoveryError}>{recoveryError}</p>}
            {restoredOperation && <button type="button" autoFocus disabled={recoveryChecking}
              onClick={() => void reconcileRestoredOperation(restoredOperation)}>{recoveryChecking ? 'Checking status…' : `Check ${restoredOperation.kind === 'apply' ? 'save' : 'Undo'} status`}</button>}
            {restoredOperation && isRecoveryView(restoredOperation.view, restoredOperation) && restoredOperation.view.edit.groupTransactionId && <button type="button" disabled={recoveryChecking || isApplying} onClick={() => { if (isRecoveryView(restoredOperation.view, restoredOperation)) void runGroupOperation(restoredOperation.kind === 'apply' ? 'save' : 'undo', restoredOperation.view.edit, true); }}>Resume {restoredOperation.kind === 'apply' ? 'Save' : 'Undo'}</button>}
            {renderGroupProgress()}
            <small>Status checks never repeat a source write.</small>
          </section>
        </div>}
        <div style={{ display: 'contents' }} inert={recoveryBooting || Boolean(restoredOperation) || Boolean(recoveryError)}>

          {/* Toast Notification */}
          {toastMessage && (
            <div role="status" aria-label="Editor notice" className="fixed top-4 left-1/2 -translate-x-1/2 z-[115] bg-[#14221c]/95 backdrop-blur-md text-slate-50 text-xs font-medium px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 border border-white/10 animate-fade-in">
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Workspace Body: Left Sidebar + Center Canvas + Right Inspector */}
          <div data-editor-workspace className="min-h-0 flex-1 flex overflow-hidden">

            {/* ======================================================== */}
            {/* LEFT SIDEBAR / FLOATING LIGHT DOCK                       */}
            {/* ======================================================== */}
            {windowMode ? (
              <LeftToolDock
                visible={leftDockVisible}
                activeTool={leftDockTool}
                onToggleTool={(tool) => {
                  setLeftDockVisible(true);
                  setLeftDockTool(tool);
                }}
                onClose={() => {
                  setLeftDockVisible(false);
                }}
                sourceLayers={sourceLayers}
                selectedLayer={selectedLayer}
                onSelectLayer={setSelectedLayer}
                pages={pages.filter(page => /^fixture-[1-5]$/.test(page.id))}
                selectedPage={selectedPage}
                onSelectPage={(page) => {
                  if (operationRef.current || blocksReview() || undoRecoveryRef.current) {
                    showToast(undoRecoveryRef.current ? 'Check Undo status before making another change.' : reviewNotice);
                    return;
                  }
                  if (draftRef.current && page.id !== selectedPage.id) {
                    showToast('Save or discard this page’s draft before switching source files.');
                    return;
                  }
                  setSelectedLayerState(null);
                  setSourceReady(false);
                  setSourceLayers([]);
                  setSelectedPage(page);
                  showToast(`Opened ${page.title}`);
                }}
                activeElement={activeElement}
                repositoryId={repositoryId}
                uncertainUndoId={uncertainUndoId}
                onUndo={handleUndo}
              />
            ) : (
              <aside data-editor-panel="layers" className="w-60 bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 z-20">
                {windowMode && <div className={reviewStyles.windowPanelHeader}><strong>Layers</strong><button type="button" aria-label="Close layers" onClick={() => setWindowPanel(null)}><X size={14} /></button></div>}
                {/* Brand header aligns with the editor toolbar. */}
                <div data-editor-brand className="h-12 px-3 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-white select-none">
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

                  {!windowMode && <details ref={workspaceMenuRef} className={reviewStyles.workspaceMenu}>
                    <summary aria-label="Workspace options" title="Workspace options"><MoreHorizontal size={16} /></summary>
                    <div>
                      <strong title={repositoryId || selectedPage.title}>{repositoryId || selectedPage.title}</strong>
                      <Link href="/workspace">Projects <ArrowUpRight size={13} /></Link>
                      <button type="button" disabled={!sourceReady || busy || isApplying || recoveryBooting || recoveryChecking || reviewBlocking || Boolean(uncertainUndoId)} onClick={event => { sourceCanvas.current?.openWindow(); event.currentTarget.closest('details')?.removeAttribute('open'); }}>Open editing window <ArrowUpRight size={13} /></button>
                      <button type="button" onClick={event => { setFocusMode(true); event.currentTarget.closest('details')?.removeAttribute('open'); }}>Focus canvas</button>
                    </div>
                  </details>}
                </div>

                {/* 2. Sidebar Tabs: Layers & Pages */}
                <div data-editor-tabs className="h-11 px-3 border-b border-[#F1F5F9] flex items-center justify-between text-xs shrink-0 bg-white" role="group" aria-label="Workspace panels">
                  <div className="flex items-center space-x-3 h-full">
                    <button
                      aria-pressed={sidebarTab === 'layers'} onClick={() => setSidebarTab('layers')}
                      className={`h-full flex items-center space-x-1.5 font-medium border-b-2 transition ${sidebarTab === 'layers'
                        ? 'border-[#059669] text-slate-900 font-semibold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      <Layers2 size={15} strokeWidth={1.7} aria-hidden="true" />
                      <span>Layers</span>
                    </button>

                    {!repositoryId && <button
                      aria-pressed={sidebarTab === 'pages'} onClick={() => setSidebarTab('pages')}
                      className={`h-full flex items-center space-x-1.5 font-medium border-b-2 transition ${sidebarTab === 'pages'
                        ? 'border-[#059669] text-slate-900 font-semibold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      <FileText size={15} strokeWidth={1.7} aria-hidden="true" />
                      <span>Pages</span>
                    </button>}
                  </div>

                </div>

                {/* Sidebar Content: Layers Tree OR Pages List */}
                {repositoryId || sidebarTab === 'layers' ? (
                  <SourceLayers layers={sourceLayers} selected={selectedLayer} onSelect={setSelectedLayer} />
                ) : (
                  /* Pages Selection Panel: Pure Native List */
                  <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-xs text-slate-700">
                    {pages.filter(page => /^fixture-[1-5]$/.test(page.id)).map((page) => {
                      const isSelected = selectedPage.id === page.id;
                      return (
                        <div
                          key={page.id}
                          onClick={() => {
                            if (operationRef.current || blocksReview() || undoRecoveryRef.current) { showToast(undoRecoveryRef.current ? 'Check Undo status before making another change.' : reviewNotice); return; }
                            if (draftRef.current && page.id !== selectedPage.id) {
                              showToast('Save or discard this page’s draft before switching source files.');
                              return;
                            }
                            setSelectedLayerState(null); setSourceReady(false); setSourceLayers([]); setSelectedPage(page);
                            showToast(`Opened ${page.title}`);
                          }}
                          className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition ${isSelected
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
                  {uncertainUndoId && <p role="status" className="px-2 text-[11px] text-amber-800">Undo status unconfirmed. Editing is paused until it is checked.</p>}
                  {uncertainUndoId && <button
                    onClick={handleUndo}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition"
                    title="Undo last source edit (Ctrl+Z)"
                  >
                    <span className="flex items-center space-x-1.5">
                      <Undo2 size={13} className="text-slate-500" />
                      <span>{uncertainUndoId ? undoRecoveryRef.current?.groupTransactionId ? 'Resume Undo' : 'Check Undo status' : 'Undo edit'}</span>
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Ctrl+Z</span>
                  </button>}

                  <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-400" title={activeElement.filePath}>
                    <Code2 size={13} className="shrink-0" />
                    <span className="truncate">{repositoryId && !selectedLayer ? 'Select an element' : (selectedLayer ? activeElement.filePath : selectedPage.file).split(/[\\/]/).pop()}</span>
                  </div>
                </div>
              </aside>
            )}

            {/* ======================================================== */}
            {/* CENTER CANVAS COLUMN                                     */}
            {/* ======================================================== */}
            <div className={`${reviewStyles.editorColumn} flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]`}>
              {windowMode && (
                <header ref={windowDock.ref} style={windowMode ? windowDock.style : undefined} className={reviewStyles.editorTopbar} aria-label="Editor toolbar">
                  {windowMode && (
                    <div className={reviewStyles.windowActions}>
                      <button type="button" aria-label="Move editing toolbar" title="Drag to move · Arrow keys to position · Home to reset" className={reviewStyles.dockGrip} {...windowDock.grip}><GripVertical size={15} /></button>
                      <div role="group" aria-label="Page interaction" className={reviewStyles.interactionMode}>
                        <button type="button" aria-pressed={!browseMode} onClick={() => setBrowseMode(false)}>Edit</button>
                        <button type="button" aria-pressed={browseMode} disabled={busy || isApplying} onClick={() => { if (reviewRef.current || inlineSessionRef.current) { showToast('Save or discard your draft before browsing the page.'); return; } setSelectedLayerState(null); setBrowseMode(true); }}>Browse</button>
                      </div>
                    </div>
                  )}
                  {renderCanvasControls()}
                  <div className={reviewStyles.topbarActions}>{renderDraftControls()}</div>
                </header>
              )}

              {usesDrafts && <EditorDraftStatus status={draftStatus} />}

              {/* Canvas Main Scroll Area */}
              <main
                data-editor-canvas data-free-canvas={!sourceWindowMode || undefined}
                onClick={() => setSelectedLayer(null)}
                className="flex-1 overflow-auto bg-[#F8F9FA] relative flex flex-col justify-between p-6 md:p-12 items-center"
              >
                {selectedLayer && !browseMode && inspectorActive && !liveMove && !isResizing && !isDraggingMove && !directDragRef.current && renderHUDBar()}
                {destinationMode && <div className={reviewStyles.destinationBanner} role="status" aria-label="Choose move destination" onClick={event => event.stopPropagation()}><span>Choose a container · Insert at end</span><button type="button" onClick={cancelDestination}>Cancel <kbd>Esc</kbd></button></div>}
                <EditorSurface mode={mode} view={unified ? view : undefined} width={viewportWidth || (breakpoint === 'mobile' ? 375 : breakpoint === 'tablet' ? 768 : 1200)} zoom={canvasZoom} reset={canvasReset} pan={canvasPan} disabled={busy || isApplying || isInlineEditing || isResizing || moveArmed || Boolean(liveMove)} onZoom={setCanvasZoom}>
                  <SourceProjectCanvas ref={sourceCanvas} repositoryId={repositoryId} localPageId={selectedPage.id} width={artboardWidth} windowMode={sourceWindowMode} continuousDraft={Boolean(repositoryId)} browseMode={browseMode} destinationMode={destinationMode}
                    onViewport={(width, fontSize) => { setActualViewportWidth(width); if (fontSize) setInitialMediaFontSize(fontSize); }}
                    onDestination={selection => { const key = destinationSource.current; if (!key) return; cancelDestination(); void triggerBackendPreview('reparent', { destination: { path: selection.path, line: selection.line, column: selection.column, tagName: selection.tagName, elementId: selection.elementId } }, key); }}
                    blocked={busy || isApplying || recoveryBooting || recoveryChecking || reviewBlocking || Boolean(uncertainUndoId)}
                    onNotice={showToast} onSelect={receiveSourceSelection} onLayers={receiveSourceLayers} onGeometry={receiveSourceGeometry}
                    onReady={() => { setSourceReady(true); needsDraftReplay.current = Boolean(draftRef.current); if (draftRef.current && !operationRef.current && !recoveryBooting && !recoveryChecking && !isApplying) void replaySourceDraft(reviewRef.current); }}
                    onClearSelection={() => { if (!operationRef.current && !blocksReview()) { cancelDestination(); sourceSelection.current = null; setSelectedLayerState(null); if (guideVRef.current) guideVRef.current.style.display = 'none'; if (guideHRef.current) guideHRef.current.style.display = 'none'; if (cursorTagRef.current) cursorTagRef.current.style.display = 'none'; } }}
                    onText={receiveSourceText} renderSelection={renderSourceSelection}
                  />
                </EditorSurface>

                {/* Bottom Breadcrumb Bar */}
                <div data-editor-breadcrumb className="w-full flex items-center justify-between text-[11px] text-slate-500 font-normal mt-4 px-2">
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
                    <span>{repositoryId && !selectedLayer ? 'Waiting for live selection' : `${activeElement.filePath}:${activeElement.line}`}</span>
                  </div>
                </div>

                {/* Transparent event shield during active drag */}
                <div ref={eventShieldRef} className={reviewStyles.eventShield} style={{ display: 'none' }} />

                {/* Smart snapping guides */}
                <div ref={guideVRef} className={reviewStyles.smartGuideV} style={{ display: 'none' }} />
                <div ref={guideHRef} className={reviewStyles.smartGuideH} style={{ display: 'none' }} />

                {/* Live W x H dimension tag next to cursor */}
                <div ref={cursorTagRef} className={reviewStyles.cursorTag} style={{ display: 'none' }} />

              </main>
              {!windowMode && <div className={reviewStyles.canvasFooter} role="region" aria-label="Canvas controls">
                <button type="button" className={reviewStyles.panelToggle} aria-label={focusMode ? 'Restore sidebars' : 'Focus canvas'} aria-pressed={focusMode} title={focusMode ? 'Restore sidebars' : 'Focus canvas'} onClick={() => setFocusMode(value => !value)}><Columns2 size={15} /></button>
                {<div className={reviewStyles.canvasViewTools} role="group" aria-label="Canvas navigation">
                  <button type="button" aria-label="Select elements" title="Select elements" aria-pressed={!canvasPan} onClick={() => setCanvasPan(false)}><MousePointer2 size={16} /></button>
                  <button type="button" aria-label="Pan canvas" title="Pan canvas · drag to move the view" aria-pressed={canvasPan} disabled={busy || isApplying || isInlineEditing || isResizing || moveArmed || Boolean(liveMove)} onClick={() => setCanvasPan(value => !value)}><Hand size={16} /></button>
                  <select aria-label="Canvas zoom" value={canvasZoom} disabled={busy || isApplying || isInlineEditing || isResizing || moveArmed || Boolean(liveMove)} onChange={event => setCanvasZoom(event.target.value === 'fit' ? 'fit' : Number(event.target.value))}>
                    <option value="fit">Fit page</option>
                    {[.1, .25, .5, .75, 1, 1.5, 2].map(value => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}
                    {typeof canvasZoom === 'number' && ![.1, .25, .5, .75, 1, 1.5, 2].includes(canvasZoom) && <option value={canvasZoom}>{Math.round(canvasZoom * 100)}%</option>}
                  </select>
                  <button type="button" aria-label="Fit page to canvas" title="Fit page to canvas" disabled={busy || isApplying || isInlineEditing || isResizing || moveArmed || Boolean(liveMove)} onClick={() => { setCanvasZoom('fit'); setCanvasReset(value => value + 1); }}><Scan size={15} /></button>
                  <button
                    type="button"
                    aria-label="Toggle lightweight outline drag"
                    title={outlineDrag ? "Outline-only drag active (wireframe preview for zero reflow)" : "Enable lightweight outline drag"}
                    aria-pressed={outlineDrag}
                    disabled={busy || isApplying || isInlineEditing || isResizing || moveArmed || Boolean(liveMove)}
                    onClick={() => setOutlineDrag(v => !v)}
                    className={`p-1.5 text-xs rounded border transition-colors ${outlineDrag ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium' : 'text-slate-600 border-transparent hover:bg-slate-100'}`}
                  >
                    <SquareDashed size={14} />
                  </button>
                </div>}
                {renderCanvasControls()}
                <button type="button" className={reviewStyles.panelToggle} aria-label={inspectorCollapsed || focusMode ? 'Show design panel' : 'Hide design panel'} aria-expanded={!inspectorCollapsed && !focusMode} title={inspectorCollapsed || focusMode ? 'Show design panel' : 'Hide design panel'} onClick={() => { if (focusMode) { setFocusMode(false); setInspectorCollapsed(false); } else setInspectorCollapsed(value => !value); }}><Pencil size={14} /></button>
                {(inspectorCollapsed || focusMode) && <div className={reviewStyles.collapsedActions}>{renderHistoryControls()}{renderDraftControls()}</div>}
              </div>}
            </div>

            {/* ======================================================== */}
            {/* RIGHT INSPECTOR / FLOATING LIGHT DOCK                    */}
            {/* ======================================================== */}
            {windowMode ? (
              <RightToolDock
                visible={rightDockVisible}
                selectedLayer={selectedLayer}
                activeElement={activeElement}
                computed={selectedLayer ? sourceSelections.current[selectedLayer]?.computed || {} : {}}
                draft={draft}
                usesDrafts={usesDrafts}
                busy={busy}
                isApplying={isApplying}
                reviewBlocking={reviewBlocking}
                destinationMode={destinationMode}
                viewportChanging={viewportChanging}
                activeVariant={activeVariant}
                activeBreakpoint={activeBreakpoint}
                repositoryId={repositoryId}
                pendingEdit={pendingEdit}
                sourceSelections={sourceSelections.current}
                sourceLayers={sourceLayers}
                activeToolOverride={rightDockTool}
                onActiveToolChange={setRightDockTool}
                onUpdateStyle={updateStyle}
                onRequestSave={requestSave}
                onDiscardDraft={() => void discardPendingEdit()}
                onDeselect={() => setSelectedLayerState(null)}
                onSetActiveVariant={setActiveVariant}
                onUndo={handleUndo}
                onRedo={() => navigateDraft(1)}
                onTriggerBackendPreview={triggerBackendPreview}
                overviewControls={selectedLayer ? (
                  <div className="space-y-2.5">
                    {(activeElement.instance || !['svg', 'img', 'source'].includes(activeElement.tag)) && (
                      <ComponentProps
                        key={`props:${selectedLayer}`}
                        drafts={draftIds(pendingEdit)}
                        source={{ filePath: activeElement.filePath, line: activeElement.line, column: activeElement.column, elementId: activeElement.id, instance: activeElement.instance, tagName: activeElement.tag, repositoryId }}
                        parentPreviewId={draftHeads(pendingEdit)[activeElement.filePath]?.id}
                        disabled={busy || isApplying || reviewBlocking || destinationMode || Boolean(activeBreakpoint || activeVariant) || (sourceLayers.find(layer => layer.key === selectedLayer)?.instances || 1) > 1}
                        onChange={(property, value, owner) => triggerBackendPreview('component', { property, value, owner, ...(owner ? { definition: { filePath: activeElement.filePath, line: activeElement.line, column: activeElement.column, instance: activeElement.instance } } : {}) })}
                      />
                    )}
                    {!activeElement.instance && activeElement.tag === 'svg' && (
                      <IconControls
                        key={selectedLayer}
                        selectionKey={selectedLayer}
                        source={{ filePath: activeElement.filePath, line: activeElement.line, column: activeElement.column, elementId: activeElement.id, tagName: 'svg', repositoryId }}
                        parentPreviewId={draftHeads(pendingEdit)[activeElement.filePath]?.id}
                        instances={sourceLayers.find(layer => layer.key === selectedLayer)?.instances || 1}
                        scoped={Boolean(activeBreakpoint || activeVariant)}
                        disabled={busy || isApplying || reviewBlocking || destinationMode}
                        onChange={(property, value) => triggerBackendPreview('icon', { property, value })}
                      />
                    )}
                    {!activeElement.instance && ['a', 'button'].includes(activeElement.tag) && (
                      <ActionControls
                        key={selectedLayer}
                        selectionKey={selectedLayer}
                        attributes={sourceSelections.current[selectedLayer]?.attributes}
                        source={{ filePath: activeElement.filePath, line: activeElement.line, column: activeElement.column, elementId: activeElement.id, tagName: activeElement.tag, repositoryId }}
                        parentPreviewId={draftHeads(pendingEdit)[activeElement.filePath]?.id}
                        instances={sourceLayers.find(layer => layer.key === selectedLayer)?.instances || 1}
                        scoped={Boolean(activeBreakpoint || activeVariant)}
                        disabled={busy || isApplying || reviewBlocking || destinationMode}
                        onChange={(property, value) => triggerBackendPreview('action', { property, value })}
                      />
                    )}
                    {activeElement.tag === 'img' && !activeElement.instance && (
                      <>
                        <ImageContent
                          key={selectedLayer}
                          selectionKey={selectedLayer}
                          attributes={sourceSelections.current[selectedLayer]?.attributes}
                          repositoryId={repositoryId}
                          scoped={Boolean(activeBreakpoint || activeVariant)}
                          disabled={busy || isApplying || reviewBlocking || destinationMode}
                          onChange={(property, value) => triggerBackendPreview('image', { property, value })}
                        />
                        <ImageFraming
                          classes={activeElement.classes}
                          computed={selectedLayer ? sourceSelections.current[selectedLayer]?.computed || {} : {}}
                          scope={activeBreakpoint || activeVariant}
                          disabled={busy || isApplying || reviewBlocking || destinationMode || viewportChanging || Boolean(activeBreakpoint) && scopeLoading}
                          onChange={updateStyle}
                        />
                      </>
                    )}
                  </div>
                ) : undefined}
                layoutExtraControls={selectedLayer ? (
                  <div className="space-y-2.5 pt-2 border-t border-[#E7ECE9]">
                    {!repositoryId && (
                      <div className={reviewStyles.resizeBar}>
                        <button
                          type="button"
                          aria-label="Drag to resize width"
                          aria-pressed={isResizing}
                          aria-describedby="selection-width-hint"
                          aria-keyshortcuts="ArrowLeft ArrowRight Home End"
                          onKeyDown={resizeWithKeyboard}
                          disabled={busy || isApplying || reviewBlocking || Boolean(uncertainUndoId) || Boolean(liveMove) || moveArmed}
                          onPointerDown={event => startResize('ne', event)}
                        >
                          <ArrowUpDown size={12} style={{ transform: 'rotate(90deg)' }} />
                          <span>Resize</span>
                          <span className={reviewStyles.resizeValue}>{liveWidth || elementDimensions[selectedLayer]?.w || 0}px</span>
                        </button>
                        <select
                          aria-label="Maximum width"
                          disabled={isResizing || busy || isApplying || reviewBlocking || Boolean(uncertainUndoId) || Boolean(liveMove) || moveArmed}
                          value={scopeTokens(activeElement.classes).find(token => token.startsWith('max-w-')) || ''}
                          onChange={event => {
                            const value = event.target.value;
                            const key = selectedLayer;
                            void triggerBackendPreview('style', { property: 'maxWidth', value }, key, () => setElements(previous => ({ ...previous, [key]: { ...previous[key], maxWidth: value } })));
                          }}
                        >
                          <option value="" disabled>Set max width</option>
                          {['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'].map(size => (
                            <option key={size} value={`max-w-${size}`}>Max {size}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <ConstraintControls
                      classes={activeElement.classes}
                      computed={selectedLayer ? sourceSelections.current[selectedLayer]?.computed || {} : {}}
                      scope={activeBreakpoint || activeVariant}
                      disabled={busy || isApplying || reviewBlocking || destinationMode || viewportChanging}
                      onChange={updateStyle}
                    />
                  </div>
                ) : undefined}
              />
            ) : (
              <aside data-editor-panel="inspector" style={windowMode ? undefined : { width: inspectorWidth }} className="w-[288px] bg-white border-l border-[#E5E7EB] flex flex-col shrink-0 z-20 overflow-hidden shadow-xs">
                {!windowMode && <div role="separator" aria-label="Resize design panel" aria-orientation="vertical" aria-valuemin={272} aria-valuemax={360} aria-valuenow={inspectorWidth} tabIndex={0} className={reviewStyles.inspectorDivider}
                  onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); inspectorResize.current = { x: event.clientX, width: inspectorWidth }; event.currentTarget.setPointerCapture(event.pointerId); }}
                  onPointerMove={event => resizeInspector(event.clientX)} onPointerUp={event => { if (!inspectorResize.current) return; resizeInspector(event.clientX); inspectorResize.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { inspectorResize.current = null; }} onLostPointerCapture={() => { inspectorResize.current = null; }}
                  onDoubleClick={() => setInspectorWidth(288)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); setInspectorWidth(value => event.key === 'Home' ? 288 : Math.max(272, Math.min(360, value + (event.key === 'ArrowLeft' ? 8 : -8)))); } }} />}
                {/* Visual Editor Header */}
                <div className="h-12 px-3.5 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-white">
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
                  {!windowMode && <button type="button" aria-label="Hide design panel" title="Hide design panel" onClick={() => setInspectorCollapsed(true)} className={reviewStyles.panelToggle}><ChevronRight size={14} /></button>}
                  {windowMode && <button type="button" aria-label="Close design panel" onClick={() => setWindowPanel(null)} className={reviewStyles.windowLaunch}><X size={14} /></button>}
                </div>

                {/* Inspector Content */}
                {!restoredOperation && renderGroupProgress()}
                {usesDrafts && draft && <div className={reviewStyles.draftSummary}>
                  <button type="button" aria-label={reviewOpen ? 'Hide changes' : 'Review changes'} onClick={() => { if (!selectedLayer && pendingEdit) setSelectedLayerState(pendingEdit.layerKey); setReviewOpen(value => !value); }} aria-expanded={reviewOpen}>{reviewOpen ? 'Hide changes' : 'Review changes'}<span>{draft.cursor}</span></button>
                  <button type="button" onClick={() => void discardPendingEdit()} disabled={busy || isApplying || Boolean(uncertainApplyId)}>Discard draft</button>
                  {reviewOpen && Object.keys(draftHeads(pendingEdit)).length > 1 && <ul aria-label="Change-set files" className={reviewStyles.changeSetFiles}>{Object.values(draftHeads(pendingEdit)).map(head => <li key={head.id}><Code2 size={12} /><span title={editPath(head)}>{editPath(head)}</span></li>)}</ul>}
                  {reviewOpen && <ol aria-label="Draft change history">{draft.frames.slice(1, draft.cursor + 1).map((frame, index) => <li key={index}>{frame.edit?.summary || 'Restored original value'}</li>)}</ol>}
                </div>}
                {!selectedLayer ? (
                  <div className={reviewStyles.emptyInspector}>
                    <MousePointer2 size={18} strokeWidth={1.5} />
                    <strong>Select an element to edit</strong>
                    <p>Click the page or choose a layer.</p>
                  </div>
                ) : (
                  /* SELECTED ELEMENT STATE (Clean SaaS Design Inspector) */
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedLayer && (activeElement.instance || !['svg', 'img', 'source'].includes(activeElement.tag)) && <ComponentProps key={`props:${selectedLayer}`} drafts={draftIds(pendingEdit)} source={{ filePath: activeElement.filePath, line: activeElement.line, column: activeElement.column, elementId: activeElement.id, instance: activeElement.instance, tagName: activeElement.tag, repositoryId }} parentPreviewId={draftHeads(pendingEdit)[activeElement.filePath]?.id} disabled={busy || isApplying || reviewBlocking || destinationMode || Boolean(activeBreakpoint || activeVariant) || (sourceLayers.find(layer => layer.key === selectedLayer)?.instances || 1) > 1} onChange={(property, value, owner) => triggerBackendPreview('component', { property, value, owner, ...(owner ? { definition: { filePath: activeElement.filePath, line: activeElement.line, column: activeElement.column, instance: activeElement.instance } } : {}) })} />}
                    {selectedLayer && !activeElement.instance && activeElement.tag === 'svg' && <IconControls key={selectedLayer} selectionKey={selectedLayer} source={{ filePath: activeElement.filePath, line: activeElement.line, column: activeElement.column, elementId: activeElement.id, tagName: 'svg', repositoryId }} parentPreviewId={draftHeads(pendingEdit)[activeElement.filePath]?.id} instances={sourceLayers.find(layer => layer.key === selectedLayer)?.instances || 1} scoped={Boolean(activeBreakpoint || activeVariant)} disabled={busy || isApplying || reviewBlocking || destinationMode} onChange={(property, value) => triggerBackendPreview('icon', { property, value })} />}
                    {selectedLayer && !activeElement.instance && ['a', 'button'].includes(activeElement.tag) && <ActionControls key={selectedLayer} selectionKey={selectedLayer} attributes={sourceSelections.current[selectedLayer]?.attributes} source={{ filePath: activeElement.filePath, line: activeElement.line, column: activeElement.column, elementId: activeElement.id, tagName: activeElement.tag, repositoryId }} parentPreviewId={draftHeads(pendingEdit)[activeElement.filePath]?.id} instances={sourceLayers.find(layer => layer.key === selectedLayer)?.instances || 1} scoped={Boolean(activeBreakpoint || activeVariant)} disabled={busy || isApplying || reviewBlocking || destinationMode} onChange={(property, value) => triggerBackendPreview('action', { property, value })} />}
                    {activeElement.tag === 'img' && !activeElement.instance && selectedLayer && <ImageContent key={selectedLayer} selectionKey={selectedLayer} attributes={sourceSelections.current[selectedLayer]?.attributes} repositoryId={repositoryId} scoped={Boolean(activeBreakpoint || activeVariant)} disabled={busy || isApplying || reviewBlocking || destinationMode} onChange={(property, value) => triggerBackendPreview('image', { property, value })} />}
                    {activeElement.tag === 'img' && !activeElement.instance && <ImageFraming classes={activeElement.classes} computed={selectedLayer ? sourceSelections.current[selectedLayer]?.computed || {} : {}} scope={activeBreakpoint || activeVariant} disabled={busy || isApplying || reviewBlocking || destinationMode || viewportChanging || Boolean(activeBreakpoint) && scopeLoading} onChange={updateStyle} />}
                    {/* One source review, alongside the selected element's controls. */}
                    {pendingEdit && (!usesDrafts || reviewOpen || uncertainApplyId) && (
                      <section className={reviewStyles.review} aria-label="Review source change" aria-busy={isApplying}>
                        <div className={reviewStyles.heading}>
                          <h2>{repositoryId ? 'Review change' : 'Draft changes'}</h2>
                          <span className={reviewStyles.status}>{uncertainApplyId === pendingEdit.id ? 'Save status unconfirmed' : 'Not saved to source'}</span>
                        </div>
                        <p className={reviewStyles.summary}>{pendingEdit.summary}</p>
                        <div className={reviewStyles.source}>
                          <Code2 size={12} strokeWidth={1.5} aria-hidden="true" />
                          <span title={`${pendingEdit.filePath}:${pendingEdit.line}`}>
                            {pendingEdit.filePath}:{pendingEdit.line}
                          </span>
                        </div>
                        <div className={reviewStyles.diff}>
                          <div className={reviewStyles.diffRow}>
                            <span>Before</span>
                            <pre aria-label="Before change">{pendingEdit.oldValue || 'Empty value'}</pre>
                          </div>
                          <div className={reviewStyles.diffRow}>
                            <span>After</span>
                            <pre aria-label="After change">{pendingEdit.newValue || 'Empty value'}</pre>
                          </div>
                        </div>
                        <div className={reviewStyles.actions}>
                          <button type="button" onMouseDown={event => event.preventDefault()} onClick={requestSave} disabled={isApplying || busy} className={reviewStyles.apply}>
                            <span>{isApplying ? (uncertainApplyId ? 'Checking…' : 'Saving…') : uncertainApplyId === pendingEdit.id ? 'Check save status' : repositoryId ? 'Apply to code' : 'Save changes'}</span>
                          </button>
                          <button type="button" onClick={discardPendingEdit} disabled={isApplying || uncertainApplyId === pendingEdit.id}>Discard</button>
                        </div>
                      </section>
                    )}

                    {/* Inspector tabs */}
                    <div className="flex border-b border-[#E5E7EB] px-3 shrink-0 bg-white sticky top-0 z-10">
                      <button
                        type="button"
                        aria-pressed={activeTab === 'design'} onClick={() => setActiveTab('design')}
                        className={`py-2 px-3 text-xs font-semibold relative transition cursor-pointer ${activeTab === 'design' ? 'text-[#2F342F]' : 'text-slate-500 hover:text-slate-900'
                          }`}
                      >
                        Design
                        {activeTab === 'design' && (
                          <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#414A3E] rounded-full"></span>
                        )}
                      </button>
                      <button
                        type="button"
                        aria-pressed={activeTab === 'settings'} onClick={() => setActiveTab('settings')}
                        className={`py-2 px-3 text-xs font-medium relative transition cursor-pointer ${activeTab === 'settings' ? 'text-[#2F342F]' : 'text-slate-500 hover:text-slate-900'
                          }`}
                      >
                        Source
                        {activeTab === 'settings' && (
                          <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#414A3E] rounded-full"></span>
                        )}
                      </button>
                    </div>

                    {/* Inspector Content */}
                    <div className={`${reviewStyles.inspectorControls} flex-1 overflow-y-auto`}>
                      {activeElement.instance && editingDefinitionStyles && <div className="border-b border-[#edf0ed] px-4 py-3 text-xs" role="note" aria-label="Definition style scope"><strong>Shared definition</strong><p className="mt-1 text-[#89938d]">Definition edits affect every use. Props above still change this instance.</p><button type="button" onClick={() => setDefinitionStyleKey(null)} className="mt-2 rounded border border-[#e6eae7] px-2 py-1">Return to instance controls</button></div>}
                      {activeElement.instance && !editingDefinitionStyles ? (<div className="space-y-3 px-4 py-4 text-xs leading-relaxed text-[#89938d]"><p>Props above change this instance. Layout and typography belong to the shared definition.</p><button type="button" disabled={busy || isApplying || reviewBlocking || destinationMode || moveArmed || isResizing} onClick={() => void openDefinitionStyles()} className="rounded-md border border-[#e6eae7] bg-white px-3 py-2 font-medium text-[#3c4b41] disabled:opacity-50">Edit shared definition</button><p>Definition edits affect every use and must pass the source safety checks.</p></div>) : activeTab === 'design' ? (
                        <div className="p-3.5 space-y-4 text-xs text-slate-700">

                          <div className={reviewStyles.states}>
                            <span className={reviewStyles.stateLabel}>State</span>
                            <div className={reviewStyles.segments} role="group" aria-label="Element state">
                              {[
                                { id: '', label: 'Default' },
                                { id: 'hover', label: 'Hover' },
                                { id: 'focus-visible', label: 'Focus' },
                                { id: 'active', label: 'Pressed' },
                              ].map((variant) => (
                                <button
                                  key={variant.id}
                                  type="button"
                                  disabled={Boolean(activeBreakpoint) && Boolean(variant.id)}
                                  onClick={() => {
                                    if (operationRef.current || blocksReview() || undoRecoveryRef.current) { showToast(undoRecoveryRef.current ? 'Check Undo status before making another change.' : reviewNotice); return; }
                                    setActiveVariant(variant.id);
                                  }}
                                  aria-pressed={activeVariant === variant.id}
                                >
                                  {variant.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <AppearanceControls key={selectedLayer} classes={activeElement.classes} computed={selectedLayer ? sourceSelections.current[selectedLayer]?.computed || {} : {}} scope={activeBreakpoint || activeVariant} disabled={busy || isApplying || reviewBlocking || destinationMode || viewportChanging} onChange={updateStyle} />
                          <ConstraintControls classes={activeElement.classes} computed={selectedLayer ? sourceSelections.current[selectedLayer]?.computed || {} : {}} scope={activeBreakpoint || activeVariant} disabled={busy || isApplying || reviewBlocking || destinationMode || viewportChanging} onChange={updateStyle} />

                          <section className={reviewStyles.interactions} aria-label="Transitions">
                            <button type="button" className={reviewStyles.disclosure} aria-expanded={showInteractions} onClick={() => setShowInteractions(value => !value)}>
                              {showInteractions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              <span>Transitions</span>
                            </button>
                            {showInteractions && (
                              <div className={reviewStyles.controlRows}>
                                {interactionControls.map(control => (
                                  <label key={control.property}>
                                    <span>{control.label}</span>
                                    <select
                                      aria-label={control.label}
                                      value={interactionValue(activeElement.classes, control.property, editScope)}
                                      disabled={busy || reviewBlocking}
                                      onChange={e => updateStyle(control.property, e.target.value)}
                                    >
                                      <option value="" disabled>{activeVariant ? 'Inherit default' : 'Not set in source'}</option>
                                      {control.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                  </label>
                                ))}
                                <p>Changes apply to {activeVariant === 'focus-visible' ? 'keyboard focus' : activeVariant === 'active' ? 'the pressed state' : activeVariant || 'the default appearance'}. Your device’s reduced-motion preference is respected in this preview.</p>
                              </div>
                            )}
                          </section>

                          {/* ---------------------------------------------------- */}
                          {/* Section: Layout                                      */}
                          {/* ---------------------------------------------------- */}
                          <div className="space-y-2">
                            <button
                              type="button"
                              aria-expanded={openSections.layout} onClick={() => toggleSection('layout')}
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

                            {openSections.layout && <LayoutControls classes={activeElement.classes} computed={selectedLayer ? sourceSelections.current[selectedLayer]?.computed || {} : {}} disabled={busy || isApplying || reviewBlocking || destinationMode} scope={activeBreakpoint || activeVariant} onChange={updateStyle} />}
                          </div>

                          <hr className="border-[#F1F5F9]" />

                          {/* ---------------------------------------------------- */}
                          {/* Section: Size                                        */}
                          {/* ---------------------------------------------------- */}
                          <div className="space-y-2">
                            <button
                              type="button"
                              aria-expanded={openSections.size} onClick={() => toggleSection('size')}
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
                                  <span className={reviewStyles.propertyLabel}>Width</span>
                                  <div className="relative w-36">
                                    <select
                                      aria-label="Width"
                                      disabled={busy || isApplying || reviewBlocking || destinationMode}
                                      value={activeElement.width}
                                      onChange={(e) => updateStyle('width', e.target.value)}
                                      className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-emerald-500/20"
                                    >
                                      <option value="" disabled>Inherited / custom</option>
                                      <option value="w-auto">Auto</option>
                                      <option value="w-full">Full</option>
                                      <option value="w-1/2">1/2</option>
                                      <option value="w-fit">Fit</option>
                                    </select>
                                    <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                  </div>
                                </div>

                                {!repositoryId && selectedLayer && <div className={reviewStyles.resizeBar}>
                                  <button type="button" aria-label="Drag to resize width" aria-pressed={isResizing}
                                    aria-describedby="selection-width-hint" aria-keyshortcuts="ArrowLeft ArrowRight Home End" onKeyDown={resizeWithKeyboard}
                                    disabled={busy || isApplying || reviewBlocking || Boolean(uncertainUndoId) || Boolean(liveMove) || moveArmed}
                                    onPointerDown={event => startResize('ne', event)}>
                                    <ArrowUpDown size={12} style={{ transform: 'rotate(90deg)' }} />
                                    <span>Resize</span><span className={reviewStyles.resizeValue}>{liveWidth || elementDimensions[selectedLayer]?.w || 0}px</span>
                                  </button>
                                  <select aria-label="Maximum width" disabled={isResizing || busy || isApplying || reviewBlocking || Boolean(uncertainUndoId) || Boolean(liveMove) || moveArmed}
                                    value={scopeTokens(activeElement.classes).find(token => token.startsWith('max-w-')) || ''}
                                    onChange={event => { const value = event.target.value; const key = selectedLayer; void triggerBackendPreview('style', { property: 'maxWidth', value }, key, () => setElements(previous => ({ ...previous, [key]: { ...previous[key], maxWidth: value } }))); }}>
                                    <option value="" disabled>Set max width</option>
                                    {['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'].map(size => <option key={size} value={`max-w-${size}`}>Max {size}</option>)}
                                  </select>
                                </div>}
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
                              aria-expanded={openSections.spacing} onClick={() => toggleSection('spacing')}
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
                              <div className={reviewStyles.controlRows}>
                                <label>
                                  <span>Padding</span>
                                  <select aria-label="Padding" disabled={busy || isApplying || reviewBlocking || destinationMode} value={scopeTokens(activeElement.classes).find(token => /^p-\d+$/.test(token)) || ''} onChange={e => updateStyle('padding', e.target.value)}>
                                    <option value="" disabled>Not set in source</option>
                                    {['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-10', 'p-12'].map(value => <option key={value} value={value}>{value.slice(2)} units</option>)}
                                  </select>
                                </label>
                                <p>Applies equally to all four sides.</p>
                              </div>
                            )}
                          </div>

                          <hr className="border-[#F1F5F9]" />

                          {/* ---------------------------------------------------- */}
                          {/* Section: Text                                        */}
                          {/* ---------------------------------------------------- */}
                          {activeElement.tag !== 'svg' && <div className="space-y-2">
                            <button
                              type="button"
                              aria-expanded={openSections.text} onClick={() => toggleSection('text')}
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
                                  <span className={reviewStyles.propertyLabel}>Typeface</span>
                                  <div className="relative w-36">
                                    <select
                                      value={scopeTokens(activeElement.classes).find(token => ['font-sans', 'font-serif', 'font-mono'].includes(token)) || ''}
                                      onChange={e => updateStyle('fontFamily', e.target.value)}
                                      className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                    >
                                      <option value="" disabled>Inherited</option>
                                      <option value="font-sans">Project sans</option>
                                      <option value="font-serif">Project serif</option>
                                      <option value="font-mono">Project mono</option>
                                    </select>
                                    <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Weight - Protected: Needed by test/studio-restore.test.ts */}
                                <div className="flex items-center justify-between">
                                  <span className={reviewStyles.propertyLabel}>Weight</span>
                                  <div className="relative w-36">
                                    <select
                                      value={scopeTokens(activeElement.classes).find(token => /^font-(normal|medium|semibold|bold|extrabold)$/.test(token)) || ''}
                                      onChange={e => updateStyle('fontWeight', e.target.value)}
                                      className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                    >
                                      <option value="" disabled>Inherited</option>
                                      <option value="font-normal">Regular</option>
                                      <option value="font-medium">Medium</option>
                                      <option value="font-semibold">Semibold</option>
                                      <option value="font-bold">Bold</option>
                                      <option value="font-extrabold">Extra bold</option>
                                    </select>
                                    <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Size */}
                                <div className="flex items-center justify-between">
                                  <span className={reviewStyles.propertyLabel}>Size</span>
                                  <div className="relative w-36">
                                    <select
                                      value={scopeTokens(activeElement.classes).find(token => /^text-(xs|sm|base|lg|xl|[2-7]xl)$/.test(token)) || ''}
                                      onChange={(e) => updateStyle('fontSize', e.target.value)}
                                      className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                    >
                                      <option value="" disabled>Inherited</option>
                                      <option value="text-xs">Extra small</option>
                                      <option value="text-sm">SM</option>
                                      <option value="text-base">Base</option>
                                      <option value="text-lg">LG</option>
                                      <option value="text-xl">XL</option>
                                      <option value="text-2xl">2XL</option>
                                      <option value="text-3xl">3XL</option>
                                      <option value="text-4xl">4XL</option>
                                      <option value="text-5xl">5XL</option>
                                      <option value="text-6xl">6XL</option>
                                    </select>
                                    <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Alignment */}
                                <div className="flex items-center justify-between">
                                  <span className={reviewStyles.propertyLabel}>Align</span>
                                  <div className="flex items-center space-x-1 w-36 bg-slate-50 p-0.5 rounded-md border border-slate-200">
                                    {[
                                      { id: 'text-left', label: 'Left', icon: <AlignLeft size={12} /> },
                                      { id: 'text-center', label: 'Center', icon: <AlignCenter size={12} /> },
                                      { id: 'text-right', label: 'Right', icon: <AlignRight size={12} /> },
                                    ].map((al) => (
                                      <button
                                        key={al.id}
                                        type="button"
                                        onClick={() => updateStyle('textAlign', al.id)}
                                        className={`flex-1 py-1 flex items-center justify-center rounded text-xs transition cursor-pointer ${activeElement.classes.includes(al.id) || (al.id === 'text-left' && !activeElement.classes.includes('text-center') && !activeElement.classes.includes('text-right'))
                                          ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                                          : 'text-slate-400 hover:text-slate-700'
                                          }`}
                                        title={al.label}
                                      >
                                        {al.icon}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Color */}
                                <div className="flex items-center justify-between">
                                  <span className={reviewStyles.propertyLabel}>Color</span>
                                  <select aria-label="Text color" value={scopeTokens(activeElement.classes).find(token => ['text-slate-900', 'text-slate-600', 'text-emerald-600', 'text-blue-600', 'text-rose-600', 'text-white', 'text-black'].includes(token)) || ''} onChange={e => updateStyle('textColor', e.target.value)} className="w-36 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs">
                                    <option value="" disabled>Inherited / custom</option>
                                    <option value="text-slate-900">Charcoal</option><option value="text-slate-600">Gray</option>
                                    <option value="text-emerald-600">Green</option><option value="text-blue-600">Blue</option>
                                    <option value="text-rose-600">Rose</option><option value="text-white">White</option><option value="text-black">Black</option>
                                  </select>
                                </div>

                                {/* Content */}
                                <div className="flex items-center justify-between">
                                  <span className={reviewStyles.propertyLabel}>Content</span>
                                  <input
                                    type="text"
                                    aria-label="Content"
                                    value={draftText}
                                    onChange={(e) => setDraftText(e.target.value)}
                                    onBlur={() => { if (draftText !== activeElement.text) updateText(draftText); }}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') e.currentTarget.blur();
                                      if (e.key === 'Escape') setDraftText(activeElement.text || '');
                                    }}
                                    placeholder="Edit text content..."
                                    className="w-36 bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#059669]"
                                  />
                                </div>
                              </div>
                            )}
                          </div>}

                          <hr className="border-[#F1F5F9]" />

                          {/* ---------------------------------------------------- */}
                          {/* Section: Background (Collapsible)                    */}
                          {/* ---------------------------------------------------- */}
                          <div>
                            <button
                              type="button"
                              aria-expanded={openSections.background} onClick={() => toggleSection('background')}
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
                                      aria-label="Fill color" value={activeElement.bgFill}
                                      onChange={(e) => updateStyle('backgroundColor', `bg-${e.target.value}`)}
                                      className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                    >
                                      {!['transparent', 'white', 'slate-50', 'slate-900', 'emerald-600', 'blue-600', 'rose-500'].includes(activeElement.bgFill) && <option value={activeElement.bgFill} disabled>Custom fill</option>}
                                      <option value="transparent">Transparent</option>
                                      <option value="white">White</option>
                                      <option value="slate-50">Slate 50</option>
                                      <option value="slate-900">Slate 900</option>
                                      <option value="emerald-600">Emerald 600</option>
                                      <option value="blue-600">Blue 600</option>
                                      <option value="rose-500">Rose 500</option>
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
                              aria-expanded={openSections.borders} onClick={() => toggleSection('borders')}
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
                                      aria-label="Corner radius" value={activeElement.borderRadius || '__computed'}
                                      onChange={(e) => updateStyle('borderRadius', e.target.value)}
                                      className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                    >
                                      {!activeElement.borderRadius && <option value="__computed" disabled>Custom · {activeElement.previewStyle?.borderRadius || 'inherited'}</option>}
                                      <option value="rounded-none">Square</option>
                                      <option value="rounded-sm">Small</option>
                                      <option value="rounded-md">Medium</option>
                                      <option value="rounded-lg">Large</option>
                                      <option value="rounded-xl">Extra Large</option>
                                      <option value="rounded-full">Pill</option>
                                    </select>
                                    <ChevronDown size={11} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-[11px]">Width</span>
                                  <div className="relative w-36">
                                    <select
                                      value={activeElement.classes.match(/\bborder(-[0248])?\b/)?.[0] || 'border-0'}
                                      onChange={(e) => updateStyle('borderWidth', e.target.value)}
                                      className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                    >
                                      <option value="border-0">None (0px)</option>
                                      <option value="border">Thin (1px)</option>
                                      <option value="border-2">Medium (2px)</option>
                                      <option value="border-4">Thick (4px)</option>
                                    </select>
                                    <ChevronDown size={11} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-[11px]">Color</span>
                                  <div className="relative w-36">
                                    <select
                                      value={activeElement.classes.match(/\bborder-(slate|emerald|blue|rose|transparent)-\d+\b|\bborder-(transparent|white|black)\b/)?.[0] || 'border-transparent'}
                                      onChange={(e) => updateStyle('borderColor', e.target.value)}
                                      className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                    >
                                      <option value="border-transparent">Transparent</option>
                                      <option value="border-slate-200">Slate 200</option>
                                      <option value="border-slate-900">Slate 900</option>
                                      <option value="border-emerald-500">Emerald 500</option>
                                    </select>
                                    <ChevronDown size={11} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
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
                              <span className="text-emerald-600 font-semibold">Checked before preview</span>
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
                      <span className="text-[10px] text-slate-400 truncate max-w-[155px]" title="Edit freely. Save changes when ready.">
                        {repositoryId ? 'Review before saving' : 'Ctrl+S to save changes'}
                      </span>
                    </div>
                  </div>
                )}
                {!windowMode && <footer className={reviewStyles.inspectorFooter} aria-label="Save and history">
                  {renderHistoryControls()}{renderDraftControls()}
                </footer>}
              </aside>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
