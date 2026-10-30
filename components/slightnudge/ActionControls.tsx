'use client';
import { useEffect, useRef, useState } from 'react';
import { getClientSessionToken } from '@/lib/slightnudge/client';
import { validLinkDestination } from '@/lib/slightnudge/link-values';
import type { inspectActionSource, ActionProperty } from '@/lib/slightnudge/link-source';

type ActionInfo = ReturnType<typeof inspectActionSource>;
export function ActionControls({ selectionKey, source, attributes, parentPreviewId, instances, disabled, scoped, onChange }: {
  selectionKey: string; source: { repositoryId?: string; filePath: string; line: number; column: number; elementId?: string; tagName: string };
  attributes?: Record<string, string | null>; parentPreviewId?: string; instances: number; disabled: boolean; scoped: boolean;
  onChange(property: ActionProperty, value: string): Promise<unknown>;
}) {
  const [info, setInfo] = useState<ActionInfo | null>(null), [error, setError] = useState(''), [href, setHref] = useState('');
  const [pending, setPending] = useState<Partial<Record<ActionProperty, string>>>({});
  const focused = useRef(false), cancel = useRef(false);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setError('');
    void (async () => {
      try {
        const token = await getClientSessionToken();
        if (!active) return;
        const response = await fetch('/api/slightnudge/preview', { signal: controller.signal, method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ ...source, ...(source.repositoryId ? { sourcePath: source.filePath } : {}), kind: 'action', operation: 'inspect', draft: true, parentPreviewId }) });
        const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'This source could not be inspected.');
        if (active) { setInfo(result.action); if (!focused.current) setHref(result.action.fields.href?.value || ''); }
      } catch (error) { if (active) setError(error instanceof Error ? error.message : 'This source could not be inspected.'); }
    })();
    return () => { active = false; controller.abort(); };
  }, [selectionKey, parentPreviewId, source.repositoryId, source.filePath, source.line, source.column, source.elementId, source.tagName]);
  const locked = disabled || scoped || instances > 1;
  const change = async (property: ActionProperty, value: string) => {
    setPending(current => ({ ...current, [property]: value }));
    try { await onChange(property, value); }
    finally { setPending(current => { const next = { ...current }; delete next[property]; return next; }); }
  };
  const commitHref = () => {
    focused.current = false;
    if (cancel.current || !info?.fields.href?.editable || locked || href === (info.fields.href.value || '')) return;
    const value = href.trim(); if (!validLinkDestination(value)) { setError('Use a page path, anchor, web address, email or telephone link.'); return; }
    setError(''); void change('href', value);
  };
  const fieldClass = 'w-full rounded-md border border-[#e6eae7] bg-[#f5f6f5] px-2 py-2 disabled:opacity-50';
  const shownTarget = pending.target || (attributes ? attributes.target || '_self' : info?.fields.target?.value || '_self');
  const shownType = pending.type || (attributes ? attributes.type || 'submit' : info?.fields.type?.value || 'submit');
  return <section aria-label="Component action" data-action-selection={selectionKey} className="border-b border-[#edf0ed] px-4 py-4 space-y-3 text-xs">
    <h3 className="font-medium">{source.tagName === 'button' ? 'Button' : 'Link'}</h3>
    <p className="text-[11px] leading-relaxed text-[#89938d]">{instances > 1 ? `Shared source · ${instances} instances in this preview. Edit its provider to change them together.` : 'Source element · 1 instance in this preview. Other renders of this source element also use its changes.'}</p>
    {!info && !error && <p role="status" className="text-[11px] text-[#89938d]">Checking source ownership…</p>}
    {info?.tag === 'a' && <>
      <label className="block space-y-2"><span>Destination</span><input aria-label="Link destination" className={fieldClass} value={info.fields.href?.editable ? href : attributes?.href || ''} disabled={locked || !info.fields.href?.editable} placeholder="/about or https://…" onFocus={() => { focused.current = true; cancel.current = false; }} onChange={event => setHref(event.target.value)} onBlur={commitHref} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } if (event.key === 'Escape') { event.preventDefault(); cancel.current = true; setHref(info.fields.href?.value || ''); event.currentTarget.blur(); } }}/></label>
      {info.fields.href?.reason && <p className="text-[11px] leading-relaxed text-[#89938d]">{info.fields.href.reason}</p>}
      <label className="block space-y-2"><span>Open in</span><select aria-label="Link opening behavior" className={fieldClass} disabled={locked || !info.fields.target?.editable} value={shownTarget} onChange={event => { setError(''); void change('target', event.target.value); }}><option value="_self">Same tab</option><option value="_blank">New tab</option>{!['_self', '_blank'].includes(shownTarget) && <option value={shownTarget} disabled>{shownTarget}</option>}</select></label>
      {info.fields.target?.reason && info.fields.target.reason !== info.fields.href?.reason && <p className="text-[11px] leading-relaxed text-[#89938d]">{info.fields.target.reason}</p>}
    </>}
    {info?.tag === 'button' && <>
      <label className="block space-y-2"><span>Behavior</span><select aria-label="Button type" className={fieldClass} disabled={locked || !info.fields.type?.editable} value={shownType} onChange={event => void change('type', event.target.value)}><option value="button">Button</option><option value="submit">Submit form</option><option value="reset">Reset form</option>{!['button', 'submit', 'reset'].includes(shownType) && <option value={shownType} disabled>{shownType}</option>}</select></label>
      <label className="flex items-center justify-between gap-3"><span>Enabled</span><input aria-label="Button enabled" type="checkbox" className="accent-[#176b55]" checked={pending.disabled !== undefined ? pending.disabled === 'false' : attributes ? attributes.disabled == null : info.fields.disabled?.value !== ''} disabled={locked || !info.fields.disabled?.editable} onChange={event => void change('disabled', event.target.checked ? 'false' : 'true')}/></label>
      {(info.fields.type?.reason || info.fields.disabled?.reason) && <p className="text-[11px] leading-relaxed text-[#89938d]">{info.fields.type?.reason || info.fields.disabled?.reason}</p>}
      <p className="text-[11px] leading-relaxed text-[#89938d]">Click handlers and form destinations stay in their source.</p>
    </>}
    {scoped && <p className="text-[11px] leading-relaxed text-[#89938d]">Behavior applies to all sizes. Choose All sizes and Default to edit.</p>}
    {error && <p role="status" className="text-[11px] leading-relaxed text-[#89938d]">{error}</p>}
  </section>;
}
