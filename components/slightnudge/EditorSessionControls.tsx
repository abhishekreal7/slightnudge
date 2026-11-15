'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Check, History, Laptop2, Redo2, Smartphone, Tablet, Undo2 } from 'lucide-react';
import { ResponsiveControls } from './ResponsiveControls';
import styles from './editor-workspace.module.css';

export function EditorHistoryControls({ historyDisabled, undoDisabled, redoDisabled, undoLabel, showRedo, onHistory, onUndo, onRedo }: {
  historyDisabled: boolean; undoDisabled: boolean; redoDisabled: boolean; undoLabel: string; showRedo: boolean;
  onHistory(): void; onUndo(): void; onRedo(): void;
}) {
  return <div className={styles.historyTools} role="group" aria-label="Edit history">
    <button type="button" aria-label="Change history" title="Change history" disabled={historyDisabled} onClick={onHistory}><History size={15} strokeWidth={1.7}/></button>
    <button type="button" aria-label={undoLabel} title="Undo · Ctrl+Z" disabled={undoDisabled} onClick={onUndo}><Undo2 size={15} strokeWidth={1.7}/></button>
    {showRedo && <button type="button" aria-label="Redo" title="Redo · Ctrl+Shift+Z" disabled={redoDisabled} onClick={onRedo}><Redo2 size={15} strokeWidth={1.7}/></button>}
  </div>;
}

export function EditorDraftStatus({ status }: { status: string }) {
  const idle = status === 'All changes saved';
  return <span role="status" aria-label="Draft status" className={idle ? 'sr-only' : styles.canvasDraftStatus}>
    {status.startsWith('Draft saved') && <Check size={12} strokeWidth={1.8} aria-hidden="true"/>}
    {status}
  </span>;
}

export function EditorDraftControls({ saveLabel, disabled, onSave, onDiscard, hasDraft }: {
  saveLabel: string;
  disabled: boolean;
  onSave(): void;
  onDiscard?(): void;
  hasDraft?: boolean;
}) {
  return (
    <div className={styles.draftControls} aria-label="Draft controls">
      {hasDraft && onDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          className="text-xs font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded transition cursor-pointer"
          title="Discard unsaved draft"
        >
          Discard
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={event => event.preventDefault()}
        onClick={onSave}
        className={styles.draftSave}
      >
        {saveLabel}
      </button>
    </div>
  );
}

export type EditorViewport = 'desktop' | 'tablet' | 'mobile';

export function EditorViewportControls({ viewport, requestedWidth, disabled, onViewport, responsive, children }: {
  viewport: EditorViewport; requestedWidth: number | null; disabled: boolean;
  onViewport(viewport: EditorViewport, width: number | null): void;
  responsive: ComponentProps<typeof ResponsiveControls>; children?: ReactNode;
}) {
  return <div className={styles.canvasTools}>
    <div className={styles.viewportControl} role="group" aria-label="Canvas viewport">
      {([
        ['desktop', Laptop2, 'Desktop', null],
        ['tablet', Tablet, 'Tablet', 768],
        ['mobile', Smartphone, 'Mobile', 375],
      ] as const).map(([value, Icon, label, width]) => {
        const active = requestedWidth === null ? viewport === value : width !== null && requestedWidth === width;
        return <button key={value} type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled} onClick={() => onViewport(value, width)} className={active ? styles.activeViewport : undefined}>
          <Icon size={14} strokeWidth={1.7}/><span>{label}</span>
        </button>;
      })}
    </div>
    <ResponsiveControls {...responsive}/>
    {children}
  </div>;
}
