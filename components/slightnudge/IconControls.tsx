'use client';
import { createElement, useEffect, useRef, useState } from 'react';
import { getClientSessionToken } from '@/lib/slightnudge/client';
import { validIconValue } from '@/lib/slightnudge/icon-source-values';
import type { IconProperty, inspectIconSource } from '@/lib/slightnudge/icon-source';
import { validIconShape, type IconShape } from '@/lib/slightnudge/icon-shape-values';

const iconLabel = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

function IconField({ property, label, value, disabled, onChange }: { property: IconProperty; label: string; value: string; disabled: boolean; onChange(property: IconProperty, value: string): Promise<unknown> }) {
  const [draft, setDraft] = useState(value), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const cancelled = useRef(false);
  useEffect(() => { setDraft(value); setError(''); }, [value]);
  async function commit() {
    if (cancelled.current || disabled || pending || draft === value) return;
    const next = draft.trim();
    if (!validIconValue(property, next)) { setError(property === 'color' ? 'Use #RRGGBB, currentColor or none.' : property === 'size' ? 'Choose 8–256 px.' : 'Choose 0.25–8.'); return; }
    setPending(true); setError('');
    try { if (await onChange(property, next) !== true) { setDraft(value); setError('This icon change was not applied. Check the editor notice for its source or style owner.'); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This icon could not be updated.'); }
    finally { setPending(false); }
  }
  return <div className="space-y-1.5"><label className="flex items-center justify-between gap-3"><span className="text-[#65736c]">{label}</span><span className="relative w-32"><input aria-label={`Icon ${label.toLowerCase()}`} value={draft} placeholder={disabled ? 'From code' : 'Inherit'} disabled={disabled || pending} aria-invalid={Boolean(error)} className="w-full rounded-md border border-[#e6eae7] bg-[#f5f6f5] px-2 py-2 text-right disabled:opacity-50" inputMode={property === 'color' ? 'text' : 'decimal'} onFocus={() => { cancelled.current = false; }} onChange={event => setDraft(event.target.value)} onBlur={() => void commit()} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } if (event.key === 'Escape') { event.preventDefault(); cancelled.current = true; setDraft(value); setError(''); event.currentTarget.blur(); } }}/></span></label>{error && <p role="status" className="text-[11px] text-[#65736c]">{error}</p>}</div>;
}
export function IconControls({ selectionKey, source, parentPreviewId, instances, disabled, scoped, onChange }: {
  selectionKey: string; source: { repositoryId?: string; filePath: string; line: number; column: number; elementId?: string; tagName: string };
  parentPreviewId?: string; instances: number; disabled: boolean; scoped: boolean; onChange(property: IconProperty, value: string): Promise<unknown>;
}) {
  const [info, setInfo] = useState<(ReturnType<typeof inspectIconSource> & { choices: IconShape[] }) | null>(null), [error, setError] = useState('');
  const [infoKey, setInfoKey] = useState('');
  const requestKey = JSON.stringify([selectionKey, source.repositoryId, source.filePath, source.line, source.column, source.elementId, source.tagName, parentPreviewId]);
  const [choosing, setChoosing] = useState(false), [query, setQuery] = useState(''), [replacing, setReplacing] = useState(false);
  const replaceButton = useRef<HTMLButtonElement>(null);
  const closePicker = () => { setChoosing(false); requestAnimationFrame(() => replaceButton.current?.focus()); };
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    void (async () => {
      try {
        const token = await getClientSessionToken(); if (!active) return;
        const response = await fetch('/api/slightnudge/preview', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ ...source, ...(source.repositoryId ? { sourcePath: source.filePath } : {}), kind: 'icon', operation: 'inspect', draft: true, parentPreviewId }) });
        const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'This icon cannot be inspected.');
        if (active) { setInfo({ ...data.icon, choices: (data.icon.choices || []).filter(validIconShape) }); setInfoKey(requestKey); setError(''); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'This icon cannot be inspected.'); }
    })();
    return () => { active = false; controller.abort(); };
  }, [selectionKey, source.repositoryId, source.filePath, source.line, source.column, source.elementId, source.tagName, parentPreviewId]);
  const informationCurrent = infoKey === requestKey;
  const locked = disabled || scoped || instances > 1 || !informationCurrent;
  const reasons = [...new Set(Object.values(info?.fields || {}).map(field => field.reason).filter(Boolean))];
  const choices = info?.choices.filter(shape => iconLabel(shape.name).toLowerCase().replace(/\s/g, '').includes(query.toLowerCase().replace(/\s/g, ''))) || [];
  async function replace(name: string) {
    if (!info || locked || replacing || !info.replacement.editable) return;
    if (name === info.replacement.name) { closePicker(); return; }
    setReplacing(true); setError('');
    try { if (await onChange('icon', name) === true) { closePicker(); setQuery(''); } else setError('The icon was not replaced. Check the editor notice.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The icon was not replaced.'); }
    finally { setReplacing(false); }
  }
  return <section aria-label="Icon appearance" className="space-y-3 border-b border-[#edf0ed] px-4 py-4 text-xs">
    <div className="flex items-center justify-between"><h3 className="font-medium">Icon</h3><span className="text-[11px] text-[#89938d]">{info?.lucide ? 'Lucide' : 'SVG'}</span></div>
    <p className="text-[11px] leading-relaxed text-[#89938d]">{instances > 1 ? `Shared source · ${instances} instances. Edit its provider in source.` : 'This source element. Other renders of the same source also use its changes.'}</p>
    {info?.lucide && <div className="space-y-2">
      <button ref={replaceButton} type="button" aria-label="Replace icon" aria-expanded={choosing} disabled={locked || replacing || !info.replacement.editable || !info.choices.length} className="flex w-full items-center justify-between rounded-md border border-[#e6eae7] bg-[#f5f6f5] px-2.5 py-2.5 text-left disabled:opacity-50" onClick={() => { setChoosing(value => !value); setQuery(''); }}><span>{iconLabel(info.replacement.name)}</span><span className="text-[11px] text-[#65736c]">{replacing ? 'Replacing…' : !informationCurrent ? 'Checking…' : 'Replace'}</span></button>
      {choosing && <div role="group" aria-label="Icon choices" className="space-y-2 rounded-lg border border-[#e6eae7] p-2">
        <input aria-label="Search icons" autoFocus value={query} placeholder="Search icons…" className="w-full rounded-md bg-[#f5f6f5] px-2 py-2" onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.metaKey || event.ctrlKey) return; event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); closePicker(); } }}/>
        <div className="grid max-h-60 grid-cols-6 gap-1 overflow-y-auto" onKeyDown={event => {
          if (event.metaKey || event.ctrlKey) return;
          event.stopPropagation();
          if (event.key === 'Escape') { event.preventDefault(); closePicker(); return; }
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')], index = buttons.indexOf(event.target as HTMLButtonElement);
          const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 };
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : index + (offsets[event.key] || 0);
          if (index >= 0 && (event.key in offsets || ['Home', 'End'].includes(event.key))) { event.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus(); }
        }}>{choices.map(shape => <button type="button" key={shape.name} aria-label={`Choose ${iconLabel(shape.name)}`} aria-pressed={shape.name === info.replacement.name} title={iconLabel(shape.name)} disabled={locked || replacing} className="flex aspect-square items-center justify-center rounded-md border border-transparent text-[#42584d] hover:bg-[#eef3ef] focus-visible:outline-2 focus-visible:outline-[#176b55] aria-pressed:border-[#b8d4c6] aria-pressed:bg-[#e8f2ec] disabled:opacity-50" onClick={() => void replace(shape.name)}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{shape.nodes.map(([tag, attrs], index) => createElement(tag, { ...Object.fromEntries(Object.entries(attrs).map(([name, value]) => [name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value])), key: index }))}</svg></button>)}</div>
        {!choices.length && <p className="py-2 text-center text-[11px] text-[#89938d]">No matching icons.</p>}
        <p className="text-[10px] leading-relaxed text-[#89938d]">From this project’s installed Lucide version.</p>
      </div>}
      {info.replacement.reason && <p className="text-[11px] leading-relaxed text-[#89938d]">{info.replacement.reason}</p>}
    </div>}
    {info && (['size', 'strokeWidth', 'color'] as const).map(property => <IconField key={property} property={property} label={property === 'size' ? 'Size (px)' : property === 'strokeWidth' ? 'Stroke' : 'Color'} value={info.fields[property].value || ''} disabled={locked || !info.fields[property].editable} onChange={onChange}/>)}
    {!informationCurrent && !error && <p role="status" className="text-[11px] text-[#89938d]">Checking icon ownership…</p>}
    {reasons.map(reason => <p key={reason} className="text-[11px] leading-relaxed text-[#89938d]">{reason}</p>)}
    {scoped && <p className="text-[11px] text-[#89938d]">Choose All sizes and Default to edit icon properties.</p>}
    {error && <p role="status" className="text-[11px] leading-relaxed text-[#89938d]">{error}</p>}
  </section>;
}
