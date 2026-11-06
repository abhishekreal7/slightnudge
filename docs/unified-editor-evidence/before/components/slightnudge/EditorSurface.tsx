'use client';

import type { ComponentProps, ReactNode } from 'react';
import { CanvasStage } from './CanvasStage';

export type EditorMode = 'studio' | 'window';

/** Presentation only: both layouts receive the same source canvas and callbacks. */
export function EditorSurface({ mode, children, ...stage }: Omit<ComponentProps<typeof CanvasStage>, 'children'> & { mode: EditorMode; children: ReactNode }) {
  return mode === 'studio' ? <CanvasStage {...stage}>{children}</CanvasStage> : <>{children}</>;
}
