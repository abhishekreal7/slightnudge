'use client';
import { useEffect, useRef, useState } from 'react';
import type { ResponsiveScope } from '@/lib/slightnudge/tailwind-verifier';
import styles from './responsive-controls.module.css';

export function ResponsiveControls({ width, requestedWidth, scope, scopes, loading, error, disabled, scopeDisabled = false, onWidth, onScope }: {
  width: number; requestedWidth: number | null; scope: string; scopes: ResponsiveScope[]; loading: boolean; error: string; disabled: boolean;
  onWidth(width: number): void; onScope(name: string): void;
  scopeDisabled?: boolean;
}) {
  const shownWidth = requestedWidth ?? width;
  const focused = useRef(false);
  const [input, setInput] = useState(String(shownWidth || ''));
  useEffect(() => { if (!focused.current) setInput(String(shownWidth || '')); }, [shownWidth]);
  const selected = scopes.find(item => item.name === scope);
  const outside = Boolean(selected && width < selected.minWidth);
  const commit = (raw: string) => { const value = Number(raw); if (Number.isInteger(value) && value >= 240 && value <= 3840) onWidth(value); else setInput(String(shownWidth || '')); };
  return <div className={styles.controls} aria-label="Responsive editing" onClick={event => event.stopPropagation()}>
    <label className={styles.width} title="Preview width in CSS pixels. This does not choose where edits apply."><input aria-label="Preview width" type="number" min="240" max="3840" step="1" value={input} disabled={disabled || !width} onFocus={() => { focused.current = true; }} onChange={event => setInput(event.target.value)} onBlur={event => { focused.current = false; commit(event.currentTarget.value); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(event.currentTarget.value); event.currentTarget.blur(); } }} /><span>px</span></label>
    <label className={styles.scope}><span>Edit</span><select aria-label="Responsive edit scope" value={scope} disabled={disabled || loading || scopeDisabled} title={scopeDisabled ? 'Open the editing window to edit responsive styles.' : error || 'All sizes changes the base style. A breakpoint changes that size and larger screens.'} onChange={event => onScope(event.target.value)}>
      <option value="">{loading ? 'Reading project…' : 'All sizes'}</option>
      {scope && !selected && <option value={scope} disabled>{scope} · unavailable</option>}
      {scopes.map(item => <option key={item.name} value={item.name}>{item.name} · {Math.ceil(item.minWidth)}px+</option>)}
    </select></label>
    {outside && <button type="button" className={styles.match} disabled={disabled} title="The current width is below this editing scope" onClick={() => onWidth(Math.ceil(selected!.minWidth))}>Show {scope}</button>}
    {error && <span className={styles.error} role="status" title={error}>Scope unavailable</span>}
  </div>;
}
