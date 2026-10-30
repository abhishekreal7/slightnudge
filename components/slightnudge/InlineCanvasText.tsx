'use client';

import React, { useLayoutEffect, useRef } from 'react';

interface InlineCanvasTextProps {
  as: 'h1' | 'p';
  text: string;
  editing: boolean;
  pending?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect: () => void;
  onEdit: () => void;
  onChange: (text: string) => void;
  onCommit: (text: string) => void;
  onCancel: () => void;
  keepEditingOnBlur: (target: EventTarget | null) => boolean;
}

/** The same DOM node displays and edits text. React never replaces its text
 * children during typing, which preserves the caret and native text selection. */
export function InlineCanvasText({ as, text, editing, pending, className, style, onSelect, onEdit, onChange, onCommit, onCancel, keepEditingOnBlur }: InlineCanvasTextProps) {
  const node = useRef<HTMLElement | null>(null);
  const wasEditing = useRef(false);
  const composing = useRef(false);
  const read = () => (node.current?.textContent || '').replace(/\u00a0/g, ' ');

  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    if ((!editing && !pending) || (editing && !wasEditing.current)) {
      if (element.textContent !== text) element.textContent = text;
    }
    if (editing && !wasEditing.current) {
      element.focus();
      const selection = window.getSelection();
      if (selection && !element.contains(selection.anchorNode)) {
        const range = document.createRange(); range.selectNodeContents(element);
        selection.removeAllRanges(); selection.addRange(range);
      }
    }
    wasEditing.current = editing;
  }, [editing, pending, text]);

  return React.createElement(as, {
    ref: (element: HTMLElement | null) => { node.current = element; },
    'data-studio-state-preview': true,
    contentEditable: editing ? 'plaintext-only' : false,
    suppressContentEditableWarning: true,
    role: editing ? 'textbox' : undefined,
    'aria-label': editing ? as === 'h1' ? 'Edit heading text' : 'Edit paragraph text' : undefined,
    'aria-multiline': editing ? false : undefined,
    tabIndex: editing ? 0 : undefined,
    className,
    style: { ...style, ...(editing ? { cursor: 'text', userSelect: 'text', outline: 'none', caretColor: 'currentColor' } : {}) },
    onClick: (event: React.MouseEvent) => { event.stopPropagation(); if (!editing) onSelect(); },
    onDoubleClick: (event: React.MouseEvent) => { event.stopPropagation(); if (!editing) onEdit(); },
    onCompositionStart: () => { composing.current = true; },
    onCompositionEnd: () => { composing.current = false; onChange(read()); },
    onInput: () => { if (!composing.current) onChange(read()); },
    onBlur: (event: React.FocusEvent) => {
      if (editing && !keepEditingOnBlur(event.relatedTarget)) onCommit(read());
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (!editing) return;
      event.stopPropagation();
      if (composing.current || event.nativeEvent.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
      else if (event.key === 'Enter') { event.preventDefault(); onCommit(read()); }
    },
    onPaste: (event: React.ClipboardEvent) => {
      if (!editing) return;
      event.preventDefault();
      const value = event.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' ');
      const selection = window.getSelection();
      if (!selection?.rangeCount || !node.current?.contains(selection.anchorNode)) return;
      const range = selection.getRangeAt(0); range.deleteContents();
      const inserted = document.createTextNode(value); range.insertNode(inserted);
      range.setStartAfter(inserted); range.collapse(true);
      selection.removeAllRanges(); selection.addRange(range); onChange(read());
    },
  });
}
