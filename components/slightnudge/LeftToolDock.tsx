'use client';

import React, { useEffect, useState } from 'react';
import {
  Layers2,
  FileText,
  FolderGit2,
  X,
  Search,
  Code2,
  Undo2,
  Sparkles,
  Component,
  Boxes,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { SourceLayers } from './SourceLayers';
import type { CanvasLayer } from '@/lib/slightnudge/source-canvas-contract';
import { appleTypographyStyle } from './FramerControls';

export type LeftTool = 'layers' | 'pages' | 'assets' | null;

export interface LeftToolDockProps {
  visible?: boolean;
  activeTool: LeftTool;
  onToggleTool: (tool: LeftTool) => void;
  onClose?: () => void;
  // Layers props
  sourceLayers: CanvasLayer[];
  selectedLayer: string | null;
  onSelectLayer: (key: string) => void;
  // Pages props
  pages: Array<{ id: string; title: string; route: string; file: string }>;
  selectedPage: { id: string; title: string; route: string; file: string };
  onSelectPage: (page: { id: string; title: string; route: string; file: string }) => void;
  // Breadcrumbs & undo
  activeElement: { filePath?: string; tag?: string };
  repositoryId?: string;
  uncertainUndoId?: string | null;
  onUndo?: () => void;
}

export function LeftToolDock({
  visible = true,
  activeTool,
  onToggleTool,
  onClose,
  sourceLayers = [],
  selectedLayer,
  onSelectLayer,
  pages = [],
  selectedPage,
  onSelectPage,
  activeElement,
  repositoryId,
  uncertainUndoId,
  onUndo,
}: LeftToolDockProps) {
  // Auto-close flyout on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        e.stopPropagation();
        if (activeTool !== null) {
          onToggleTool(null);
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, visible, onToggleTool, onClose]);

  const showTooltips = activeTool === null;

  return (
    <>
      {/* =========================================================================
         1. LEFT CAPSULE DOCK (Rendered ONLY when flyout is closed)
         ========================================================================= */}
      {activeTool === null && (
        <aside
          data-editor-rail="left"
          data-dock-visible={visible ? 'true' : 'false'}
          aria-label="Navigation tools dock"
          className="fixed left-[20px] top-1/2 -translate-y-1/2 z-50 select-none flex flex-col items-center pointer-events-auto"
        >
          <div
            role="toolbar"
            aria-label="Navigation Tools"
            className="w-[44px] py-2 px-1 rounded-full bg-gradient-to-b from-[#1E2023]/96 via-[#131518]/98 to-[#0B0C0E]/99 backdrop-blur-3xl border border-white/[0.12] shadow-[0_20px_48px_-10px_rgba(0,0,0,0.85),inset_0_1px_1px_0_rgba(255,255,255,0.2)] flex flex-col items-center gap-1 transition-all duration-200"
          >
            {/* 1. LAYERS (⊞) */}
            <button
              type="button"
              aria-label="Layers"
              aria-pressed={false}
              title="Page Layers (⌘1)"
              onClick={() => onToggleTool('layers')}
              className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </button>

            {/* 2. PAGES (📄) */}
            <button
              type="button"
              aria-label="Pages"
              aria-pressed={false}
              title="Site Pages (⌘2)"
              onClick={() => onToggleTool('pages')}
              className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </button>

            {/* 3. ASSETS & COMPONENTS (📁) */}
            <button
              type="button"
              aria-label="Assets"
              aria-pressed={false}
              title="Assets & Components (⌘3)"
              onClick={() => onToggleTool('assets')}
              className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </aside>
      )}

      {/* =========================================================================
         2. COMPACT FLOATING CARD (Replaces rail at left: 20px when open — NEVER TWO SIDEBARS)
         ========================================================================= */}
      {activeTool !== null && (
        <aside
          data-editor-panel="layers"
          data-dock-visible={visible ? 'true' : 'false'}
          role="dialog"
          aria-label={activeTool === 'layers' ? 'Layers' : activeTool === 'pages' ? 'Pages' : 'Assets'}
          style={appleTypographyStyle}
          className="fixed left-[20px] top-1/2 -translate-y-1/2 z-50 w-[245px] h-[360px] max-h-[48vh] flex flex-col bg-gradient-to-b from-[#181A1C]/98 to-[#101214]/99 backdrop-blur-3xl border border-white/[0.12] rounded-[16px] shadow-[0_24px_54px_-10px_rgba(0,0,0,0.85),0_8px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_0_rgba(255,255,255,0.18)] p-2.5 text-xs text-slate-100 antialiased"
        >
          {/* Header with segmented switcher tabs + Collapse '<' and Close 'x' button */}
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-black/40 border border-white/10">
              <button
                type="button"
                aria-label="Layers"
                aria-pressed={activeTool === 'layers'}
                onClick={() => onToggleTool('layers')}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  activeTool === 'layers'
                    ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers2 size={11} />
                <span>Layers</span>
              </button>
              <button
                type="button"
                aria-label="Pages"
                aria-pressed={activeTool === 'pages'}
                onClick={() => onToggleTool('pages')}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  activeTool === 'pages'
                    ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileText size={11} />
                <span>Pages</span>
              </button>
              <button
                type="button"
                aria-label="Assets"
                aria-pressed={activeTool === 'assets'}
                onClick={() => onToggleTool('assets')}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  activeTool === 'assets'
                    ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Boxes size={11} />
                <span>Assets</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Collapse to rail"
                title="Collapse to dock"
                onClick={() => onToggleTool(null)}
                className="text-white/40 hover:text-white hover:bg-white/[0.08] p-1 rounded-md transition cursor-pointer"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                aria-label="Close layers"
                title="Close panel (Esc)"
                onClick={() => {
                  if (onClose) onClose();
                  else onToggleTool(null);
                }}
                className="text-white/40 hover:text-white hover:bg-white/[0.08] p-1 rounded-md transition cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Flyout Body */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* 1. LAYERS TOOL */}
            {activeTool === 'layers' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <SourceLayers
                  layers={sourceLayers}
                  selected={selectedLayer}
                  onSelect={onSelectLayer}
                />
              </div>
            )}

            {/* 2. PAGES TOOL */}
            {activeTool === 'pages' && (
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 py-1">
                {pages.map(page => {
                  const isSelected = selectedPage.id === page.id;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => onSelectPage(page)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium shadow-xs'
                          : 'hover:bg-white/[0.06] text-zinc-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FileText
                          size={14}
                          className={`shrink-0 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`}
                        />
                        <span className="text-[12px] truncate">{page.title}</span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ml-2 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {page.route}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. ASSETS & COMPONENTS TOOL */}
            {activeTool === 'assets' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1">
                <p className="text-[11px] text-zinc-400 mb-2">Drag or click to insert standard components into your page:</p>
                {[
                  { name: 'Hero Banner', tag: 'section', desc: 'Display headline + primary CTA' },
                  { name: 'Feature Grid', tag: 'div', desc: '3-column responsive card layout' },
                  { name: 'Call to Action', tag: 'section', desc: 'High-contrast conversion band' },
                  { name: 'Pill Button', tag: 'button', desc: 'Accessible rounded action button' },
                  { name: 'Navigation Bar', tag: 'nav', desc: 'Brand logo + link cluster' },
                ].map(item => (
                  <div
                    key={item.name}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-between transition cursor-pointer group"
                  >
                    <div>
                      <p className="text-[12px] font-medium text-zinc-200 group-hover:text-white">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.desc}</p>
                    </div>
                    <span className="w-6 h-6 rounded-lg bg-white/[0.08] text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/15 flex items-center justify-center transition">
                      <Plus size={13} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Flyout Footer: Source & Breadcrumb */}
          <div className="pt-2 mt-2 border-t border-white/[0.08] flex items-center justify-between text-[10.5px] text-zinc-400">
            <div className="flex items-center gap-1.5 truncate max-w-[190px]" title={activeElement.filePath}>
              <Code2 size={13} className="shrink-0 text-zinc-500" />
              <span className="truncate font-mono">
                {repositoryId && !selectedLayer ? 'Select element' : (selectedLayer ? activeElement.filePath : selectedPage.file)?.split(/[\\/]/).pop()}
              </span>
            </div>
            {uncertainUndoId && (
              <button
                type="button"
                onClick={onUndo}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                title="Undo edit"
              >
                <Undo2 size={12} />
                <span>Undo</span>
              </button>
            )}
          </div>
        </aside>
      )}
    </>
  );
}

