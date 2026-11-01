'use client';
import { readApiJson } from '@/lib/slightnudge/api-response';


import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Check, CircleAlert, Code2, ExternalLink, FileCode2, GitBranch, ImagePlus, LoaderCircle, Play, RotateCcw, Search, ShieldCheck, Square, Type } from 'lucide-react';
import { StudioLayout } from '@/components/slightnudge/StudioLayout';
import { ProjectCompatibility } from '@/components/slightnudge/ProjectCompatibility';
import { nextDevCommand } from '@/lib/slightnudge/editing-capabilities';
import type { ProjectCompatibility as CompatibilityReport } from '@/lib/slightnudge/project-compatibility';
import { getClientSessionToken, undoEditAPI, type UndoContext } from '@/lib/slightnudge/client';

interface RepositoryDetail {
  repository: { id: string; name: string; owner: string; url: string; defaultBranch: string };
  files: string[];
  framework: string;
  compatibility?: CompatibilityReport;
  sourceAdapterEnabled?: boolean;
  sourceAdapterNeedsUpdate?: boolean;
}

interface PreviewSelection {
  path: string;
  line: number;
  column: number;
  tagName: string;
  className: string;
  textContent?: string;
  imageSource?: string;
  safeToEdit?: boolean;
  refusalReason?: string;
  rect: { top: number; left: number; width: number; height: number };
  clickedRect?: { top: number; left: number; width: number; height: number };
  textEditable?: boolean;
  textReason?: string;
  propSource?: string;
}

interface DockerPreviewStatus {
  available: boolean;
  state: string;
  url: string | null;
  logs: string;
  message: string;
}

interface ImportedEditPreview {
  id: string;
  filePath: string;
  line?: number;
  summary: string;
  oldValue: string;
  newValue: string;
  oldClassName?: string;
  newClassName?: string;
  previewType?: 'className' | 'textContent' | 'imageSource' | 'reorder';
}

interface ImportedAsset { id: string; url: string; size: number; addedAt: string }

