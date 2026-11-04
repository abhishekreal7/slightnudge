'use client';
import { readApiJson } from '@/lib/slightnudge/api-response';


import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getClientSessionToken } from '@/lib/slightnudge/client';
import type { CanvasLayer, CanvasRenderPatch } from '@/lib/slightnudge/source-canvas-contract';
import { SOURCE_CANVAS_PROTOCOL } from '@/lib/slightnudge/source-canvas-contract';
import windowStyles from './source-window.module.css';
import canvasStyles from './imported-canvas.module.css';

export interface SourceSelection {
  renderPatches?: CanvasRenderPatch[];
  key?: string; parentKey?: string; name?: string;
  path: string; line: number; column: number; tagName: string; elementId?: string; instance?: string;
  className: string; textContent: string; computed: Record<string, string>;
  attributes?: Record<string, string | null>;
  rect: { top: number; left: number; width: number; height: number };
}
export interface SourceCanvasHandle {
  openWindow(): void;
  command(operation: 'preview' | 'check' | 'discard' | 'verify' | 'verify-document' | 'restore' | 'select' | 'catalog' | 'gesture' | 'cancel-gesture' | 'begin-text' | 'cancel-text' | 'finish-text' | 'verify-batch' | 'set-mode', selection?: SourceSelection | null, extra?: Record<string, unknown>): Promise<SourceSelection | undefined>;
  reload(selection?: SourceSelection, expectedClass?: string, expectedText?: string, expectedBatch?: CanvasRenderPatch[]): Promise<void>;
}

