
(() => {
  const currentUrl = new URL(window.location.href);
  const session = currentUrl.searchParams.get('__slightnudge_session');
  const parentOrigin = currentUrl.searchParams.get('__slightnudge_parent');
  if (!session || !parentOrigin || window.parent === window) return;
  let parsedParent;
  try { parsedParent = new URL(parentOrigin); } catch { return; }
  if (!['http:', 'https:'].includes(parsedParent.protocol) || parsedParent.origin !== parentOrigin) return;

  let selected = null;
  function send(type, target, clicked) {
    if (!target?.isConnected) return;
    const marker = target.closest('[data-source-file]');
    if (!marker) return;
    const rect = marker.getBoundingClientRect();
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
    };
    if (!selection.path || !Number.isSafeInteger(selection.line) || !Number.isSafeInteger(selection.column)) return;
    window.parent.postMessage({ channel: 'slightnudge', type, session, selection }, parentOrigin);
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const marker = event.target.closest('[data-source-file]');
    if (!marker) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selected = marker;
    send('source-selection', marker, event.target);
  }, true);

  window.addEventListener('message', (event) => {
    if (event.origin !== parentOrigin || event.source !== window.parent) return;
    const message = event.data;
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
    if (message.property === 'imageSource' && selected instanceof HTMLImageElement && typeof message.value === 'string' && /^\/slightnudge-assets\/[a-f0-9-]{36}\.(?:png|jpe?g|webp|gif)$/i.test(message.value)) selected.setAttribute('src', message.value);
    send('source-rect', selected);
  });

  window.addEventListener('scroll', () => { if (selected) send('source-rect', selected); }, { passive: true });
  window.addEventListener('resize', () => { if (selected) send('source-rect', selected); }, { passive: true });
})();
