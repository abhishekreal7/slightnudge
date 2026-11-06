import type { ResizeAnchor } from './direct-manipulation';

export interface ResizeLayout { anchor: ResizeAnchor; width: number; height: number; rem: number }

/** Read layout only. No probing writes, source edits, wrappers or DOM changes. */
export function readResizeLayout(element: HTMLElement): ResizeLayout {
  const view = element.ownerDocument.defaultView, parent = element.parentElement;
  if (!view || !parent || !element.isConnected) throw new Error('Select a connected source element before resizing.');
  const style = view.getComputedStyle(element), parentStyle = view.getComputedStyle(parent);
  if (style.display === 'inline' || style.display === 'contents' || style.display.startsWith('table')) throw new Error('This element does not have a supported resizable box.');
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const current = view.getComputedStyle(node);
    if (current.writingMode !== 'horizontal-tb' || !['none', '0deg'].includes(current.rotate) || current.perspective !== 'none') throw new Error('This transformed or vertical layout cannot be resized safely.');
    const matrix = current.transform === 'none' ? new DOMMatrix() : new DOMMatrix(current.transform);
    const transform = (node as HTMLElement & { computedStyleMap?(): { get(name: string): { toString(): string } | undefined } }).computedStyleMap?.().get('transform')?.toString();
    if (current.translate.includes('%') || transform?.includes('%')) throw new Error('This percentage transform changes the resize anchor. Use its source styles.');
    if (!matrix.is2D || Math.abs(matrix.b) > .00001 || Math.abs(matrix.c) > .00001 || Math.abs(matrix.a - 1) > .00001 || Math.abs(matrix.d - 1) > .00001 || current.scale !== 'none' && current.scale.split(/\s+/).some(value => Number(value) !== 1) || current.zoom && !['1', 'normal', '100%'].includes(current.zoom)) throw new Error('This transformed layout cannot be resized safely.');
  }
  const typed = (element as HTMLElement & { computedStyleMap?(): { get(name: string): { toString(): string } | undefined } }).computedStyleMap?.();
  if (!typed) throw new Error('This browser cannot determine the resize anchor safely.');
  const leftAuto = typed.get('margin-left')?.toString() === 'auto', rightAuto = typed.get('margin-right')?.toString() === 'auto';
  const rtl = parentStyle.direction === 'rtl';
  let anchor: ResizeAnchor = rtl ? 'end' : 'start';
  const align = (value: string): ResizeAnchor => {
    if (value === 'center') return 'center';
    if (value === 'left') return 'start';
    if (value === 'right') return 'end';
    if (value === 'self-start') return style.direction === 'rtl' ? 'end' : 'start';
    if (value === 'self-end') return style.direction === 'rtl' ? 'start' : 'end';
    if (['end', 'flex-end'].includes(value)) return rtl ? 'start' : 'end';
    if (['normal', 'stretch', 'start', 'flex-start', 'auto'].includes(value)) return rtl ? 'end' : 'start';
    throw new Error('This alignment does not have a supported resize anchor.');
  };
  const flex = parentStyle.display.includes('flex'), row = flex && parentStyle.flexDirection.startsWith('row');
  if (row && (parent.children.length !== 1 || Number(style.flexGrow) !== 0)) throw new Error('This flex row shares its width with other items. Use its layout controls.');
  if (style.position === 'absolute' || style.position === 'fixed') {
    const left = typed.get('left')?.toString(), right = typed.get('right')?.toString();
    if (left !== 'auto' && right === 'auto') anchor = 'start';
    else if (left === 'auto' && right !== 'auto') anchor = 'end';
    else throw new Error('This positioned element has an ambiguous resize anchor.');
  } else if (!flex && !parentStyle.display.includes('grid') && style.cssFloat !== 'none') {
    throw new Error('This floated layout needs its source layout controls.');
  } else if ((leftAuto || rightAuto) && (!style.display.startsWith('inline') || flex || parentStyle.display.includes('grid'))) {
    anchor = leftAuto && rightAuto ? 'center' : leftAuto ? 'end' : 'start';
  } else if (row) {
    anchor = align(parentStyle.justifyContent);
    if (parentStyle.flexDirection === 'row-reverse' && ['normal', 'flex-start', 'flex-end'].includes(parentStyle.justifyContent)) anchor = anchor === 'start' ? 'end' : 'start';
  } else if (flex) anchor = align(style.alignSelf === 'auto' ? parentStyle.alignItems : style.alignSelf);
  else if (parentStyle.display.includes('grid')) anchor = align(style.justifySelf === 'auto' ? parentStyle.justifyItems : style.justifySelf);
  else if (style.display.startsWith('inline')) anchor = align(parentStyle.textAlign);
  // max-width uses the authored box-sizing basis, not always offsetWidth:
  // padding/borders must not become an extra pointer delta for content-box.
  const width = Number.parseFloat(style.width), height = element.offsetHeight;
  const rem = Number.parseFloat(view.getComputedStyle(element.ownerDocument.documentElement).fontSize);
  if (![width, height, rem].every(value => Number.isFinite(value) && value > 0)) throw new Error('The source dimensions could not be measured.');
  return { anchor, width, height, rem };
}