const importedStyleOptions = {
  fontSize: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl'],
  fontWeight: ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
  fontFamily: ['font-sans', 'font-serif', 'font-mono'],
  lineHeight: ['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose'],
  letterSpacing: ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest'],
  textTransform: ['normal-case', 'capitalize', 'uppercase', 'lowercase'],
  textColor: ['text-[#17211f]', 'text-[#697571]', 'text-[#176b55]', 'text-[#ffffff]'],
  alignment: ['text-left', 'text-center', 'text-right'],
  backgroundColor: ['bg-[#ffffff]', 'bg-[#f1f3f1]', 'bg-[#176b55]', 'bg-[#17211f]'],
  padding: ['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-12'],
  display: ['block', 'inline-block', 'flex', 'inline-flex', 'grid', 'hidden'],
  flexDirection: ['flex-row', 'flex-col'],
  alignItems: ['items-start', 'items-center', 'items-end', 'items-stretch'],
  justifyContent: ['justify-start', 'justify-center', 'justify-between', 'justify-end'],
  width: ['w-auto', 'w-full', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4'],
  maxWidth: ['max-w-none', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl'],
  gap: ['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8', 'gap-12'],
  borderRadius: ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'],
} as const;

const importedStyleNames = {
  fontSize: 'Text size', fontWeight: 'Weight', fontFamily: 'Font family', lineHeight: 'Line height', letterSpacing: 'Letter spacing', textTransform: 'Text case', textColor: 'Text color',
  alignment: 'Alignment', backgroundColor: 'Fill', padding: 'Padding', display: 'Display', flexDirection: 'Direction', alignItems: 'Align items', justifyContent: 'Justify content', width: 'Width', maxWidth: 'Max width', gap: 'Gap', borderRadius: 'Corner radius',
} as const;
const importedBreakpoints = [['', 'Base'], ['sm', '≥640'], ['md', '≥768'], ['lg', '≥1024'], ['xl', '≥1280'], ['2xl', '≥1536']] as const;

function hasImportedBreakpointClass(className: string, value: string, breakpoint: string) {
  return className.split(/\s+/).includes(breakpoint ? `${breakpoint}:${value}` : value);
}

export default function ImportedRepositoryPage() {
  const params = useParams<{ repoId: string }>();
  const [project, setProject] = useState<RepositoryDetail | null>(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [source, setSource] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [sourceRevision, setSourceRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [previewInput, setPreviewInput] = useState('http://127.0.0.1:3001');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewFrameUrl, setPreviewFrameUrl] = useState('');
  const [previewSession, setPreviewSession] = useState('');
  const [dockerStatus, setDockerStatus] = useState<DockerPreviewStatus | null>(null);
  const [dockerBusy, setDockerBusy] = useState(false);
  const [dockerError, setDockerError] = useState('');
  const [selection, setSelection] = useState<PreviewSelection | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [activeBreakpoint, setActiveBreakpoint] = useState('');
  const [assets, setAssets] = useState<ImportedAsset[]>([]);
  const [assetBusy, setAssetBusy] = useState(false);
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const [editPreview, setEditPreviewState] = useState<ImportedEditPreview | null>(null);
  const [editBusy, setEditBusyState] = useState(false);
  const [editNotice, setEditNotice] = useState('');
  const editBusyRef = useRef(false);
  const editPreviewRef = useRef<ImportedEditPreview | null>(null);
  editPreviewRef.current = editPreview;
  editBusyRef.current = editBusy;
  const reviewNotice = 'Apply or discard the current preview before making another change. Source has not been changed.';
  function setEditPreview(value: ImportedEditPreview | null) {
    editPreviewRef.current = value;
    setEditPreviewState(value);
  }
  function setEditBusy(value: boolean) {
    editBusyRef.current = value;
    setEditBusyState(value);
  }
  const [canUndo, setCanUndo] = useState(false);
  const editGroupIdRef = useRef<string | null>(null);
  const undoTargetRef = useRef<UndoContext | null>(null);
  const undoUncertainRef = useRef(false);
  const [undoUncertain, setUndoUncertain] = useState(false);
  const [adapterEnabled, setAdapterEnabled] = useState(false);
  const [adapterLoading, setAdapterLoading] = useState(false);
  const [adapterNotice, setAdapterNotice] = useState('');
  const [adapterError, setAdapterError] = useState('');
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const selectedSourceLineRef = useRef<HTMLSpanElement | null>(null);
  const selectionRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}`)
      .then(async (response) => {
        const data = await readApiJson(response);
        if (!response.ok) throw new Error(data.error || 'Repository details could not be loaded.');
        if (!cancelled) {
          setProject(data);
          setSelectedFile(data.files[0] || '');
          setAdapterEnabled(Boolean(data.sourceAdapterEnabled));
          fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/docker-preview`)
            .then(async (response) => {
              const status = await readApiJson(response);
              if (!response.ok) throw new Error(status.error || 'Could not read Docker status.');
              if (!cancelled) setDockerStatus(status);
            })
            .catch((cause) => { if (!cancelled) setDockerError(cause instanceof Error ? cause.message : 'Could not read Docker status.'); });
        }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Repository details could not be loaded.'); });
    return () => { cancelled = true; };
  }, [params.repoId]);

  useEffect(() => {
    if (!selectedFile) return;
    let cancelled = false;
    const sourceQuery = new URLSearchParams({ path: selectedFile });
    setSourceLoading(true);
    setSourceError('');
    fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/source?${sourceQuery}`)
      .then(async (response) => {
        const data = await readApiJson(response);
        if (!response.ok) throw new Error(data.error || 'Could not inspect this source file.');
        if (!cancelled) setSource(data.content);
      })
      .catch((cause) => { if (!cancelled) setSourceError(cause instanceof Error ? cause.message : 'Could not inspect this source file.'); })
      .finally(() => { if (!cancelled) setSourceLoading(false); });
    return () => { cancelled = true; };
  }, [params.repoId, selectedFile, sourceRevision]);
  useEffect(() => {
    if (dockerStatus?.state !== 'running' || previewUrl || !dockerStatus.url) return;
    let cancelled = false;
    void (async () => {
      const token = await getClientSessionToken();
      fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/preview-check`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
        body: JSON.stringify({ url: dockerStatus.url }),
      }).then(async (response) => {
        const data = await readApiJson(response);
        if (!response.ok) return;
        if (cancelled) return;
        const session = crypto.randomUUID();
        const frameUrl = new URL(data.url);
        frameUrl.searchParams.set('__slightnudge_session', session);
        frameUrl.searchParams.set('__slightnudge_parent', window.location.origin);
        setPreviewInput(data.url);
        setPreviewUrl(data.url);
        setPreviewSession(session);
        setPreviewFrameUrl(frameUrl.toString());
      }).catch(() => undefined);
    })();
    return () => { cancelled = true; };
  }, [dockerStatus, params.repoId, previewUrl]);

  useEffect(() => {
    if (!previewUrl || !previewSession || !project) return;
    const allowedOrigin = new URL(previewUrl).origin;
    let active = true;
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== allowedOrigin || event.source !== previewFrameRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.channel !== 'slightnudge' || message.session !== previewSession) return;
      const value = message.selection;
      if (!value || typeof value.path !== 'string' || value.path.length > 1000) return;
      const rect = value.rect;
      if (!rect || ![rect.top, rect.left, rect.width, rect.height].every((part: unknown) => typeof part === 'number' && Number.isFinite(part))) return;
      if (message.type === 'source-rect') {
        setSelection((current) => current && current.path === value.path && current.line === value.line ? { ...current, rect } : current);
        return;
      }
      if (message.type !== 'source-selection' || !Number.isSafeInteger(value.line) || value.line < 1 || !Number.isSafeInteger(value.column) || value.column < 1) return;
      if (undoUncertainRef.current) { setEditNotice('Check Undo status before selecting another element.'); return; }
      if (editPreviewRef.current || editBusyRef.current) { setEditNotice(reviewNotice); return; }

      const nextSelection: PreviewSelection = {
        path: value.path,
        line: value.line,
        column: value.column,
        tagName: typeof value.tagName === 'string' ? value.tagName.slice(0, 40) : 'element',
        className: typeof value.className === 'string' ? value.className.slice(0, 1200) : '',
        textContent: typeof value.textContent === 'string' ? value.textContent.slice(0, 2000) : '',
        imageSource: typeof value.imageSource === 'string' ? value.imageSource.slice(0, 1000) : '',
        rect,
        clickedRect: value.clickedRect,
      };
      setSelection(nextSelection);
      setTextDraft(nextSelection.textContent || '');
      setEditPreview(null);
      setCanUndo(false);
      setEditNotice('');
      editGroupIdRef.current = crypto.randomUUID();
      const selectionRequestId = ++selectionRequestRef.current;
      setSelectedFile(nextSelection.path);
      setQuery('');
      setSourceError('');
      try {
        const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/inspect`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            path: nextSelection.path,
            line: nextSelection.line,
            column: nextSelection.column,
            tagName: nextSelection.tagName,
            className: nextSelection.className,
            rect: nextSelection.rect,
            clickedRect: nextSelection.clickedRect,
          }),
        });
        const result = await readApiJson(response);
        if (!response.ok || !active || selectionRequestId !== selectionRequestRef.current) return;
        setSelection((current) => current && current.path === nextSelection.path && current.line === nextSelection.line
          ? {
              ...current,
              tagName: result.tagName || current.tagName,
              className: result.className || current.className,
              safeToEdit: Boolean(result.safeToEdit),
              refusalReason: result.reason,
              textEditable: result.textEditable,
              textReason: result.textReason,
              propSource: result.propSource,
            }
          : current);
        undoTargetRef.current = result.undoTarget ? { ...result.undoTarget, repositoryId: params.repoId, sourcePath: nextSelection.path } : null;
        setCanUndo(Boolean(undoTargetRef.current));
      } catch (cause) {
        if (active && selectionRequestId === selectionRequestRef.current) setSelection((current) => current && current.path === nextSelection.path && current.line === nextSelection.line
          ? { ...current, safeToEdit: false, refusalReason: cause instanceof Error ? cause.message : 'Could not verify this source location.' }
          : current);
      }
    };
    window.addEventListener('message', onMessage);
    return () => { active = false; window.removeEventListener('message', onMessage); };
  }, [editPreview, params.repoId, previewSession, previewUrl, project]);

  useEffect(() => {
    if (selection?.path === selectedFile) selectedSourceLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selection, selectedFile, source]);

  useEffect(() => {
    if (selection?.tagName !== 'img') { setAssets([]); return; }
    let cancelled = false;
    fetch(`/api/slightnudge/assets?repositoryId=${encodeURIComponent(params.repoId)}`)
      .then(async (response) => {
        const data = await readApiJson(response);
        if (!response.ok) throw new Error(data.error || 'Could not load imported images.');
        if (!cancelled) setAssets(data.assets || []);
      })
      .catch((cause) => { if (!cancelled) setEditNotice(cause instanceof Error ? cause.message : 'Could not load imported images.'); });
    return () => { cancelled = true; };
  }, [params.repoId, selection?.tagName]);

  const visibleFiles = useMemo(() => project?.files.filter((file) => file.toLowerCase().includes(query.trim().toLowerCase())) || [], [project, query]);

  async function connectPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (undoUncertainRef.current) { setPreviewError('Check Undo status before reconnecting.'); return; }
    if (editPreviewRef.current || editBusyRef.current) { setPreviewError(reviewNotice); return; }
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const token = await getClientSessionToken();
      const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/preview-check`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
        body: JSON.stringify({ url: previewInput }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not connect to your local preview.');
      attachPreview(data.url);
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : 'Could not connect to your local preview.');
    } finally {
      setPreviewLoading(false);
    }
  }

  function attachPreview(url: string) {
    if (editPreviewRef.current || editBusyRef.current) { setPreviewError(reviewNotice); return; }
    const session = crypto.randomUUID();
    const frameUrl = new URL(url);
    frameUrl.searchParams.set('__slightnudge_session', session);
    frameUrl.searchParams.set('__slightnudge_parent', window.location.origin);
    setPreviewInput(url);
    setPreviewUrl(url);
    setPreviewSession(session);
    setPreviewFrameUrl(frameUrl.toString());
    setSelection(null);
  }

  async function startDockerPreview() {
    if (undoUncertainRef.current) { setDockerError('Check Undo status before reconnecting.'); return; }
    if (editPreviewRef.current || editBusyRef.current) { setDockerError(reviewNotice); return; }
    setDockerBusy(true);
    setDockerError('');
    try {
      const endpoint = `/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/docker-preview`;
      const token = await getClientSessionToken();
      const started = await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-slightnudge-token': token },
      });
      const startResult = await readApiJson(started);
      if (!started.ok) throw new Error(startResult.error || 'Could not start the Docker preview.');
      setDockerStatus({ available: true, state: 'starting', url: startResult.url, logs: '', message: startResult.message });

      for (let attempt = 0; attempt < 120; attempt += 1) {
        const check = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/preview-check`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
          body: JSON.stringify({ url: startResult.url }),
        });
        const checkResult = await readApiJson(check);
        if (check.ok) {
          attachPreview(checkResult.url);
          setDockerStatus({ available: true, state: 'running', url: checkResult.url, logs: '', message: 'The isolated preview is ready.' });
          return;
        }
        if (check.status === 403 || check.status === 422) throw new Error(checkResult.error || 'The preview server cannot be embedded.');
        const statusResponse = await fetch(endpoint);
        const status = await readApiJson(statusResponse);
        if (statusResponse.ok) setDockerStatus(status);
        if (status.state === 'exited') throw new Error(`${status.message}\n${status.logs || 'The container exited before the dev server was ready.'}`);
        if (attempt % 4 === 3) setDockerStatus({ ...status, state: 'starting', message: 'Installing dependencies and starting the dev server…' });
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
      const statusResponse = await fetch(endpoint);
      const status = await readApiJson(statusResponse);
      setDockerStatus(status);
      throw new Error(`The preview is still starting. You can retry the connection in a moment.${status.logs ? `\n${status.logs}` : ''}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not start the Docker preview.';
      setDockerError(message);
      setPreviewError(message.split('\n')[0]);
    } finally {
      setDockerBusy(false);
    }
  }

  async function stopDockerPreview() {
    if (undoUncertainRef.current) { setDockerError('Check Undo status before disconnecting.'); return; }
    if (editPreviewRef.current || editBusyRef.current) { setDockerError(reviewNotice); return; }
    setDockerBusy(true);
    setDockerError('');
    try {
      const token = await getClientSessionToken();
      const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/docker-preview`, {
        method: 'DELETE',
        headers: { 'x-slightnudge-token': token },
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not stop the Docker preview.');
      setDockerStatus({ available: true, state: 'missing', url: null, logs: '', message: data.message });
      setPreviewUrl('');
      setPreviewSession('');
      setPreviewFrameUrl('');
      setSelection(null);
    } catch (cause) {
      setDockerError(cause instanceof Error ? cause.message : 'Could not stop the Docker preview.');
    } finally {
      setDockerBusy(false);
    }
  }

  function sendImportedPreview(property: 'className' | 'textContent' | 'imageSource' | 'reorder', value: string, direction?: 'earlier' | 'later') {
    if (!previewUrl || !previewSession) return;
    const targetOrigin = new URL(previewUrl).origin;
    previewFrameRef.current?.contentWindow?.postMessage({
      channel: 'slightnudge', type: 'preview-change', session: previewSession,
      selection: { path: selection?.path, line: selection?.line, column: selection?.column }, property, value, direction,
    }, targetOrigin);
  }

  async function previewImportedChange(kind: 'style' | 'text' | 'image-source' | 'reorder', value: string, property?: keyof typeof importedStyleNames, breakpoint = activeBreakpoint, direction?: 'earlier' | 'later') {
    if (undoUncertainRef.current) { setEditNotice('Check Undo status before making another change.'); return; }
    if (editPreviewRef.current || editBusyRef.current) { setEditNotice(reviewNotice); return; }
    if (!selection?.safeToEdit) return;
    editBusyRef.current = true;
    setEditBusy(true);
    setEditNotice('');
    try {
      const token = await getClientSessionToken();
      const response = await fetch('/api/slightnudge/preview', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
        body: JSON.stringify({ repositoryId: params.repoId, sourcePath: selection.path, line: selection.line, column: selection.column, kind, ...(property ? { property, breakpoint } : {}), ...(direction ? { direction } : {}), value }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not prepare this source change.');
      if (data.changed === false) { setEditNotice(data.message || 'That value is already applied.'); return; }
      const preview = data as ImportedEditPreview;
      if (preview.previewType === 'className' && (typeof preview.newClassName !== 'string' || typeof preview.oldClassName !== 'string')) {
        throw new Error('This preview is missing its complete class list. Source has not been changed.');
      }
      editPreviewRef.current = preview;
      setEditPreview(preview);
      sendImportedPreview(preview.previewType === 'textContent' ? 'textContent' : preview.previewType === 'imageSource' ? 'imageSource' : preview.previewType === 'reorder' ? 'reorder' : 'className', preview.previewType === 'className' ? preview.newClassName! : preview.newValue, direction);
    } catch (cause) {
      setEditNotice(cause instanceof Error ? cause.message : 'Could not prepare this source change.');
    } finally {
      setEditBusy(false);
    }
  }

  async function previewImportedStyle(property: keyof typeof importedStyleNames, value: string, breakpoint = activeBreakpoint) {
    return previewImportedChange('style', value, property, breakpoint);
  }

  async function previewImportedText() {
    if (!textDraft.trim() || textDraft === (selection?.textContent || '')) return;
    return previewImportedChange('text', textDraft);
  }

  async function importImage(file: File | undefined) {
    if (!file || assetBusy) return;
    setAssetBusy(true); setEditNotice('');
    try {
      const form = new FormData();
      form.set('file', file);
      const token = await getClientSessionToken();
      const response = await fetch(`/api/slightnudge/assets?repositoryId=${encodeURIComponent(params.repoId)}`, {
        method: 'POST',
        headers: { 'x-slightnudge-token': token },
        body: form,
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not import this image.');
      setAssets((current) => [data.asset, ...current.filter((asset) => asset.id !== data.asset.id)]);
      setEditNotice('Image imported into this repository’s public/slightnudge-assets folder.');
    } catch (cause) {
      setEditNotice(cause instanceof Error ? cause.message : 'Could not import this image.');
    } finally {
      setAssetBusy(false);
      if (assetInputRef.current) assetInputRef.current.value = '';
    }
  }

  async function discardImportedEdit() {
    if (!editPreview || editBusyRef.current) return;
    editBusyRef.current = true;
    setEditBusy(true);
    try {
      const token = await getClientSessionToken();
      const response = await fetch(`/api/slightnudge/preview?id=${encodeURIComponent(editPreview.id)}`, {
        method: 'DELETE',
        headers: { 'x-slightnudge-token': token },
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not discard this source change.');
      if (editPreview.previewType === 'reorder') {
        const revertDir = editPreview.summary.includes('earlier') ? 'later' : 'earlier';
        sendImportedPreview('reorder', '', revertDir);
      } else {
        sendImportedPreview(editPreview.previewType === 'textContent' ? 'textContent' : editPreview.previewType === 'imageSource' ? 'imageSource' : 'className', editPreview.previewType === 'className' ? editPreview.oldClassName! : editPreview.oldValue);
      }
      setEditPreview(null);
      setEditNotice('Change discarded. Repository source is unchanged.');
    } catch (cause) {
      setEditNotice(cause instanceof Error ? cause.message : 'Could not discard this source change.');
    } finally {
      setEditBusy(false);
    }
  }

  async function applyImportedEdit() {
    if (!editPreview || !selection || editBusyRef.current) return;
    editBusyRef.current = true;
    setEditBusy(true);
    setEditNotice('');
    try {
      editGroupIdRef.current ||= crypto.randomUUID();
      const token = await getClientSessionToken();
      const response = await fetch('/api/slightnudge/apply', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
        body: JSON.stringify({ previewId: editPreview.id, groupId: editGroupIdRef.current, repositoryId: params.repoId, sourcePath: selection.path }),
      });
      const data = await readApiJson(response);
      if (!response.ok || !data.success) {
        if (data.code === 'SOURCE_CHANGED') {
          sendImportedPreview(editPreview.previewType === 'textContent' ? 'textContent' : editPreview.previewType === 'imageSource' ? 'imageSource' : editPreview.previewType === 'reorder' ? 'reorder' : 'className', editPreview.previewType === 'className' ? editPreview.oldClassName! : editPreview.oldValue, editPreview.previewType === 'reorder' ? editPreview.summary.includes('earlier') ? 'later' : 'earlier' : undefined);
          setEditPreview(null);
          setSelection(null);
          setSourceRevision((revision) => revision + 1);
        }
        throw new Error(data.error || 'The source changed after review. Preview it again before applying.');
      }
      setEditPreview(null);
      undoTargetRef.current = { previewId: editPreview.id, editId: data.editId, repositoryId: params.repoId, sourcePath: selection.path };
      setCanUndo(true);
      setSelection((current) => current ? editPreview.previewType === 'textContent'
        ? { ...current, textContent: editPreview.newValue }
        : editPreview.previewType === 'imageSource'
          ? { ...current, imageSource: editPreview.newValue }
          : editPreview.previewType === 'reorder'
            ? current
            : { ...current, className: editPreview.newClassName! } : current);
      setSourceRevision((revision) => revision + 1);
      setEditNotice('Applied to the imported source and visible in the live preview. You can keep refining this element.');
    } catch (cause) {
      setEditNotice(cause instanceof Error ? cause.message : 'Could not apply this source change.');
    } finally {
      setEditBusy(false);
    }
  }

  async function undoImportedEdit() {
    if (!selection || !canUndo || editBusy || editPreview) return;
    setEditBusy(true);
    setEditNotice('');
    try {
      const target = undoTargetRef.current;
      if (!target) throw new Error('Inspect the accepted edit before undoing.');
      const data = await undoEditAPI(undefined, target);
      undoUncertainRef.current = !data.success && ['UNDO_UNCERTAIN', 'UNDO_RECOVERY_REQUIRED', 'UNDO_UNKNOWN', 'UNDO_TARGET_CHANGED', 'OUTCOME_SCOPE_MISMATCH'].includes(data.code || '');
      setUndoUncertain(undoUncertainRef.current);
      if (!data.success) throw new Error(data.error || 'Check Undo status before continuing.');
      undoTargetRef.current = null;
      setCanUndo(false);
      setSourceRevision((revision) => revision + 1);
      setSelection(null);
      setPreviewFrameUrl((current) => {
        if (!current) return current;
        const updated = new URL(current);
        updated.searchParams.set('__slightnudge_refresh', String(Date.now()));
        return updated.toString();
      });
      setEditNotice('The last accepted visual edit was undone. Select an element again to keep editing.');
    } catch (cause) {
      setEditNotice(cause instanceof Error ? cause.message : 'Could not undo the last source change.');
    } finally {
      setEditBusy(false);
    }
  }

  async function updateAdapter(enable: boolean) {
    setAdapterLoading(true);
    setAdapterError('');
    setAdapterNotice('');
    try {
      const token = await getClientSessionToken();
      const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/adapter`, {
        method: enable ? 'POST' : 'DELETE',
        headers: { 'x-slightnudge-token': token },
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not update the Next.js source adapter.');
      setAdapterEnabled(enable);
      setProject(current => current ? { ...current, sourceAdapterEnabled: enable, sourceAdapterNeedsUpdate: false } : current);
      setAdapterNotice(enable
        ? 'Source mapping is installed in this local clone. Stop its dev server, then restart it with the command below.'
        : 'Source mapping has been removed and the original Next.js config restored. Restart the dev server.');
    } catch (cause) {
      setAdapterError(cause instanceof Error ? cause.message : 'Could not update the Next.js source adapter.');
    } finally {
      setAdapterLoading(false);
    }
  }

  const projectName = project ? `${project.repository.owner}/${project.repository.name}` : 'Imported repository';
  return <StudioLayout projectName={projectName} activeFile={selectedFile || 'Repository sources'} inspectorEnabled={false} previewConnected={Boolean(previewUrl)}>
    <section className="sn-repository-welcome">
      <div className="sn-repo-welcome-icon"><Code2 size={21}/></div>
      <p className="sn-eyebrow">Repository ready</p>
      <h1>{projectName}</h1>
      <p className="sn-repo-welcome-lede">Connect a local preview, select a supported element, and review precise style changes before they reach your imported source.</p>
      {error && <p className="sn-form-error" role="alert"><CircleAlert size={15}/>{error}</p>}
      {!project && !error && <p className="sn-loading-line"><LoaderCircle className="sn-spinner" size={15}/> Reading repository…</p>}
      {project && <>
        <div className="sn-repo-facts"><span><GitBranch size={14}/>{project.repository.defaultBranch}</span><span><FileCode2 size={14}/>{project.files.length} source {project.files.length === 1 ? 'file' : 'files'}</span><span><Check size={14}/>{project.framework}</span></div>
        {project.compatibility && <ProjectCompatibility report={project.compatibility}/>}
        <div className="sn-repo-next"><span><ShieldCheck size={16}/></span><div><strong>Isolated local preview</strong><p>Starting runs this repository’s install scripts and dev server inside Docker. The source mount is read only; the container has memory, CPU, and process limits. Network access stays enabled for dependencies and app services.</p></div></div>
        <section className="sn-docker-preview" aria-label="Docker preview">
          <div className="sn-docker-preview-copy"><div className="sn-docker-preview-heading"><span className={`sn-docker-indicator ${dockerStatus?.state === 'running' ? 'is-running' : ''}`}/><strong>Docker preview</strong><span>{dockerStatus?.available ? dockerStatus.state === 'running' ? 'Running' : dockerStatus.state === 'exited' ? 'Stopped with an error' : 'Engine ready' : dockerStatus ? 'Engine unavailable' : 'Checking engine'}</span></div><p>{dockerStatus?.message || 'Checking Docker Desktop…'}</p></div>
          <div className="sn-docker-preview-actions">{dockerStatus?.state === 'running' ? <button type="button" className="sn-button sn-button-secondary" disabled={dockerBusy} onClick={() => void stopDockerPreview()}>{dockerBusy ? <LoaderCircle className="sn-spinner" size={14}/> : <Square size={13}/>} Stop preview</button> : <button type="button" className="sn-button sn-button-primary" disabled={dockerBusy || !dockerStatus?.available || !['Next.js', 'Vite'].includes(project.framework)} onClick={() => void startDockerPreview()}>{dockerBusy ? <><LoaderCircle className="sn-spinner" size={14}/> {dockerStatus?.state === 'starting' ? 'Starting…' : 'Preparing…'}</> : <><Play size={14}/> Start in Docker</>}</button>}</div>
          {dockerStatus?.state === 'exited' && dockerStatus.logs && <pre className="sn-docker-logs" aria-label="Docker preview logs">{dockerStatus.logs}</pre>}
          {(dockerError || (!dockerStatus && project)) && <p className="sn-form-error" role="alert"><CircleAlert size={15}/>{dockerError || 'Docker status is still loading.'}</p>}
        </section>
        {project.framework === 'Next.js' && <section className="sn-next-adapter" aria-label="Next.js source mapping">
          <div><strong>Click-to-source for Next.js</strong><p>{adapterEnabled ? project.sourceAdapterNeedsUpdate ? 'This adapter needs an update for the current editing tools. Remove and enable source mapping, then restart the local dev server. Modified config files are preserved.' : 'The reversible adapter is installed in this local clone.' : 'Install a reversible development adapter to map preview clicks to JSX source files and exact lines.'}</p></div>
          <button type="button" className="sn-button sn-button-secondary" disabled={adapterLoading || !adapterEnabled && (project.compatibility?.sourceMapping === false || project.compatibility?.checks.some(check => check.id === 'framework' && check.state === 'setup'))} onClick={() => void updateAdapter(!adapterEnabled)}>{adapterLoading ? <><LoaderCircle className="sn-spinner" size={14}/> Updating…</> : adapterEnabled ? 'Remove adapter' : 'Enable source mapping'}</button>
          {adapterNotice && <p className="sn-next-adapter-notice" role="status">{adapterNotice}</p>}
          {adapterError && <p className="sn-form-error" role="alert"><CircleAlert size={15}/>{adapterError}</p>}
        </section>}
        <form className="sn-preview-connect" onSubmit={connectPreview}>
          <div className="sn-preview-connect-heading"><span><Play size={15}/></span><div><strong>Connect a local preview</strong><p>Start the app yourself, then connect to its local address.</p></div></div>
          <div className="sn-preview-command"><span>In the repository folder, start its dev server on <code>127.0.0.1:3001</code>.</span><code>{project.framework === 'Next.js' ? adapterEnabled ? nextDevCommand(project.compatibility?.nextVersion) : 'npm run dev -- --hostname 127.0.0.1 --port 3001' : project.framework === 'Vite' ? 'npm run dev -- --host 127.0.0.1 --port 3001' : 'Use your framework’s dev command on port 3001'}</code></div>
          <label className="sn-preview-url-label" htmlFor="sn-preview-url">Local preview URL</label>
          <div className="sn-preview-connect-row"><input id="sn-preview-url" type="url" inputMode="url" autoComplete="url" value={previewInput} onChange={(event) => setPreviewInput(event.target.value)} placeholder="http://127.0.0.1:3001" required/><button className="sn-button sn-button-primary" type="submit" disabled={previewLoading}>{previewLoading ? <><LoaderCircle className="sn-spinner" size={15}/> Checking…</> : <>{previewUrl ? 'Reconnect' : 'Connect'} <ArrowUpRight size={15}/></>}</button></div>
          <p className="sn-preview-safety"><ShieldCheck size={14}/> Connect only to code you trust. The frame is isolated from SlightNudge; your dev server runs under your user account.</p>
          {previewError && <p className="sn-form-error" role="alert"><CircleAlert size={15}/>{previewError}</p>}
        </form>
        <div className="sn-repo-actions">
          {project.framework === 'Next.js' && project.compatibility?.sourceMapping !== false && <Link className="sn-button sn-button-primary" href={`/studio/${encodeURIComponent(params.repoId)}/edit${previewUrl ? '?preview=' + encodeURIComponent(previewUrl) : ''}`}>Open Studio <ArrowUpRight size={15}/></Link>}
          <Link className="sn-button sn-button-secondary" href={project.repository.url} target="_blank" rel="noreferrer">Open on GitHub <ExternalLink size={15}/></Link><Link className="sn-text-action" href="/studio">Try the visual playground <ArrowUpRight size={15}/></Link>
        </div>
        {previewUrl && <section className="sn-live-preview" aria-label="Connected local preview">
          <div className="sn-live-preview-head"><div><span className="sn-live-dot"/><strong>Live preview</strong><code>{previewUrl}</code></div><a href={previewUrl} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">Open in new tab <ExternalLink size={13}/></a></div>
          <div className="sn-live-preview-stage"><iframe ref={previewFrameRef} className="sn-live-preview-frame" key={previewFrameUrl} src={previewFrameUrl} title={`${projectName} local preview`} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer"/>{selection && <div className="sn-live-selection-outline" aria-hidden="true" style={{ top: selection.rect.top, left: selection.rect.left, width: selection.rect.width, height: selection.rect.height }}/>}</div>
          {selection && <div className="sn-live-selection-status" aria-live="polite"><span>&lt;{selection.tagName}&gt;</span><code>{selection.path}:{selection.line}:{selection.column}</code><span className={selection.safeToEdit ? 'is-mapped' : ''}>{selection.safeToEdit ? 'Source verified' : selection.refusalReason || 'Source mapped'}</span></div>}
        </section>}
        {!selection && editNotice && <p className="sn-imported-edit-notice" role="status">{editNotice}</p>}
        {selection && <section className="sn-imported-edit" aria-label="Edit selected element">
          <div className="sn-imported-edit-heading"><div><p className="sn-eyebrow">Source editor</p><h2>Refine selected element</h2><p>{selection.path}:{selection.line} · {selection.safeToEdit ? 'Static Tailwind classes are editable' : selection.refusalReason || 'Checking whether this element can be edited safely'}</p></div><button type="button" className="sn-button sn-button-secondary" disabled={!canUndo || editBusy || Boolean(editPreview)} onClick={() => void undoImportedEdit()}><RotateCcw size={14}/> {undoUncertain ? 'Check Undo status' : 'Undo last change'}</button></div>
          {selection.safeToEdit && <>
            {editPreview && (
              <div className="sn-pending-dock" aria-live="polite">
                <div className="sn-pending-info">
                  <div className="sn-pending-badge">
                    <span className="sn-pending-dot" />
                    <span>{editPreview.summary}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Not saved to source</span>
                </div>
                <div className="sn-review-diff">
                  <code className="sn-review-file">{editPreview.filePath}{editPreview.line ? `:${editPreview.line}` : ''}</code>
                  <div><span>Before</span><pre aria-label="Before change">{editPreview.oldValue}</pre></div>
                  <div><span>After</span><pre aria-label="After change">{editPreview.newValue}</pre></div>
                </div>
                <div className="sn-pending-actions">
                  <button type="button" className="sn-dock-btn sn-dock-discard" disabled={editBusy} onClick={() => void discardImportedEdit()}>
                    Discard
                  </button>
                  <button type="button" className="sn-dock-btn sn-dock-apply" disabled={editBusy} onClick={() => void applyImportedEdit()}>
                    {editBusy ? <LoaderCircle className="sn-spinner" size={12} /> : <Check size={12} />} Apply to code
                  </button>
                </div>
              </div>
            )}
            {['p', 'span', 'a', 'button', 'label', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(selection.tagName) && <section className="sn-imported-text-control" aria-label="Text content editor"><label htmlFor="sn-imported-text"><span><Type size={15}/> Text content</span><small>{textDraft.length} / 2,000</small></label><textarea id="sn-imported-text" maxLength={2000} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} disabled={editBusy || selection.textEditable === false}/>{selection.textEditable === false ? <p className="sn-imported-text-notice" role="status" style={{ color: '#b43e35', margin: '0.5rem 0', fontSize: '0.8125rem' }}>{selection.textReason || 'This text cannot be edited directly.'}</p> : <button type="button" className="sn-button sn-button-secondary" disabled={editBusy || !textDraft.trim() || textDraft === (selection.textContent || '')} onClick={() => void previewImportedText()}>Preview text change</button>}<small>Static text only. Nested or generated content is protected.</small></section>}
            {selection.tagName === 'img' && <section className="sn-imported-assets" aria-label="Image assets"><div className="sn-imported-assets-heading"><div><strong><ImagePlus size={15}/> Image library</strong><p>Imported images are stored in this repository’s public folder.</p></div><input ref={assetInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Import image" onChange={(event) => void importImage(event.target.files?.[0])} hidden/><button type="button" className="sn-button sn-button-secondary" disabled={assetBusy} onClick={() => assetInputRef.current?.click()}>{assetBusy ? <LoaderCircle className="sn-spinner" size={14}/> : <ImagePlus size={14}/>} Import image</button></div><div className="sn-asset-grid">{assets.map((asset) => <button type="button" key={asset.id} className={`sn-asset-card ${selection.imageSource === asset.url ? 'is-selected' : ''}`} disabled={editBusy} onClick={() => void previewImportedChange('image-source', asset.url)}><img src={asset.url} alt=""/><span>{asset.id}</span></button>)}{assets.length === 0 && <p className="sn-asset-empty">No images yet. Import a PNG, JPEG, WebP, or GIF up to 8 MB.</p>}</div></section>}
            <fieldset className="sn-imported-control sn-imported-breakpoints"><legend>Apply at breakpoint</legend><div className="sn-breakpoint-options">{importedBreakpoints.map(([value, label]) => <button type="button" key={value || 'base'} className={activeBreakpoint === value ? 'is-selected' : ''} aria-pressed={activeBreakpoint === value} onClick={() => setActiveBreakpoint(value)}>{label}</button>)}</div></fieldset>
            <fieldset className="sn-imported-control" aria-label="Arrange element">
              <legend>Arrange</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="sn-button sn-button-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', padding: '6px 10px' }}
                  disabled={editBusy}
                  onClick={() => void previewImportedChange('reorder', '', undefined, undefined, 'earlier')}
                >
                  <ArrowUp size={13}/> Move earlier
                </button>
                <button
                  type="button"
                  className="sn-button sn-button-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', padding: '6px 10px' }}
                  disabled={editBusy}
                  onClick={() => void previewImportedChange('reorder', '', undefined, undefined, 'later')}
                >
                  <ArrowDown size={13}/> Move later
                </button>
              </div>
            </fieldset>
            <div className="sn-imported-control-grid">{(Object.keys(importedStyleOptions) as Array<keyof typeof importedStyleOptions>).map((property) => <fieldset className="sn-imported-control" key={property}><legend>{importedStyleNames[property]}</legend><div>{importedStyleOptions[property].map((value) => <button type="button" key={value} className={`sn-imported-style-chip ${hasImportedBreakpointClass(selection.className, value, activeBreakpoint) ? 'is-selected' : ''}`} aria-pressed={hasImportedBreakpointClass(selection.className, value, activeBreakpoint)} disabled={editBusy} onClick={() => void previewImportedStyle(property, value)}>{property === 'textColor' || property === 'backgroundColor' ? <i style={{ backgroundColor: value.match(/#([0-9a-f]{6})/i)?.[0] || '#fff' }}/> : null}{value.replace(/^text-\[|^bg-\[|\]$/g, '').replace(/^(text-|font-|bg-|p-|max-w-|rounded-|leading-|tracking-|w-|gap-)/, '').replace('semibold', 'semi-bold')}</button>)}</div></fieldset>)}</div>
          </>}
          {!selection.safeToEdit && <div className="sn-imported-edit-locked"><ShieldCheck size={15}/> Editing stays disabled until the source mapping passes its safety check.</div>}
          {editBusy && !editPreview && <p className="sn-imported-edit-notice"><LoaderCircle className="sn-spinner" size={14}/> Preparing a change preview…</p>}
          {editNotice && <p className="sn-imported-edit-notice" role="status">{editNotice}</p>}
        </section>}
        <div className="sn-source-explorer">
          <div className="sn-source-files">
            <div className="sn-file-list-heading"><strong>Source files</strong><span>{visibleFiles.length} {visibleFiles.length === 1 ? 'file' : 'files'}</span></div>
            <label className="sn-source-search"><Search size={14}/><input aria-label="Filter source files" placeholder="Filter files" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
            <div className="sn-source-file-list">{visibleFiles.slice(0, 160).map((file) => <button type="button" className={selectedFile === file ? 'is-active' : ''} aria-current={selectedFile === file ? 'true' : undefined} onClick={() => setSelectedFile(file)} key={file}><FileCode2 size={14}/><span>{file}</span></button>)}{visibleFiles.length === 0 && <p className="sn-source-empty">No files match that name.</p>}{visibleFiles.length > 160 && <p className="sn-source-empty">Showing the first 160 matches. Filter by folder or filename.</p>}</div>
          </div>
          <section className="sn-source-preview" aria-label="Selected source file">
            <div className="sn-source-preview-head"><div><Code2 size={14}/><span>{selectedFile || 'Select a source file'}</span></div><span>Source</span></div>
            {sourceLoading ? <div className="sn-source-placeholder"><LoaderCircle className="sn-spinner" size={16}/> Loading source…</div> : sourceError ? <p className="sn-source-placeholder is-error" role="alert"><CircleAlert size={16}/>{sourceError}</p> : <pre className="sn-source-code"><code>{source.split('\n').map((line, index) => { const activeLine = selection?.path === selectedFile && selection.line === index + 1; return <span className={`sn-source-line ${activeLine ? 'is-selected' : ''}`} key={`${index}-${line.slice(0, 14)}`} ref={activeLine ? selectedSourceLineRef : undefined}><i>{index + 1}</i><b>{line || ' '}</b></span>; })}</code></pre>}
          </section>
        </div>
      </>}
    </section>
  </StudioLayout>;
}
