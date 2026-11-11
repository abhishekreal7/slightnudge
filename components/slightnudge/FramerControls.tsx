'use client';

import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowRight,
  ArrowDown,
  Box,
  Rows3,
  Grid2X2,
  Italic,
  Underline,
} from 'lucide-react';

export const appleFontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", "Inter", var(--font-inter), var(--font-geist-sans), system-ui, sans-serif';

export const appleTypographyStyle: React.CSSProperties = {
  fontFamily: appleFontFamily,
  fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11", "tnum"',
  fontOpticalSizing: 'auto',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'optimizeLegibility',
};

/* =========================================================================
   1. SEGMENTED CONTROL (Authentic Apple iOS Ecosystem Standard)
   ========================================================================= */
export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  fullWidth = true,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      role="group"
      style={appleTypographyStyle}
      className={`inline-flex items-center h-[30px] p-[2px] bg-white/[0.05] border border-white/[0.08] rounded-[9px] select-none antialiased ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {options.map((opt, idx) => {
        const active = opt.id === value;
        const nextActive = options[idx + 1]?.id === value;
        const showDivider = !active && !nextActive && idx < options.length - 1;

        return (
          <React.Fragment key={opt.id}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(opt.id)}
              className={`flex items-center justify-center gap-1.5 h-[24px] rounded-[7px] text-[11.5px] tracking-[-0.015em] transition-all cursor-pointer ${
                fullWidth ? 'flex-1' : 'px-3'
              } ${
                active
                  ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_1px_6px_rgba(0,0,0,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-100 font-medium'
              } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={opt.label}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <span className="truncate leading-none pt-[0.5px] tabular-nums">{opt.label}</span>
            </button>
            {showDivider && (
              <span className="w-[1px] h-3 bg-white/[0.1] shrink-0 my-auto" aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* =========================================================================
   2. SPACING CONTROL (Clean, compact Apple-style chips and inputs)
   ========================================================================= */
export function BoxModelControl({
  classes,
  disabled = false,
  onChange,
}: {
  classes: string;
  disabled?: boolean;
  onChange: (property: string, value: string) => void;
}) {
  const pMatch = classes.match(/\bp-(\d+)\b/);
  const currentPad = pMatch ? pMatch[1] : '0';

  const paddingPresets = [
    { id: '0', label: '0' },
    { id: '1', label: '4px' },
    { id: '2', label: '8px' },
    { id: '3', label: '12px' },
    { id: '4', label: '16px' },
    { id: '6', label: '24px' },
    { id: '8', label: '32px' },
    { id: '12', label: '48px' },
  ];

  return (
    <div className="space-y-2 text-xs antialiased" style={appleTypographyStyle}>
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] text-zinc-400 font-medium tracking-[-0.01em]">Padding</span>
        <span className="font-mono text-[10.5px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[5px] border border-white/[0.07] tracking-tight tabular-nums">
          p-{currentPad} ({Number(currentPad) * 4}px)
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {paddingPresets.map((p) => {
          const active = currentPad === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange('padding', `p-${p.id}`)}
              className={`h-[30px] rounded-[8px] text-[11.5px] tracking-[-0.015em] transition-all cursor-pointer flex items-center justify-center ${
                active
                  ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.18)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.07] font-medium'
              }`}
            >
              <span className="leading-none pt-[0.5px] tabular-nums">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   3. TYPOGRAPHY CONTROL (Apple SF Pro typography styling)
   ========================================================================= */
export function TypographyStudio({
  classes,
  disabled = false,
  onChange,
}: {
  classes: string;
  disabled?: boolean;
  onChange: (property: string, value: string) => void;
}) {
  const fontMatch = classes.match(/\bfont-(sans|serif|mono)\b/);
  const currentFont = fontMatch ? fontMatch[0] : 'font-sans';

  const weightMatch = classes.match(/\bfont-(normal|medium|semibold|bold|extrabold)\b/);
  const currentWeight = weightMatch ? weightMatch[0] : 'font-normal';

  const sizeMatch = classes.match(/\btext-(xs|sm|base|lg|xl|[2-6]xl)\b/);
  const currentSize = sizeMatch ? sizeMatch[0] : 'text-base';

  const alignMatch = classes.match(/\btext-(left|center|right|justify)\b/);
  const currentAlign = alignMatch ? alignMatch[0] : 'text-left';

  const isItalic = /\bitalic\b/.test(classes);
  const isUnderline = /\bunderline\b/.test(classes);

  const sizes = [
    { id: 'text-xs', label: 'XS' },
    { id: 'text-sm', label: 'SM' },
    { id: 'text-base', label: 'Base' },
    { id: 'text-lg', label: 'LG' },
    { id: 'text-xl', label: 'XL' },
    { id: 'text-2xl', label: '2XL' },
    { id: 'text-3xl', label: '3XL' },
    { id: 'text-4xl', label: '4XL' },
  ];

  const weights = [
    { id: 'font-normal', label: 'Regular' },
    { id: 'font-medium', label: 'Medium' },
    { id: 'font-semibold', label: 'Semibold' },
    { id: 'font-bold', label: 'Bold' },
  ];

  const textColors = [
    { label: 'Dark Slate', class: 'text-slate-900', bg: 'bg-slate-900' },
    { label: 'Medium Slate', class: 'text-slate-600', bg: 'bg-slate-600' },
    { label: 'Pure White', class: 'text-white', bg: 'bg-white' },
    { label: 'Emerald 500', class: 'text-emerald-500', bg: 'bg-emerald-500' },
    { label: 'Royal Blue', class: 'text-blue-600', bg: 'bg-blue-600' },
    { label: 'Purple 600', class: 'text-purple-600', bg: 'bg-purple-600' },
    { label: 'Rose 500', class: 'text-rose-500', bg: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-2.5 text-xs antialiased" style={appleTypographyStyle}>
      {/* Typeface */}
      <div>
        <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">Typeface</label>
        <SegmentedControl
          value={currentFont}
          disabled={disabled}
          onChange={(v) => onChange('fontFamily', v)}
          options={[
            { id: 'font-sans', label: 'Sans' },
            { id: 'font-serif', label: 'Serif' },
            { id: 'font-mono', label: 'Mono' },
          ]}
        />
      </div>

      {/* Font Size */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em]">Size</label>
          <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] border border-white/[0.06] tracking-tight">{currentSize}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange('fontSize', s.id)}
              className={`h-[30px] rounded-[8px] text-[11.5px] tracking-[-0.015em] transition-all cursor-pointer flex items-center justify-center ${
                currentSize === s.id
                  ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.18)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.07] font-medium'
              }`}
            >
              <span className="leading-none pt-[0.5px] tabular-nums">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">Weight</label>
        <div className="grid grid-cols-4 gap-1.5">
          {weights.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange('fontWeight', w.id)}
              className={`h-[30px] rounded-[8px] text-[11.5px] tracking-[-0.015em] transition-all cursor-pointer flex items-center justify-center ${
                currentWeight === w.id
                  ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.18)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.07] font-medium'
              }`}
            >
              <span className="leading-none pt-[0.5px]">{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Alignment & Style */}
      <div className="flex items-center gap-2 pt-0.5">
        <div className="flex-1">
          <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">Align</label>
          <div className="flex items-center h-[30px] p-[2px] bg-white/[0.05] border border-white/[0.08] rounded-[9px]">
            {[
              { id: 'text-left', icon: <AlignLeft size={13} />, label: 'Left' },
              { id: 'text-center', icon: <AlignCenter size={13} />, label: 'Center' },
              { id: 'text-right', icon: <AlignRight size={13} />, label: 'Right' },
            ].map((al, idx, arr) => {
              const active = currentAlign === al.id;
              const nextActive = arr[idx + 1]?.id === currentAlign;
              const showDivider = !active && !nextActive && idx < arr.length - 1;

              return (
                <React.Fragment key={al.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange('alignment', al.id)}
                    className={`flex-1 h-[24px] flex items-center justify-center rounded-[7px] text-xs transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_1px_6px_rgba(0,0,0,0.15)]'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                    title={al.label}
                  >
                    {al.icon}
                  </button>
                  {showDivider && (
                    <span className="w-[1px] h-3 bg-white/[0.1] shrink-0 my-auto" aria-hidden="true" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">Style</label>
          <div className="flex items-center gap-0.5 h-[30px] p-[2px] bg-white/[0.05] border border-white/[0.08] rounded-[9px]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('fontStyle', isItalic ? 'not-italic' : 'italic')}
              className={`w-7 h-[24px] flex items-center justify-center rounded-[7px] text-xs transition-all cursor-pointer ${
                isItalic
                  ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_1px_6px_rgba(0,0,0,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <span className="w-[1px] h-3 bg-white/[0.1] shrink-0 my-auto" aria-hidden="true" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('textDecoration', isUnderline ? 'no-underline' : 'underline')}
              className={`w-7 h-[24px] flex items-center justify-center rounded-[7px] text-xs transition-all cursor-pointer ${
                isUnderline
                  ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_1px_6px_rgba(0,0,0,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="Underline"
            >
              <Underline size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Text Color Swatches */}
      <div className="pt-1">
        <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1.5 block">Text Color</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {textColors.map((tc) => (
            <button
              key={tc.class}
              type="button"
              disabled={disabled}
              title={tc.label}
              onClick={() => onChange('textColor', tc.class)}
              className={`w-5 h-5 rounded-full ${tc.bg} ring-1 ring-white/20 hover:scale-120 active:scale-95 transition-all cursor-pointer shadow-xs`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   4. LAYOUT MATRIX (Apple-style segmented controls and select chips)
   ========================================================================= */
export function LayoutMatrix({
  classes,
  computed,
  disabled = false,
  onChange,
}: {
  classes: string;
  computed?: Record<string, string>;
  disabled?: boolean;
  onChange: (property: string, value: string) => void;
}) {
  const isFlex = /\bflex\b/.test(classes) || computed?.display?.includes('flex');
  const isGrid = /\bgrid\b/.test(classes) || computed?.display?.includes('grid');
  const displayVal = isFlex ? 'flex' : isGrid ? 'grid' : 'block';

  const dirMatch = classes.match(/\b(flex-row|flex-col)\b/);
  const flexDir = dirMatch ? dirMatch[0] : 'flex-row';

  const alignMatch = classes.match(/\bitems-(start|center|end|stretch)\b/);
  const alignVal = alignMatch ? alignMatch[0] : 'items-start';

  const justifyMatch = classes.match(/\bjustify-(start|center|end|between|evenly)\b/);
  const justifyVal = justifyMatch ? justifyMatch[0] : 'justify-start';

  const gapMatch = classes.match(/\bgap-(\d+)\b/);
  const gapVal = gapMatch ? gapMatch[1] : '0';

  const gapOptions = ['0', '1', '2', '3', '4', '6', '8', '12', '16'];

  return (
    <div className="space-y-2.5 text-xs antialiased" style={appleTypographyStyle}>
      <div>
        <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">Display</label>
        <SegmentedControl
          value={displayVal}
          disabled={disabled}
          onChange={(v) => onChange('display', v)}
          options={[
            { id: 'block', label: 'Block', icon: <Box size={12} /> },
            { id: 'flex', label: 'Flex', icon: <Rows3 size={12} /> },
            { id: 'grid', label: 'Grid', icon: <Grid2X2 size={12} /> },
          ]}
        />
      </div>

      {(isFlex || isGrid) && (
        <>
          {isFlex && (
            <div>
              <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">
                Direction
              </label>
              <SegmentedControl
                value={flexDir}
                disabled={disabled}
                onChange={(v) => onChange('flexDirection', v)}
                options={[
                  { id: 'flex-row', label: 'Row', icon: <ArrowRight size={12} /> },
                  { id: 'flex-col', label: 'Column', icon: <ArrowDown size={12} /> },
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">Align</label>
              <select
                disabled={disabled}
                value={alignVal}
                onChange={(e) => onChange('alignItems', e.target.value)}
                className="w-full h-[30px] bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-[8px] px-2 text-[11.5px] font-medium tracking-[-0.015em] text-zinc-200 focus:outline-none focus:border-emerald-500/80 transition cursor-pointer"
              >
                <option value="items-start" className="bg-[#1A1E1C] text-white">Start</option>
                <option value="items-center" className="bg-[#1A1E1C] text-white">Center</option>
                <option value="items-end" className="bg-[#1A1E1C] text-white">End</option>
                <option value="items-stretch" className="bg-[#1A1E1C] text-white">Stretch</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">Justify</label>
              <select
                disabled={disabled}
                value={justifyVal}
                onChange={(e) => onChange('justifyContent', e.target.value)}
                className="w-full h-[30px] bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-[8px] px-2 text-[11.5px] font-medium tracking-[-0.015em] text-zinc-200 focus:outline-none focus:border-emerald-500/80 transition cursor-pointer"
              >
                <option value="justify-start" className="bg-[#1A1E1C] text-white">Start</option>
                <option value="justify-center" className="bg-[#1A1E1C] text-white">Center</option>
                <option value="justify-end" className="bg-[#1A1E1C] text-white">End</option>
                <option value="justify-between" className="bg-[#1A1E1C] text-white">Space Between</option>
                <option value="justify-evenly" className="bg-[#1A1E1C] text-white">Space Evenly</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em]">Gap (px)</label>
              <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] border border-white/[0.06] tracking-tight tabular-nums">
                gap-{gapVal} ({Number(gapVal) * 4}px)
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {gapOptions.map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange('gap', `gap-${g}`)}
                  className={`h-[30px] rounded-[8px] text-[11.5px] tracking-[-0.015em] transition-all cursor-pointer flex items-center justify-center ${
                    gapVal === g
                      ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.18)]'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.07] font-medium'
                  }`}
                >
                  <span className="leading-none pt-[0.5px] tabular-nums">{Number(g) * 4}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================================
   5. APPEARANCE STUDIO (Corner Radius & Border Stroke & Fill Swatches)
   ========================================================================= */
export function AppearanceStudio({
  classes,
  disabled = false,
  onChange,
}: {
  classes: string;
  disabled?: boolean;
  onChange: (property: string, value: string) => void;
}) {
  const radiusMatch = classes.match(/\brounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?\b/);
  const currentRadius = radiusMatch ? radiusMatch[0] : 'rounded-none';

  const borderWidthMatch = classes.match(/\bborder(-[0248])?\b/);
  const currentBorderWidth = borderWidthMatch ? borderWidthMatch[0] : 'border-0';

  const radiusPresets = [
    { id: 'rounded-none', label: '0' },
    { id: 'rounded-sm', label: '2' },
    { id: 'rounded-md', label: '6' },
    { id: 'rounded-lg', label: '8' },
    { id: 'rounded-xl', label: '12' },
    { id: 'rounded-2xl', label: '16' },
    { id: 'rounded-full', label: 'Pill' },
  ];

  const borderPresets = [
    { id: 'border-0', label: 'None' },
    { id: 'border', label: '1px' },
    { id: 'border-2', label: '2px' },
    { id: 'border-4', label: '4px' },
  ];

  const fillPresets = [
    { label: 'Dark Slate', class: 'bg-slate-900', ring: 'ring-white/20' },
    { label: 'Emerald 600', class: 'bg-emerald-600', ring: 'ring-emerald-400/30' },
    { label: 'Royal Blue', class: 'bg-blue-600', ring: 'ring-blue-400/30' },
    { label: 'Purple 600', class: 'bg-purple-600', ring: 'ring-purple-400/30' },
    { label: 'Rose 500', class: 'bg-rose-500', ring: 'ring-rose-400/30' },
    { label: 'Amber 500', class: 'bg-amber-500', ring: 'ring-amber-400/30' },
    { label: 'Ceramic White', class: 'bg-white', ring: 'ring-black/20' },
    { label: 'Transparent', class: 'bg-transparent', ring: 'ring-white/20' },
  ];

  return (
    <div className="space-y-2.5 text-xs antialiased" style={appleTypographyStyle}>
      {/* Corner Radius */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em]">Corner Radius (px)</label>
          <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] border border-white/[0.06] tracking-tight">{currentRadius}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {radiusPresets.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange('borderRadius', r.id)}
              className={`h-[30px] text-center rounded-[8px] text-[11.5px] tracking-[-0.015em] transition-all cursor-pointer flex items-center justify-center ${
                currentRadius === r.id
                  ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.18)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.07] font-medium'
              }`}
            >
              <span className="leading-none pt-[0.5px]">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Border Width */}
      <div>
        <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1 block">Border</label>
        <SegmentedControl
          value={currentBorderWidth}
          disabled={disabled}
          onChange={(v) => onChange('borderWidth', v)}
          options={borderPresets}
        />
      </div>

      {/* Quick Fill Swatches */}
      <div className="pt-1">
        <label className="text-[11px] text-zinc-400 font-medium tracking-[-0.01em] mb-1.5 block">Quick Background Fill</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {fillPresets.map((f) => (
            <button
              key={f.class}
              type="button"
              disabled={disabled}
              title={f.label}
              onClick={() => onChange('backgroundColor', f.class)}
              className={`w-6 h-6 rounded-full ${f.class} ${f.ring} ring-1 hover:scale-120 active:scale-95 transition-all cursor-pointer shadow-xs`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
