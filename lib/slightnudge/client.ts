import { readApiJson, apiResponseDiagnostic } from './api-response';
/**
 * SlightNudge Thin Client Module
 * Connects frontend studio controls to the validated backend API routes.
 * Enforces safety refusals, eliminates fake client fallbacks, and keeps contracts stable.
 */

export interface InspectParams {
  repositoryId?: string;
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
  undoTarget?: { previewId: string; editId: string } | null;
}

export interface PreviewParams {
  instance?: string;
  important?: boolean;
  draft?: boolean;
  parentPreviewId?: string;
  repositoryId?: string;
  sourcePath?: string;
  kind: 'style' | 'text' | 'nudge' | 'reorder' | 'reparent' | 'image' | 'action' | 'icon' | 'component' | 'move';
  destination?: { path: string; line: number; column: number; tagName?: string; elementId?: string };
  x?: number;
  y?: number;
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

/** Inspect the prop owner at the current draft revision, without staging an edit. */
export async function inspectComponentPropsAPI(params: {
  repositoryId?: string; filePath: string; line: number; column: number;
  elementId?: string; instance?: string; tagName: string; parentPreviewId?: string; drafts?: Record<string,string>;
}, signal?: AbortSignal): Promise<ComponentPropsInfo> {
  const token = await getClientSessionToken();
  const response = await fetch('/api/slightnudge/preview', {
    method: 'POST', signal: signal || AbortSignal.timeout(30000),
    headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
    body: JSON.stringify({ ...params, ...(params.repositoryId ? { sourcePath: params.filePath } : {}), kind: 'component', operation: 'inspect', draft: true }),
  });
  const result = await readApiJson(response);
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to inspect component props.');
  return result.component;
}
export type ComponentPropsInfo = {component:string;fields:{name:string;value:string;type:'text'|'boolean'|'enum';target?:string;options?:string[]}[];reason:string;ownership:'local-call'|'cross-file-call'|'instance-call'|'unsupported';owner?:import('./component-ownership').ComponentOwner};

export interface PreviewResult {
  ownerPath?: string;
  responsiveMedia?: string;
  responsiveScopes?: import('./tailwind-verifier').ResponsiveScope[];
  css?: string;
  renderPatches?: import('./source-canvas-contract').CanvasRenderPatch[];
  sourceTargets?: { before: { line: number; column: number }; after: { line: number; column: number }; tag: string }[];
  draftClean?: boolean;
  success: boolean;
  id?: string;
  summary?: string;
  oldValue?: string;
  newValue?: string;
  oldClassName?: string;
  newClassName?: string;
  filePath: string;
  line?: number;
  changed?: boolean;
  error?: string;
  refusalReason?: string;
}

export async function inspectElementAPI(params: InspectParams): Promise<InspectResult> {
  try {
    // Inspection only reads source. A cold local route can spend the previous
    // 15s budget compiling; allow it to finish and retry one transient failure.
    // Never apply this policy to Save/Undo, whose outcome may be uncertain.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(params.repositoryId ? `/api/slightnudge/repositories/${encodeURIComponent(params.repositoryId)}/inspect` : '/api/slightnudge/inspect', {
          signal: AbortSignal.timeout(30000),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params.repositoryId ? { ...params, path: params.filePath } : params),
        });
        if (attempt === 0 && [502, 503, 504].includes(res.status)) { await new Promise(resolve => setTimeout(resolve, 250)); continue; }
        return await readApiJson(res);
      } catch (error) {
        if (attempt === 0 && error instanceof Error && ['AbortError', 'TimeoutError', 'TypeError'].includes(error.name)) { await new Promise(resolve => setTimeout(resolve, 250)); continue; }
        throw error;
      }
    }
    throw new Error('Source inspection did not complete.');
  } catch (err: any) {
    return {
      found: false,
      safeToEdit: false,
      refusedSafely: true,
      reason: apiResponseDiagnostic(err).trim() || "I can't confirm which element this is. Nothing was changed.",
      filePath: params.filePath,
    };
  }
}

let cachedSessionToken: string | null = null;

export async function getClientSessionToken(refresh = false): Promise<string> {
  if (refresh) {
    cachedSessionToken = null;
    if (typeof window !== 'undefined') delete (window as any).__SLIGHTNUDGE_TOKEN__;
  }
  if (cachedSessionToken) return cachedSessionToken;
  if (typeof window !== 'undefined' && (window as any).__SLIGHTNUDGE_TOKEN__) {
    cachedSessionToken = (window as any).__SLIGHTNUDGE_TOKEN__;
    return cachedSessionToken!;
  }
  try {
    const res = await fetch('/api/slightnudge/token', { signal: AbortSignal.timeout(10000), cache: 'no-store' });
    const data = await readApiJson(res);
    if (res.ok) {
      cachedSessionToken = data.token;
      if (typeof window !== 'undefined') {
        (window as any).__SLIGHTNUDGE_TOKEN__ = data.token;
      }
      return cachedSessionToken || '';
    }
  } catch (error) { if (apiResponseDiagnostic(error)) throw error; }
  return '';
}

