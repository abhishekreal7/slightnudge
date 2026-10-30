/** Serialized into an imported preview. No project source is modified. */
export function importedCanvasRuntime(send: (type: string, extra?: Record<string, unknown>) => void) {
  const viewportHeight = 720;
  document.documentElement.setAttribute('data-editor-canvas-page', '');
  const chrome = document.createElement('style');
  chrome.dataset.slightnudgeCanvasChrome = '';
  chrome.textContent = `html[data-editor-canvas-page]{height:${viewportHeight}px!important}html[data-editor-canvas-page],html[data-editor-canvas-page] body{overflow:hidden!important;scrollbar-width:none!important;scrollbar-gutter:auto!important}html[data-editor-canvas-page]::-webkit-scrollbar,html[data-editor-canvas-page] body::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}`;
  document.head.append(chrome);
  // Growing the iframe must not repeatedly grow a 100vh hero. Pin vertical
  // viewport units to the design viewport, keeping width breakpoints native.
  const originals = new WeakMap<CSSStyleDeclaration, Map<string, { authored: string; pinned: string }>>();
  const pin = (style: CSSStyleDeclaration) => {
    let values = originals.get(style);
    if (!values) { values = new Map(); originals.set(style, values); }
    for (const property of Array.from(style)) {
      const current = style.getPropertyValue(property), previous = values.get(property);
      const authored = previous?.pinned === current ? previous.authored : current;
      if (!/(?:\d|\.)\s*(?:[sdl]?vh|vb|vmin|vmax)\b/i.test(authored)) continue;
      const pinned = authored.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\([^)]*\))|(?<![\w-])(-?\d*\.?\d+)([sdl]?vh|vb|vmin|vmax)\b/gi, (whole, quoted, amount, unit) => {
        if (quoted) return whole;
        const size = unit.toLowerCase() === 'vmin' ? Math.min(innerWidth, viewportHeight) : unit.toLowerCase() === 'vmax' ? Math.max(innerWidth, viewportHeight) : viewportHeight;
        return `${Number(amount) * size / 100}px`;
      });
      if (pinned !== current) style.setProperty(property, pinned, style.getPropertyPriority(property));
      values.set(property, { authored, pinned });
    }
  };
  const rules = (list: CSSRuleList) => {
    for (const rule of Array.from(list)) {
      const candidate = rule as CSSStyleRule & CSSGroupingRule;
      if (candidate.style) pin(candidate.style);
      if (candidate.cssRules) rules(candidate.cssRules);
    }
  };
  let scheduled = false, lastHeight = 0;
  const measure = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      for (const sheet of Array.from(document.styleSheets)) {
        if (sheet.ownerNode === chrome) continue;
        try { rules(sheet.cssRules); } catch { /* Cross-origin stylesheets remain browser-owned. */ }
      }
      for (const node of Array.from(document.querySelectorAll<HTMLElement>('[style]'))) pin(node.style);
      const body = document.body;
      let height = Math.max(viewportHeight, body.getBoundingClientRect().height, body.scrollHeight);
      for (const node of Array.from(body.children)) {
        if (/^(SCRIPT|STYLE|LINK|NEXTJS-PORTAL)$/.test(node.tagName) || getComputedStyle(node).position === 'fixed') continue;
        height = Math.max(height, node.getBoundingClientRect().bottom + scrollY);
      }
      height = Math.min(60000, Math.ceil(height));
      if (height !== lastHeight) { lastHeight = height; send('source-canvas-size', { height, viewportHeight }); }
    });
  };
  const observer = new ResizeObserver(measure); observer.observe(document.body);
  new MutationObserver(measure).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('resize', measure);
  document.addEventListener('load', measure, true);
  void document.fonts.ready.then(measure);
  document.addEventListener('wheel', event => {
    // Keep intentionally scrollable widgets usable; root scrolling belongs to
    // the canvas. Pinch zoom always belongs to the surrounding canvas.
    if (!event.ctrlKey && !event.metaKey) {
      let target = event.target instanceof Element ? event.target : null;
      while (target && target !== document.body && target !== document.documentElement) {
        const style = getComputedStyle(target);
        if (/(auto|scroll)/.test(style.overflowY) && target.scrollHeight > target.clientHeight + 1 || /(auto|scroll)/.test(style.overflowX) && target.scrollWidth > target.clientWidth + 1) return;
        target = target.parentElement;
      }
    }
    event.preventDefault();
    send('source-canvas-wheel', { deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode, ctrlKey: event.ctrlKey, metaKey: event.metaKey, clientX: event.clientX, clientY: event.clientY });
  }, { passive: false });
  measure();
}
