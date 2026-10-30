'use client';

import type { ComponentProps, ReactNode } from 'react';
import { CanvasStage } from './CanvasStage';
import type { EditorView } from '@/lib/slightnudge/editor-route';

export type EditorMode = 'studio' | 'window';

/** Presentation only: both layouts receive the same source canvas and callbacks. */
export function EditorSurface({ mode, view, children, ...stage }: Omit<ComponentProps<typeof CanvasStage>, 'children'> & { mode: EditorMode; view?: EditorView; children: ReactNode }) {
  return mode === 'studio' || view === 'fit' ? <CanvasStage {...stage}>{children}</CanvasStage> : <>{children}</>;
}