export async function previewEditAPI(params: PreviewParams): Promise<PreviewResult> {
  try {
    const token = await getClientSessionToken();
    const res = await fetch('/api/slightnudge/preview', {
      signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-slightnudge-token': token,
      },
      body: JSON.stringify(params),
    });
    const data = await readApiJson(res);
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.reason || 'Could not prepare this preview.',
        refusalReason: data.reason || data.error,
        responsiveScopes: data.responsiveScopes,
        filePath: params.filePath,
      };
    }
    return {
      success: true,
      draftClean: data.draftClean,
      sourceTargets: data.sourceTargets,
      renderPatches: data.renderPatches,
      css: data.css,
      responsiveMedia: data.responsiveMedia,
      responsiveScopes: data.responsiveScopes,
      id: data.id,
      summary: data.summary || `${params.property || params.kind} modified`,
      oldValue: data.oldValue || '',
      newValue: data.newValue || '',
      oldClassName: data.oldClassName,
      newClassName: data.newClassName,
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

type ApplyContext = { repositoryId?: string; sourcePath?: string };
type ApplyResult = { success: boolean; error?: string; code?: string; editId?: string };

export async function checkApplyOutcomeAPI(previewId: string, context: ApplyContext = {}): Promise<ApplyResult> {
  let diagnostic = '';
  try {
    let token = await getClientSessionToken();
    const lookup = () => fetch('/api/slightnudge/apply/status', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', 'x-slightnudge-token': token },
      body: JSON.stringify({ previewId, ...context }),
    });
    let res = await lookup();
    // A restarted server has a new session token. Refresh authorization for this
    // read only; never retry the write when its outcome is uncertain.
    if (res.status === 403) { token = await getClientSessionToken(true); res = await lookup(); }
    const data = await readApiJson(res);
    if (res.ok && data.success === true) return { success: true, editId: data.editId };
    if (['SOURCE_CHANGED', 'APPLY_ALREADY_UNDONE', 'OUTCOME_SCOPE_MISMATCH', 'APPLY_NOT_APPLIED', 'SOURCE_RECOVERY_REQUIRED'].includes(data.code)) return { success: false, code: data.code, error: data.error };
  } catch (error) { diagnostic = apiResponseDiagnostic(error); /* A failed lookup says nothing about whether the save succeeded. */ }
  return { success: false, code: 'APPLY_UNCERTAIN', error: 'The save outcome is not confirmed. Check save status before continuing; the change will not be sent again.' + diagnostic };
}

export async function applyEditAPI(previewId: string, context: ApplyContext = {}): Promise<ApplyResult> {
  let token: string;
  try { token = await getClientSessionToken(); }
  catch (error) { return { success: false, error: 'Could not authorize this save. Please try again.' + apiResponseDiagnostic(error) }; }
  if (!token) return { success: false, error: 'Could not authorize this save. Please try again.' };
  try {
    const res = await fetch('/api/slightnudge/apply', {
      signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-slightnudge-token': token,
      },
      body: JSON.stringify({ previewId, ...context }),
    });
    const data = await readApiJson(res);
    if (res.status === 403) {
      // This endpoint's authorization guard runs before any source operation.
      // Refresh the credential, but leave the reviewed write to an explicit retry.
      await getClientSessionToken(true);
      return { success: false, code: 'AUTH_REQUIRED', error: 'The save was denied before writing. Check the project connection, then apply this reviewed change again.' };
    }
    if (!res.ok || !data.success) {
      if (res.status >= 500 || data.success !== false) return checkApplyOutcomeAPI(previewId, context);
      return { success: false, error: data.error || 'Could not apply change to disk.', code: data.code };
    }
    return { success: true, editId: data.editId };
  } catch (error) {
    const outcome = await checkApplyOutcomeAPI(previewId, context);
    return outcome.success ? outcome : { ...outcome, error: (outcome.error || '') + apiResponseDiagnostic(error) };
  }
}

