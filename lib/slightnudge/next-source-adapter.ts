import { lstat, mkdir, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { resolveRepositoryRoot } from './repository-store';
import { getSourceCanvasBridge } from './source-canvas-bridge';
import { SOURCE_CANVAS_PROTOCOL } from './source-canvas-contract';

const adapterDirectoryName = '.slightnudge-source-adapter';
const stateFileName = 'state.json';
const generatedConfigMarker = 'slightnudge-source-adapter';

export function getBridgeClient(targetRepositoryId = '') {
  return `${getSourceCanvasBridge(false, targetRepositoryId)}\n
(() => {
  if (typeof window === 'undefined') return;
  if (window.__slightnudge_bridge_active) return;
  window.__slightnudge_bridge_active = true;

  const currentUrl = new URL(window.location.href);
  const session = currentUrl.searchParams.get('__slightnudge_session');
  const parentOrigin = currentUrl.searchParams.get('__slightnudge_parent');
  const isEmbedded = Boolean(session && parentOrigin && window.parent !== window);

  let parsedParent = null;
  if (isEmbedded) {
    try { parsedParent = new URL(parentOrigin); } catch { return; }
    if (!['http:', 'https:'].includes(parsedParent.protocol) || parsedParent.origin !== parentOrigin) return;
  }

  // --- EMBEDDED IFRAME MODE ---
  if (isEmbedded) {
    let selected = null;
    let pending = null;
    document.addEventListener('submit', event => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
    const indicator = document.createElement('div');
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.cssText = 'all:initial;position:fixed;pointer-events:none;z-index:2147483645;border:1px solid #16845b;border-radius:2px;box-sizing:border-box;';
    const measuredProperties = ['fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'color', 'backgroundColor', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderRadius', 'display', 'width', 'maxWidth'];
    const propertyNames = { fontSize: 'fontSize', fontWeight: 'fontWeight', fontFamily: 'fontFamily', fontStyle: 'fontStyle', lineHeight: 'lineHeight', letterSpacing: 'letterSpacing', alignment: 'textAlign', textColor: 'color', backgroundColor: 'backgroundColor', padding: 'paddingTop', borderRadius: 'borderRadius', display: 'display', width: 'width', maxWidth: 'maxWidth', marginLeft: 'marginLeft', marginTop: 'marginTop' };
    function send(type, target, clicked) {
      if (!target?.isConnected) return;
      const marker = target.closest('[data-source-file]');
      if (!marker) return;
      const rect = marker.getBoundingClientRect();
      if (!indicator.isConnected) document.body.append(indicator);
      Object.assign(indicator.style, { top: rect.top + 'px', left: rect.left + 'px', width: rect.width + 'px', height: rect.height + 'px' });
      const clickedEl = (clicked instanceof Element && clicked.isConnected) ? clicked : marker;
      const clickedRect = clickedEl.getBoundingClientRect();
      const selection = {
        path: marker.dataset.sourceFile,
        line: Number(marker.dataset.sourceLine),
        column: Number(marker.dataset.sourceColumn),
        tagName: clickedEl.tagName.toLowerCase(),
        sourceTagName: marker.tagName.toLowerCase(),
        elementId: marker.id || undefined,
        className: typeof clickedEl.className === 'string' ? clickedEl.className : '',
        textContent: marker.textContent || '',
        imageSource: marker instanceof HTMLImageElement ? marker.getAttribute('src') || '' : undefined,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        clickedRect: { top: clickedRect.top, left: clickedRect.left, width: clickedRect.width, height: clickedRect.height },
        computed: Object.fromEntries(measuredProperties.map(key => [key, getComputedStyle(marker)[key]])),
      };
      if (!selection.path || !Number.isSafeInteger(selection.line) || !Number.isSafeInteger(selection.column)) return;
      window.parent.postMessage({ channel: 'slightnudge', type, session, selection, pageUrl: window.location.href }, parentOrigin);
    }

    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const marker = event.target.closest('[data-source-file]');
      if (!marker) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (pending) return;
      selected = marker;
      send('source-selection', marker, event.target);
    }, true);

    window.addEventListener('message', (event) => {
      if (event.origin !== parentOrigin || event.source !== window.parent) return;
      const message = event.data;
      if (message?.channel === 'slightnudge' && message.session === session && message.type === 'source-edit') {
        const reply = (success, reason = '') => window.parent.postMessage({ channel: 'slightnudge', session, type: 'edit-result', requestId: message.requestId, success, reason }, parentOrigin);
        const target = message.selection;
        if (message.operation === 'verify' && target && (typeof message.expectedClass === 'string' || typeof message.expectedText === 'string')) {
          const matches = Array.from(document.querySelectorAll('[data-source-file]')).filter(element => element.getAttribute('data-source-file') === target.path && Number(element.getAttribute('data-source-line')) === target.line && Number(element.getAttribute('data-source-column')) === target.column);
          reply(matches.length === 1 && (typeof message.expectedClass !== 'string' || matches[0].getAttribute('class') === message.expectedClass) && (typeof message.expectedText !== 'string' || matches[0].textContent === message.expectedText), 'The project is still rendering an older source revision.'); return;
        }
        if (!selected?.isConnected || !target || target.path !== selected.dataset.sourceFile || target.line !== Number(selected.dataset.sourceLine) || target.column !== Number(selected.dataset.sourceColumn)) { reply(false, 'The selected element changed. Reload and select it again.'); return; }
        if (message.operation !== 'discard') {
          const instances = Array.from(document.querySelectorAll('[data-source-file]')).filter(element => element.getAttribute('data-source-file') === target.path && Number(element.getAttribute('data-source-line')) === target.line && Number(element.getAttribute('data-source-column')) === target.column);
          if (instances.length !== 1) { reply(false, 'This source element appears more than once on the page. Editing shared instances is not supported yet. Nothing was changed.'); return; }
        }
        const intact = () => pending && pending.element === selected && selected.getAttribute('class') === pending.afterClass && (pending.kind !== 'text' || selected.innerHTML === pending.afterHTML) && selected.getAttribute('style') === pending.style;
        if (message.operation === 'check') { reply(Boolean(intact()), 'The page changed after preview. Reload and select again.'); return; }
        if (message.operation === 'discard') {
          if (!intact()) { reply(false, 'The page changed after preview. Reload to restore the actual page.'); return; }
          if (pending.beforeClass === null) selected.removeAttribute('class'); else selected.setAttribute('class', pending.beforeClass);
          if (pending.kind === 'text') selected.textContent = pending.beforeText;
          pending = null; send('source-rect', selected); reply(true); return;
        }
        if (message.operation !== 'preview' || pending) { reply(false, 'Apply or discard the current preview first.'); return; }
        const beforeClass = selected.getAttribute('class');
        const beforeText = selected.textContent;
        const style = selected.getAttribute('style');
        if (message.kind === 'text') {
          if (selected.children.length || typeof message.value !== 'string' || message.value.length > 2000) { reply(false, 'Only plain text without child elements can be previewed safely.'); return; }
          selected.textContent = message.value;
        } else {
          const property = propertyNames[message.property];
          if (!property || typeof message.value !== 'string' || message.value.length > 1200 || typeof message.utility !== 'string' || message.utility.includes(':')) { reply(false, 'This style cannot yet be verified in the actual page. Nothing was changed.'); return; }
          const before = getComputedStyle(selected)[property];
          const probe = document.createElement('span'); probe.className = message.utility; probe.style.position = 'fixed'; probe.style.visibility = 'hidden'; document.body.append(probe);
          const expected = getComputedStyle(probe)[property]; probe.remove();
          selected.className = message.value;
          const actual = getComputedStyle(selected)[property];
          if (actual !== expected || actual === before) {
            if (beforeClass === null) selected.removeAttribute('class'); else selected.setAttribute('class', beforeClass);
            reply(false, 'The project styling overrides this change, or its utility is unavailable. Nothing was changed.'); return;
          }
        }
        pending = { element: selected, beforeClass, beforeText, kind: message.kind, afterClass: selected.getAttribute('class'), afterHTML: selected.innerHTML, style };
        send('source-rect', selected); reply(true); return;
      }
      if (!selected || !message || message.channel !== 'slightnudge' || message.session !== session || message.type !== 'preview-change') return;
      const target = message.selection;
      if (!target || target.path !== selected.dataset.sourceFile || Number(target.line) !== Number(selected.dataset.sourceLine) || Number(target.column) !== Number(selected.dataset.sourceColumn)) return;
      if (!selected.isConnected) {
        selected = Array.from(document.querySelectorAll('[data-source-file]')).find((element) =>
          element.getAttribute('data-source-file') === target.path && Number(element.getAttribute('data-source-line')) === Number(target.line) && Number(element.getAttribute('data-source-column')) === Number(target.column),
        ) || null;
        if (!selected) return;
      }
      if (message.property === 'className' && typeof message.value === 'string' && message.value.length <= 1200) selected.className = message.value;
      if (message.property === 'textContent' && typeof message.value === 'string' && message.value.length <= 2000) selected.textContent = message.value;
      if (message.property === 'imageSource' && selected instanceof HTMLImageElement && typeof message.value === 'string' && /^\\/slightnudge-assets\\/[a-f0-9-]{36}\\.(?:png|jpe?g|webp|gif)$/i.test(message.value)) selected.setAttribute('src', message.value);
      if (message.property === 'reorder') {
        if (message.direction === 'earlier') {
          const prev = selected.previousElementSibling;
          if (prev) prev.before(selected);
        } else if (message.direction === 'later') {
          const next = selected.nextElementSibling;
          if (next) next.after(selected);
        }
      }
      send('source-rect', selected);
    });

    window.addEventListener('scroll', () => { if (selected) send('source-rect', selected); }, { passive: true });
    window.addEventListener('resize', () => { if (selected) send('source-rect', selected); }, { passive: true });
    const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => window.parent.postMessage({ channel: 'slightnudge', session, type: 'bridge-ready' }, parentOrigin)));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
    return;
  }

  // --- STANDALONE IN-SITU FOCUS MODE (Direct on localhost dev port) ---
  const defaultRepo = "${targetRepositoryId}" || currentUrl.searchParams.get('__slightnudge_repo') || '';
  let backendOrigin = currentUrl.searchParams.get('__slightnudge_backend') || 'http://localhost:3000';

  let inspectActive = true;
  let selectedElement = null;
  let hoveredElement = null;
  let originalSnapshot = null;
  let pendingEdit = null;
  let inspectedData = null;
  let canUndoState = false;
  let undoTarget = null;
  let undoNeedsCheck = false;
  let undoBusy = false;
  let activeTab = 'style';

  // Create isolated Shadow DOM root
  const container = document.createElement('div');
  container.id = '__slightnudge_root';
  container.style.cssText = 'all: initial; position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';
  document.documentElement.appendChild(container);
  const shadow = container.attachShadow({ mode: 'open' });

  // Stylesheet
  const styleEl = document.createElement('style');
  styleEl.textContent = \`
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .sn-box { pointer-events: auto; }
    
    .sn-hover-outline {
      position: fixed; pointer-events: none; z-index: 2147483640;
      border: 1.5px dashed #10b981; background: rgba(16, 185, 129, 0.06);
      border-radius: 4px; transition: all 70ms ease-out;
    }
    .sn-hover-badge {
      position: absolute; top: -22px; left: 0;
      background: #0f172a; color: #34d399; font-size: 11px; font-weight: 600;
      padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4);
      white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    
    .sn-selected-outline {
      position: fixed; pointer-events: none; z-index: 2147483641;
      border: 2px solid #10b981; box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.25);
      border-radius: 4px; transition: all 120ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sn-selected-badge {
      position: absolute; bottom: -24px; left: 0;
      background: #10b981; color: #064e3b; font-size: 11px; font-weight: 700;
      padding: 2px 8px; border-radius: 4px; white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .sn-dock {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px;
      box-shadow: 0 20px 45px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
      color: #f1f5f9; font-size: 13px; z-index: 2147483647;
      display: flex; flex-direction: column; overflow: hidden;
      transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
      min-width: 320px; max-width: 680px; width: auto;
    }
    
    .sn-bar-compact {
      display: flex; align-items: center; gap: 10px; padding: 7px 14px;
    }
    .sn-brand {
      display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 12px;
      color: #f8fafc; letter-spacing: -0.01em;
    }
    .sn-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .sn-btn {
      appearance: none; border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.06); color: #e2e8f0;
      padding: 5px 11px; border-radius: 8px; font-size: 11.5px; font-weight: 600;
      cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
      transition: all 120ms ease; outline: none; user-select: none;
    }
    .sn-btn:hover { background: rgba(255, 255, 255, 0.12); border-color: rgba(255, 255, 255, 0.25); color: #fff; }
    .sn-btn.is-active { background: #10b981; color: #022c22; border-color: #10b981; font-weight: 700; }
    .sn-btn.is-primary { background: #10b981; color: #022c22; border-color: #10b981; }
    .sn-btn.is-primary:hover { background: #34d399; }
    .sn-btn.is-danger { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }
    .sn-btn.is-danger:hover { background: rgba(239, 68, 68, 0.25); color: #fff; }
    .sn-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .sn-focus-panel {
      border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 16px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .sn-header-row {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .sn-target-badge {
      display: flex; align-items: center; gap: 8px; font-size: 12px;
    }
    .sn-tag-pill {
      background: rgba(16, 185, 129, 0.18); color: #34d399;
      padding: 2px 7px; border-radius: 5px; font-family: monospace; font-size: 11.5px; font-weight: 700;
    }
    .sn-loc-pill {
      color: #94a3b8; font-family: monospace; font-size: 11px;
    }
    .sn-status-badge {
      font-size: 11px; padding: 2px 7px; border-radius: 5px; font-weight: 600;
    }
    .sn-status-verified { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .sn-status-unsafe { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

    .sn-tabs {
      display: flex; gap: 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;
    }
    .sn-tab-btn {
      appearance: none; background: transparent; border: none; color: #94a3b8;
      font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 6px;
      cursor: pointer; transition: all 120ms ease;
    }
    .sn-tab-btn:hover { color: #f1f5f9; background: rgba(255, 255, 255, 0.05); }
    .sn-tab-btn.is-active { color: #10b981; background: rgba(16, 185, 129, 0.12); }

    .sn-tab-body { display: flex; flex-direction: column; gap: 10px; }
    .sn-chips-row {
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    }
    .sn-chip-group-label {
      font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; font-weight: 700; width: 100%; margin-top: 2px;
    }
    .sn-chip {
      appearance: none; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1; font-size: 11px; padding: 3px 8px; border-radius: 6px; cursor: pointer;
      transition: all 100ms ease; font-family: monospace;
    }
    .sn-chip:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
    .sn-chip.is-selected { background: #10b981; color: #022c22; font-weight: 700; border-color: #10b981; }

    .sn-text-input {
      width: 100%; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px; color: #f8fafc; font-size: 12.5px; padding: 8px 10px; resize: vertical;
      min-height: 48px; max-height: 120px; outline: none; font-family: inherit;
    }
    .sn-text-input:focus { border-color: #10b981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }

    .sn-action-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .sn-summary-chip {
      display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #94a3b8;
    }
    .sn-pending-badge {
      display: inline-flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.15);
      color: #34d399; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
    }
  \`;
  shadow.appendChild(styleEl);

  const hoverOutline = document.createElement('div');
  hoverOutline.className = 'sn-hover-outline';
  hoverOutline.style.display = 'none';
  const hoverBadge = document.createElement('div');
  hoverBadge.className = 'sn-hover-badge';
  hoverOutline.appendChild(hoverBadge);
  shadow.appendChild(hoverOutline);

  const selectedOutline = document.createElement('div');
  selectedOutline.className = 'sn-selected-outline';
  selectedOutline.style.display = 'none';
  const selectedBadge = document.createElement('div');
  selectedBadge.className = 'sn-selected-badge';
  selectedOutline.appendChild(selectedBadge);
  shadow.appendChild(selectedOutline);

  const dock = document.createElement('div');
  dock.className = 'sn-dock sn-box';
  shadow.appendChild(dock);

  function updateOverlays() {
    if (hoveredElement && hoveredElement.isConnected) {
      const r = hoveredElement.getBoundingClientRect();
      hoverOutline.style.display = 'block';
      hoverOutline.style.top = r.top + 'px';
      hoverOutline.style.left = r.left + 'px';
      hoverOutline.style.width = r.width + 'px';
      hoverOutline.style.height = r.height + 'px';
      hoverBadge.textContent = '<' + hoveredElement.tagName.toLowerCase() + '> ' + (hoveredElement.dataset.sourceLine ? ':' + hoveredElement.dataset.sourceLine : '');
    } else {
      hoverOutline.style.display = 'none';
    }

    if (selectedElement && selectedElement.isConnected) {
      const r = selectedElement.getBoundingClientRect();
      selectedOutline.style.display = 'block';
      selectedOutline.style.top = r.top + 'px';
      selectedOutline.style.left = r.left + 'px';
      selectedOutline.style.width = r.width + 'px';
      selectedOutline.style.height = r.height + 'px';
      selectedBadge.textContent = '<' + selectedElement.tagName.toLowerCase() + '> selected';
    } else {
      selectedOutline.style.display = 'none';
    }
  }

  window.addEventListener('scroll', updateOverlays, { passive: true });
  window.addEventListener('resize', updateOverlays, { passive: true });

  document.addEventListener('mousemove', (e) => {
    if (e.composedPath().includes(container)) return;
    if (!inspectActive || !(e.target instanceof Element)) return;
    const marker = e.target.closest('[data-source-file]');
    if (marker !== hoveredElement) {
      hoveredElement = marker;
      updateOverlays();
    }
  }, true);

  document.addEventListener('click', (e) => {
    // Shadow events are retargeted to our host. On a mapped <html> element,
    // closest() would select the document and swallow our own controls.
    if (e.composedPath().includes(container)) return;
    if (!(e.target instanceof Element)) return;
    const isAltClick = e.altKey;
    if (!inspectActive && !isAltClick) return;

    const marker = e.target.closest('[data-source-file]');
    if (!marker) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    selectTarget(marker);
  }, true);

  async function selectTarget(marker) {
    selectedElement = marker;
    originalSnapshot = {
      className: marker.className,
      textContent: marker.textContent,
      parent: marker.parentElement,
      nextSibling: marker.nextSibling,
    };
    pendingEdit = null;
    inspectedData = null;
    updateOverlays();
    renderDock();

    const rect = marker.getBoundingClientRect();
    const payload = {
      path: marker.dataset.sourceFile,
      line: Number(marker.dataset.sourceLine),
      column: Number(marker.dataset.sourceColumn),
      tagName: marker.tagName.toLowerCase(),
      className: typeof marker.className === 'string' ? marker.className : '',
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    };

    try {
      const inspectUrl = defaultRepo
        ? \`\${backendOrigin}/api/slightnudge/repositories/\${encodeURIComponent(defaultRepo)}/inspect\`
        : \`\${backendOrigin}/api/slightnudge/inspect\`;
      const res = await fetch(inspectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultRepo ? payload : { filePath: payload.path, ...payload }),
      });
      if (res.ok) {
        inspectedData = await res.json();
        if (!undoNeedsCheck && !undoBusy) {
          undoTarget = inspectedData.undoTarget ? { ...inspectedData.undoTarget, sourcePath: payload.path } : null;
          canUndoState = Boolean(undoTarget);
        }
        renderDock();
      }
    } catch (err) {
      console.warn('[SlightNudge In-Situ] Could not inspect source:', err);
    }
  }

  async function previewChange(kind, payload) {
    if (!selectedElement || undoNeedsCheck || undoBusy) return;
    const sourcePath = selectedElement.dataset.sourceFile;
    const line = Number(selectedElement.dataset.sourceLine);
    const column = Number(selectedElement.dataset.sourceColumn);

    const body = {
      kind,
      repositoryId: defaultRepo || undefined,
      sourcePath: defaultRepo ? sourcePath : undefined,
      filePath: defaultRepo ? undefined : sourcePath,
      line,
      column,
      tagName: selectedElement.tagName.toLowerCase(),
      className: selectedElement.className,
      ...payload,
    };

    try {
      const res = await fetch(\`\${backendOrigin}/api/slightnudge/preview\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        pendingEdit = { id: data.id, summary: data.summary, kind, sourcePath };
        if (kind === 'style' && payload.value) {
          const classes = selectedElement.className.split(/\\s+/).filter(Boolean);
          const nextClasses = classes.filter((c) => !c.startsWith(payload.value.split('-')[0] + '-'));
          nextClasses.push(payload.value);
          selectedElement.className = nextClasses.join(' ');
        } else if (kind === 'text' && typeof payload.value === 'string') {
          selectedElement.textContent = payload.value;
        } else if (kind === 'reorder') {
          if (payload.direction === 'earlier') {
            const prev = selectedElement.previousElementSibling;
            if (prev) prev.before(selectedElement);
          } else if (payload.direction === 'later') {
            const next = selectedElement.nextElementSibling;
            if (next) next.after(selectedElement);
          }
        }
        updateOverlays();
        renderDock();
      }
    } catch (err) {
      console.error('[SlightNudge In-Situ] Preview failed:', err);
    }
  }

  let cachedToken = null;
  async function getBridgeToken() {
    if (cachedToken) return cachedToken;
    try {
      const res = await fetch(\`\${backendOrigin}/api/slightnudge/token\`);
      if (res.ok) {
        const data = await res.json();
        cachedToken = data.token;
        return cachedToken;
      }
    } catch {}
    return '';
  }

  async function applyPending() {
    if (!pendingEdit || undoNeedsCheck || undoBusy) return;
    const accepted = pendingEdit;
    try {
      const token = await getBridgeToken();
      const res = await fetch(\`\${backendOrigin}/api/slightnudge/apply\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-slightnudge-token': token,
        },
        body: JSON.stringify({
          previewId: accepted.id,
          repositoryId: defaultRepo || undefined,
          sourcePath: accepted.sourcePath,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        undoTarget = { previewId: accepted.id, editId: data.editId, sourcePath: accepted.sourcePath };
        pendingEdit = null;
        canUndoState = true;
        renderDock();
      }
    } catch (err) {
      console.error('[SlightNudge In-Situ] Apply failed:', err);
    }
  }

  function discardPending() {
    if (!originalSnapshot || !selectedElement) return;
    selectedElement.className = originalSnapshot.className;
    selectedElement.textContent = originalSnapshot.textContent;
    if (originalSnapshot.parent && originalSnapshot.nextSibling) {
      originalSnapshot.parent.insertBefore(selectedElement, originalSnapshot.nextSibling);
    } else if (originalSnapshot.parent) {
      originalSnapshot.parent.appendChild(selectedElement);
    }
    pendingEdit = null;
    updateOverlays();
    renderDock();
  }

  async function undoLast() {
    if (!undoTarget || undoBusy || pendingEdit) return;
    const target = undoTarget;
    const checking = undoNeedsCheck;
    undoBusy = true;
    undoNeedsCheck = true;
    try {
      const token = await getBridgeToken();
      const res = await fetch(\`\${backendOrigin}/api/slightnudge/undo\${checking ? '/status' : ''}\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-slightnudge-token': token,
        },
        body: JSON.stringify({
          repositoryId: defaultRepo || undefined,
          sourcePath: defaultRepo ? target.sourcePath : undefined,
          filePath: defaultRepo ? undefined : target.sourcePath,
          previewId: target.previewId,
          editId: target.editId,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        pendingEdit = null;
        canUndoState = false;
        undoTarget = null;
        undoNeedsCheck = false;
      } else if (data.code === 'UNDO_NOT_APPLIED' || (!checking && res.status === 403)) {
        undoNeedsCheck = false;
        if (res.status === 403) cachedToken = null;
      }
    } catch (err) {
      console.error('[SlightNudge In-Situ] Undo failed:', err);
    } finally {
      undoBusy = false;
      renderDock();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (pendingEdit) discardPending();
      selectedElement = null;
      updateOverlays();
      renderDock();
    }
  });

  function renderDock() {
    dock.innerHTML = '';

    const bar = document.createElement('div');
    bar.className = 'sn-bar-compact';

    const brand = document.createElement('div');
    brand.className = 'sn-brand';
    brand.innerHTML = '<span class="sn-dot"></span> SlightNudge In-Situ';
    bar.appendChild(brand);

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'sn-btn ' + (inspectActive ? 'is-active' : '');
    toggleBtn.textContent = inspectActive ? '⌖ Inspect: ON' : '⌖ Inspect: OFF';
    toggleBtn.title = 'Toggle inspection mode (or hold Alt to click any element)';
    toggleBtn.onclick = () => {
      inspectActive = !inspectActive;
      hoveredElement = null;
      updateOverlays();
      renderDock();
    };
    bar.appendChild(toggleBtn);

    if (canUndoState) {
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'sn-btn';
      undoBtn.textContent = undoNeedsCheck ? 'Check Undo status' : '↺ Undo';
      undoBtn.disabled = undoBusy;
      undoBtn.onclick = () => undoLast();
      bar.appendChild(undoBtn);
    }

    if (selectedElement) {
      const deselectBtn = document.createElement('button');
      deselectBtn.type = 'button';
      deselectBtn.className = 'sn-btn';
      deselectBtn.textContent = '✕ Close';
      deselectBtn.onclick = () => {
        if (pendingEdit) discardPending();
        selectedElement = null;
        updateOverlays();
        renderDock();
      };
      bar.appendChild(deselectBtn);
    }

    dock.appendChild(bar);

    if (selectedElement) {
      const panel = document.createElement('div');
      panel.className = 'sn-focus-panel';

      const headerRow = document.createElement('div');
      headerRow.className = 'sn-header-row';

      const targetBadge = document.createElement('div');
      targetBadge.className = 'sn-target-badge';
      targetBadge.innerHTML = \`
        <span class="sn-tag-pill">&lt;\${selectedElement.tagName.toLowerCase()}&gt;</span>
        <span class="sn-loc-pill">\${selectedElement.dataset.sourceFile || ''}:\${selectedElement.dataset.sourceLine || ''}</span>
      \`;
      headerRow.appendChild(targetBadge);

      const statusBadge = document.createElement('span');
      statusBadge.className = 'sn-status-badge ' + (inspectedData?.safeToEdit !== false ? 'sn-status-verified' : 'sn-status-unsafe');
      statusBadge.textContent = inspectedData?.safeToEdit !== false ? '✓ Source verified' : (inspectedData?.refusalReason || 'Unsafe');
      headerRow.appendChild(statusBadge);

      panel.appendChild(headerRow);

      const tabs = document.createElement('div');
      tabs.className = 'sn-tabs';
      const isText = ['h1','h2','h3','h4','h5','h6','p','span','button','a','label','li'].includes(selectedElement.tagName.toLowerCase());
      
      const tabStyleBtn = document.createElement('button');
      tabStyleBtn.className = 'sn-tab-btn ' + (activeTab === 'style' ? 'is-active' : '');
      tabStyleBtn.textContent = 'Tailwind Styles';
      tabStyleBtn.onclick = () => { activeTab = 'style'; renderDock(); };
      tabs.appendChild(tabStyleBtn);

      if (isText) {
        const tabTextBtn = document.createElement('button');
        tabTextBtn.className = 'sn-tab-btn ' + (activeTab === 'text' ? 'is-active' : '');
        tabTextBtn.textContent = 'Edit Text';
        tabTextBtn.onclick = () => { activeTab = 'text'; renderDock(); };
        tabs.appendChild(tabTextBtn);
      }

      const tabArrangeBtn = document.createElement('button');
      tabArrangeBtn.className = 'sn-tab-btn ' + (activeTab === 'arrange' ? 'is-active' : '');
      tabArrangeBtn.textContent = 'Arrange';
      tabArrangeBtn.onclick = () => { activeTab = 'arrange'; renderDock(); };
      tabs.appendChild(tabArrangeBtn);

      panel.appendChild(tabs);

      const body = document.createElement('div');
      body.className = 'sn-tab-body';

      if (activeTab === 'style') {
        const styleGroups = [
          { label: 'Padding', prop: 'padding', chips: ['p-0', 'p-2', 'p-4', 'p-6', 'p-8'] },
          { label: 'Text Size', prop: 'fontSize', chips: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'] },
          { label: 'Weight', prop: 'fontWeight', chips: ['font-normal', 'font-medium', 'font-semibold', 'font-bold'] },
          { label: 'Corner Radius', prop: 'borderRadius', chips: ['rounded-none', 'rounded-md', 'rounded-lg', 'rounded-full'] },
        ];

        for (const g of styleGroups) {
          const row = document.createElement('div');
          row.className = 'sn-chips-row';
          const lbl = document.createElement('div');
          lbl.className = 'sn-chip-group-label';
          lbl.textContent = g.label;
          row.appendChild(lbl);

          for (const chip of g.chips) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sn-chip ' + (selectedElement.className.includes(chip) ? 'is-selected' : '');
            btn.textContent = chip;
            btn.onclick = () => previewChange('style', { property: g.prop, value: chip });
            row.appendChild(btn);
          }
          body.appendChild(row);
        }
      } else if (activeTab === 'text') {
        const textarea = document.createElement('textarea');
        textarea.className = 'sn-text-input';
        textarea.value = selectedElement.textContent || '';
        let timer = null;
        textarea.oninput = (e) => {
          const val = e.target.value;
          selectedElement.textContent = val;
          clearTimeout(timer);
          timer = setTimeout(() => {
            previewChange('text', { value: val });
          }, 300);
        };
        body.appendChild(textarea);
      } else if (activeTab === 'arrange') {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';

        const earlierBtn = document.createElement('button');
        earlierBtn.type = 'button';
        earlierBtn.className = 'sn-btn';
        earlierBtn.textContent = '↑ Move earlier';
        earlierBtn.onclick = () => previewChange('reorder', { direction: 'earlier' });
        row.appendChild(earlierBtn);

        const laterBtn = document.createElement('button');
        laterBtn.type = 'button';
        laterBtn.className = 'sn-btn';
        laterBtn.textContent = '↓ Move later';
        laterBtn.onclick = () => previewChange('reorder', { direction: 'later' });
        row.appendChild(laterBtn);

        body.appendChild(row);
      }

      panel.appendChild(body);

      const actionBar = document.createElement('div');
      actionBar.className = 'sn-action-bar';

      const summaryChip = document.createElement('div');
      summaryChip.className = 'sn-summary-chip';
      if (pendingEdit) {
        summaryChip.innerHTML = \`<span class="sn-pending-badge">● \${pendingEdit.summary || 'Pending change'}</span> Live on canvas\`;
      } else {
        summaryChip.textContent = 'Ready for edits';
      }
      actionBar.appendChild(summaryChip);

      const actionBtns = document.createElement('div');
      actionBtns.style.display = 'flex';
      actionBtns.style.gap = '6px';

      if (pendingEdit) {
        const discardBtn = document.createElement('button');
        discardBtn.type = 'button';
        discardBtn.className = 'sn-btn sn-btn.is-danger';
        discardBtn.textContent = 'Discard';
        discardBtn.onclick = discardPending;
        actionBtns.appendChild(discardBtn);

        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'sn-btn is-primary';
        applyBtn.textContent = '✓ Apply to code';
        applyBtn.onclick = applyPending;
        actionBtns.appendChild(applyBtn);
      }

      actionBar.appendChild(actionBtns);
      panel.appendChild(actionBar);

      dock.appendChild(panel);
    }
  }

  renderDock();
})();
`;
}

export const bridgeClient = getBridgeClient();

interface AdapterState {
  version: 1;
  backupName: string | null;
  wrapperName: string;
  installedAt: string;
  protocol?: number;
  configRevision?: number;
  generatedHashes?: Record<string, string>;
}

const digest = (source: string) => createHash('sha256').update(source).digest('hex');
const generatedFiles = ['next-source-loader.cjs', 'bridge-client.mjs', 'hydration-client.jsx', 'next-hmr-sync-loader.cjs'];
const safeConfigName = (name: unknown) => typeof name === 'string' && /^next\.config\.(?:js|mjs|cjs|ts|mts|cts)$/.test(name);

async function exists(filePath: string) {
  try { await lstat(filePath); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function getState(root: string): Promise<AdapterState | null> {
  const statePath = path.join(root, adapterDirectoryName, stateFileName);
  try {
    const directory = await lstat(path.join(root, adapterDirectoryName));
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('Adapter directory was replaced');
    const state = JSON.parse(await readFile(statePath, 'utf8')) as AdapterState;
    if (state?.version !== 1 || !safeConfigName(state.wrapperName) || state.backupName !== null && (typeof state.backupName !== 'string' || !/^next\.config\.slightnudge-original\.(?:js|mjs|cjs|ts|mts|cts)$/.test(state.backupName))) throw new Error('Invalid adapter state');
    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error('SlightNudge found an unreadable Next.js adapter state file.');
  }
}

export async function getNextSourceAdapterStatus(repositoryId: string) {
  const root = await resolveRepositoryRoot(repositoryId);
  const state = await getState(root);
  return { enabled: Boolean(state), needsUpdate: Boolean(state && (state.protocol !== SOURCE_CANVAS_PROTOCOL || /\.(?:ts|mts|cts)$/.test(state.wrapperName) && state.configRevision !== 1)) };
}

export async function installNextSourceAdapter(repositoryId: string) {
  const root = await resolveRepositoryRoot(repositoryId);
  const existingState = await getState(root);
  if (existingState) return { success: true as const, alreadyInstalled: true, restartRequired: true };

  const packagePath = path.join(root, 'package.json');
  const packageInfo = JSON.parse(await readFile(packagePath, 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const declaredNext = packageInfo.dependencies?.next || packageInfo.devDependencies?.next || '';
  if (!declaredNext) throw new Error('This adapter currently supports Next.js repositories only.');
  const nextVersionPath = path.join(root, 'node_modules', 'next', 'package.json');
  let nextVersion = declaredNext;
  try { nextVersion = (JSON.parse(await readFile(nextVersionPath, 'utf8')) as { version: string }).version; } catch { /* Resolve from manifest */ }
  const match = nextVersion.match(/(?:^|[^0-9])(\d+)/);
  if (!match || Number(match[1]) < 13) {
    throw new Error('Click-to-source needs Next.js 13 or newer. This adapter will not change an older Next.js configuration.');
  }

  const configNames = ['next.config.js', 'next.config.mjs', 'next.config.cjs', 'next.config.ts', 'next.config.mts', 'next.config.cts'];
  const configs = [] as string[];
  for (const name of configNames) if (await exists(path.join(root, name))) configs.push(name);
  if (configs.length > 1) throw new Error('This repository has multiple Next.js config files. Remove the duplicate config before enabling source mapping.');
  const originalName = configs[0] || null;

  const isTypeScript = originalName ? /\.tsx?$|\.mts$|\.cts$/i.test(originalName) : false;
  const wrapperName = originalName || 'next.config.mjs';

  const adapterRoot = path.join(root, adapterDirectoryName);
  if (await exists(adapterRoot)) {
    throw new Error('A .slightnudge-source-adapter folder already exists in this repository. Preserve or rename it before enabling the adapter.');
  }
  const configPath = path.join(root, wrapperName);

  await mkdir(adapterRoot, { recursive: false });
  let backupName: string | null = null;
  let backupMoved = false;
  let wrapperWritten = false;
  try {
    const loaderSource = await readFile(path.join(process.cwd(), 'lib', 'slightnudge', 'next-source-loader.cjs'), 'utf8');
    await writeFile(path.join(adapterRoot, 'next-source-loader.cjs'), loaderSource, { encoding: 'utf8', flag: 'wx' });
    await writeFile(path.join(adapterRoot, 'hydration-client.jsx'), `'use client';\nimport { useEffect } from 'react';\nexport default function SlightNudgeHydrationSignal() { useEffect(() => { window.__slightnudge_hydrated = true; window.dispatchEvent(new Event('slightnudge:hydrated')); }, []); return null; }\n`, { encoding: 'utf8', flag: 'wx' });
    const repoBridgeClient = getBridgeClient(repositoryId);
    await writeFile(path.join(adapterRoot, 'bridge-client.mjs'), repoBridgeClient, { encoding: 'utf8', flag: 'wx' });

    if (originalName) {
      const extension = path.extname(originalName);
      backupName = `next.config.slightnudge-original${extension}`;
      const backupPath = path.join(root, backupName);
      if (await exists(backupPath)) throw new Error(`The preserved config path ${backupName} already exists.`);
      await rename(path.join(root, originalName), backupPath);
      backupMoved = true;
    }

    // Next's TypeScript config loader compiles to CommonJS. A static import
    // loads the preserved TS config while its transpilation hook is active;
    // module-level await would make that CommonJS graph impossible to require.
    const originalImport = backupName ? isTypeScript
      ? `import importedConfig from './${backupName}';\nconst baseConfig = importedConfig;`
      : `const importedConfig = await import('./${backupName}');\n  const baseConfig = importedConfig.default ?? importedConfig;`
      : 'const baseConfig = {};';
    const wrapper = `/* eslint-disable */\n// ${generatedConfigMarker}: generated for development previews; remove through SlightNudge to restore the original config.\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nconst projectRoot = path.dirname(fileURLToPath(import.meta.url));\n${originalImport}\n\nexport default async function slightNudgeNextConfig(phase, context) {\n  const resolved = typeof baseConfig === 'function' ? await baseConfig(phase, context) : baseConfig;\n  const config = { ...resolved };\n  const originalWebpack = config.webpack;\n  config.webpack = (webpackConfig, options) => {\n    const applyAdapter = (nextConfig) => {\n      const result = nextConfig || webpackConfig;\n      if (options.dev) {\n        result.module.rules.push({\n          test: /\\.[jt]sx?$/,\n          include: [projectRoot],\n          enforce: 'pre',\n          use: [{ loader: path.join(projectRoot, '${adapterDirectoryName}', 'next-source-loader.cjs'), options: { development: true, root: projectRoot } }],\n        });\n        if (!options.isServer) {\n          const bridgePath = path.join(projectRoot, '${adapterDirectoryName}', 'bridge-client.mjs');\n          const origEntry = result.entry;\n          result.entry = async () => {\n            const entries = typeof origEntry === 'function' ? await origEntry() : origEntry;\n            if (entries && typeof entries === 'object') {\n              for (const key of ['main-app', 'main', 'app']) {\n                if (entries[key] && Array.isArray(entries[key]) && !entries[key].includes(bridgePath)) {\n                  entries[key].unshift(bridgePath);\n                }\n              }\n            }\n            return entries;\n          };\n        }\n      }\n      return result;\n    };\n    const previous = originalWebpack ? originalWebpack(webpackConfig, options) : webpackConfig;\n    return previous && typeof previous.then === 'function' ? previous.then(applyAdapter) : applyAdapter(previous);\n  };\n  return config;\n}\n`;
    let configuredWrapper = wrapper.replace('  const config = { ...resolved };', '  const config = { ...resolved };\n  config.devIndicators = false;').replace('development: true, root: projectRoot', 'development: true, hydrationSignal: true, root: projectRoot');
    if (isTypeScript) configuredWrapper = '// @ts-nocheck\n' + configuredWrapper;
    const socketSource = await readFile(path.join(root, 'node_modules/next/dist/client/dev/hot-reloader/app/web-socket.js'), 'utf8').catch(() => '');
    if (socketSource.includes('// Track webpack compilation hash for server restart detection') && socketSource.includes('mostRecentCompilationHash !== message.hash')) {
      await writeFile(path.join(adapterRoot, 'next-hmr-sync-loader.cjs'), await readFile(path.join(process.cwd(), 'lib/slightnudge/next-hmr-sync-loader.cjs'), 'utf8'), { encoding: 'utf8', flag: 'wx' });
      configuredWrapper = configuredWrapper.replace('          const bridgePath =', `          result.module.rules.push({ test: /[\\\\/]next[\\\\/]dist[\\\\/]client[\\\\/]dev[\\\\/]hot-reloader[\\\\/]app[\\\\/]web-socket\\.js$/, enforce: 'pre', use: [{ loader: path.join(projectRoot, '${adapterDirectoryName}', 'next-hmr-sync-loader.cjs') }] });\n          const bridgePath =`);
    }
    await writeFile(configPath, configuredWrapper, { encoding: 'utf8', flag: 'wx' });
    wrapperWritten = true;
    const generatedHashes: Record<string, string> = { [wrapperName]: digest(configuredWrapper) };
    for (const name of generatedFiles) if (await exists(path.join(adapterRoot, name))) generatedHashes[name] = digest(await readFile(path.join(adapterRoot, name), 'utf8'));
    const state: AdapterState = { version: 1, backupName, wrapperName, installedAt: new Date().toISOString(), protocol: SOURCE_CANVAS_PROTOCOL, configRevision: 1, generatedHashes };
    await writeFile(path.join(adapterRoot, stateFileName), JSON.stringify(state, null, 2), { encoding: 'utf8', flag: 'wx' });
    return { success: true as const, alreadyInstalled: false, restartRequired: true };
  } catch (error) {
    if (wrapperWritten) await rm(configPath, { force: true }).catch(() => undefined);
    if (backupMoved && backupName && await exists(path.join(root, backupName))) {
      await rename(path.join(root, backupName), path.join(root, originalName!)).catch(() => undefined);
    }
    await rm(adapterRoot, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

export async function removeNextSourceAdapter(repositoryId: string) {
  const root = await resolveRepositoryRoot(repositoryId);
  const state = await getState(root);
  if (!state) return { success: true as const, removed: false, restartRequired: false };
  const configPath = path.join(root, state.wrapperName);
  const wrapper = await readFile(configPath, 'utf8').catch(() => '');
  if (!wrapper.includes(generatedConfigMarker)) throw new Error('The Next.js config changed after adapter setup. Restore or merge it manually before removing the adapter.');
  if (!state.generatedHashes) throw new Error('This older adapter has no file integrity record. Preserve the adapter folder and merge its original config backup manually before enabling the current adapter; automatic removal could discard local edits.');
  // Preflight everything before touching the config or its original backup.
  if (state.generatedHashes) {
    if (state.generatedHashes[state.wrapperName] !== digest(wrapper)) throw new Error('The generated Next.js config has local changes. Preserve or merge them before removing the adapter.');
  }
  const adapterRoot = path.join(root, adapterDirectoryName);
  for (const target of [configPath, ...(state.backupName ? [path.join(root, state.backupName)] : []), ...generatedFiles.map(name => path.join(adapterRoot, name)), path.join(adapterRoot, stateFileName)]) {
    if (!(await exists(target))) {
      if (target === configPath || state.backupName && target === path.join(root, state.backupName)) throw new Error('The original Next.js config or adapter config is missing. Nothing was removed.');
      continue;
    }
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('An adapter file was replaced. Nothing was removed.');
    const name = path.basename(target);
    if (generatedFiles.includes(name) && state.generatedHashes?.[name] && state.generatedHashes[name] !== digest(await readFile(target, 'utf8'))) throw new Error('An adapter file has local changes. Preserve them before removing the adapter.');
  }
  // Rename the preserved config over the generated wrapper in one operation.
  if (state.backupName) {
    const backupPath = path.join(root, state.backupName);
    await rename(backupPath, configPath);
  } else await rm(configPath);
  for (const name of [...generatedFiles, stateFileName]) {
    const target = path.join(adapterRoot, name);
    if (await exists(target)) {
      const info = await lstat(target);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('An adapter file was replaced; it was left untouched.');
      await rm(target);
    }
  }
  // Leave unknown files intact rather than deleting user content recursively.
  await rmdir(adapterRoot).catch(() => undefined);
  return { success: true as const, removed: true, restartRequired: true };
}
