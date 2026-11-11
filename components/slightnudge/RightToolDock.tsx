'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  X,
  Save,
  RotateCcw,
  Sparkles,
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
  repositoryId,
  pendingEdit,
  sourceSelections = {},
  sourceLayers = [],
  onUpdateStyle,
  onRequestSave,
  onDiscardDraft,
  onDeselect,
  onSetActiveVariant,
  onUndo,
  onRedo,
  onTriggerBackendPreview,
}: RightToolDockProps) {
  const [activeTool, setActiveTool] = useState<DockTool>(() => (selectedLayer ? 'layout' : null));
  const disabled = busy || isApplying || reviewBlocking || destinationMode || viewportChanging;

  // Auto-open layout when an element is selected, or close when deselected
  useEffect(() => {
    if (selectedLayer && activeTool === null) {
      setActiveTool('layout');
    } else if (!selectedLayer) {
      setActiveTool(null);
    }
  }, [selectedLayer]);

  // Auto-close flyout on Escape
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
    setActiveTool(current => (current === tool ? null : tool));
  };

  const draftCount = draft?.cursor || 0;
  const tagLabel = activeElement.tag ? `<${activeElement.tag.split('.')[0]}>` : 'Element';
  const showTooltips = activeTool === null;

  // Determine current width class
  const widthVal = activeElement.width || activeElement.classes.match(/\bw-(auto|full|1\/2|1\/3|2\/3|1\/4|3\/4|fit)\b/)?.[0] || '';
  // Determine current grid cols
  const colsMatch = activeElement.classes.match(/\bgrid-cols-(\d+)\b/);
  const colsVal = colsMatch ? colsMatch[0] : 'grid-cols-1';

  return (
    <>
      {/* =========================================================================
         1. TOP-TIER OBSIDIAN GLASS DOCK (Framer & Dribbble Award Standard)
         ========================================================================= */}
      <aside
        data-editor-panel="inspector"
        data-dock-visible={visible ? 'true' : 'false'}
        aria-label="Design tools dock"
        className="select-none flex flex-col items-center pointer-events-auto"
      >
        <div
          role="toolbar"
          aria-label="Pro Studio Tools"
          className="w-[52px] py-3 px-1.5 rounded-full bg-gradient-to-b from-[#1E2023]/96 via-[#131518]/98 to-[#0B0C0E]/99 backdrop-blur-3xl border border-white/[0.12] shadow-[0_24px_54px_-10px_rgba(0,0,0,0.85),0_10px_20px_-5px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_-1px_1px_0_rgba(0,0,0,0.5)] flex flex-col items-center gap-1.5 transition-all duration-200"
        >
          {/* 1. TOP TOOL: Select & Move Pointer (Figma / Framer Standard) */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label={selectedLayer ? `Inspecting ${tagLabel}` : 'Inspect tool'}
              title={selectedLayer ? `Inspecting ${tagLabel}` : 'Select & Move (V)'}
              onClick={() => toggleTool('inspect')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'inspect'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : selectedLayer
                  ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                  : 'text-zinc-300 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 4.5L11.5 21L14 14L21 11.5L4.5 4.5Z" />
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>{selectedLayer ? `Inspect ${tagLabel}` : 'Select & Move'}</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">V</kbd>
              </div>
            )}
          </div>

          {/* ELEGANT HAIRLINE DIVIDER UNDER POINTER */}
          <span className="w-6 h-[1px] bg-gradient-to-r from-transparent via-white/[0.14] to-transparent my-0.5" />

          {/* 2. LAYOUT & BENTO GRID */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Layout and display"
              title="Layout & Shapes (Display, Flex, Grid, Columns)"
              onClick={() => toggleTool('layout')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'layout'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="7" rx="2"/>
                <rect x="3" y="14" width="8" height="7" rx="2"/>
                <rect x="13" y="14" width="8" height="7" rx="2"/>
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>Layout & Grid</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">L</kbd>
              </div>
            )}
          </div>

          {/* 3. SPACING & BOX MODEL */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Spacing and padding"
              title="Spacing & Box Model (Padding & Margin)"
              onClick={() => toggleTool('spacing')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'spacing'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3.5" strokeDasharray="3 2" opacity="0.65" />
                <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>Spacing & Padding</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">S</kbd>
              </div>
            )}
          </div>

          {/* 4. TYPOGRAPHY STUDIO */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Typography"
              title="Typography (Typeface, Size, Weight, Align)"
              onClick={() => toggleTool('type')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'type'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6.5V4h16v2.5"/>
                <path d="M12 4v16"/>
                <path d="M8.5 20h7"/>
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>Typography</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">T</kbd>
              </div>
            )}
          </div>

          {/* 5. COLORS & FILLS (Palette with colored enamel dots) */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Colors and styles"
              title="Colors & Fills (Palette, Background, Gradients)"
              onClick={() => toggleTool('colors')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'colors'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/>
                <circle cx="7.5" cy="11.5" r="1.3" fill="#F43F5E" stroke="none"/>
                <circle cx="12" cy="7.5" r="1.3" fill="#FBBF24" stroke="none"/>
                <circle cx="16.5" cy="11.5" r="1.3" fill="#38BDF8" stroke="none"/>
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>Colors & Fills</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">C</kbd>
              </div>
            )}
          </div>

          {/* 6. BORDER & CORNER RADIUS */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Borders and radius"
              title="Borders & Radius (Corner Radius, Stroke)"
              onClick={() => toggleTool('borders')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'borders'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20V10a6 6 0 0 1 6-6h10"/>
                <circle cx="14" cy="14" r="3.2" fill="currentColor" fillOpacity="0.25"/>
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>Border & Radius</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">R</kbd>
              </div>
            )}
          </div>

          {/* 7. SHADOWS & EFFECTS */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Shadows and effects"
              title="Shadows, Blurs & Gradient Overlays"
              onClick={() => toggleTool('effects')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'effects'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="13" height="13" rx="2.5"/>
                <path d="M8 21h10a2 2 0 0 0 2-2V8"/>
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>Shadows & Effects</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">E</kbd>
              </div>
            )}
          </div>

          {/* 8. INTERACTIVE STATES (Sparkle) */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="States"
              title="Interactive States (Hover, Focus, Pressed)"
              onClick={() => toggleTool('states')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeVariant
                  ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : activeTool === 'states'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 2.5-2 6a1.8 1.8 0 0 1-1.2 1.2l-6 2 6 2a1.8 1.8 0 0 1 1.2 1.2l2 6 2-6a1.8 1.8 0 0 1 1.2-1.2l6-2-6-2a1.8 1.8 0 0 1-1.2-1.2z" fill="currentColor" fillOpacity="0.2"/>
                <circle cx="18" cy="6" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>Interactive States</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">V</kbd>
              </div>
            )}
          </div>

          {/* ELEGANT HAIRLINE DIVIDER */}
          <span className="w-6 h-[1px] bg-gradient-to-r from-transparent via-white/[0.14] to-transparent my-1" />

          {/* 9. SOURCE CODE INSPECT (</>) */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              aria-label="Inspect source code"
              title="Inspect TSX Source & Tailwind Classes"
              onClick={() => toggleTool('code')}
              className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'code'
                  ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </button>
            {showTooltips && (
              <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                <span>Source Code</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">&lt;/&gt;</kbd>
              </div>
            )}
          </div>

          {/* 10. STAGED CHANGES / SAVE WITH MICRO-COUNTER BADGE (Image 4 Style) */}
          {usesDrafts && (
            <div className="relative group flex items-center justify-center">
              {draftCount > 0 ? (
                <button
                  type="button"
                  aria-label={`Review ${draftCount} staged changes`}
                  title={`Review ${draftCount} staged changes (⌘S)`}
                  onClick={() => toggleTool('drafts')}
                  className={`w-[34px] h-[34px] rounded-full bg-gradient-to-b from-[#00D68F] to-[#00A86B] text-white font-bold text-[13px] flex items-center justify-center shadow-[0_2px_12px_rgba(0,180,115,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:brightness-110 active:scale-95 transition-all cursor-pointer ${
                    activeTool === 'drafts' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#131518]' : ''
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
                  className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTool === 'drafts'
                      ? 'bg-white text-zinc-950 shadow-[0_2px_12px_rgba(255,255,255,0.35)] font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95'
                  }`}
                >
                  <RotateCcw size={16} strokeWidth={2.2} />
                </button>
              )}

              {showTooltips && (
                <div className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0F1110]/95 backdrop-blur-xl border border-white/[0.12] text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                  <span>{draftCount > 0 ? `${draftCount} Staged Edits` : 'History & Edits'}</span>
                  <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">⌘S</kbd>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
         2. CONTEXTUAL FLYOUT CARD (Positioned Cleanly to the Left of the Dock)
         ========================================================================= */}
      {visible && activeTool !== null && (
        <div
          role="dialog"
          aria-label={`${activeTool} controls`}
          style={appleTypographyStyle}
          className="fixed right-[96px] top-1/2 -translate-y-1/2 z-50 w-[310px] max-h-[calc(100vh-100px)] overflow-y-auto bg-gradient-to-b from-[#181A1C]/98 to-[#101214]/99 backdrop-blur-3xl border border-white/[0.12] rounded-[18px] shadow-[0_28px_64px_-12px_rgba(0,0,0,0.85),0_12px_24px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.18)] p-4 text-xs text-slate-100 antialiased animate-in fade-in slide-in-from-right-3 duration-200"
        >
          {/* Flyout Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.1]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[13px] tracking-[-0.022em] text-white/95">
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
                <span className="text-[10.5px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-[5px] border border-emerald-500/30 font-medium tracking-tight truncate max-w-[90px]">
                  {tagLabel}
                </span>
              )}
            </div>
            <button
              type="button"
              aria-label="Close panel"
              onClick={() => setActiveTool(null)}
              className="text-white/40 hover:text-white hover:bg-white/[0.08] p-1 rounded-[6px] transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Flyout Content by Tool */}
          <div className="space-y-3">
            {!selectedLayer && activeTool !== 'drafts' ? (
              <div className="py-6 px-3 text-center text-white/40">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-white/30">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                </svg>
                <p className="text-xs font-medium text-white/80">Select an element</p>
                <p className="text-[11px] text-white/45 mt-0.5">Click any element on the canvas to inspect & style it.</p>
              </div>
            ) : (
              <>
                {/* TOOL: INSPECT OVERVIEW */}
                {activeTool === 'inspect' && (
                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-white/[0.06]">
                      <span className="text-zinc-400">Tag</span>
                      <span className="font-mono font-medium text-white">{activeElement.tag}</span>
                    </div>
                    {activeElement.filePath && (
                      <div className="flex justify-between py-1 border-b border-white/[0.06]">
                        <span className="text-zinc-400">Source</span>
                        <span className="font-mono text-white/70 truncate max-w-[140px]" title={activeElement.filePath}>
                          {activeElement.filePath.split(/[\\/]/).pop()}
                        </span>
                      </div>
                    )}
                    {activeElement.classes && (
                      <div className="py-1 border-b border-white/[0.06]">
                        <span className="text-zinc-400 block mb-1">Classes</span>
                        <p className="font-mono text-[10px] text-white/60 break-words line-clamp-3">
                          {activeElement.classes}
                        </p>
                      </div>
                    )}
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={onDeselect}
                        className="w-full py-1.5 text-center text-zinc-300 hover:text-rose-400 bg-white/[0.06] hover:bg-rose-950/40 border border-white/[0.08] rounded-lg font-medium transition cursor-pointer text-xs"
                      >
                        Deselect Element
                      </button>
                    </div>
                  </div>
                )}

                {/* TOOL: LAYOUT & DISPLAY */}
                {activeTool === 'layout' && (
                  <div className="space-y-3">
                    {/* Width Combobox (required by core editing tests) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11.5px] text-zinc-400 font-medium tracking-[-0.01em]">Width</label>
                        <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] border border-white/[0.06] tracking-tight tabular-nums">{widthVal || 'inherited'}</span>
                      </div>
                      <div className="relative">
                        <select
                          aria-label="Width"
                          disabled={disabled}
                          value={widthVal}
                          onChange={(e) => onUpdateStyle('width', e.target.value)}
                          className="w-full h-[30px] bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-[8px] px-2.5 text-[11.5px] font-medium tracking-[-0.015em] text-white appearance-none focus:outline-none focus:border-emerald-500/80 cursor-pointer transition"
                        >
                          <option value="" disabled className="bg-[#1A1E1C] text-white">Inherited / custom</option>
                          <option value="w-auto" className="bg-[#1A1E1C] text-white">Auto</option>
                          <option value="w-full" className="bg-[#1A1E1C] text-white">Full</option>
                          <option value="w-1/2" className="bg-[#1A1E1C] text-white">1/2</option>
                          <option value="w-fit" className="bg-[#1A1E1C] text-white">Fit</option>
                        </select>
                        <ChevronDown size={12} className="text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Layout Columns Combobox (required by core editing tests on grids) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11.5px] text-zinc-400 font-medium tracking-[-0.01em]">Layout columns</label>
                        <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] border border-white/[0.06] tracking-tight tabular-nums">{colsVal}</span>
                      </div>
                      <div className="relative">
                        <select
                          aria-label="Layout columns"
                          disabled={disabled}
                          value={colsVal}
                          onChange={(e) => onUpdateStyle('gridColumns', e.target.value)}
                          className="w-full h-[30px] bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-[8px] px-2.5 text-[11.5px] font-medium tracking-[-0.015em] text-white appearance-none focus:outline-none focus:border-emerald-500/80 cursor-pointer transition"
                        >
                          <option value="" disabled className="bg-[#1A1E1C] text-white">Columns</option>
                          <option value="grid-cols-1" className="bg-[#1A1E1C] text-white">1 Col</option>
                          <option value="grid-cols-2" className="bg-[#1A1E1C] text-white">2 Cols</option>
                          <option value="grid-cols-3" className="bg-[#1A1E1C] text-white">3 Cols</option>
                          <option value="grid-cols-4" className="bg-[#1A1E1C] text-white">4 Cols</option>
                        </select>
                        <ChevronDown size={12} className="text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Full Layout Matrix */}
                    <LayoutMatrix
                      classes={activeElement.classes}
                      computed={computed}
                      disabled={disabled}
                      onChange={onUpdateStyle}
                    />
                  </div>
                )}

                {/* TOOL: TYPOGRAPHY */}
                {activeTool === 'type' && (
                  <TypographyStudio
                    classes={activeElement.classes}
                    disabled={disabled}
                    onChange={onUpdateStyle}
                  />
                )}

                {/* TOOL: SPACING */}
                {activeTool === 'spacing' && (
                  <BoxModelControl
                    classes={activeElement.classes}
                    disabled={disabled}
                    onChange={onUpdateStyle}
                  />
                )}

                {/* TOOL: COLORS & FILLS */}
                {activeTool === 'colors' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 font-medium mb-1.5 block">Quick Background Fill</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: 'Slate 900', class: 'bg-slate-900', ring: 'ring-white/20' },
                          { label: 'Emerald 600', class: 'bg-emerald-600', ring: 'ring-emerald-400/30' },
                          { label: 'Royal Blue', class: 'bg-blue-600', ring: 'ring-blue-400/30' },
                          { label: 'Purple 600', class: 'bg-purple-600', ring: 'ring-purple-400/30' },
                          { label: 'Rose 500', class: 'bg-rose-500', ring: 'ring-rose-400/30' },
                          { label: 'Amber 500', class: 'bg-amber-500', ring: 'ring-amber-400/30' },
                          { label: 'White', class: 'bg-white', ring: 'ring-black/20' },
                          { label: 'Transparent', class: 'bg-transparent', ring: 'ring-white/20' },
                        ].map((c) => (
                          <button
                            key={c.class}
                            type="button"
                            disabled={disabled}
                            title={c.label}
                            onClick={() => onUpdateStyle('backgroundColor', c.class)}
                            className="h-[30px] rounded-[8px] flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[11.5px] font-medium tracking-[-0.015em] text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            <span className={`w-3.5 h-3.5 rounded-full ${c.class} ${c.ring} ring-1`} />
                            <span className="truncate">{c.label.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1.5 block">Text Color</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: 'Dark', class: 'text-slate-900', bg: 'bg-slate-900' },
                          { label: 'Muted', class: 'text-slate-500', bg: 'bg-slate-500' },
                          { label: 'White', class: 'text-white', bg: 'bg-white' },
                          { label: 'Emerald', class: 'text-emerald-500', bg: 'bg-emerald-500' },
                          { label: 'Blue', class: 'text-blue-600', bg: 'bg-blue-600' },
                          { label: 'Purple', class: 'text-purple-600', bg: 'bg-purple-600' },
                          { label: 'Rose', class: 'text-rose-500', bg: 'bg-rose-500' },
                          { label: 'Amber', class: 'text-amber-500', bg: 'bg-amber-500' },
                        ].map((tc) => (
                          <button
                            key={tc.class}
                            type="button"
                            disabled={disabled}
                            title={tc.label}
                            onClick={() => onUpdateStyle('textColor', tc.class)}
                            className="h-[30px] rounded-[8px] flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[11.5px] font-medium tracking-[-0.015em] text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            <span className={`w-3.5 h-3.5 rounded-full ${tc.bg} ring-1 ring-white/20`} />
                            <span className="truncate">{tc.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TOOL: BORDERS & RADIUS */}
                {activeTool === 'borders' && (
                  <AppearanceStudio
                    classes={activeElement.classes}
                    disabled={disabled}
                    onChange={onUpdateStyle}
                  />
                )}

                {/* TOOL: SHADOWS & EFFECTS */}
                {activeTool === 'effects' && (
                  <AppearanceControls
                    classes={activeElement.classes}
                    computed={computed}
                    scope={activeBreakpoint || activeVariant}
                    disabled={disabled}
                    onChange={onUpdateStyle}
                  />
                )}

                {/* TOOL: STATES */}
                {activeTool === 'states' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1">Preview & style interaction states:</p>
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
                              ? 'bg-emerald-500 text-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_2px_8px_rgba(16,185,129,0.3)]'
                              : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.07]'
                          }`}
                        >
                          {variant.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TOOL: SOURCE CODE */}
                {activeTool === 'code' && (
                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-white/[0.06]">
                      <span className="text-zinc-400">Element Tag</span>
                      <span className="font-mono font-medium text-emerald-400">{activeElement.tag}</span>
                    </div>
                    {activeElement.filePath && (
                      <div className="flex justify-between py-1 border-b border-white/[0.06]">
                        <span className="text-zinc-400">File Path</span>
                        <span className="font-mono text-white/70 truncate max-w-[150px]" title={activeElement.filePath}>
                          {activeElement.filePath.split(/[\\/]/).pop()}
                        </span>
                      </div>
                    )}
                    <div className="py-1">
                      <span className="text-zinc-400 block mb-1.5">Tailwind Classes</span>
                      <div className="p-2.5 rounded-lg bg-black/50 border border-white/[0.08] font-mono text-[10px] text-emerald-300/90 break-words leading-relaxed max-h-36 overflow-y-auto">
                        {activeElement.classes || 'No classes'}
                      </div>
                    </div>
                  </div>
                )}

                {/* TOOL: DRAFTS & HISTORY */}
                {activeTool === 'drafts' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/80">
                        {draftCount} staged change{draftCount === 1 ? '' : 's'}
                      </span>
                      <button
                        type="button"
                        onClick={onDiscardDraft}
                        disabled={disabled}
                        className="text-white/50 hover:text-rose-400 transition cursor-pointer text-[11px]"
                      >
                        Discard all
                      </button>
                    </div>

                    {draft?.frames && draft.frames.length > 1 && (
                      <ol className="max-h-48 overflow-y-auto space-y-1 py-1 pl-4 list-decimal text-[11px] text-white/70 leading-snug border-y border-white/[0.08]">
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
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
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
