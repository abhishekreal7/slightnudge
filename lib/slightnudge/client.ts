/**
 * SlightNudge Thin Client Module
 * Connects frontend studio controls to the validated backend API routes.
 * Enforces safety refusals, eliminates fake client fallbacks, and keeps contracts stable.
 */

export interface InspectParams {
  filePath: string;
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  className?: string;
  rect?: { top: number; left: number; width: number; height: number };
  clickedRect?: { top: number; left: number; width: number; height: number };
}

export interface InspectResult {
  found: boolean;
  safeToEdit: boolean;
  refusedSafely?: boolean;
  reason?: string;
  filePath: string;
  line?: number;
  column?: number;
  tagName?: string;
  className?: string;
  textContent?: string;
  textEditable?: boolean;
  textReason?: string;
  propSource?: string;
  canUndo?: boolean;
}

export interface PreviewParams {
  kind: 'style' | 'text' | 'nudge' | 'reorder' | 'image';
  filePath: string;
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  className?: string;
  property?: string;
  value?: string;
  direction?: 'earlier' | 'later' | 'top' | 'bottom' | 'up' | 'down' | 'left' | 'right';
  targetIndex?: number;
  stepSize?: 'micro' | 'normal' | 'large';
  breakpoint?: string;
}

export interface PreviewResult {
  success: boolean;
  id?: string;
  summary?: string;
  oldValue?: string;
  newValue?: string;
  filePath: string;
  line?: number;
  changed?: boolean;
  error?: string;
  refusalReason?: string;
}

export async function inspectElementAPI(params: InspectParams): Promise<InspectResult> {
  try {
    const res = await fetch('/api/slightnudge/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      found: false,
      safeToEdit: false,
      refusedSafely: true,
      reason: "I can't confirm which element this is. Nothing was changed.",
      filePath: params.filePath,
    };
  }
}

export async function previewEditAPI(params: PreviewParams): Promise<PreviewResult> {
  try {
    const res = await fetch('/api/slightnudge/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.reason || 'Could not prepare this preview.',
        refusalReason: data.reason || data.error,
        filePath: params.filePath,
      };
    }
    return {
      success: true,
      id: data.id,
      summary: data.summary || `${params.property || params.kind} modified`,
      oldValue: data.oldValue || '',
      newValue: data.newValue || '',
      filePath: data.filePath || params.filePath,
      line: data.line || params.line,
      changed: data.changed,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error preparing preview.',
      filePath: params.filePath,
    };
  }
}

export async function applyEditAPI(previewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/slightnudge/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previewId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Could not apply change to disk.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to connect to apply endpoint.' };
  }
}

export async function discardEditAPI(previewId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/slightnudge/preview?id=${encodeURIComponent(previewId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function undoEditAPI(filePath?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/slightnudge/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || data.message || 'There is no visual edit to undo.' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to contact undo endpoint.' };
  }
}