export async function discardEditAPI(previewId: string): Promise<boolean> {
  try {
    const token = await getClientSessionToken();
    const res = await fetch(`/api/slightnudge/preview?id=${encodeURIComponent(previewId)}`, {
      signal: AbortSignal.timeout(10000),
      method: 'DELETE',
      headers: {
        'x-slightnudge-token': token,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface UndoContext { repositoryId?: string; sourcePath?: string; previewId?: string; editId?: string }
export interface UndoResult { success: boolean; message?: string; error?: string; code?: string; editId?: string; sourceCurrent?: boolean }

export interface ChangeSetResult {
  success: boolean; transactionId: string; state?: string; code?: string; error?: string; sourceCurrent?: boolean;
  members?: { previewId: string; filePath: string; sourcePath?: string; editId: string; written: boolean }[];
}
/** Lost write responses trigger status reads only, never an automatic write retry. */
export async function changeSetAPI(operation: 'save'|'status'|'undo', transactionId: string, members: {previewId:string;filePath:string}[], repositoryId?: string): Promise<ChangeSetResult> {
  try {
    let token = await getClientSessionToken();
    const request = () => fetch('/api/slightnudge/change-set', { method:'POST', signal:AbortSignal.timeout(15000), headers:{'content-type':'application/json','x-slightnudge-token':token},body:JSON.stringify({operation,transactionId,repositoryId,...(operation==='save'?{members}:{})}) });
    let response=await request();
    if(response.status===403&&operation==='status'){token=await getClientSessionToken(true);response=await request();}
    const data=await readApiJson(response);
    if(response.status===403)return {success:false,transactionId,code:'GROUP_AUTH_DENIED',error:'The change-set request was denied before writing. Reconnect, then explicitly retry.'};
    if(response.status>=500&&operation!=='status')return changeSetAPI('status',transactionId,[],repositoryId);
    return {...data,transactionId};
  }catch(error){
    if(operation!=='status'){const outcome=await changeSetAPI('status',transactionId,[],repositoryId);return outcome.success?outcome:{...outcome,error:(outcome.error||'')+apiResponseDiagnostic(error)};}
    return {success:false,transactionId,code:'GROUP_UNCERTAIN',error:'The change-set outcome is not confirmed. Check its status before continuing.'+apiResponseDiagnostic(error)};
  }
}
const uncertainUndos = new Set<string>();
const undoKey = (filePath: string | undefined, context: UndoContext) => JSON.stringify([filePath || '', context.repositoryId || '', context.sourcePath || '', context.previewId || '', context.editId || '']);

export async function checkUndoOutcomeAPI(filePath?: string, context: UndoContext = {}): Promise<UndoResult> {
  if (!context.previewId) return { success: false, code: 'UNDO_TARGET_REQUIRED', error: 'Choose the accepted edit to undo.' };
  const key = undoKey(filePath, context);
  let diagnostic = '';
  try {
    let token = await getClientSessionToken();
    const lookup = () => fetch('/api/slightnudge/undo/status', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', 'x-slightnudge-token': token },
      body: JSON.stringify({ filePath, ...context }),
    });
    let response = await lookup();
    if (response.status === 403) { token = await getClientSessionToken(true); response = await lookup(); }
    const data = await readApiJson(response);
    if (response.ok && data.success === true && (!data.previewId || data.previewId === context.previewId)) {
      uncertainUndos.delete(key);
      return { success: true, editId: data.editId, message: data.message, sourceCurrent: data.sourceCurrent };
    }
    if (data.code === 'UNDO_NOT_APPLIED') { uncertainUndos.delete(key); return { success: false, code: data.code, error: data.error }; }
    if (['UNDO_RECOVERY_REQUIRED', 'OUTCOME_SCOPE_MISMATCH', 'UNDO_UNKNOWN', 'UNDO_TARGET_CHANGED'].includes(data.code)) {
      uncertainUndos.add(key); return { success: false, code: data.code, error: data.error };
    }
  } catch (error) { diagnostic = apiResponseDiagnostic(error); /* No failed lookup proves that Undo did not write. */ }
  uncertainUndos.add(key);
  return { success: false, code: 'UNDO_UNCERTAIN', error: 'Undo status is unconfirmed. Check Undo status before continuing; Undo will not be sent again.' + diagnostic };
}

export async function undoEditAPI(filePath?: string, context: UndoContext = {}): Promise<UndoResult> {
  if (!context.previewId) return { success: false, code: 'UNDO_TARGET_REQUIRED', error: 'Choose the accepted edit to undo.' };
  const key = undoKey(filePath, context);
  if (uncertainUndos.has(key)) return checkUndoOutcomeAPI(filePath, context);
  let token: string;
  try { token = await getClientSessionToken(); }
  catch (error) { return { success: false, code: 'AUTH_REQUIRED', error: 'Could not authorize Undo.' + apiResponseDiagnostic(error) }; }
  if (!token) return { success: false, code: 'AUTH_REQUIRED', error: 'Could not authorize Undo. Please try again.' };
  uncertainUndos.add(key);
  try {
    const res = await fetch('/api/slightnudge/undo', {
      signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-slightnudge-token': token,
      },
      body: JSON.stringify({ filePath, ...context }),
    });
    const data = await readApiJson(res);
    if (res.status === 403) {
      uncertainUndos.delete(key); await getClientSessionToken(true);
      return { success: false, code: 'AUTH_REQUIRED', error: 'Undo was denied before writing. Explicitly retry it after checking the connection.' };
    }
    if (!res.ok || !data.success) {
      if (res.status >= 500 || data.success !== false || ['UNDO_UNCERTAIN', 'UNDO_RECOVERY_REQUIRED'].includes(data.code)) return checkUndoOutcomeAPI(filePath, context);
      uncertainUndos.delete(key);
      return { success: false, code: data.code, error: data.error || data.message || 'There is no visual edit to undo.' };
    }
    uncertainUndos.delete(key);
    return { success: true, editId: data.editId, message: data.message, sourceCurrent: data.sourceCurrent };
  } catch (error) {
    const outcome = await checkUndoOutcomeAPI(filePath, context);
    return outcome.success ? outcome : { ...outcome, error: (outcome.error || '') + apiResponseDiagnostic(error) };
  }
}
