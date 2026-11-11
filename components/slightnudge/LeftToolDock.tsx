'use client';

import React, { useEffect } from 'react';
import {
  Layers2,
  FileText,
  X,
  Code2,
  Undo2,
  Boxes,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { SourceLayers } from './SourceLayers';
import type { CanvasLayer } from '@/lib/slightnudge/source-canvas-contract';
import { appleTypographyStyle } from './FramerControls';

export type LeftTool = 'layers' | 'pages' | 'assets' | null;

export interface LeftDockPageItem {
  id: string;
  title: string;
  route: string;
  file: string;
}

export interface LeftToolDockProps<TPage extends LeftDockPageItem = LeftDockPageItem> {
  visible?: boolean;
  activeTool: LeftTool;
  onToggleTool: (tool: LeftTool) => void;
  onClose?: () => void;
  sourceLayers: CanvasLayer[];
  selectedLayer: string | null;
  onSelectLayer: (key: string) => void;
  pages: TPage[];
  selectedPage: TPage;
  onSelectPage: (page: TPage) => void;
  activeElement: { filePath?: string; tag?: string };
  repositoryId?: string;
  uncertainUndoId?: string | null;
  onUndo?: () => void;
}

export function LeftToolDock<TPage extends LeftDockPageItem>({
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
}: LeftToolDockProps<TPage>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        if (activeTool !== null) {
          e.stopPropagation();
          onToggleTool(null);
        } else if (onClose) {
          e.stopPropagation();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, visible, onToggleTool, onClose]);

  return (
    <>
      {/* 1. LEFT FLOATING CAPSULE RAIL (Smooth 340ms Slide-In, Light Frosted Glass) */}
      {activeTool === null && (
        <aside
          data-editor-rail="left"
          data-dock-visible={visible ? 'true' : 'false'}
          aria-hidden={!visible}
          aria-label="Navigation tools dock"
          className="fixed left-[16px] top-1/2 z-50 select-none flex flex-col items-center pointer-events-auto"
        >
          <div
            role="toolbar"
            aria-label="Navigation Tools"
            className="w-[44px] py-2 px-1 rounded-full bg-white/95 backdrop-blur-2xl border border-[#DCE3DF] shadow-[0_14px_36px_-8px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.05)] flex flex-col items-center gap-1 transition-all duration-200"
          >
            <button
              type="button"
              aria-label="Layers"
              aria-pressed={false}
              title="Page Layers"
              onClick={() => onToggleTool('layers')}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[#5A6960] hover:text-[#16845B] hover:bg-[#EFF5F0] active:scale-95 transition-all cursor-pointer"
            >
              <Layers2 size={16} strokeWidth={1.85} />
            </button>

            <button
              type="button"
              aria-label="Pages"
              aria-pressed={false}
              title="Site Pages"
              onClick={() => onToggleTool('pages')}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[#5A6960] hover:text-[#16845B] hover:bg-[#EFF5F0] active:scale-95 transition-all cursor-pointer"
            >
              <FileText size={15} strokeWidth={1.85} />
            </button>

            <button
              type="button"
              aria-label="Assets"
              aria-pressed={false}
              title="Assets & Components"
              onClick={() => onToggleTool('assets')}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[#5A6960] hover:text-[#16845B] hover:bg-[#EFF5F0] active:scale-95 transition-all cursor-pointer"
            >
              <Boxes size={15} strokeWidth={1.85} />
            </button>
          </div>
        </aside>
      )}

      {/* 2. COMPACT FLOATING PANEL (Smooth 340ms Slide-In, Light Ceramic Card, clears bottom dock) */}
      {activeTool !== null && (
        <aside
          data-editor-panel="layers"
          data-dock-visible={visible ? 'true' : 'false'}
          aria-hidden={!visible}
          role="dialog"
          aria-label={activeTool === 'layers' ? 'Layers' : activeTool === 'pages' ? 'Pages' : 'Assets'}
          style={appleTypographyStyle}
          className="fixed left-[16px] top-[16px] z-50 w-[252px] h-[min(560px,calc(100vh-100px))] flex flex-col bg-white/96 backdrop-blur-2xl border border-[#DCE3DF] rounded-[16px] shadow-[0_20px_50px_-10px_rgba(15,23,42,0.14),0_6px_16px_rgba(15,23,42,0.06)] p-2.5 text-xs text-[#1D2B24] antialiased"
        >
          {/* Header tabs + Collapse/Close */}
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-[#E7ECE9]">
            <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-[#F1F4F2] border border-[#E2E7E4]">
              <button
                type="button"
                aria-label="Layers"
                aria-pressed={activeTool === 'layers'}
                onClick={() => onToggleTool('layers')}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  activeTool === 'layers'
                    ? 'bg-white text-[#14221B] font-semibold shadow-xs'
                    : 'text-[#64746C] hover:text-[#1D2B24]'
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
                    ? 'bg-white text-[#14221B] font-semibold shadow-xs'
                    : 'text-[#64746C] hover:text-[#1D2B24]'
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
                    ? 'bg-white text-[#14221B] font-semibold shadow-xs'
                    : 'text-[#64746C] hover:text-[#1D2B24]'
                }`}
              >
                <Boxes size={11} />
                <span>Assets</span>
              </button>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label="Collapse to rail"
                title="Collapse to dock"
                onClick={() => onToggleTool(null)}
                className="text-[#7B8880] hover:text-[#1D2B24] hover:bg-[#EFF4F1] p-1 rounded-md transition cursor-pointer"
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
                className="text-[#7B8880] hover:text-[#1D2B24] hover:bg-[#EFF4F1] p-1 rounded-md transition cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {activeTool === 'layers' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <SourceLayers
                  layers={sourceLayers}
                  selected={selectedLayer}
                  onSelect={onSelectLayer}
                />
              </div>
            )}

            {activeTool === 'pages' && (
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 py-1">
                {pages.map((page) => {
                  const isSelected = selectedPage.id === page.id;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => onSelectPage(page)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#EFF5F0] border border-[#A7F3D0] text-[#156948] font-medium shadow-xs'
                          : 'hover:bg-[#F5F7F6] text-[#35443C] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FileText
                          size={14}
                          className={`shrink-0 ${isSelected ? 'text-[#16845B]' : 'text-[#7C8A82]'}`}
                        />
                        <span className="text-[12px] truncate">{page.title}</span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ml-2 ${isSelected ? 'text-[#16845B]' : 'text-[#7C8A82]'}`}>
                        {page.route}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTool === 'assets' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1">
                <p className="text-[11px] text-[#64746C] mb-2">Standard section patterns & blocks:</p>
                {[
                  { name: 'Hero Banner', tag: 'section', desc: 'Display headline + primary CTA' },
                  { name: 'Feature Grid', tag: 'div', desc: '3-column responsive card layout' },
                  { name: 'Call to Action', tag: 'section', desc: 'High-contrast conversion band' },
                  { name: 'Pill Button', tag: 'button', desc: 'Accessible rounded action button' },
                  { name: 'Navigation Bar', tag: 'nav', desc: 'Brand logo + link cluster' },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="p-2.5 rounded-xl bg-[#F7F9F8] hover:bg-[#EFF4F1] border border-[#E3E8E5] flex items-center justify-between transition cursor-pointer group"
                  >
                    <div>
                      <p className="text-[12px] font-medium text-[#1D2B24]">{item.name}</p>
                      <p className="text-[10px] text-[#6C7B72] font-mono mt-0.5">{item.desc}</p>
                    </div>
                    <span className="w-6 h-6 rounded-lg bg-white border border-[#E1E7E3] text-[#64746C] group-hover:text-[#16845B] group-hover:border-[#A7F3D0] flex items-center justify-center transition">
                      <Plus size={13} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 mt-2 border-t border-[#E7ECE9] flex items-center justify-between text-[10.5px] text-[#64746C]">
            <div className="flex items-center gap-1.5 truncate max-w-[190px]" title={activeElement.filePath}>
              <Code2 size={13} className="shrink-0 text-[#7B8880]" />
              <span className="truncate font-mono">
                {repositoryId && !selectedLayer
                  ? 'Select element'
                  : (selectedLayer ? activeElement.filePath : selectedPage.file)?.split(/[\\/]/).pop()}
              </span>
            </div>
            {uncertainUndoId && onUndo && (
              <button
                type="button"
                onClick={onUndo}
                className="text-amber-700 hover:text-amber-800 flex items-center gap-1"
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