export const SourceProjectCanvas = forwardRef<SourceCanvasHandle, {
  repositoryId?: string; localPageId?: string; width: string; blocked: boolean;
  windowMode?: boolean; continuousDraft?: boolean; browseMode?: boolean;
  destinationMode?: boolean; onDestination?(selection: SourceSelection): void;
  onLayers?(layers: CanvasLayer[]): void; onGeometry?(selection: SourceSelection): void; onReady?(): void;
  onViewport?(width: number, initialFontSize?: number): void;
  onText?(type: string, selection?: SourceSelection, text?: string, shift?: boolean): void;
  renderSelection?(selection: SourceSelection): React.ReactNode;
  onSelect(selection: SourceSelection): void; onNotice(message: string): void; onClearSelection(): void;
}>(function SourceProjectCanvas({ repositoryId, localPageId, width, blocked, windowMode = false, continuousDraft = false, browseMode = false, destinationMode = false, onDestination, onSelect, onNotice, onClearSelection, onLayers, onGeometry, onReady, onViewport, onText, renderSelection }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [input, setInput] = useState('http://127.0.0.1:3001');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const acknowledgedSession = useRef<string | null>(null);
  const [pageHeight, setPageHeight] = useState(720);
  const [connectionHost, setConnectionHost] = useState<Element | null>(null);
  useEffect(() => { if (repositoryId && !windowMode) setConnectionHost(document.querySelector('[data-editor-canvas]')); }, [repositoryId, windowMode]);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [geometry, setGeometry] = useState<SourceSelection | null>(null);
  const [destination, setDestination] = useState<SourceSelection | null>(null);
  const destinationRef = useRef(destinationMode); destinationRef.current = destinationMode;
  const destinationCallback = useRef(onDestination); destinationCallback.current = onDestination;
  const readyRef = useRef(false);
  const syncFailed = useRef(false);
  const [framework, setFramework] = useState('Checking project…');
  const session = useRef('');
  const documentUrl = useRef('');
  const selected = useRef<SourceSelection | null>(null);
  const autoConnected = useRef(false);
  const modeRef = useRef(browseMode); modeRef.current = browseMode;
  const props = useRef({ blocked, onSelect, onNotice, onClearSelection, onLayers, onGeometry, onReady, onViewport, onText }); props.current = { blocked, onSelect, onNotice, onClearSelection, onLayers, onGeometry, onReady, onViewport, onText };
  const requests = useRef(new Map<string, { resolve(selection?: SourceSelection): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }> () );
  useEffect(() => {
    if (repositoryId || windowMode || !ready) return;
    const iframe = frame.current, doc = iframe?.contentDocument;
    const root = doc?.querySelector<HTMLElement>('[data-source-canvas-root]');
    if (!iframe || !doc || !root) return;
    let animation = 0, active = true;
    const oldOverflow = doc.documentElement.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    const measure = () => {
      cancelAnimationFrame(animation);
      animation = requestAnimationFrame(() => {
        if (!active) return;
        const height = Math.max(240, Math.min(60000, Math.ceil(Math.max(root.scrollHeight, root.getBoundingClientRect().height))));
        setPageHeight(previous => Math.abs(previous - height) < 2 ? previous : height);
      });
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = iframe.getBoundingClientRect(), scale = box.width / iframe.clientWidth;
      iframe.dispatchEvent(new CustomEvent('slightnudge:canvas-wheel', { bubbles: true, detail: { deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode, ctrlKey: event.ctrlKey, metaKey: event.metaKey, clientX: box.left + event.clientX * scale, clientY: box.top + event.clientY * scale } }));
    };
    const observer = new ResizeObserver(measure); observer.observe(root);
    const changes = new MutationObserver(measure); changes.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
    doc.addEventListener('load', measure, true); doc.addEventListener('wheel', wheel, { passive: false });
    void doc.fonts.ready.then(measure); measure();
    return () => { active = false; cancelAnimationFrame(animation); observer.disconnect(); changes.disconnect(); doc.removeEventListener('load', measure, true); doc.removeEventListener('wheel', wheel); doc.documentElement.style.overflow = oldOverflow; };
  }, [url, ready, repositoryId, windowMode, documentRevision]);
  useEffect(() => {
    if (!repositoryId) {
      setPageHeight(720);
      session.current = crypto.randomUUID(); readyRef.current = false; setReady(false); setGeometry(null);
      const next = new URL(`/studio/preview/${encodeURIComponent(localPageId || 'fixture-1')}`, window.location.origin);
      next.searchParams.set('__slightnudge_parent', window.location.origin); next.searchParams.set('__slightnudge_session', session.current);
      if (!windowMode) next.searchParams.set('__slightnudge_canvas', '1');
      documentUrl.current = next.toString(); setUrl(next.toString()); return;
    }
    let active = true;
    fetch(`/api/slightnudge/repositories/${encodeURIComponent(repositoryId)}`).then(async response => {
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not inspect project compatibility.');
      if (!active) return;
      setFramework(data.framework);
      if (data.framework !== 'Next.js') setError(`${data.framework} source mapping is unsupported. No source changes are available.`);
    }).catch(cause => { if (active) { setFramework('Unavailable'); setError(cause.message); } });
    return () => { active = false; };
  }, [repositoryId, localPageId, windowMode]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!url || event.origin !== new URL(url).origin || event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      if (message?.channel !== 'slightnudge' || message.session !== session.current) return;
      if (!windowMode && repositoryId && message.repositoryId === repositoryId) {
        if (message.type === 'source-canvas-size' && Number.isInteger(message.height) && message.height >= 240 && message.height <= 60000) { setPageHeight(message.height); return; }
        if (message.type === 'source-canvas-wheel') {
          const iframe = frame.current, box = iframe?.getBoundingClientRect();
          if (!iframe || !box || !Number.isFinite(message.clientX) || !Number.isFinite(message.clientY) || Math.abs(message.clientX) > 20000 || Math.abs(message.clientY) > 60000) return;
          const scale = box.width / iframe.clientWidth;
          iframe.dispatchEvent(new CustomEvent('slightnudge:canvas-wheel', { bubbles: true, detail: { ...message, clientX: box.left + message.clientX * scale, clientY: box.top + message.clientY * scale } })); return;
        }
      }
      if (typeof message.pageUrl === 'string') {
        try { const currentDocument = new URL(message.pageUrl); if (currentDocument.origin === new URL(url).origin) documentUrl.current = currentDocument.toString(); } catch { /* Ignore invalid route metadata. */ }
      }
      if (message.type === 'bridge-ready') {
        if (continuousDraft && repositoryId && message.protocol !== SOURCE_CANVAS_PROTOCOL) { readyRef.current = false; setReady(false); setError('This project’s editing adapter needs an update. Open project setup, remove and enable source mapping, then restart its local dev server and reconnect.'); return; }
        if (continuousDraft && repositoryId && message.repositoryId !== repositoryId) { setError('This preview does not have the current adapter for this project. Update its source adapter in project setup, then reconnect.'); return; }
        frame.current?.contentWindow?.postMessage({ channel: 'slightnudge', session: session.current, type: 'bridge-ack' }, event.origin);
        if (acknowledgedSession.current === session.current && readyRef.current) return;
        acknowledgedSession.current = session.current;
        if (!syncFailed.current) { readyRef.current = true; const finish = () => { setReady(true); setError(''); props.current.onReady?.(); }; if (windowMode) void command('set-mode', null, { edit: !modeRef.current }).then(finish).catch(cause => setError(cause.message)); else finish(); }
        return;
      }
      if (message.type === 'source-route') { selected.current = null; setGeometry(null); props.current.onClearSelection(); return; }
      if (message.type === 'source-viewport' && Number.isInteger(message.width) && message.width > 0 && message.width <= 20000) { props.current.onViewport?.(message.width, typeof message.initialFontSize === 'number' && message.initialFontSize > 0 && message.initialFontSize < 1024 ? message.initialFontSize : undefined); return; }
      if (message.type === 'source-navigating') { readyRef.current = false; setReady(false); selected.current = null; setGeometry(null); props.current.onClearSelection(); return; }
      if (message.type === 'source-tree' && Array.isArray(message.layers) && message.layers.length <= 1000) { props.current.onLayers?.(message.layers); return; }
      if (message.type === 'destination-hover' && destinationRef.current) { setDestination(message.selection?.rect ? message.selection : null); return; }
      if (message.type === 'destination-picked' && destinationRef.current && message.selection?.rect && typeof message.selection.path === 'string' && Number.isInteger(message.selection.line) && Number.isInteger(message.selection.column)) { destinationCallback.current?.(message.selection); return; }
      if (message.type === 'selection-refused') { props.current.onNotice(typeof message.reason === 'string' ? message.reason : 'This source element cannot be selected uniquely.'); return; }
      if (message.type === 'source-rect' && message.selection?.rect) { selected.current = message.selection; setGeometry(message.selection); props.current.onGeometry?.(message.selection); return; }
      if (['text-draft', 'text-commit', 'text-cancel', 'text-request', 'save-request', 'shortcut'].includes(message.type)) { props.current.onText?.(message.type, message.selection, message.text ?? message.key, message.shift); return; }
      if (message.type === 'edit-result') {
        const request = requests.current.get(message.requestId);
        if (!request) return;
        clearTimeout(request.timer); requests.current.delete(message.requestId);
        if (message.success === true) request.resolve(message.selection); else request.reject(new Error(message.reason || 'The live page could not verify this preview.'));
        return;
      }
      if (message.type !== 'source-selection' || modeRef.current || props.current.blocked && Boolean(repositoryId) && !continuousDraft || !readyRef.current || syncFailed.current) return;
      const value = message.selection;
      if (!value || typeof value.path !== 'string' || value.path.length > 1000 || !Number.isSafeInteger(value.line) || value.line < 1 || !Number.isSafeInteger(value.column) || value.column < 1 || !value.computed || typeof value.className !== 'string' || typeof value.tagName !== 'string') return;
      if (value.tagName !== value.sourceTagName) { selected.current = null; props.current.onClearSelection(); props.current.onNotice('The clicked element has no exact source marker. Nothing was changed.'); return; }
      selected.current = value; setGeometry(value); props.current.onSelect(value);
    };
    window.addEventListener('message', receive);
    return () => { window.removeEventListener('message', receive); };
  }, [url, repositoryId, continuousDraft, windowMode]);
  useEffect(() => { if ((windowMode || !repositoryId) && ready) { void command('set-mode', null, { edit: !browseMode, destination: destinationMode }).catch(cause => props.current.onNotice(cause.message)); if (browseMode) { selected.current = null; setGeometry(null); props.current.onClearSelection(); } } if (!destinationMode) setDestination(null); }, [browseMode, ready, windowMode, destinationMode, repositoryId]);
  useEffect(() => () => {
    for (const request of requests.current.values()) { clearTimeout(request.timer); request.reject(new Error('The project preview closed.')); }
    requests.current.clear();
  }, []);

  const command: SourceCanvasHandle['command'] = (operation, selection, extra = {}) => {
      return new Promise<SourceSelection | undefined>((resolve, reject) => {
        if (!url || !frame.current?.contentWindow) { reject(new Error('Connect the project preview first.')); return; }
        const requestId = crypto.randomUUID();
        const hydrationOperation = ['begin-text', 'preview', 'restore', 'check', 'verify-batch', 'verify-document'].includes(operation);
        const timer = setTimeout(() => { requests.current.delete(requestId); reject(new Error('The live page did not acknowledge this operation.')); }, operation === 'verify' ? 1500 : hydrationOperation ? 15000 : 5000);
        requests.current.set(requestId, { resolve, reject, timer });
        frame.current.contentWindow.postMessage({ channel: 'slightnudge', session: session.current, type: 'source-edit', requestId, operation, selection, ...extra }, new URL(url).origin);
      });
    };
  useImperativeHandle(ref, () => ({
    command,
    openWindow,
    async reload(selection, expectedClass, expectedText, expectedBatch) {
      // Recovery can finish before this newly mounted window has connected.
      // There is no document to reload yet; release the operation so the
      // deferred automatic connection can run and show the current source.
      if (!url || !frame.current?.contentWindow) throw new Error('The source operation is recorded. Connect the local preview to verify it.');
      selected.current = null;
      setGeometry(null);
      syncFailed.current = false;
      const refreshDeadline = Date.now() + 30000;
      for (let attempt = 0; attempt < 5 && Date.now() < refreshDeadline; attempt++) {
        const instanceTextPatches = expectedBatch?.filter(patch => typeof patch.text === 'string' && (patch.after.instance || patch.text.length > 0) && !patch.nextImage);
        if (repositoryId && instanceTextPatches?.length) {
          try { await command('verify-document', null, { patches: instanceTextPatches }); }
          catch {
            await new Promise(resolve => setTimeout(resolve, Math.min(4000, 500 * 2 ** attempt, Math.max(0, refreshDeadline - Date.now()))));
            continue;
          }
        }
        readyRef.current = false; setReady(false); session.current = crypto.randomUUID();
        setUrl(current => { if (!current) return current; const next = new URL(documentUrl.current || current); next.searchParams.set('__slightnudge_parent', window.location.origin); next.searchParams.set('__slightnudge_session', session.current); next.searchParams.set('__slightnudge_refresh', crypto.randomUUID()); return next.toString(); });
        // Give this navigation time to finish a development rebuild. Starting
        // another navigation after two seconds can repeatedly cancel a healthy
        // page before its bridge has loaded, especially on a cold compilation.
        const readyDeadline = Math.min(refreshDeadline, Date.now() + 15000);
        while (!readyRef.current && Date.now() < readyDeadline) await new Promise(resolve => setTimeout(resolve, 50));
        if (!readyRef.current) continue;
        if (!expectedBatch && (!selection || (expectedClass === undefined && expectedText === undefined))) return;
        // A ready document can still be the prior compiled revision. Request a
        // fresh document after a short backoff instead of repeatedly checking
        // immutable stale HTML. Never replace a navigation before readiness.
        try { if (expectedBatch) await command('verify-batch', null, { patches: expectedBatch }); else await command('verify', selection, { expectedClass, expectedText }); return; }
        catch {
          const backoff = Math.min(4000, 500 * 2 ** attempt, Math.max(0, refreshDeadline - Date.now()));
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
      syncFailed.current = true; readyRef.current = false; setReady(false);
      const message = 'The source operation succeeded, but the live page has not rendered that revision yet. Reconnect its preview before editing again.';
      setError(message); throw new Error(message);
    },
  }), [url, repositoryId]);

  async function connectTo(address: string) {
    if (!repositoryId || blocked || loading || framework !== 'Next.js') return;
    setLoading(true); setError('');
    try {
      const token = await getClientSessionToken();
      let data: { url?: string; error?: string } | undefined;
      // Only retry the read-only connection probe, never Save or Undo. A
      // restarted Next server can be listening while its route still rebuilds.
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(repositoryId)}/preview-check`, {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ url: address }),
        });
        data = await readApiJson(response);
        if (response.ok) break;
        if ((response.status === 502 || response.status === 504) && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); continue; }
        throw new Error(data?.error || 'Could not connect to the project.');
      }
      if (!data?.url) throw new Error('The local preview did not return a valid address.');
      const next = new URL(data.url); session.current = crypto.randomUUID();
      try { sessionStorage.setItem(`slightnudge:preview-url:${repositoryId}`, data.url); } catch {}
      documentUrl.current = next.toString();
      syncFailed.current = false;
      setReady(false);
      next.searchParams.set('__slightnudge_session', session.current); next.searchParams.set('__slightnudge_parent', window.location.origin);
      if (continuousDraft) next.searchParams.set('__slightnudge_draft', '1');
      if (!windowMode) next.searchParams.set('__slightnudge_canvas', '1');
      else next.searchParams.delete('__slightnudge_canvas');
      setPageHeight(720);
      setUrl(next.toString());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect.'); }
    finally { setLoading(false); }
  }
  function connect(event: React.FormEvent) { event.preventDefault(); void connectTo(input); }
  useEffect(() => {
    // A temporarily blocked recovery operation must not consume the one-time
    // connection attempt before connectTo is actually allowed to run.
    if (!repositoryId || framework !== 'Next.js' || autoConnected.current || blocked || loading) return;
    if (url) { autoConnected.current = true; return; }
    let address = new URLSearchParams(window.location.search).get('preview');
    try { address ||= sessionStorage.getItem(`slightnudge:preview-url:${repositoryId}`); } catch {}
    if (address) { autoConnected.current = true; setInput(address); void connectTo(address); }
  }, [windowMode, repositoryId, framework, blocked, loading, url]);
  useEffect(() => {
    if (!url || ready) return;
    const timer = setTimeout(() => { if (!syncFailed.current) setError('The page has not connected yet. Check that its local server and source adapter are running, then reconnect.'); }, 45000);
    return () => clearTimeout(timer);
  }, [url, ready]);
  useEffect(() => {
    setElapsed(0);
    if (ready || (!loading && !url)) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [loading, ready, url]);
  function retryPreview() {
    if (blocked || loading || ready) return;
    setError('');
    if (repositoryId) { void connectTo(input); return; }
    const next = new URL(url);
    session.current = crypto.randomUUID();
    next.searchParams.set('__slightnudge_session', session.current);
    documentUrl.current = next.toString();
    syncFailed.current = false;
    setUrl(next.toString());
  }
  const previewStatus = !ready && (url || loading) && (
    <div role="status" aria-label="Preview connection status" className={windowMode ? windowStyles.status : 'text-xs text-slate-500'}>
      {elapsed >= 60 ? 'The preview may still be compiling. Check the local server and source adapter.' : 'Connecting to the preview…'} {elapsed}s elapsed
      {elapsed >= 60 && <button type="button" className="pointer-events-auto ml-2 underline" disabled={blocked || loading} onClick={retryPreview}>Retry preview</button>}
    </div>
  );
  function openWindow() {
    if (props.current.blocked || !readyRef.current) return;
    let target = '/studio/window';
    if (repositoryId) {
      const address = new URL(documentUrl.current || url);
      ['__slightnudge_session', '__slightnudge_parent', '__slightnudge_refresh', '__slightnudge_draft', '__slightnudge_canvas'].forEach(key => address.searchParams.delete(key));
      target = `/studio/${encodeURIComponent(repositoryId)}/window?preview=${encodeURIComponent(address.toString())}`;
    }
    if (!window.open(target, `slightnudge-${repositoryId || 'local'}`, 'popup,width=1440,height=960')) props.current.onNotice('Allow pop-ups for SlightNudge to open your editing window.');
  }

  const connection = repositoryId && <form onSubmit={connect} className={windowMode ? `${windowStyles.connection} ${url ? windowStyles.connected : ''}` : canvasStyles.form} onClick={event => event.stopPropagation()}>
      {windowMode && !url && <><strong>Open your local preview</strong><p>Your site, with editing tools on top. Changes stay in your local project.</p></>}
      <label className="text-slate-500" htmlFor="source-preview-url">Project URL</label>
      <input id="source-preview-url" value={input} onChange={event => setInput(event.target.value)} disabled={blocked || loading || framework !== 'Next.js'} className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2" />
      <button disabled={blocked || loading || framework !== 'Next.js'} className="rounded-md border border-slate-200 bg-white px-3 py-2">{loading ? 'Connecting…' : 'Connect'}</button>
      {!windowMode && ready && <button type="button" disabled={blocked} onClick={openWindow} className="rounded-md border border-slate-200 bg-white px-3 py-2">Open editing window ↗</button>}
    </form>;
  return <section className={windowMode ? windowStyles.canvas : 'w-full flex flex-col gap-3'} aria-label="Actual project preview" data-source-ready={ready} data-source-key={geometry?.key}>
    {repositoryId && !windowMode && connectionHost ? createPortal(<div className={canvasStyles.connection} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
      <details open={!url}><summary>{ready ? 'Preview connected' : 'Connect local preview'}</summary>{connection}</details>
      {error && <p role="alert">{error}</p>}
      {previewStatus}
    </div>, connectionHost) : connection}
    {error && (windowMode || !repositoryId) && <p role="alert" className={windowMode ? windowStyles.error : 'text-xs text-red-700'}>{error}</p>}
    {(windowMode || !repositoryId || !connectionHost) && previewStatus}
    {url && windowMode && ready && <p role="status" className={windowStyles.status}>Live source connected</p>}
    {url && <div data-selection-artboard className={windowMode ? windowStyles.artboard : 'relative mx-auto'} style={{ width, flexShrink: 0, maxWidth: width === '100%' ? '100%' : undefined }}>
      <iframe ref={frame} title="Actual project" src={url} onLoad={() => setDocumentRevision(value => value + 1)} scrolling={!windowMode ? 'no' : undefined} inert={!ready} tabIndex={ready ? 0 : -1} className="block w-full border-0 bg-white" style={{ height: windowMode ? '100dvh' : pageHeight, pointerEvents: ready ? 'auto' : 'none' }} />
      {geometry && ready && renderSelection && <div className="absolute pointer-events-none" style={{ inset: 0, overflow: 'clip' }}><div style={{ position: 'absolute', top: geometry.rect.top, left: geometry.rect.left, width: geometry.rect.width, height: geometry.rect.height }}>{renderSelection(geometry)}</div></div>}
      {destinationMode && destination && ready && <div className={windowStyles.destinationTarget} aria-label="Move destination preview" style={{ top: destination.rect.top, left: destination.rect.left, width: destination.rect.width, height: destination.rect.height }}><span>Move to end</span><i/></div>}
    </div>}
  </section>;
});
