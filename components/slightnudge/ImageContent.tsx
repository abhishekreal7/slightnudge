'use client';
import { readApiJson } from '@/lib/slightnudge/api-response';

import { useEffect, useRef, useState } from 'react';
import { getClientSessionToken } from '@/lib/slightnudge/client';

export function ImageContent({ selectionKey, attributes, repositoryId, disabled, scoped, onChange }: { selectionKey: string; attributes?: Record<string, string | null>; repositoryId?: string; disabled: boolean; scoped: boolean; onChange(property: 'src' | 'alt', value: string): Promise<unknown> }) {
  const [alt, setAlt] = useState(attributes?.alt || ''), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const focused = useRef(false), cancelled = useRef(false), currentSelection = useRef(selectionKey); currentSelection.current = selectionKey;
  useEffect(() => { currentSelection.current = selectionKey; return () => { currentSelection.current = ''; }; }, [selectionKey]);
  useEffect(() => { if (!focused.current) setAlt(attributes?.alt || ''); }, [selectionKey, attributes?.alt]);
  return <section aria-label="Image content" className="border-b border-[#edf0ed] px-4 py-4 space-y-3 text-xs">
    <div className="flex justify-between items-center gap-3"><h3 className="font-medium">Image</h3><label className="rounded-md border border-[#e6eae7] px-3 py-2 cursor-pointer focus-within:ring-2 focus-within:ring-[#91ab9e]" aria-disabled={disabled || scoped || uploading}>{uploading ? 'Importing…' : 'Replace image'}<input className="sr-only" aria-label="Replace image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={disabled || scoped || uploading} onChange={async e => {
      const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!file) return;
      setUploading(true); setError('');
      try {
        const token = await getClientSessionToken(); const form = new FormData(); form.set('file', file);
        const response = await fetch(`/api/slightnudge/assets${repositoryId ? `?repositoryId=${encodeURIComponent(repositoryId)}` : ''}`, { method: 'POST', headers: { 'x-slightnudge-token': token }, body: form });
        const result = await readApiJson(response); if (!response.ok) throw new Error(result.error || 'Could not import this image.');
        if (currentSelection.current === selectionKey) await onChange('src', result.asset.url);
      } catch (error) { setError(error instanceof Error ? error.message : 'Image import failed.'); }
      finally { setUploading(false); }
    }} /></label></div>
    <label className="block space-y-2"><span>Alt text</span><input aria-label="Image alt text" className="w-full rounded-md border border-[#e6eae7] bg-[#f5f6f5] px-2 py-2" value={alt} maxLength={2000} disabled={disabled || scoped || uploading} onFocus={() => { focused.current = true; cancelled.current = false; }} onChange={e => setAlt(e.target.value)} onBlur={() => { focused.current = false; if (!cancelled.current && alt !== (attributes?.alt || '')) void onChange('alt', alt); }} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); cancelled.current = true; setAlt(attributes?.alt || ''); e.currentTarget.blur(); } if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} /></label>
    {attributes?.alt !== '' && <button type="button" className="text-[11px] text-[#176b55] underline underline-offset-2 disabled:opacity-40" disabled={disabled || scoped || uploading} onMouseDown={e => e.preventDefault()} onClick={() => { cancelled.current = true; focused.current = false; setAlt(''); void onChange('alt', ''); }}>Mark as decorative</button>}
    <p className="text-[11px] leading-relaxed text-[#89938d]">Describe meaningful content, or mark the image as decorative. {scoped ? 'Image content applies to all sizes; switch to All sizes to edit it.' : attributes?.responsive === 'true' ? 'Replacement updates the responsive image set and keeps its breakpoints and sizing styles.' : 'Your size and fit styles stay in place.'}</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
