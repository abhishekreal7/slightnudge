import { validIconShape, type IconShape } from './icon-shape-values';
import { validIconValue } from './icon-source-values';
import { validLinkDestination } from './link-values';
import { SOURCE_CANVAS_PROTOCOL, sourceClassesMatch, withRuntimeClasses } from './source-canvas-contract';
import { importedCanvasRuntime } from './imported-canvas-runtime';
import { parseInstanceTrace } from './instance-trace';

/** Browser runtime shared by local source previews and imported adapters. Keep
 * this function self-contained: it is serialized into the preview document. */
function sourceCanvasRuntime(continuous: boolean, repositoryId = '', protocol = 18, setupCanvas: typeof importedCanvasRuntime | undefined, classMatches: typeof sourceClassesMatch, runtimeClasses: typeof withRuntimeClasses, linkDestination: typeof validLinkDestination, iconValue: typeof validIconValue, iconShape: typeof validIconShape, instanceTrace: typeof parseInstanceTrace) {
  const url = new URL(location.href);
  let saved: any = null; try { saved = JSON.parse(sessionStorage.getItem('slightnudge:preview-session') || 'null'); } catch {}
  const session = url.searchParams.get('__slightnudge_session') || (window.parent !== window ? saved?.session : null), origin = url.searchParams.get('__slightnudge_parent') || (window.parent !== window ? saved?.origin : null);
  if (repositoryId && (url.searchParams.get('__slightnudge_draft') === '1' || saved?.session === session && saved?.continuous)) continuous = true;
  if (!session || !origin || window.parent === window || (window as any).__slightnudge_bridge_active) return;
  try { if (new URL(origin).origin !== origin || !/^https?:/.test(origin) || continuous && !repositoryId && origin !== location.origin) return; } catch { return; }
  const canvas = Boolean(repositoryId && (url.searchParams.has('__slightnudge_session') ? url.searchParams.get('__slightnudge_canvas') === '1' : saved?.session === session && saved?.canvas));
  try { sessionStorage.setItem('slightnudge:preview-session', JSON.stringify({ session, origin, continuous, canvas })); } catch {}
  (window as any).__slightnudge_bridge_active = true;
  const root = document.querySelector('[data-source-canvas-root]') || document.body;
  let readyRetry: ReturnType<typeof setInterval> | undefined;
  let selected: HTMLElement | null = null, editing: HTMLElement | null = null, editingHost: HTMLElement | null = null, composing = false;
  let pendingReview = false;
  let inspectEnabled = true;
  let destinationMode = false;
  let editingMeta: { text: string; role: string | null; label: string | null; editable: string | null; prefix?: string; suffix?: string } | null = null;
  const stagedText = new Map<HTMLElement, { before: string; text: string }>();
  let gesture: { element: HTMLElement; style: string | null; legacyTranslate?: boolean } | null = null;
  const snapshots = new Map<HTMLElement, { classes: string | null; text: string; html: string; style: string | null; afterClass?: string | null; afterText?: string; afterStyle?: string | null; checks: Set<string>; attributes?: Record<string, { before: string | null; after: string | null }>; icon?: { beforeNodes: ChildNode[]; before: IconShape; after: IconShape; afterClassName: string } }>();
  const orders = new Map<HTMLElement, { before: ChildNode[]; expected: ChildNode[] }>();
  const sheet = document.createElement('style'); sheet.dataset.slightnudgeDraft = ''; document.head.append(sheet);
  const editingStyle = document.createElement('style'); editingStyle.textContent = '[contenteditable="plaintext-only"]{outline:none;user-select:text}[contenteditable="plaintext-only"][aria-label="Edit selected text"]{caret-color:#16845b}html[data-slightnudge-destination] *{cursor:crosshair!important}'; document.head.append(editingStyle);
  const cssRules = new Set<string>();
  const send = (type: string, extra: Record<string, unknown> = {}) => window.parent.postMessage({ channel: 'slightnudge', session, type, repositoryId, pageUrl: location.href, ...extra }, origin);
  const properties = ['fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'textDecorationLine', 'textTransform', 'color', 'backgroundColor', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'height', 'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'borderWidth', 'borderColor', 'display', 'width', 'maxWidth', 'gap', 'flexDirection', 'justifyContent', 'alignItems', 'order', 'transform', 'translate', 'transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction'];
  properties.push('backgroundImage', 'boxShadow', 'minWidth', 'minHeight', 'flexGrow', 'flexShrink', 'alignSelf', 'gridTemplateColumns', 'flexWrap', 'objectFit', 'objectPosition');
  const propertyNames: Record<string, string> = { alignment: 'textAlign', textColor: 'color', textDecoration: 'textDecorationLine', padding: 'paddingTop' };
  const locator = (element: HTMLElement) => ({ path: element.dataset.sourceFile || '', line: Number(element.dataset.sourceLine), column: Number(element.dataset.sourceColumn) || (element.id ? 1 : 0), elementId: element.id || undefined, instance: instanceTrace(element.dataset.slightnudgeCallsite) ? element.dataset.slightnudgeCallsite : undefined });
  const key = (element: HTMLElement) => { const value = locator(element); return (value.elementId ? `${value.path}#${value.elementId}` : `${value.path}:${value.line}:${value.column}:${element.tagName.toLowerCase()}`)+(value.instance?`@${value.instance}`:''); };
  const nodes = () => [...root.querySelectorAll<HTMLElement>('[data-source-file]')].filter(element => { const value = locator(element); return value.path && Number.isSafeInteger(value.line) && value.line > 0 && Number.isSafeInteger(value.column) && value.column > 0; });
  const matches = (target: any) => nodes().filter(element => { const value = locator(element); return value.path === target?.path && (!target.instance || value.instance === target.instance) && (target.elementId ? value.elementId === target.elementId : value.line === Number(target.line) && value.column === Number(target.column)); });
  const waitForTargets = async (locations: any[]) => {
    if (!repositoryId || !continuous) return;
    // A client signal at the root does not cover independently hydrating
    // Suspense/client boundaries. React 18/19 attach this host-instance key
    // when the individual DOM node hydrates. Fail closed if it is unavailable.
    const deadline = Date.now() + 10000;
    for (;;) {
      if (Date.now() > deadline) throw new Error('This part of the page is still loading. Let it finish before editing again.');
      const targets = locations.flatMap(location => matches(location));
      if (targets.every(element => Object.getOwnPropertyNames(element).some(name => name.startsWith('__reactFiber$')))) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  };
  const labelNodes = new WeakMap<HTMLElement, ChildNode>();
  const labelWhitespace = new WeakMap<HTMLElement, { prefix: string; suffix: string }>();
  const labelNode = (element: HTMLElement) => {
    if (!/^(a|button)$/i.test(element.tagName)) return null;
    const cached = labelNodes.get(element); if (cached?.parentNode === element) return cached;
    const text = [...element.childNodes].filter(node => node.nodeType === 3 && node.textContent?.trim());
    if (text.length !== 1) return null;
    const raw = text[0].textContent || '';
    labelNodes.set(element, text[0]); labelWhitespace.set(element, { prefix: raw.match(/^\s*/)?.[0] || '', suffix: raw.match(/\s*$/)?.[0] || '' }); return text[0];
  };
  const readText = (element: HTMLElement) => {
    if (editing === element && editingHost && editingHost !== element) return editingHost.textContent || '';
    return element.children.length && labelNode(element) ? labelNode(element)!.textContent!.trim() : element.textContent || '';
  };
  const writeText = (element: HTMLElement, text: string) => {
    const node = element.children.length ? labelNode(element) : null;
    if (node) { const spacing = labelWhitespace.get(element); node.textContent = (spacing?.prefix || '') + text + (spacing?.suffix || ''); }
    else if (!element.children.length) element.textContent = text;
    else throw new Error('Select a button with one static text label. Its other content was preserved.');
  };
  const sourceElement = (target: Element) => {
    const icon = target.closest<HTMLElement>('svg[data-source-file]');
    if (icon) return icon;
    const button = target.closest<HTMLElement>('a[data-source-file],button[data-source-file]');
    return button && (editing === button || labelNode(button)) && !target.closest('img') ? button : target.closest<HTMLElement>('[data-source-file]');
  };
  const isIdentityCssTransform = (value: string) => !value || value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)';
  const readTransformChain = (targetEl: HTMLElement) => {
    const domNodes: HTMLElement[] = [];
    let cursor: HTMLElement | null = targetEl;
    let steps = 0;
    while (cursor && steps++ < 128) { domNodes.push(cursor); cursor = cursor.parentElement; }
    domNodes.reverse();
    const docEl = document.documentElement, body = document.body;
    const bodyStyle = body ? getComputedStyle(body) : null;
    const isBodyPlainStatic = !body || !bodyStyle ? true : (
      bodyStyle.position === 'static' &&
      isIdentityCssTransform(bodyStyle.translate || '') &&
      isIdentityCssTransform(bodyStyle.rotate || '') &&
      isIdentityCssTransform(bodyStyle.scale || '') &&
      isIdentityCssTransform(bodyStyle.transform || '') &&
      body.clientLeft === 0 && body.clientTop === 0 && body.scrollLeft === 0 && body.scrollTop === 0
    );
    const frames: any[] = [];
    for (let i = 0; i < domNodes.length; i++) {
      const el = domNodes[i], st = getComputedStyle(el);
      const width = el.offsetWidth || 0, height = el.offsetHeight || 0;
      const originParts = (st.transformOrigin || '').trim().split(/\s+/);
      const ox = Number.parseFloat(originParts[0] || ''), oy = Number.parseFloat(originParts[1] || '');
      let offsetX = 0, offsetY = 0;
      if (i === 0) {
        offsetX = el === docEl ? 0 : el.offsetLeft || 0;
        offsetY = el === docEl ? 0 : el.offsetTop || 0;
      } else {
        const parent = domNodes[i - 1];
        if (el === body && parent === docEl) {
          if (!isBodyPlainStatic || el === targetEl) {
            offsetX = Number.parseFloat(st.marginLeft) || 0;
            offsetY = Number.parseFloat(st.marginTop) || 0;
          }
        } else {
          const op = el.offsetParent as HTMLElement | null;
          if (op === parent) {
            offsetX = parent === body ? el.offsetLeft : el.offsetLeft + parent.clientLeft;
            offsetY = parent === body ? el.offsetTop : el.offsetTop + parent.clientTop;
          } else if (op === parent.offsetParent) {
            offsetX = el.offsetLeft - parent.offsetLeft;
            offsetY = el.offsetTop - parent.offsetTop;
          } else if (op === null && st.position === 'fixed') {
            offsetX = el.offsetLeft;
            offsetY = el.offsetTop;
          } else {
            const opIdx = op ? domNodes.indexOf(op) : -1;
            if (opIdx >= 0 && opIdx < i) {
              let sumPrevX = 0, sumPrevY = 0;
              for (let k = opIdx + 1; k < i; k++) { sumPrevX += frames[k].offsetX; sumPrevY += frames[k].offsetY; }
              const opBorderX = op && op !== body ? op.clientLeft : 0, opBorderY = op && op !== body ? op.clientTop : 0;
              offsetX = el.offsetLeft + opBorderX - sumPrevX;
              offsetY = el.offsetTop + opBorderY - sumPrevY;
            } else {
              offsetX = el.offsetLeft - parent.offsetLeft;
              offsetY = el.offsetTop - parent.offsetTop;
            }
          }
        }
      }
      frames.push({
        offsetX, offsetY, width, height,
        scrollLeft: el.scrollLeft || 0, scrollTop: el.scrollTop || 0,
        translate: st.translate && st.translate !== 'none' ? st.translate : undefined,
        rotate: st.rotate && st.rotate !== 'none' ? st.rotate : undefined,
        scale: st.scale && st.scale !== 'none' ? st.scale : undefined,
        transform: st.transform && st.transform !== 'none' ? st.transform : undefined,
        transformOriginX: Number.isFinite(ox) ? ox : width / 2,
        transformOriginY: Number.isFinite(oy) ? oy : height / 2,
      });
    }
    return frames.slice(-64);
  };
  const describe = (element: HTMLElement, includeChain = true) => {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    let parent = element.parentElement;
    while (parent && parent !== root && !parent.hasAttribute('data-source-file')) parent = parent.parentElement;
    const text = readText(element), tagName = element.tagName.toLowerCase();
    return { ...locator(element), key: key(element), parentKey: parent && parent !== root ? key(parent) : undefined,
      tagName, sourceTagName: tagName, className: element.getAttribute('class') || '', textContent: text,
      name: (['h1','h2','h3','h4','h5','h6','p','a','button','label'].includes(tagName) ? text.trim().replace(/\s+/g, ' ').slice(0, 60) : (element.getAttribute('class') || '').split(' ').find(value => value.startsWith('sn-playground-'))?.replace('sn-playground-', '').replaceAll('-', ' ') || tagName),
      attributes: element instanceof SVGSVGElement ? Object.fromEntries(['width', 'height', 'stroke-width', 'stroke'].map(name => [name, element.getAttribute(name)])) : element.tagName === 'IMG' ? { src: element.getAttribute('src'), alt: element.getAttribute('alt'), srcSet: element.getAttribute('srcset'), responsive: element.closest('picture') || element.hasAttribute('srcset') ? 'true' : null } : element instanceof HTMLAnchorElement ? { href: element.getAttribute('href'), target: element.getAttribute('target'), rel: element.getAttribute('rel') } : element instanceof HTMLButtonElement ? { type: element.getAttribute('type'), disabled: element.getAttribute('disabled') } : undefined, computed: { ...Object.fromEntries(properties.map(property => [property, style[property as any]])), parentDisplay: element.parentElement ? getComputedStyle(element.parentElement).display : "" },
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      transformChain: includeChain ? readTransformChain(element) : undefined };
  };
  const catalog = () => {
    const layers = new Map<string, ReturnType<typeof describe> & { instances: number }>();
    for (const element of nodes()) { const value = describe(element, false), existing = layers.get(value.key); if (existing) existing.instances++; else layers.set(value.key, { ...value, instances: 1 }); }
    send('source-tree', { layers: [...layers.values()] });
  };
  const geometry = () => { if (selected?.isConnected) send('source-rect', { selection: describe(selected) }); };
  const iconNodesMatch = (nodes: ChildNode[], shape: IconShape) => nodes.length === shape.nodes.length && nodes.every((node, index) => {
    if (!(node instanceof SVGElement)) return false;
    const [tag, attrs] = shape.nodes[index];
    return node.localName === tag && node.attributes.length === Object.keys(attrs).length && Object.entries(attrs).every(([name, value]) => node.getAttribute(name) === value);
  });
  const iconMatches = (element: HTMLElement, shape: IconShape, classes: string) => element instanceof SVGSVGElement && element.getAttribute('viewBox') === '0 0 24 24' && classMatches(element.getAttribute('class'), classes) && iconNodesMatch([...element.childNodes], shape);
  const paintIcon = (element: HTMLElement, shape: IconShape, classes: string) => {
    element.setAttribute('class', runtimeClasses(classes, element.getAttribute('class')));
    element.replaceChildren(...shape.nodes.map(([tag, attributes]) => { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value); return node; }));
  };
  const intact = (element: HTMLElement) => { const value = snapshots.get(element); return !value || (!value.icon || iconMatches(element, value.icon.after, value.icon.afterClassName) && iconNodesMatch(value.icon.beforeNodes, value.icon.before)) && Object.entries(value.attributes || {}).every(([name, attr]) => element.getAttribute(name) === attr.after) && classMatches(element.getAttribute('class'), value.afterClass || null) && element.getAttribute('style') === value.afterStyle && (editing === element || stagedText.has(element) || value.afterText === undefined || readText(element) === value.afterText); };
  const remember = (element: HTMLElement) => {
    if (!snapshots.has(element)) snapshots.set(element, { classes: element.getAttribute('class'), text: readText(element), html: element.innerHTML, style: element.getAttribute('style'), afterClass: element.getAttribute('class'), afterStyle: element.getAttribute('style'), checks: new Set() });
    return snapshots.get(element)!;
  };
  const imageSource = (raw: string) => { const url = new URL(raw, location.href); return url.searchParams.has('url') && url.searchParams.has('w') ? url.searchParams.get('url')! : raw; };
  const replaceOptimizedUrl = (raw: string, replacement: string) => {
    const url = new URL(raw, location.href);
    if (!url.searchParams.has('url') || !url.searchParams.has('w')) return replacement;
    url.searchParams.set('url', replacement);
    return /^https?:/i.test(raw) ? url.toString() : url.pathname + url.search;
  };
  const projectImagePatch = (patch: any, saved = false) => {
    if (!patch.nextImage || !Object.prototype.hasOwnProperty.call(patch.attributes || {}, 'src')) return patch;
    const found = matches(saved ? patch.after : patch.before);
    if (found.length !== 1 || !(found[0] instanceof HTMLImageElement) || found[0].getAttribute('data-source-image') !== 'next') throw new Error('The optimized image source mapping is unavailable.');
    const element = found[0], owned = snapshots.get(element)?.attributes;
    const raw = saved ? element.getAttribute('src') : owned?.src ? owned.src.before : element.getAttribute('src');
    const marker = saved ? element.getAttribute('data-source-image-src') : owned?.['data-source-image-src'] ? owned['data-source-image-src'].before : element.getAttribute('data-source-image-src');
    if (!raw || !marker || imageSource(raw) !== marker) throw new Error('The optimized image changed outside its source.');
    if (!saved && patch.beforeAttributes?.src !== null && patch.beforeAttributes?.src !== undefined && patch.beforeAttributes.src !== marker) throw new Error('The optimized source revision does not match this draft.');
    const set = saved ? element.getAttribute('srcset') : owned?.srcset ? owned.srcset.before : element.getAttribute('srcset');
    const replacement = patch.attributes.src;
    if (saved && replacement === null) { const attributes = { ...patch.attributes }; delete attributes.src; return { ...patch, attributes }; }
    if (saved && marker !== replacement) throw new Error('The saved optimized source does not match the draft.');
    const srcset = set ? set.split(',').map(candidate => { const entry = candidate.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?[wx])$/); if (!entry || imageSource(entry[1]) !== marker) throw new Error('The optimized image candidates changed outside their source.'); return replaceOptimizedUrl(entry[1], replacement) + ' ' + entry[2]; }).join(', ') : null;
    return { ...patch, attributes: { ...patch.attributes, src: replaceOptimizedUrl(raw, replacement), srcset, 'data-source-image-src': replacement }, beforeAttributes: { ...patch.beforeAttributes, src: raw, srcset: set, 'data-source-image-src': marker } };
  };
  const restoreGesture = () => { if (gesture) { if (gesture.style === null) gesture.element.removeAttribute('style'); else gesture.element.setAttribute('style', gesture.style); gesture = null; } };
  const authoredPosition = (element: HTMLElement) => { const classes = element.getAttribute('class') || ''; return { x: Number(classes.match(/(?:^|\s)translate-x-\[(-?\d+)px\](?:\s|$)/)?.[1] || 0), y: Number(classes.match(/(?:^|\s)translate-y-\[(-?\d+)px\](?:\s|$)/)?.[1] || 0) }; };
  const positionMatches = (element: HTMLElement, x: number, y: number) => {
    const style = getComputedStyle(element), matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
    const close = (a: number, b: number) => Math.abs(a - b) < .1;
    if (!matrix.is2D || !close(matrix.a, 1) || !close(matrix.b, 0) || !close(matrix.c, 0) || !close(matrix.d, 1)) return false;
    if (style.translate === 'none') return close(matrix.e, x) && close(matrix.f, y);
    const axes = style.translate.split(/\s+/).map(Number.parseFloat);
    return close(axes[0], x) && close(axes[1] || 0, y) && close(matrix.e, 0) && close(matrix.f, 0);
  };
  const applyCss = (css: unknown) => {
    if (typeof css !== 'string' || css.length >= 500000 || cssRules.has(css)) return;
    if (css.includes('/*slightnudge-theme*/')) {
      const compiled = new CSSStyleSheet(); compiled.replaceSync(css);
      const existing = getComputedStyle(document.documentElement);
      const owned = new Set<string>();
      for (const layer of (sheet.sheet?.cssRules || []) as any) if (layer.name === 'theme' && layer.cssRules) for (const rule of layer.cssRules) if (rule.selectorText === ':where(:root)') for (const property of rule.style) owned.add(property);
      for (const layer of compiled.cssRules as any) if (layer.name === 'theme' && layer.cssRules) {
        for (const rule of layer.cssRules) if (rule.selectorText === ':where(:root)') {
          for (const property of [...rule.style]) if (!owned.has(property) && existing.getPropertyValue(property).trim()) rule.style.removeProperty(property);
        }
      }
      css = [...compiled.cssRules].map(rule => rule.cssText).join('\n');
    }
    if (!cssRules.has(css as string)) { cssRules.add(css as string); sheet.textContent = [...cssRules].join('\n'); }
  };
  const orderIntact = () => [...orders].every(([parent, value]) => parent.isConnected && parent.childNodes.length === value.expected.length && [...parent.childNodes].every((child, index) => child === value.expected[index]));
  const orderedChildren = (parent: HTMLElement, locations: any[]) => {
    const children = locations.map(location => { const found = matches(location); if (found.length !== 1 || found[0].parentElement !== parent) throw new Error('Reorder direct elements within the same source container. Component boundaries and repeated elements are not supported.'); return found[0]; });
    if (children.length !== parent.children.length || new Set(children).size !== children.length) throw new Error('The rendered container does not match its complete source child order.');
    return children;
  };
  const verifyOrder = (parent: HTMLElement, locations: any[]) => { const children = orderedChildren(parent, locations); if ([...parent.children].some((child, index) => child !== children[index])) throw new Error('The page is not rendering the expected section order.'); };
  const applyOrders = (patches: any[]) => {
    if (!orderIntact()) throw new Error('The page structure changed outside this draft. Reload before arranging sections.');
    const plans = patches.filter(patch => patch.order).map(patch => {
      const found = matches(patch.before); if (found.length !== 1) throw new Error('The source container is missing or repeated.');
      const parent = found[0], children = patch.order.map((location: any) => { const matchesLocation = matches(location); if (matchesLocation.length !== 1) throw new Error('The moved source element is missing or repeated.'); return matchesLocation[0]; }) as HTMLElement[];
      if (children.some(child => child === parent || child.contains(parent))) throw new Error('An element cannot contain itself.');
      if (children.some(child => { const style = getComputedStyle(child); return ['absolute', 'fixed'].includes(style.position) || style.gridRowStart !== 'auto' || style.gridColumnStart !== 'auto'; })) throw new Error('These elements use explicit layout positions. Adjust their layout before changing source order.');
      const layout = getComputedStyle(parent).display;
      if (/flex|grid/.test(layout) && parent.children.length === children.length && children.every(child => child.parentElement === parent)) {
        const visual = (values: Element[]) => [...values].sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order));
        const oldOrder = visual([...parent.children]), nextOrder = visual(children);
        if (oldOrder.every((child, index) => child === nextOrder[index]) && [...parent.children].some((child, index) => child !== children[index])) throw new Error('CSS order keeps these elements in the same visual positions. Choose a sibling in the same order group.');
      }
      return { parent, children };
    });
    const oldChildren = plans.flatMap(({ parent }) => [...parent.children]), newChildren = plans.flatMap(({ children }) => children);
    if (new Set(newChildren).size !== newChildren.length || oldChildren.length !== newChildren.length || oldChildren.some(child => !newChildren.includes(child as HTMLElement))) throw new Error('The rendered containers do not match the complete source move. Nothing was moved.');
    const updates = plans.map(({ parent, children }) => {
      let index = 0; const nodes = [...parent.childNodes].flatMap<ChildNode>(child => child instanceof Element ? index < children.length ? [children[index++]] : [] : [child]);
      return { parent, nodes: [...nodes, ...children.slice(index)] };
    });
    for (const { parent } of plans) {
      if (!orders.has(parent)) orders.set(parent, { before: [...parent.childNodes], expected: [...parent.childNodes] });
    }
    for (const { parent, nodes } of updates) parent.replaceChildren(...nodes);
    for (const { parent } of plans) orders.get(parent)!.expected = [...parent.childNodes];
  };
  const restore = () => {
    if (editing) finishText(true);
    for (const [element, value] of stagedText) writeText(element, value.before);
    stagedText.clear();
    restoreGesture();
    if ([...snapshots.keys()].some(element => !intact(element))) throw new Error('The page changed after preview. Reload to restore its current source.');
    if (!orderIntact()) throw new Error('The page structure changed after preview. Reload to restore current source.');
    for (const [parent, value] of orders) parent.replaceChildren(...value.before);
    orders.clear();
    for (const [element, value] of snapshots) {
      if (!element.isConnected) throw new Error('The page changed. Reload its source preview.');
      const classes = runtimeClasses(value.classes || '', element.getAttribute('class'));
      if (value.classes === null && !classes) element.removeAttribute('class'); else element.setAttribute('class', classes);
      if (value.style === null) element.removeAttribute('style'); else element.setAttribute('style', value.style);
      if (value.icon) element.replaceChildren(...value.icon.beforeNodes);
      if (value.afterText !== undefined) writeText(element, value.text);
      for (const [name, attr] of Object.entries(value.attributes || {})) { if (attr.before === null) element.removeAttribute(name); else element.setAttribute(name, attr.before); }
    }
    snapshots.clear(); cssRules.clear(); sheet.textContent = ''; pendingReview = false;
  };
  const preview = async (element: HTMLElement, message: any) => {
    restoreGesture();
    if (message.kind === 'reorder' || message.kind === 'reparent') { if (!continuous || !message.patches?.some((patch: any) => patch.order)) throw new Error('This order cannot be previewed in the current canvas.'); applyOrders(message.patches); return; }
    if (message.kind === 'move') { const base = authoredPosition(element); if (!positionMatches(element, base.x, base.y)) throw new Error('This element has a custom or animated transform. Resolve it before using Move.'); }
    if (!intact(element)) throw new Error('The page changed after its last draft revision. Reload before editing.');
    const value = remember(element), beforeClass = element.getAttribute('class'), beforeText = readText(element);
    const previousRules = [...cssRules];
    const property = propertyNames[message.property] || message.property;
    if (message.kind !== 'text' && message.kind !== 'move' && (!properties.includes(property) || typeof message.utility !== 'string' || message.utility.includes(':') && !message.responsiveMedia)) throw new Error('This style scope is not available in the source canvas yet.');
    if (message.responsiveMedia && (typeof message.responsiveMedia !== 'string' || !matchMedia(message.responsiveMedia).matches)) throw new Error('This breakpoint is outside the current preview width. Choose its matching width before editing.');
    const previousValue = message.kind !== 'text' && message.kind !== 'move' ? getComputedStyle(element)[property as any] : undefined;
    try {
    if (message.replaceCss === true) cssRules.clear();
    applyCss(message.css);
    if (message.kind === 'text') {
      if (typeof message.value !== 'string' || message.value.length > 2000) throw new Error('Only a static plain-text label can be edited in place.');
      writeText(element, message.value);
      stagedText.delete(element);
    } else {
      if (typeof message.value !== 'string' || message.value.length > 12000) throw new Error('A complete verified class list is required.');
      element.setAttribute('class', runtimeClasses(message.value, beforeClass));
      if (message.kind !== 'move') {
        const probeSheet = document.createElement('style'); probeSheet.textContent = typeof message.probeCss === 'string' ? message.probeCss : ''; document.head.append(probeSheet);
        const probe = document.createElement('span'); probe.className = message.utility; probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
        if(property==='boxShadow')for(const name of ['--tw-ring-shadow','--tw-ring-offset-shadow','--tw-inset-ring-shadow']){const value=getComputedStyle(element).getPropertyValue(name);if(value)probe.style.setProperty(name,value);}
        // A fixed percentage probe resolves against the viewport, which falsely
        // rejects ordinary w-full/w-1/2 edits inside padded containers. Give
        // the probe the same content-width basis without changing page layout.
        let probeContainer: HTMLElement | undefined;
        if (property === 'width') {
          const parent = element.parentElement!, parentStyle = getComputedStyle(parent);
          probeContainer = document.createElement('div');
          probeContainer.style.cssText = 'all:initial;position:fixed;visibility:hidden;pointer-events:none;display:block;box-sizing:content-box';
          probeContainer.style.width = `${parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight)}px`;
          const style = getComputedStyle(element);
          probe.style.position = 'static'; probe.style.display = style.display;
          probe.style.boxSizing = style.boxSizing; probe.style.padding = style.padding;
          probe.style.borderWidth = style.borderWidth; probe.style.borderStyle = style.borderStyle;
          probe.style.font = style.font; probe.style.letterSpacing = style.letterSpacing;
          probe.textContent = readText(element);
        }
        if (property === 'gridTemplateColumns') { const style = getComputedStyle(element); probe.style.display = 'grid'; probe.style.boxSizing = 'content-box'; probe.style.width = `${element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)}px`; probe.style.columnGap = style.columnGap; }
        if (probeContainer) { probeContainer.append(probe); document.body.append(probeContainer); } else element.parentElement!.append(probe);
        const expected = getComputedStyle(probe)[property as any]; probe.remove(); probeContainer?.remove(); probeSheet.remove();
        const transition = getComputedStyle(element);
        const milliseconds = (values: string) => values.split(',').map(value => Number.parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000));
        const deadline = performance.now() + Math.min(1500, Math.max(0, ...milliseconds(transition.transitionDuration)) + Math.max(0, ...milliseconds(transition.transitionDelay)) + 75);
        let actual = getComputedStyle(element)[property as any];
        const equivalent = (value: string) => { if (property === 'width' && /^\d+(?:\.\d+)?px$/.test(value) && /^\d+(?:\.\d+)?px$/.test(expected)) return Math.abs(parseFloat(value) - parseFloat(expected)) < .75; if (property !== 'gridTemplateColumns') return value === expected; const tracks = value.split(/\s+/), wanted = expected.split(/\s+/); return tracks.length === wanted.length && tracks.every((track, index) => /^\d+(?:\.\d+)?px$/.test(track) && Math.abs(parseFloat(track) - parseFloat(wanted[index])) < .75); };
        while (!equivalent(actual) && performance.now() < deadline && element.isConnected) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); actual = getComputedStyle(element)[property as any]; }
        if (!equivalent(actual) || !message.css && actual === previousValue) { if (beforeClass === null) element.removeAttribute('class'); else element.setAttribute('class', beforeClass); throw new Error('Project CSS overrides this utility, or the utility is unavailable. The source was not changed.'); }
        value.checks.add(property); if (property === 'fontSize') value.checks.add('lineHeight');
      } else {
        if (!positionMatches(element, message.x, message.y)) { if (beforeClass === null) element.removeAttribute('class'); else element.setAttribute('class', beforeClass); throw new Error('This position could not be rendered by the project CSS.'); }
        value.checks.add('translate'); value.checks.add('transform');
      }
    }
    value.afterClass = element.getAttribute('class'); value.afterStyle = element.getAttribute('style');
    if (message.kind === 'text') value.afterText = readText(element);
    return { beforeClass, beforeText };
    } catch (error) {
      cssRules.clear(); for (const rule of previousRules) cssRules.add(rule); sheet.textContent = previousRules.join('\n');
      if (beforeClass === null) element.removeAttribute('class'); else element.setAttribute('class', beforeClass);
      throw error;
    }
  };
  const finishText = (cancel = false) => {
    if (!editing) return;
    const element = editing, host = editingHost || element, text = /^(A|BUTTON)$/.test(element.tagName) ? (host.textContent || '').trim() : host.textContent || '', original = editingMeta?.text || '';
    const attributes = { contenteditable: editingMeta?.editable, role: editingMeta?.role, 'aria-label': editingMeta?.label };
    for (const [name, value] of Object.entries(attributes)) { if (value == null) host.removeAttribute(name); else host.setAttribute(name, value); }
    if (host !== element) { const node = document.createTextNode((editingMeta?.prefix || '') + text + (editingMeta?.suffix || '')); host.replaceWith(node); labelNodes.set(element, node); }
    editing = null; editingHost = null; editingMeta = null;
    if (cancel) writeText(element, original);
    else if (text !== original) stagedText.set(element, { before: original, text });
    else stagedText.delete(element);
    send(cancel ? 'text-cancel' : 'text-commit', { selection: describe(element), text });
    if (cancel) catalog(); geometry();
  };
  document.addEventListener('submit', event => { if (inspectEnabled) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  const destinationAt = (target: Element) => {
    const selector = 'div[data-source-file],section[data-source-file],main[data-source-file],article[data-source-file],aside[data-source-file],header[data-source-file],footer[data-source-file],nav[data-source-file]';
    let candidate = target.closest<HTMLElement>(selector);
    while (candidate && selected && (candidate === selected.parentElement || candidate === selected || selected.contains(candidate) || candidate.dataset.sourceFile !== selected.dataset.sourceFile)) candidate = candidate.parentElement?.closest<HTMLElement>(selector) || null;
    return candidate && root.contains(candidate) && matches(locator(candidate)).length === 1 ? candidate : null;
  };
  let pointer: { x: number; y: number } | null = null, hoverFrame = 0, hoverSignature = '';
  const hover = () => {
    hoverFrame = 0; if (!destinationMode || !pointer) return;
    const target = document.elementFromPoint(pointer.x, pointer.y), candidate = target ? destinationAt(target) : null;
    const selection = candidate ? describe(candidate) : null, signature = JSON.stringify(selection ? [selection.key, selection.rect] : null);
    if (signature !== hoverSignature) { hoverSignature = signature; send('destination-hover', { selection }); }
    if (pointer.y < 48 || pointer.y > innerHeight - 48) { window.scrollBy(0, pointer.y < 48 ? -10 : 10); hoverFrame = requestAnimationFrame(hover); }
  };
  document.addEventListener('pointermove', event => { if (!destinationMode) return; pointer = { x: event.clientX, y: event.clientY }; if (!hoverFrame) hoverFrame = requestAnimationFrame(hover); }, { passive: true });
  document.addEventListener('pointerdown',event=>{
    if(!inspectEnabled||destinationMode||!(event.target instanceof Element))return;
    const button=event.target.closest<HTMLButtonElement>('button[disabled][data-source-file]');
    if(!button||!root.contains(button)||matches(locator(button)).length!==1)return;
    event.preventDefault();event.stopImmediatePropagation();if(editing)finishText();selected=button;send('source-selection',{selection:describe(button)});
  },true);
  document.addEventListener('click', event => {
    if (!inspectEnabled) return;
    if (!(event.target instanceof Element)) return;
    if (destinationMode) { event.preventDefault(); event.stopImmediatePropagation(); const destination = destinationAt(event.target); if (destination) send('destination-picked', { selection: describe(destination) }); else send('selection-refused', { reason: 'Choose another layout container in the same source component. Escape cancels the move.' }); return; }
    const element = sourceElement(event.target);
    const isEmptyRootCanvas = Boolean(
      element &&
        event.target === element &&
        element.tagName === 'MAIN' &&
        !element.id &&
        element.getBoundingClientRect().height >= window.innerHeight * 0.9
    );
    if (!element || !root.contains(element) || isEmptyRootCanvas) {
      if (!destinationMode && (continuous || !pendingReview) && selected) {
        if (editing) finishText();
        selected = null;
        send('selection-cleared');
      }
      return;
    }
    if (editing === element) { if (/^(A|BUTTON)$/.test(element.tagName)) { event.preventDefault(); event.stopImmediatePropagation(); } return; }
    event.preventDefault(); event.stopImmediatePropagation();
    if (!continuous && pendingReview) return;
    if (matches(locator(element)).length !== 1) { send('selection-refused', { reason: 'This source element has several rendered instances. Select a unique element to edit safely.' }); return; }
    if (editing) finishText(); selected = element;
    send('source-selection', { selection: describe(element) });
  }, true);
  document.addEventListener('dblclick', event => { if (inspectEnabled && continuous && event.target instanceof Element) { const element = sourceElement(event.target); if (element && editing !== element && (!element.children.length || labelNode(element))) { selected = element; send('text-request', { selection: describe(element) }); } } }, true);
  document.addEventListener('input', event => { if (event.target === editingHost) { if (!composing) send('text-draft', { text: editingHost!.textContent || '' }); geometry(); } }, true);
  document.addEventListener('compositionstart', () => { composing = true; });
  document.addEventListener('compositionend', () => { composing = false; if (editingHost) { send('text-draft', { text: editingHost.textContent || '' }); geometry(); } });
  document.addEventListener('paste', event => {
    if (!editingHost) return; event.preventDefault();
    const selection = window.getSelection(); if (!selection?.rangeCount || !editingHost.contains(selection.anchorNode)) return;
    const value = (event.clipboardData?.getData('text/plain') || '').replace(/[\r\n]+/g, ' ');
    const range = selection.getRangeAt(0); range.deleteContents(); const text = document.createTextNode(value); range.insertNode(text); range.setStartAfter(text); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
    send('text-draft', { text: editingHost.textContent || '' });
    geometry();
  }, true);
  document.addEventListener('keydown', event => {
    if (editing) {
      if (event.isComposing || composing) return;
      if (event.key === 'Escape' || event.key === 'Enter') { event.preventDefault(); event.stopImmediatePropagation(); finishText(event.key === 'Escape'); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); finishText(); send('save-request'); }
      return;
    }
    if (!inspectEnabled || event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Escape') { event.preventDefault(); send('shortcut', { key: 'Escape' }); return; }
    if ((event.ctrlKey || event.metaKey) && ['s', 'z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); send('shortcut', { key: event.key, shift: event.shiftKey }); }
  }, true);
  window.addEventListener('message', async event => {
    if (event.source !== window.parent || event.origin !== origin || event.data?.channel !== 'slightnudge' || event.data.session !== session || !['source-edit', 'bridge-ack'].includes(event.data.type)) return;
    clearInterval(readyRetry);
    if (event.data.type === 'bridge-ack') return;
    const message = event.data;
    const reply = (success: boolean, reason = '', selection?: unknown) => send('edit-result', { requestId: message.requestId, success, reason, selection });
    try {
      if (message.operation === 'set-mode') { if (editing) finishText(true); inspectEnabled = message.edit !== false; destinationMode = inspectEnabled && message.destination === true; document.documentElement.toggleAttribute('data-slightnudge-destination', destinationMode); hoverSignature = ''; if (!destinationMode) { cancelAnimationFrame(hoverFrame); hoverFrame = 0; send('destination-hover', { selection: null }); } (window as any).__slightnudge_inspect = inspectEnabled; if (!inspectEnabled) selected = null; reply(true); return; }
      if (message.operation === 'catalog') { catalog(); reply(true); return; }
      if (message.operation === 'verify-document') {
        // Probe server HTML without hydrating it or touching the live draft.
        // A visible draft can already match while Next still serves the saved
        // revision after Undo; navigating that HTML races the newer client JS.
        const address = new URL(location.href);
        address.searchParams.set('__slightnudge_document_check', String(Date.now()));
        const response = await fetch(address, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (!response.ok || new URL(response.url).origin !== location.origin) throw new Error('The server document could not be verified.');
        const document = new DOMParser().parseFromString(await response.text(), 'text/html');
        const serverNodes = [...document.querySelectorAll<HTMLElement>('[data-source-file]')];
        for (const patch of message.patches || []) {
          const location = patch.after;
          const inFile = serverNodes.filter(element => element.dataset.sourceFile === location?.path);
          // Client-only targets are checked by the existing post-hydration
          // verify-batch operation. Do not claim SSR evidence for those nodes.
          if (!inFile.length) continue;
          const found = inFile.filter(element => {
            const value = locator(element);
            return (!location.instance || value.instance === location.instance) && (location.elementId ? value.elementId === location.elementId : value.line === Number(location.line) && value.column === Number(location.column));
          });
          if (found.length !== 1 || patch.className !== undefined && !classMatches(found[0].getAttribute('class'), patch.className) || patch.text !== undefined && readText(found[0]) !== patch.text || Object.entries(patch.attributes || {}).some(([name, value]) => found[0].getAttribute(name) !== value)) throw new Error('The server is still rendering an older source revision.');
        }
        reply(true); return;
      }
      if (message.operation === 'verify-batch') {
        await waitForTargets((message.patches || []).map((patch: any) => patch.after));
        for (const originalPatch of message.patches || []) {
          const patch = projectImagePatch(originalPatch, true);
          const found = matches(patch.after); if (found.length !== 1 || patch.className !== undefined && !classMatches(found[0].getAttribute('class'), patch.className) || patch.text !== undefined && readText(found[0]) !== patch.text) throw new Error('The rendered page is not yet the saved source revision.');
          if (patch.computed && (!patch.viewportWidth || patch.viewportWidth === innerWidth) && Object.entries(patch.computed).some(([property, expected]) => getComputedStyle(found[0])[property as any] !== expected)) throw new Error('The saved page CSS does not yet match the verified draft appearance.');
          if (Object.entries(patch.attributes || {}).some(([name, value]) => found[0].getAttribute(name) !== value)) throw new Error('The saved element attributes do not match the draft.');
          if (patch.attributes?.src && found[0] instanceof HTMLImageElement) await (found[0] as HTMLImageElement).decode();
          if (patch.icon && (!iconShape(patch.icon.after) || typeof patch.icon.afterClassName !== 'string' || !iconMatches(found[0], patch.icon.after, patch.icon.afterClassName))) throw new Error('The saved icon shape does not match the draft.');
          if (patch.orderAfter) verifyOrder(found[0], patch.orderAfter);
        }
        reply(true); return;
      }
      if (message.operation === 'restore') {
        if (!continuous) throw new Error('This preview requires explicit review.');
        await waitForTargets((message.patches || []).map((patch: any) => patch.before));
        message.patches = (message.patches || []).map((patch: any) => projectImagePatch(patch));
        for (const patch of message.patches || []) {
          const found = matches(patch.before); if (found.length !== 1) throw new Error('The image source target changed.');
          const snapshot = snapshots.get(found[0]);
          if(patch.beforeText!==undefined&&(snapshot?snapshot.text:stagedText.get(found[0])?.before??readText(found[0]))!==patch.beforeText)throw Error('Rendered text differs from its source prop. Reload before editing.');
          if(patch.beforeClassName!==undefined&&!classMatches(snapshot?snapshot.classes:found[0].getAttribute('class'),patch.beforeClassName))throw Error('Rendered styles differ from their source prop. Reload before editing.');
          for (const [name, expected] of Object.entries(patch.beforeAttributes || {})) {
            const owned = snapshot?.attributes?.[name];
            if ((owned ? owned.before : found[0].getAttribute(name)) !== expected) throw new Error('The element attributes changed outside this draft. Select it again.');
          }
        }
        // Resolve and decode every candidate before changing any draft DOM.
        const probes = new Set<string>();
        for (const patch of message.patches || []) {
          const found = matches(patch.before), target = found[0];
          const allowed = target instanceof SVGSVGElement ? ['width', 'height', 'stroke-width', 'stroke'] : target instanceof HTMLAnchorElement ? ['href', 'target', 'rel'] : target instanceof HTMLButtonElement ? ['type', 'disabled'] : target instanceof HTMLSourceElement ? ['srcSet', 'srcset'] : target instanceof HTMLImageElement ? ['src', 'alt', 'srcSet', 'srcset', ...(patch.nextImage ? ['data-source-image-src'] : [])] : [];
          if (Object.keys(patch.attributes || {}).length && !allowed.length) throw new Error('Select an editable image, link or button.');
          for (const [name, content] of Object.entries(patch.attributes || {})) {
            if (!allowed.includes(name) || content !== null && typeof content !== 'string') throw new Error('Unsupported image attribute.');
            if (target instanceof SVGSVGElement && content !== null && !iconValue(name === 'width' || name === 'height' ? 'size' : name === 'stroke-width' ? 'strokeWidth' : 'color', String(content))) throw new Error('Unsupported icon value.');
            if (name === 'href' && content !== null && !linkDestination(String(content))) throw new Error('Unsupported link destination.');
            if (name === 'target' && content !== null && !['_self', '_blank'].includes(String(content))) throw new Error('Unsupported link target.');
            if (name === 'type' && content !== null && !['button', 'submit', 'reset'].includes(String(content))) throw new Error('Unsupported button type.');
            if (name === 'disabled' && content !== null && content !== '') throw new Error('Unsupported button state.');
            if (name === 'rel' && content !== null && (String(content).length > 2048 || /[\u0000-\u001f]/.test(String(content)))) throw new Error('Unsupported link relationship.');
            if ((name === 'src' || name.toLowerCase() === 'srcset') && content) {
              const candidates = name.toLowerCase() === 'srcset' ? String(content).split(',').map(candidate => candidate.trim().split(/\s+/)[0]) : [String(content)];
              for (const candidate of candidates) {
                const asset = patch.nextImage ? imageSource(candidate) : candidate;
                if (!/^\/slightnudge-assets\/[a-f0-9-]{36}\.(?:png|jpe?g|webp|gif|avif)$/i.test(asset)) throw new Error('Choose an imported image.');
                probes.add(candidate);
              }
            }
          }
          if (patch.icon) {
            const saved = snapshots.get(target);
            if (!iconShape(patch.icon.before) || !iconShape(patch.icon.after) || typeof patch.icon.beforeClassName !== 'string' || typeof patch.icon.afterClassName !== 'string' || patch.icon.afterClassName.length > 8192 || !(target instanceof SVGSVGElement) || target.getAttribute('viewBox') !== '0 0 24 24' || !classMatches(saved?.classes ?? target.getAttribute('class'), patch.icon.beforeClassName) || !iconNodesMatch(saved?.icon?.beforeNodes || [...target.childNodes], patch.icon.before)) throw new Error('This icon shape changed outside the draft or has custom contents.');
          }
          if (target instanceof SVGSVGElement) {
            // Probe the actual cascade and restore attributes synchronously. CSS-owned
            // dimensions/colors must refuse before the committed draft is changed.
            const previousClass = target.getAttribute('class'), previousChildren = [...target.childNodes];
            const previous = Object.fromEntries(Object.keys(patch.attributes || {}).map(name => [name, target.getAttribute(name)]));
            try {
              for (const [name, content] of Object.entries(patch.attributes || {})) { if (content === null) target.removeAttribute(name); else target.setAttribute(name, String(content)); }
              if (patch.icon) {
                const properties = ['width', 'height', 'stroke', 'strokeWidth', 'fill', 'opacity', 'display', 'transform'];
                const before = properties.map(property => getComputedStyle(target)[property as any]);
                paintIcon(target, patch.icon.after, patch.icon.afterClassName);
                if (properties.some((property, index) => getComputedStyle(target)[property as any] !== before[index])) throw new Error('A style rule changes this icon’s appearance when its shape changes. Edit that rule in source.');
              }
              const style = getComputedStyle(target);
              for (const [name, content] of Object.entries(patch.attributes || {})) {
                if (content === null) continue;
                if ((name === 'width' || name === 'height') && Math.abs(parseFloat(style.getPropertyValue(name)) - Number(content)) > .1 || name === 'stroke-width' && Math.abs(parseFloat(style.strokeWidth) - Number(content)) > .01) throw new Error('A style rule controls this icon. Adjust its styles instead.');
                if (name === 'stroke') {
                  const probe = document.createElement('span'); probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none'; probe.style.color = content === 'currentColor' ? style.color : String(content); root.append(probe);
                  const expected = content === 'none' ? 'none' : getComputedStyle(probe).color; probe.remove();
                  if (style.stroke !== expected) throw new Error('A style rule controls this icon’s stroke color. Adjust its styles instead.');
                }
              }
            } finally { if (patch.icon) { target.replaceChildren(...previousChildren); if (previousClass === null) target.removeAttribute('class'); else target.setAttribute('class', previousClass); } for (const [name, value] of Object.entries(previous)) { if (value === null) target.removeAttribute(name); else target.setAttribute(name, value); } }
          }
        }
        await Promise.all([...probes].map(async candidate => { const probe = new Image(); probe.src = candidate; await Promise.race([probe.decode(), new Promise((_, reject) => setTimeout(() => reject(new Error('The replacement image could not load.')), 10000))]); }));
        restore();
        applyOrders(message.patches || []);
        for (const patch of message.patches || []) { const found = matches(patch.before); if (found.length !== 1) throw new Error('A draft target no longer matches the page.'); const element = found[0], value = remember(element); if (patch.icon) { value.icon = { beforeNodes: [...element.childNodes], before: patch.icon.before, after: patch.icon.after, afterClassName: patch.icon.afterClassName }; paintIcon(element, patch.icon.after, patch.icon.afterClassName); } applyCss(patch.css); for (const [name, content] of Object.entries(patch.attributes || {})) { if (!(element instanceof HTMLImageElement) && !(element instanceof HTMLSourceElement) && !(element instanceof HTMLAnchorElement) && !(element instanceof HTMLButtonElement) && !(element instanceof SVGSVGElement)) throw new Error('Select an editable source element.'); value.attributes ||= {}; value.attributes[name] = { before: element.getAttribute(name), after: content as string | null }; if (content === null) element.removeAttribute(name); else element.setAttribute(name, String(content)); } if (patch.className !== undefined) element.setAttribute('class', runtimeClasses(patch.className, element.getAttribute('class'))); if (patch.text !== undefined) { writeText(element, patch.text); value.afterText = patch.text; } for (const property of Object.keys(patch.computed || {})) if (properties.includes(property)) value.checks.add(property); value.afterClass = element.getAttribute('class'); value.afterStyle = element.getAttribute('style'); }
        catalog(); geometry(); reply(true); return;
      }
      if (message.operation === 'cancel-gesture') { restoreGesture(); geometry(); reply(true); return; }
      if (message.operation === 'check' && continuous) {
        await waitForTargets((message.patches || []).map((patch: any) => patch.before));
        if ([...snapshots.keys()].some(element => !intact(element))) throw new Error('The source page changed after the draft.');
        if (!orderIntact()) throw new Error('The page structure changed after the draft.');
        const patches = (message.patches || []).map((patch: any) => {
          const found = matches(patch.before); if (found.length !== 1) throw new Error('A draft target no longer matches the page.');
          const element = found[0], snapshot = snapshots.get(element), style = getComputedStyle(element);
          if (patch.order) verifyOrder(element, patch.order);
          return { ...patch, viewportWidth: innerWidth, computed: Object.fromEntries([...(snapshot?.checks || [])].map(property => [property, style[property as any]])) };
        });
        reply(true, '', selected ? { ...describe(selected), renderPatches: patches } : undefined); return;
      }
      if (['preview', 'begin-text'].includes(message.operation)) await waitForTargets([message.selection]);
      const found = matches(message.selection); if (found.length !== 1) throw new Error('This source target is missing or appears more than once.');
      const element = found[0];
      if (message.operation === 'verify') { if (message.expectedClass !== undefined && !classMatches(element.getAttribute('class'), message.expectedClass) || message.expectedText !== undefined && readText(element) !== message.expectedText) throw new Error('The project is still rendering an older source revision.'); reply(true); return; }
      if (message.operation === 'select') { selected = element; send('source-selection', { selection: describe(element) }); reply(true, '', describe(element)); return; }
      if (message.operation === 'begin-text') {
        if (!continuous || element.children.length && !labelNode(element) || !/^(h[1-6]|p|span|label|a|button)$/.test(element.tagName.toLowerCase())) throw new Error('This element does not contain a single editable text value.');
        if (editing) finishText();
        remember(element); const original = readText(element), label = labelNode(element);
        let host = element;
        const raw = label?.textContent || '';
        if (label) { host = document.createElement('span'); host.textContent = original; host.style.cssText = 'font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;line-height:inherit;padding:0;margin:0;min-width:1ch'; label.replaceWith(host); }
        selected = element; editing = element; editingHost = host;
        editingMeta = { text: original, role: host.getAttribute('role'), label: host.getAttribute('aria-label'), editable: host.getAttribute('contenteditable'), prefix: label ? raw.match(/^\s*/)?.[0] : '', suffix: label ? raw.match(/\s*$/)?.[0] : '' };
        host.contentEditable = 'plaintext-only'; host.setAttribute('role', 'textbox'); host.setAttribute('aria-label', 'Edit selected text'); host.focus({ preventScroll: true });
        if (document.activeElement !== host) { finishText(true); throw new Error('Could not focus the selected text. Try Edit text again.'); }
        const caret = document.createRange();
        caret.selectNodeContents(host); caret.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges(); selection?.addRange(caret);
        reply(true); return;
      }
      if (message.operation === 'cancel-text') { finishText(true); const value = stagedText.get(element); if (value) { writeText(element, value.before); stagedText.delete(element); catalog(); geometry(); } reply(true); return; }
      if (message.operation === 'finish-text') { finishText(); reply(true); return; }
      if (message.operation === 'gesture') {
        if (!continuous) throw new Error('Direct movement is not available for this preview.');
        const base = authoredPosition(element), legacyTransform = getComputedStyle(element).translate === 'none';
        if (!gesture && typeof message.x === 'number' && !positionMatches(element, base.x, base.y)) throw new Error('This element has a custom or animated transform. Resolve it before using Move.');
        if (!gesture) gesture = { element, style: element.getAttribute('style'), legacyTranslate: legacyTransform };
        if (typeof message.x === 'number' && typeof message.y === 'number' && Math.abs(message.x) <= 2048 && Math.abs(message.y) <= 2048) element.style.translate = `${message.x - (gesture.legacyTranslate ? base.x : 0)}px ${message.y - (gesture.legacyTranslate ? base.y : 0)}px`;
        if (typeof message.maxWidth === 'number' && message.maxWidth >= 1 && message.maxWidth <= 2048) element.style.maxWidth = `${message.maxWidth}px`;
        geometry(); reply(true, '', describe(element)); return;
      }
      if (!continuous && ['preview', 'check', 'discard'].includes(message.operation) && (!selected?.isConnected || selected !== element)) throw new Error('The selected rendered instance changed. Select it again.');
      if (message.operation === 'check') {
        if (!pendingReview || ![...snapshots.keys()].every(intact)) throw new Error('The page changed after preview.');
        const snapshot = snapshots.get(element)!, location = locator(element), style = getComputedStyle(element);
        const patch = { before: location, after: location, className: element.getAttribute('class') || '', text: snapshot.afterText, beforeClassName: snapshot.classes, beforeText: snapshot.afterText === undefined ? undefined : snapshot.text, computed: Object.fromEntries([...snapshot.checks].map(property => [property, style[property as any]])) };
        reply(true, '', { ...describe(element), renderPatches: [patch] }); return;
      }
      if (message.operation === 'discard') { restore(); geometry(); reply(true); return; }
      if (message.operation !== 'preview' || !continuous && pendingReview) throw new Error('Apply or discard the current preview first.');
      if (typeof message.selection.className === 'string' && !classMatches(element.getAttribute('class'), message.selection.className)) throw new Error('The rendered classes changed. Select the element again.');
      await preview(element, message); pendingReview = !continuous; catalog(); geometry(); reply(true, '', describe(element));
    } catch (error) {
      if (message.operation === 'preview') for (const element of matches(message.selection)) { const value = stagedText.get(element); if (value) { writeText(element, value.before); stagedText.delete(element); } }
      if (!continuous && !pendingReview) restore();
      catalog(); geometry(); reply(false, error instanceof Error ? error.message : 'The source page could not verify this operation.');
    }
  });
  let scheduled = false;
  const changed = () => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; geometry(); }); };
  const viewport = () => {
    const probe = document.createElement('span'); probe.style.cssText = 'display:none!important;font-size:initial!important'; document.documentElement.append(probe);
    const initialFontSize = parseFloat(getComputedStyle(probe).fontSize); probe.remove();
    send('source-viewport', { width: innerWidth, height: innerHeight, initialFontSize });
  };
  let scrollBridgeTimeout: any = null;
  const onScrollBridge = () => {
    if (scrollBridgeTimeout) clearTimeout(scrollBridgeTimeout);
    scrollBridgeTimeout = setTimeout(() => {
      geometry();
    }, 100);
  };
  window.addEventListener('scroll', onScrollBridge, { passive: true }); window.addEventListener('resize', () => { viewport(); catalog(); changed(); });
  const observer = new ResizeObserver(changed); observer.observe(root);
  let route = location.pathname + location.search;
  const routes = new MutationObserver(() => { const next = location.pathname + location.search; if (next === route) return; route = next; selected = null; catalog(); send('source-route'); });
  routes.observe(root, { childList: true, subtree: true });
  window.addEventListener('beforeunload', () => send('source-navigating'));
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (canvas) setupCanvas?.(send);
    const announce = () => { send('bridge-ready', { protocol }); viewport(); catalog(); };
    announce();
    const deadline = Date.now() + 30000;
    readyRetry = setInterval(() => { if (Date.now() >= deadline) clearInterval(readyRetry); else announce(); }, 500);
  }));
  // Imported drafts must not modify server HTML before React hydrates it.
  if (repositoryId && continuous && !(window as any).__slightnudge_hydrated) window.addEventListener('slightnudge:hydrated', ready, { once: true });
  else ready();
}

export function getSourceCanvasBridge(continuous: boolean, repositoryId = '') { return `(() => { const __name = (value) => value; const importedCanvasRuntime = ${importedCanvasRuntime.toString()}; (${sourceCanvasRuntime.toString()})(${JSON.stringify(continuous)}, ${JSON.stringify(repositoryId)}, ${SOURCE_CANVAS_PROTOCOL}, importedCanvasRuntime, ${sourceClassesMatch.toString()}, ${withRuntimeClasses.toString()}, ${validLinkDestination.toString()}, ${validIconValue.toString()}, ${validIconShape.toString()}, ${parseInstanceTrace.toString()}); })();`; }
export function startLocalSourceCanvas() { sourceCanvasRuntime(true, '', SOURCE_CANVAS_PROTOCOL, undefined, sourceClassesMatch, withRuntimeClasses, validLinkDestination, validIconValue, validIconShape, parseInstanceTrace); }
