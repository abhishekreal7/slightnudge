import { lucideIconName } from './icon-identity';
import { componentTextBinding } from './component-props';
import { crossFileTextPatches, validateComponentDependencies } from './component-ownership';
import { openIconLibrary } from './icon-library';
import { isActionElement, isNextLink } from './link-identity';
import { isIconElement, isLucideIcon, iconAttributes } from './icon-source';
import { actionAttribute } from './link-source';
import { isImageElement, isNextImage } from './image-identity';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Project, SyntaxKind, Node } from 'ts-morph';
import { readDraftSource, createPendingSourceEdit } from './edit-history';
import { inspectElement, editableTextChild, isElementInsideLoop, isComponentUsedMultipleTimes, type InspectOptions } from './ast-nudger';
import { findProjectRoot, verifyTailwindClass, compileScopedProjectClasses } from './tailwind-verifier';
import type { CanvasRenderPatch } from './source-canvas-contract';
import { renderJsxText, renderJsxAttribute } from './jsx-text';

/** Keep baseline source identities stable across text, style and sibling moves. */
export function prepareDraftTarget(options: InspectOptions, parentId?: string, scope: { repositoryId?: string; root?: string; structural?: boolean; text?: boolean; image?: boolean; action?: boolean; icon?: boolean; component?: boolean } = {}) {
  const parent = parentId ? readDraftSource(parentId, options.filePath, scope.repositoryId) : undefined;
  const before = parent?.before ?? readFileSync(options.filePath, 'utf8');
  const after = parent?.after ?? before;
  const project = new Project({ useInMemoryFileSystem: true });
  const original = project.createSourceFile('/original.tsx', before);
  const draft = project.createSourceFile('/draft.tsx', after);
  const openings = (file: typeof original) => [...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].sort((a, b) => a.getStart() - b.getStart());
  const baseNodes = openings(original), currentNodes = openings(draft);
  const sameTarget = (a: typeof baseNodes[number], b: typeof baseNodes[number] | undefined) => Boolean(b && (a.getTagNameNode().getText() === b.getTagNameNode().getText() || isLucideIcon(a) && isLucideIcon(b)));
  const identity = baseNodes.map((_, index) => index);
  const draftOrder = parent?.sourceOrder || identity;
  const validOrder = (order: number[]) => order.length === baseNodes.length && new Set(order).size === baseNodes.length && order.every(index => Number.isInteger(index) && index >= 0 && index < baseNodes.length);
  if (!validOrder(draftOrder)) throw new Error('The saved draft identities cannot be matched safely.');
  const draftNodes = draftOrder.map(index => currentNodes[index]);
  if (baseNodes.length !== currentNodes.length || baseNodes.some((node, index) => !sameTarget(node, draftNodes[index]))) throw new Error('The draft structure cannot be matched safely.');
  const index = baseNodes.findIndex(node => {
    if (options.elementId) {
      const attr = node.getAttribute('id');
      const value = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
      return !!value && Node.isStringLiteral(value) && value.getLiteralValue() === options.elementId;
    }
    const pos = original.getLineAndColumnAtPos(node.getStart());
    return pos.line === options.line && pos.column === options.column && (!options.tagName || node.getTagNameNode().getText() === options.tagName || options.tagName === 'img' && isNextImage(node) || options.tagName === 'a' && isNextLink(node) || options.tagName === 'svg' && isLucideIcon(node));
  });
  if (index < 0) throw new Error('Select an element with an exact source mapping.');
  const node = draftNodes[index];
  const position = draft.getLineAndColumnAtPos(node.getStart());
  const target = { ...options, line: position.line, column: position.column, sourceText: after, className: undefined, dryRun: true };
  const inspected = inspectElement(target);
  if ((scope.action || scope.text) && (isElementInsideLoop(node) || isComponentUsedMultipleTimes(node, project))) throw new Error('This source element is shared or generated. Edit its provider in source.');
  const ownedAction = scope.action && isActionElement(node) || scope.icon && isIconElement(node);
  const ownedComponent = scope.component;
  const classlessImage = scope.image && isImageElement(node) && !isElementInsideLoop(node) && !isComponentUsedMultipleTimes(node, project);
  if (!scope.structural && !classlessImage && !ownedAction && !ownedComponent && (!inspected.found || (scope.text ? !inspected.textEditable : !inspected.safeToEdit))) throw new Error((scope.text ? inspected.textReason : inspected.reason) || 'This draft target cannot be edited safely.');
  // Validate the complete resulting class delta at Save, including earlier edits.
  const classes = (file: typeof original) => new Set(openings(file).flatMap(element => {
    const attr = element.getAttribute('className');
    const value = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
    return value && Node.isStringLiteral(value) ? value.getLiteralValue().split(/\s+/).filter(Boolean) : [];
  }));
  return {
    target,
    async create(options: Parameters<typeof createPendingSourceEdit>[0], renderOnly = false, permutation?: number[]) {
      if (options.before === options.after && !renderOnly) return { changed: false as const };
      const resultFile = project.createSourceFile('/result.tsx', options.after, { overwrite: true });
      if (permutation && !validOrder(permutation)) throw new Error('The new source order cannot be matched safely.');
      const resultOrder = permutation ? draftOrder.map(index => permutation[index]) : draftOrder;
      const componentDependencies=[...(parent?.componentDependencies||[]),...(options.componentDependencies||[])];
      if(componentDependencies?.length){
        if(resultOrder.some((value,index)=>value!==index))throw new Error('Save component prop changes before rearranging their caller.');
        validateComponentDependencies(componentDependencies,{}, {root:scope.root||process.cwd(),caller:options.filePath});
      }
      const physicalNodes = openings(resultFile);
      const resultNodes = resultOrder.map(index => physicalNodes[index]);
      if (physicalNodes.length !== baseNodes.length || baseNodes.some((node, index) => !sameTarget(node, resultNodes[index]))) throw new Error('The reordered draft structure cannot be matched safely.');
      const sourceTargets = baseNodes.map((node, index) => ({
        before: original.getLineAndColumnAtPos(node.getStart()),
        after: resultFile.getLineAndColumnAtPos(resultNodes[index].getStart()),
        tag: isNextImage(node) ? 'img' : isNextLink(node) ? 'a' : isLucideIcon(node) ? 'svg' : node.getTagNameNode().getText(),
      }));
      const renderPatches: CanvasRenderPatch[] = [];
      const sourcePath = path.relative(scope.root || process.cwd(), options.filePath).split(path.sep).join('/');
      if (sourcePath.startsWith('../') || path.isAbsolute(sourcePath)) throw new Error('The draft target is outside its project.');
      const location = (index: number, saved = false) => ({ path: sourcePath, ...(saved ? sourceTargets[index].after : sourceTargets[index].before) });
      const children = (element: typeof node) => {
        if (Node.isJsxSelfClosingElement(element)) return [];
        const parent = element.getParent();
        return Node.isJsxElement(parent) ? parent.getJsxChildren().flatMap<typeof node>(child => Node.isJsxElement(child) ? [child.getOpeningElement()] : Node.isJsxSelfClosingElement(child) ? [child] : []) : [];
      };
      const literalClass = (element: typeof node) => { const attribute = element.getAttribute('className'); const value = attribute && Node.isJsxAttribute(attribute) ? attribute.getInitializer() : undefined; return value && Node.isStringLiteral(value) ? value.getLiteralValue() : undefined; };
      const literalAttributes = (element: typeof node): Record<string, string | null> => {
        if (isIconElement(element)) return iconAttributes(element);
        if (isActionElement(element)) return Object.fromEntries((element.getTagNameNode().getText() === 'button' ? ['type', 'disabled'] : ['href', 'target', 'rel']).map(name => [name, actionAttribute(element, name)]));
        if (!['img', 'source'].includes(element.getTagNameNode().getText()) && !isNextImage(element)) return {};
        return Object.fromEntries(['src', 'alt', 'srcSet'].map(name => { const attr = element.getAttribute(name) || (name === 'srcSet' ? element.getAttribute('srcset') : undefined); const initial = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined; const expression = initial && Node.isJsxExpression(initial) ? initial.getExpression() : initial; return [name, expression && Node.isStringLiteral(expression) ? initial && Node.isStringLiteral(initial) ? renderJsxAttribute(initial.getText()) : expression.getLiteralValue() : null]; }));
      };
      const literalText = (element: typeof node) => {
        const binding = componentTextBinding(element); if (binding) return binding.value;
        const parent = element.getParent(); if (!Node.isJsxElement(parent)) return undefined;
        if (!Node.isJsxOpeningElement(element)) return undefined;
        const child = editableTextChild(element); if (!child) return undefined;
        if (Node.isJsxText(child)) {
          const rendered = renderJsxText(child.getText());
          return ['a', 'button'].includes(element.getTagNameNode().getText()) || isNextLink(element) ? rendered.trim() : rendered;
        }
        const value = Node.isJsxExpression(child) ? child.getExpression() : undefined; return value && Node.isStringLiteral(value) ? value.getLiteralValue() : undefined;
      };
      for (let index = 0; index < baseNodes.length; index++) {
        if(componentDependencies.some(record=>record.instance&&record.definition===sourcePath&&record.nativeIndex===index))continue;
        const oldClass = literalClass(baseNodes[index]), newClass = literalClass(resultNodes[index]);
        const oldIcon = lucideIconName(baseNodes[index]), newIcon = lucideIconName(resultNodes[index]);
        const library = oldIcon && newIcon && oldIcon !== newIcon ? openIconLibrary(scope.root || process.cwd()) : undefined;
        const iconClasses = (element: typeof node, classes: string[]) => {
          const attr = element.getAttribute('className'); const init = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
          const expression = init && Node.isJsxExpression(init) ? init.getExpression() : init;
          if (attr && (!expression || !Node.isStringLiteral(expression))) throw new Error('This icon’s classes come from code.');
          const authored = expression && Node.isStringLiteral(expression) ? expression.getLiteralValue() : '';
          return [...new Set([...classes, ...authored.split(/\s+/).filter(Boolean)])].join(' ');
        };
        const oldShape = library?.shape(oldIcon!), newShape = library?.shape(newIcon!);
        const icon = oldShape && newShape ? { before: oldShape, after: newShape, beforeClassName: iconClasses(baseNodes[index], oldShape.classes), afterClassName: iconClasses(resultNodes[index], newShape.classes) } : undefined;
        const beforeValues = literalAttributes(baseNodes[index]), afterValues = literalAttributes(resultNodes[index]);
        const attributes = Object.fromEntries(Object.entries(afterValues).filter(([name, value]) => value !== beforeValues[name]));
        const beforeAttributes = Object.fromEntries(Object.keys(attributes).map(name => [name, beforeValues[name]]));
        const oldText = literalText(baseNodes[index]), newText = literalText(resultNodes[index]);
        const beforeChildren = children(baseNodes[index]).map(child => baseNodes.indexOf(child));
        const afterChildren = children(resultNodes[index]).map(child => resultNodes.indexOf(child));
        const previousChildren = children(draftNodes[index]).map(child => draftNodes.indexOf(child));
        const reordered = beforeChildren.join(',') !== afterChildren.join(',') || beforeChildren.join(',') !== previousChildren.join(',');
        if (!icon && oldClass === newClass && oldText === newText && !reordered && !Object.keys(attributes).length) continue;
        const idAttribute = baseNodes[index].getAttribute('id'); const idValue = idAttribute && Node.isJsxAttribute(idAttribute) ? idAttribute.getInitializer() : undefined;
        const elementId = idValue && Node.isStringLiteral(idValue) ? idValue.getLiteralValue() : undefined;
        let css = '';
        for (const utility of (newClass || '').split(/\s+/).filter(token => token && !(oldClass || '').split(/\s+/).includes(token))) {
          const compiled = await verifyTailwindClass(utility, findProjectRoot(options.filePath));
          if (!compiled.verified) throw new Error(compiled.error || `Cannot render ${utility} in the project.`);
          css += (compiled.layer ? `@layer ${compiled.layer} {\n${compiled.css || ''}\n}` : compiled.css || '') + '\n';
        }
        if (oldClass !== newClass && newClass) css = await compileScopedProjectClasses(newClass, findProjectRoot(options.filePath), { ...location(index), elementId });
        // A text-only draft does not own the class attribute. Animation and
        // widget runtimes may add classes after hydration; replay/verification
        // must preserve those unless this draft actually changes the classes.
        renderPatches.push({ icon, nextImage: isNextImage(baseNodes[index]) || undefined, attributes, beforeAttributes, before: { ...location(index), elementId }, after: { ...location(index, true), elementId }, className: oldClass !== newClass ? newClass : undefined, text: oldText !== newText ? newText : undefined, beforeClassName: oldClass !== newClass ? oldClass : undefined, beforeText: oldText !== newText ? oldText : undefined, css, ...(reordered ? { order: afterChildren.map(index => location(index)), orderAfter: afterChildren.map(index => location(index, true)), beforeOrder: beforeChildren.map(index => location(index)) } : {}) });
      }
      const oldClasses = classes(original), newClasses = classes(resultFile);
      const cross = componentDependencies.length ? crossFileTextPatches(scope.root || process.cwd(), options.filePath, before, options.after,componentDependencies) : { patches: [], dependencies: [] };
      renderPatches.push(...cross.patches);
      if(cross.dependencies.length>32)throw new Error('Save this set of component props before editing more.');
      if (renderOnly) return { changed: true as const, renderPatches, sourceTargets };
      const clean = before === options.after;
      if (clean) return { changed: true as const, draftClean: true, renderPatches: [], id: undefined, filePath: options.filePath, summary: options.summary, oldValue: options.oldValue, newValue: options.newValue, newClassName: options.newClassName, oldClassName: options.oldClassName, line: options.line };
      return { ...createPendingSourceEdit({ ...options, componentDependencies: cross.dependencies, draft: true, sourceOrder: resultOrder, before, previewType: 'reorder',
        summary: 'Save visual draft', addedTokens: [...newClasses].filter(token => !oldClasses.has(token)), removedTokens: undefined,
        // Batch Undo uses an exact full-file snapshot rather than one target's tokens.
        elementId: undefined, tagName: undefined, column: undefined,
      }), sourceTargets, renderPatches, summary: options.summary, oldValue: options.oldValue, newValue: options.newValue, newClassName: options.newClassName, oldClassName: options.oldClassName };
    },
  };
}

export async function readRenderableDraft(id: string, filePath: string, scope: { repositoryId?: string; root?: string } = {}) {
  const pending = readDraftSource(id, filePath, scope.repositoryId);
  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile('/source.tsx', pending.before);
  const node = [...source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...source.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].sort((a, b) => a.getStart() - b.getStart())[0];
  if (!node) throw new Error('The draft has no source elements.');
  const position = source.getLineAndColumnAtPos(node.getStart());
  const prepared = prepareDraftTarget({ filePath, ...position, tagName: node.getTagNameNode().getText() }, id, { ...scope, structural: true });
  return prepared.create({ ...pending, filePath }, true);
}
