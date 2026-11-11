'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  X,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  LayoutMatrix,
  BoxModelControl,
  TypographyStudio,
  AppearanceStudio,
  appleTypographyStyle,
} from './FramerControls';
import { AppearanceControls } from './AppearanceControls';

export type DockTool =
  | 'inspect'
  | 'type'
  | 'layout'
  | 'spacing'
  | 'colors'
  | 'borders'
  | 'effects'
  | 'states'
  | 'code'
  | 'drafts'
  | null;

export interface RightToolDockProps {
  visible?: boolean;
  selectedLayer: string | null;
  activeElement: {
    tag: string;
    classes: string;
    id?: string;
    filePath?: string;
    line?: number | string;
    column?: number | string;
    width?: string;
    text?: string;
    instance?: string;
  };
  computed?: Record<string, string>;
  draft?: { cursor: number; frames: Array<{ edit?: { summary?: string } | null }> } | null;
  usesDrafts?: boolean;
  busy?: boolean;
  isApplying?: boolean;
  reviewBlocking?: boolean;
  destinationMode?: boolean;
  viewportChanging?: boolean;
  activeVariant: string;
  activeBreakpoint: string;
  repositoryId?: string;
  pendingEdit?: any;
  sourceSelections?: Record<string, any>;
  sourceLayers?: any[];
  overviewControls?: React.ReactNode;
  layoutExtraControls?: React.ReactNode;
  activeToolOverride?: DockTool | undefined;
  onActiveToolChange?: (tool: DockTool) => void;
  onUpdateStyle: (property: string, value: string) => void;
  onRequestSave: () => void;
  onDiscardDraft: () => void;
  onDeselect: () => void;
  onSetActiveVariant: (v: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onTriggerBackendPreview?: (kind: any, payload: any) => void;
}

export function RightToolDock({
  visible = true,
  selectedLayer,
  activeElement,
  computed = {},
  draft,
  usesDrafts = true,
  busy = false,
  isApplying = false,
  reviewBlocking = false,
  destinationMode = false,
  viewportChanging = false,
  activeVariant,
  activeBreakpoint,
  overviewControls,
  layoutExtraControls,
  activeToolOverride,
  onActiveToolChange,
  onUpdateStyle,
  onRequestSave,
  onDiscardDraft,
  onDeselect,
  onSetActiveVariant,
}: RightToolDockProps) {
  const [internalTool, setInternalTool] = useState<DockTool>(() => (selectedLayer ? 'layout' : null));
  const activeTool = activeToolOverride !== undefined ? activeToolOverride : internalTool;
  const setActiveTool = (next: DockTool | ((prev: DockTool) => DockTool)) => {
    const resolved = typeof next === 'function' ? next(activeTool) : next;
    setInternalTool(resolved);
    onActiveToolChange?.(resolved);
  };
  const disabled = busy || isApplying || reviewBlocking || destinationMode || viewportChanging;
  const scope = activeBreakpoint || activeVariant;
  const prevSelectedRef = useRef(selectedLayer);

  useEffect(() => {
    if (prevSelectedRef.current && !selectedLayer && activeTool !== null && activeTool !== 'drafts') {
      setActiveTool(null);
    }
    prevSelectedRef.current = selectedLayer;
  }, [selectedLayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTool !== null) {
        e.stopPropagation();
        setActiveTool(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);

  const toggleTool = (tool: DockTool) => {
    setActiveTool((current) => (current === tool ? null : tool));
  };

  const draftCount = draft?.cursor || 0;
  const tagLabel = activeElement.tag ? `<${activeElement.tag.split('.')[0]}>` : 'Element';
  const showTooltips = activeTool === null;

  const widthVal =
    activeElement.width || activeElement.classes.match(/\bw-(auto|full|1\/2|1\/3|2\/3|1\/4|3\/4|fit)\b/)?.[0] || '';
  const colsMatch = activeElement.classes.match(/\bgrid-cols-(\d+)\b/);
  const colsVal = colsMatch ? colsMatch[0] : 'grid-cols-1';

  const railBtnClass = (active: boolean) =>
    `w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
      active
        ? 'bg-[#16845B] text-white shadow-[0_4px_12px_rgba(22,132,91,0.28)] scale-105 font-bold'
        : 'text-[#5A6960] hover:text-[#14221B] hover:bg-[#EFF4F1] active:scale-95'
    }`;

  const tooltipClass =
    'pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/98 backdrop-blur-xl border border-[#DCE3DF] text-[11px] font-medium text-[#1D2B24] shadow-[0_8px_20px_rgba(15,23,42,0.12)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50';

  const kbdClass = 'text-[9px] px-1 py-0.5 rounded bg-[#EFF3F0] text-[#5B6961] font-mono';

  return (
    <>
      {/* 1. LIGHT FROSTED GLASS DESIGN RAIL (Smooth 340ms Slide-In, 28px margin from border) */}
      <aside
        data-editor-rail="right"
        data-dock-visible={visible ? 'true' : 'false'}
        aria-hidden={!visible}
        aria-label="Design tools dock"
        className="fixed right-[28px] top-1/2 z-50 select-none flex flex-col items-center pointer-events-auto"
      >
        <div
          role="toolbar"
          aria-label="Pro Studio Tools"
          className="w-[52px] py-3 px-1.5 rounded-full bg-white/95 backdrop-blur-2xl border border-[#DCE3DF] shadow-[0_14px_36px_-8px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.05)] flex flex-col items-center gap-1.5 transition-all duration-200"
        >
          {/* 1. Select & Inspect */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label={selectedLayer ? `Inspecting ${tagLabel}` : 'Inspect tool'}
              title={selectedLayer ? `Inspecting ${tagLabel}` : 'Select & Move (V)'}
              onClick={() => toggleTool('inspect')}
              className={
                activeTool === 'inspect'
                  ? railBtnClass(true)
                  : selectedLayer
                  ? 'w-[38px] h-[38px] rounded-full flex items-center justify-center text-[#16845B] bg-[#ECFDF5] hover:bg-[#D1FAE5] transition-all cursor-pointer'
                  : railBtnClass(false)
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 4.5L11.5 21L14 14L21 11.5L4.5 4.5Z" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>{selectedLayer ? `Inspect ${tagLabel}` : 'Select & Move'}</span>
                <kbd className={kbdClass}>V</kbd>
              </div>
            )}
          </div>

          <span className="w-6 h-[1px] bg-[#E4EAE6] my-0.5" />

          {/* 2. Layout */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Layout and display"
              title="Layout & Shapes (Display, Flex, Grid, Columns)"
              onClick={() => toggleTool('layout')}
              className={railBtnClass(activeTool === 'layout')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="7" rx="2" />
                <rect x="3" y="14" width="8" height="7" rx="2" />
                <rect x="13" y="14" width="8" height="7" rx="2" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>Layout &amp; Grid</span>
                <kbd className={kbdClass}>L</kbd>
              </div>
            )}
          </div>

          {/* 3. Spacing */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Spacing and padding"
              title="Spacing & Box Model (Padding)"
              onClick={() => toggleTool('spacing')}
              className={railBtnClass(activeTool === 'spacing')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3.5" strokeDasharray="3 2" opacity="0.65" />
                <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>Spacing &amp; Padding</span>
                <kbd className={kbdClass}>S</kbd>
              </div>
            )}
          </div>

          {/* 4. Typography */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Typography"
              title="Typography (Typeface, Size, Weight, Align)"
              onClick={() => toggleTool('type')}
              className={railBtnClass(activeTool === 'type')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6.5V4h16v2.5" />
                <path d="M12 4v16" />
                <path d="M8.5 20h7" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>Typography</span>
                <kbd className={kbdClass}>T</kbd>
              </div>
            )}
          </div>

          {/* 5. Colors & Fills */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Colors and styles"
              title="Colors & Fills (Palette, Background, Text)"
              onClick={() => toggleTool('colors')}
              className={railBtnClass(activeTool === 'colors')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
                <circle cx="7.5" cy="11.5" r="1.3" fill="#F43F5E" stroke="none" />
                <circle cx="12" cy="7.5" r="1.3" fill="#FBBF24" stroke="none" />
                <circle cx="16.5" cy="11.5" r="1.3" fill="#38BDF8" stroke="none" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>Colors &amp; Fills</span>
                <kbd className={kbdClass}>C</kbd>
              </div>
            )}
          </div>

          {/* 6. Border & Radius */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Borders and radius"
              title="Borders & Radius (Corner Radius, Stroke)"
              onClick={() => toggleTool('borders')}
              className={railBtnClass(activeTool === 'borders')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20V10a6 6 0 0 1 6-6h10" />
                <circle cx="14" cy="14" r="3.2" fill="currentColor" fillOpacity="0.2" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>Border &amp; Radius</span>
                <kbd className={kbdClass}>R</kbd>
              </div>
            )}
          </div>

          {/* 7. Shadows & Effects */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Shadows and effects"
              title="Fill, Shadows & Constraints"
              onClick={() => toggleTool('effects')}
              className={railBtnClass(activeTool === 'effects')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="13" height="13" rx="2.5" />
                <path d="M8 21h10a2 2 0 0 0 2-2V8" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>Shadows &amp; Effects</span>
                <kbd className={kbdClass}>E</kbd>
              </div>
            )}
          </div>

          {/* 8. States */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="States"
              title="Interactive States (Hover, Focus, Pressed)"
              onClick={() => toggleTool('states')}
              className={
                activeVariant && activeTool !== 'states'
                  ? 'w-[38px] h-[38px] rounded-full flex items-center justify-center bg-[#ECFDF5] text-[#16845B] border border-[#A7F3D0] transition-all cursor-pointer'
                  : railBtnClass(activeTool === 'states')
              }
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 2.5-2 6a1.8 1.8 0 0 1-1.2 1.2l-6 2 6 2a1.8 1.8 0 0 1 1.2 1.2l2 6 2-6a1.8 1.8 0 0 1 1.2-1.2l6-2-6-2a1.8 1.8 0 0 1-1.2-1.2z" fill="currentColor" fillOpacity="0.18" />
                <circle cx="18" cy="6" r="1.5" fill="currentColor" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>Interactive States</span>
                <kbd className={kbdClass}>H</kbd>
              </div>
            )}
          </div>

          <span className="w-6 h-[1px] bg-[#E4EAE6] my-1" />

          {/* 9. Source Code */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Inspect source code"
              title="Inspect TSX Source & Tailwind Classes"
              onClick={() => toggleTool('code')}
              className={railBtnClass(activeTool === 'code')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </button>
            {showTooltips && (
              <div className={tooltipClass}>
                <span>Source Code</span>
                <kbd className={kbdClass}>&lt;/&gt;</kbd>
              </div>
            )}
          </div>

          {/* 10. Staged Edits Counter */}
          {usesDrafts && (
            <div className="relative group flex items-center justify-center">
              {draftCount > 0 ? (
                <button
                  type="button"
                  aria-label={`Review ${draftCount} staged changes`}
                  title={`Review ${draftCount} staged changes (⌘S)`}
                  onClick={() => toggleTool('drafts')}
                  className={`w-[34px] h-[34px] rounded-full bg-gradient-to-b from-[#189466] to-[#11714D] text-white font-bold text-[13px] flex items-center justify-center shadow-[0_2px_10px_rgba(22,132,91,0.35)] hover:brightness-105 active:scale-95 transition-all cursor-pointer ${
                    activeTool === 'drafts' ? 'ring-2 ring-[#16845B] ring-offset-2 ring-offset-white' : ''
                  }`}
                >
                  {draftCount}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="History and staged edits"
                  title="History & Staged Edits (⌘S)"
                  onClick={() => toggleTool('drafts')}
                  className={railBtnClass(activeTool === 'drafts')}
                >
                  <RotateCcw size={16} strokeWidth={2.1} />
                </button>
              )}

              {showTooltips && (
                <div className={tooltipClass}>
                  <span>{draftCount > 0 ? `${draftCount} Staged Edits` : 'History & Edits'}</span>
                  <kbd className={kbdClass}>⌘S</kbd>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* 2. CONTEXTUAL LIGHT FLYOUT CARD (Vertically centered beside rail at right: 96px) */}
      {activeTool !== null && (
        <div
          data-editor-panel="inspector"
          data-dock-visible={visible ? 'true' : 'false'}
          aria-hidden={!visible}
          role="dialog"
          aria-label={`${activeTool} controls`}
          style={appleTypographyStyle}
          className="fixed right-[96px] top-1/2 z-50 w-[308px] max-h-[calc(100vh-150px)] flex flex-col overflow-y-auto bg-white/96 backdrop-blur-2xl border border-[#DCE3DF] rounded-[18px] shadow-[0_24px_56px_-12px_rgba(15,23,42,0.15),0_8px_20px_rgba(15,23,42,0.06)] p-4 text-xs text-[#1D2B24] antialiased"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E7ECE9]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[13px] tracking-[-0.022em] text-[#14221B]">
                {activeTool === 'inspect' && 'Element Overview'}
                {activeTool === 'type' && 'Typography Studio'}
                {activeTool === 'layout' && 'Layout & Display'}
                {activeTool === 'spacing' && 'Spacing & Box Model'}
                {activeTool === 'colors' && 'Colors & Fills'}
                {activeTool === 'borders' && 'Borders & Radius'}
                {activeTool === 'effects' && 'Shadows & Effects'}
                {activeTool === 'states' && 'Interactive States'}
                {activeTool === 'code' && 'Source Code'}
                {activeTool === 'drafts' && `Draft Changes (${draftCount})`}
              </span>
              {selectedLayer && activeTool !== 'drafts' && (
                <span className="text-[10.5px] font-mono text-[#156948] bg-[#ECFDF5] px-2 py-0.5 rounded-[5px] border border-[#A7F3D0] font-medium tracking-tight truncate max-w-[90px]">
                  {tagLabel}
                </span>
              )}
            </div>
            <button
              type="button"
              aria-label="Close panel"
              onClick={() => setActiveTool(null)}
              className="text-[#7B8880] hover:text-[#1D2B24] hover:bg-[#EFF4F1] p-1 rounded-[6px] transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {!selectedLayer && activeTool !== 'drafts' ? (
              <div className="py-6 px-3 text-center text-[#64746C]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-[#8E9C94]">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                </svg>
                <p className="text-xs font-medium text-[#1D2B24]">Select an element</p>
                <p className="text-[11px] text-[#64746C] mt-0.5">Click any element on the canvas to inspect &amp; style it.</p>
              </div>
            ) : (
              <>
                {activeTool === 'inspect' && (
                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-[#EFF3F0]">
                      <span className="text-[#627168]">Tag</span>
                      <span className="font-mono font-medium text-[#14221B]">{activeElement.tag}</span>
                    </div>
                    {activeElement.id && (
                      <div className="flex justify-between py-1 border-b border-[#EFF3F0]">
                        <span className="text-[#627168]">ID</span>
                        <span className="font-mono text-[#16845B]">#{activeElement.id}</span>
                      </div>
                    )}
                    {activeElement.filePath && (
                      <div className="flex justify-between py-1 border-b border-[#EFF3F0]">
                        <span className="text-[#627168]">Source</span>
                        <span className="font-mono text-[#35443C] truncate max-w-[165px]" title={`${activeElement.filePath}:${activeElement.line || ''}`}>
                          {activeElement.filePath.split(/[\\/]/).pop()}{activeElement.line ? `:${activeElement.line}` : ''}
                        </span>
                      </div>
                    )}
                    {overviewControls}
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={onDeselect}
                        className="w-full py-1.5 text-center text-[#35443C] hover:text-rose-700 bg-[#F5F7F6] hover:bg-rose-50 border border-[#E2E7E4] hover:border-rose-200 rounded-lg font-medium transition cursor-pointer text-xs"
                      >
                        Deselect Element
                      </button>
                    </div>
                  </div>
                )}

                {activeTool === 'layout' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11.5px] text-[#627168] font-medium tracking-[-0.01em]">Width</label>
                        <span className="font-mono text-[10px] text-[#495850] bg-[#F3F6F4] px-1.5 py-0.5 rounded-[4px] border border-[#E1E7E3] tracking-tight tabular-nums">
                          {widthVal || 'inherited'}
                        </span>
                      </div>
                      <div className="relative">
                        <select
                          aria-label="Width"
                          disabled={disabled}
                          value={widthVal}
                          onChange={(e) => onUpdateStyle('width', e.target.value)}
                          className="w-full h-[30px] bg-[#F7F9F8] hover:bg-[#EFF3F0] border border-[#DCE3DF] rounded-[8px] px-2.5 text-[11.5px] font-medium tracking-[-0.015em] text-[#1D2B24] appearance-none focus:outline-none focus:border-[#16845B] cursor-pointer transition"
                        >
                          <option value="" disabled className="bg-white text-slate-900">Inherited / custom</option>
                          <option value="w-auto" className="bg-white text-slate-900">Auto</option>
                          <option value="w-full" className="bg-white text-slate-900">Full</option>
                          <option value="w-1/2" className="bg-white text-slate-900">1/2</option>
                          <option value="w-fit" className="bg-white text-slate-900">Fit</option>
                        </select>
                        <ChevronDown size={12} className="text-[#64746C] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {(/\bgrid\b|\binline-grid\b/.test(activeElement.classes) || computed?.display?.includes('grid')) && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11.5px] text-[#627168] font-medium tracking-[-0.01em]">Layout columns</label>
                          <span className="font-mono text-[10px] text-[#495850] bg-[#F3F6F4] px-1.5 py-0.5 rounded-[4px] border border-[#E1E7E3] tracking-tight tabular-nums">
                            {colsVal}
                          </span>
                        </div>
                        <div className="relative">
                          <select
                            aria-label="Layout columns"
                            disabled={disabled}
                            value={colsVal}
                            onChange={(e) => onUpdateStyle('gridColumns', e.target.value)}
                            className="w-full h-[30px] bg-[#F7F9F8] hover:bg-[#EFF3F0] border border-[#DCE3DF] rounded-[8px] px-2.5 text-[11.5px] font-medium tracking-[-0.015em] text-[#1D2B24] appearance-none focus:outline-none focus:border-[#16845B] cursor-pointer transition"
                          >
                            <option value="" disabled className="bg-white text-slate-900">Columns</option>
                            <option value="grid-cols-1" className="bg-white text-slate-900">1 Col</option>
                            <option value="grid-cols-2" className="bg-white text-slate-900">2 Cols</option>
                            <option value="grid-cols-3" className="bg-white text-slate-900">3 Cols</option>
                            <option value="grid-cols-4" className="bg-white text-slate-900">4 Cols</option>
                          </select>
                          <ChevronDown size={12} className="text-[#64746C] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    <LayoutMatrix
                      classes={activeElement.classes}
                      computed={computed}
                      scope={scope}
                      disabled={disabled}
                      onChange={onUpdateStyle}
                    />
                    {layoutExtraControls}
                  </div>
                )}

                {activeTool === 'type' && (
                  <TypographyStudio
                    classes={activeElement.classes}
                    scope={scope}
                    disabled={disabled}
                    onChange={onUpdateStyle}
                  />
                )}

                {activeTool === 'spacing' && (
                  <BoxModelControl
                    classes={activeElement.classes}
                    scope={scope}
                    disabled={disabled}
                    onChange={onUpdateStyle}
                  />
                )}

                {activeTool === 'colors' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-[#627168] font-medium mb-1.5 block">Background Fill</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: 'Slate 900', class: 'bg-slate-900', ring: 'ring-black/15' },
                          { label: 'Emerald 600', class: 'bg-emerald-600', ring: 'ring-emerald-600/25' },
                          { label: 'Royal Blue', class: 'bg-blue-600', ring: 'ring-blue-600/25' },
                          { label: 'Purple 600', class: 'bg-purple-600', ring: 'ring-purple-600/25' },
                          { label: 'Rose 500', class: 'bg-rose-500', ring: 'ring-rose-500/25' },
                          { label: 'Amber 500', class: 'bg-amber-500', ring: 'ring-amber-500/25' },
                          { label: 'Pure White', class: 'bg-white', ring: 'ring-black/15' },
                          { label: 'Transparent', class: 'bg-transparent', ring: 'ring-black/15' },
                        ].map((c) => (
                          <button
                            key={c.class}
                            type="button"
                            disabled={disabled}
                            title={c.label}
                            onClick={() => onUpdateStyle('backgroundColor', c.class)}
                            className="h-[30px] rounded-[8px] flex items-center gap-2 px-2.5 bg-[#F5F7F6] hover:bg-[#EAEFEB] border border-[#E2E7E4] text-[11px] font-medium tracking-[-0.015em] text-[#2E3C35] hover:text-[#14221B] transition cursor-pointer"
                          >
                            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${c.class} ${c.ring} ring-1`} />
                            <span className="truncate">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#627168] font-medium tracking-[-0.01em] mb-1.5 block">Text Color</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: 'Dark Slate', class: 'text-slate-900', bg: 'bg-slate-900' },
                          { label: 'Muted Slate', class: 'text-slate-500', bg: 'bg-slate-500' },
                          { label: 'Pure White', class: 'text-white', bg: 'bg-white' },
                          { label: 'Emerald 600', class: 'text-emerald-600', bg: 'bg-emerald-600' },
                          { label: 'Royal Blue', class: 'text-blue-600', bg: 'bg-blue-600' },
                          { label: 'Purple 600', class: 'text-purple-600', bg: 'bg-purple-600' },
                          { label: 'Rose 500', class: 'text-rose-500', bg: 'bg-rose-500' },
                          { label: 'Amber 500', class: 'text-amber-500', bg: 'bg-amber-500' },
                        ].map((tc) => (
                          <button
                            key={tc.class}
                            type="button"
                            disabled={disabled}
                            title={tc.label}
                            onClick={() => onUpdateStyle('textColor', tc.class)}
                            className="h-[30px] rounded-[8px] flex items-center gap-2 px-2.5 bg-[#F5F7F6] hover:bg-[#EAEFEB] border border-[#E2E7E4] text-[11px] font-medium tracking-[-0.015em] text-[#2E3C35] hover:text-[#14221B] transition cursor-pointer"
                          >
                            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${tc.bg} ring-1 ring-black/15`} />
                            <span className="truncate">{tc.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === 'borders' && (
                  <AppearanceStudio
                    classes={activeElement.classes}
                    scope={scope}
                    disabled={disabled}
                    onChange={onUpdateStyle}
                  />
                )}

                {activeTool === 'effects' && (
                  <AppearanceControls
                    defaultOpen
                    classes={activeElement.classes}
                    computed={computed}
                    scope={scope}
                    disabled={disabled}
                    onChange={onUpdateStyle}
                  />
                )}

                {activeTool === 'states' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#627168] font-medium tracking-[-0.01em] mb-1">
                      Preview &amp; style interaction states:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
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
                          onClick={() => onSetActiveVariant(variant.id)}
                          aria-pressed={activeVariant === variant.id}
                          className={`h-[30px] rounded-[8px] text-[11.5px] font-medium tracking-[-0.015em] transition cursor-pointer flex items-center justify-center ${
                            activeVariant === variant.id
                              ? 'bg-[#16845B] text-white font-semibold shadow-[0_2px_8px_rgba(22,132,91,0.24)]'
                              : 'bg-[#F5F7F6] text-[#35443C] hover:bg-[#EAEFEB] hover:text-[#14221B] border border-[#E2E7E4]'
                          }`}
                        >
                          {variant.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTool === 'code' && (
                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-[#EFF3F0]">
                      <span className="text-[#627168]">Element Tag</span>
                      <span className="font-mono font-medium text-[#16845B]">&lt;{activeElement.tag}&gt;</span>
                    </div>
                    {activeElement.filePath && (
                      <div className="flex justify-between py-1 border-b border-[#EFF3F0]">
                        <span className="text-[#627168]">Source</span>
                        <span className="font-mono text-[#35443C] truncate max-w-[165px]" title={`${activeElement.filePath}:${activeElement.line || ''}`}>
                          {activeElement.filePath.split(/[\\/]/).pop()}{activeElement.line ? `:${activeElement.line}` : ''}
                        </span>
                      </div>
                    )}
                    <div className="py-1">
                      <span className="text-[#627168] block mb-1.5">Tailwind Classes</span>
                      <div className="p-2.5 rounded-lg bg-[#F5F7F6] border border-[#E2E7E5] font-mono text-[10px] text-[#176849] leading-relaxed max-h-[260px] overflow-y-auto flex flex-wrap gap-1">
                        {activeElement.classes.trim()
                          ? activeElement.classes.trim().split(/\s+/).map((cls, i) => (
                              <span key={`${cls}-${i}`} className="px-1.5 py-0.5 rounded bg-white border border-[#DCE3DF] text-[#156948]">
                                {cls}
                              </span>
                            ))
                          : <span className="text-[#8A978F]">No utility classes</span>}
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === 'drafts' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1D2B24]">
                        {draftCount} staged change{draftCount === 1 ? '' : 's'}
                      </span>
                      <button
                        type="button"
                        onClick={onDiscardDraft}
                        disabled={disabled || draftCount === 0}
                        className="text-[#627168] hover:text-rose-600 transition cursor-pointer text-[11px] disabled:opacity-40 disabled:cursor-default disabled:hover:text-[#627168]"
                      >
                        Discard all
                      </button>
                    </div>

                    {draft?.frames && draft.frames.length > 1 && (
                      <ol className="max-h-48 overflow-y-auto space-y-1 py-1 pl-4 list-decimal text-[11px] text-[#46554C] leading-snug border-y border-[#E7ECE9]">
                        {draft.frames.slice(1, draftCount + 1).map((frame, index) => (
                          <li key={index} className="py-0.5">
                            {frame.edit?.summary || 'Restored original value'}
                          </li>
                        ))}
                      </ol>
                    )}

                    <button
                      type="button"
                      onClick={onRequestSave}
                      disabled={disabled || draftCount === 0}
                      className="w-full py-2 rounded-xl bg-[#16845B] hover:bg-[#11714D] text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Save size={13} />
                      <span>{isApplying ? 'Saving…' : 'Save all changes'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
