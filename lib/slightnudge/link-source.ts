import { Node, Project, SyntaxKind } from 'ts-morph';
import { isActionElement, isNextLink, type ActionElement } from './link-identity';
import { isComponentUsedMultipleTimes, isElementInsideLoop } from './ast-nudger';
import { renderJsxAttribute } from './jsx-text';
import { validLinkDestination } from './link-values';

export type ActionProperty = 'href' | 'target' | 'type' | 'disabled';
export interface ActionSourceOptions { sourceText: string; line: number; column: number }
export function actionAttribute(element: ActionElement, name: string): string | null {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) return null;
  const initial = attr.getInitializer(), value = initial && Node.isJsxExpression(initial) ? initial.getExpression() : initial;
  if (name === 'disabled') return !initial || value?.getKind() === SyntaxKind.TrueKeyword ? '' : null;
  return value && Node.isStringLiteral(value) ? initial && Node.isStringLiteral(initial) ? renderJsxAttribute(initial.getText()) : value.getLiteralValue() : null;
}
function dynamic(element: ActionElement, name: string) {
  const attr = element.getAttribute(name); if (!attr) return false;
  if (!Node.isJsxAttribute(attr)) return true;
  const initial = attr.getInitializer(), value = initial && Node.isJsxExpression(initial) ? initial.getExpression() : initial;
  return name === 'disabled' ? !!initial && (!value || ![SyntaxKind.TrueKeyword, SyntaxKind.FalseKeyword].includes(value.getKind())) : !value || !Node.isStringLiteral(value);
}
function parse(options: ActionSourceOptions) {
  const project = new Project({ useInMemoryFileSystem: true }), file = project.createSourceFile('/action.tsx', options.sourceText);
  const node = [...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].find(node => { const position = file.getLineAndColumnAtPos(node.getStart()); return position.line === options.line && position.column === options.column; });
  if (!node || !isActionElement(node)) throw new Error('Choose a source-mapped link or button.');
  return { project, file, node };
}
export function inspectActionSource(options: ActionSourceOptions) {
  const { project, node } = parse(options), button = node.getTagNameNode().getText() === 'button';
  let reason = '';
  if (isElementInsideLoop(node)) reason = 'This source element is rendered by a loop. Edit its data provider to change one item.';
  else if (isComponentUsedMultipleTimes(node, project)) reason = 'This component source is used more than once. Edit its shared source explicitly.';
  else if (node.getAttributes().some(Node.isJsxSpreadAttribute)) reason = 'This element receives shared properties. Edit its provider in source.';
  else if (!button && ['onClick', 'onNavigate', 'as', 'legacyBehavior'].some(name => node.getAttribute(name))) reason = 'This link uses a custom navigation provider. Edit its destination in source.';
  else if (!button && node.getAncestors().some(parent => Node.isJsxElement(parent) && parent.getOpeningElement() !== node && isNextLink(parent.getOpeningElement()))) reason = 'The parent Link component owns this destination. Edit that component in source.';
  const properties = button ? ['type', 'disabled'] as const : ['href', 'target'] as const;
  const fields = Object.fromEntries(properties.map(name => [name, { value: actionAttribute(node, name), editable: !reason && !dynamic(node, name) && !(name === 'target' && dynamic(node, 'rel')), reason: reason || (dynamic(node, name) || name === 'target' && dynamic(node, 'rel') ? 'This property comes from code. Its provider stays in control.' : '') }])) as Partial<Record<ActionProperty, { value: string | null; editable: boolean; reason: string }>>;
  return { tag: button ? 'button' as const : 'a' as const, nextLink: isNextLink(node), fields, reason, ownership: 'source-element' as const };
}
export function updateActionSource(options: ActionSourceOptions & { property: ActionProperty; value: string }) {
  const inspection = inspectActionSource(options), field = inspection.fields[options.property];
  if (!field?.editable) throw new Error(field?.reason || 'Choose a supported property for this element.');
  let value = options.value;
  if (options.property === 'href') { value = value.trim(); if (!validLinkDestination(value)) throw new Error('Use a page path, anchor, https/http address, email or telephone link.'); }
  if (options.property === 'target' && !['_self', '_blank'].includes(value)) throw new Error('Choose the same tab or a new tab.');
  if (options.property === 'type' && !['button', 'submit', 'reset'].includes(value)) throw new Error('Choose a supported button type.');
  if (options.property === 'disabled' && !['true', 'false'].includes(value)) throw new Error('Choose an enabled or disabled state.');
  const { file, node } = parse(options), before = file.getFullText();
  const remove = options.property === 'target' && value === '_self' || options.property === 'disabled' && value === 'false';
  const attr = node.getAttribute(options.property);
  if (remove) attr?.remove();
  else {
    const initializer = options.property === 'disabled' ? '{true}' : `{${JSON.stringify(value)}}`;
    if (attr && Node.isJsxAttribute(attr)) attr.setInitializer(initializer); else node.addAttribute({ name: options.property, initializer });
  }
  if (options.property === 'target' && value === '_blank') {
    const tokens = (actionAttribute(node, 'rel') || '').split(/\s+/).filter(token => token && token.toLowerCase() !== 'opener');
    for (const token of ['noopener', 'noreferrer']) if (!tokens.some(item => item.toLowerCase() === token)) tokens.push(token);
    const rel = node.getAttribute('rel'), initializer = `{${JSON.stringify(tokens.join(' '))}}`;
    if (rel && Node.isJsxAttribute(rel)) rel.setInitializer(initializer); else node.addAttribute({ name: 'rel', initializer });
  }
  return { before, after: file.getFullText(), oldValue: field.value || '', newValue: value };
}
