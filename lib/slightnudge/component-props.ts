import { Node, Project, SyntaxKind, type JsxOpeningElement, type JsxSelfClosingElement } from 'ts-morph';
import { isComponentUsedMultipleTimes, isElementInsideLoop } from './ast-nudger';
import { renderJsxAttribute } from './jsx-text';

type Element = JsxOpeningElement | JsxSelfClosingElement;
/** A deliberately narrow projection: one local call, one destructured string,
 * and one direct text consumer. Never evaluate the component's JavaScript. */
function resolveComponentText(node: Element, providerOnly = false) {
  if (!Node.isJsxOpeningElement(node)) return undefined;
  const parent = node.getParent(); if (!Node.isJsxElement(parent)) return undefined;
  const meaningful = parent.getJsxChildren().filter(child => !Node.isJsxText(child) || child.getText().trim());
  if (meaningful.length !== 1 || !Node.isJsxExpression(meaningful[0])) return undefined;
  const expression = meaningful[0].getExpression(); if (!expression || !Node.isIdentifier(expression)) return undefined;
  const fn = node.getFirstAncestor(ancestor => Node.isFunctionDeclaration(ancestor) || Node.isArrowFunction(ancestor) || Node.isFunctionExpression(ancestor));
  if (!fn || !Node.isFunctionDeclaration(fn) && !Node.isArrowFunction(fn)) return undefined;
  const variable = Node.isArrowFunction(fn) && Node.isVariableDeclaration(fn.getParent()) ? fn.getParent().asKindOrThrow(SyntaxKind.VariableDeclaration) : undefined;
  const name = Node.isFunctionDeclaration(fn) ? fn.getNameNode() : variable?.getNameNode();
  if (!name || !Node.isIdentifier(name) || !/^[A-Z]/.test(name.getText())) return undefined;
  const params = fn.getParameters(); if (params.length !== 1) return undefined;
  const pattern = params[0].getNameNode(); if (!Node.isObjectBindingPattern(pattern) || params[0].getInitializer()) return undefined;
  const binding = pattern.getElements().find(item => item.getNameNode().getSymbol() === expression.getSymbol());
  if (!binding) return undefined;
  const unavailable = (reason: string) => ({ component: name.getText(), reason, binding: undefined });
  if (variable && variable.getVariableStatement()?.getDeclarationKind() !== 'const') return unavailable('This component binding can be reassigned. Use its source to edit props.');
  // These can read props without referencing the destructured binding.
  if (fn.getDescendantsOfKind(SyntaxKind.Identifier).some(identifier => ['arguments', 'eval'].includes(identifier.getText()))) return unavailable('This component reads props indirectly. Its source stays in control.');
  if (binding.getDotDotDotToken() || binding.getInitializer() || !Node.isIdentifier(binding.getNameNode())) return unavailable('This prop uses a default or binding pattern. Edit its provider in source.');
  const property = binding.getPropertyNameNode()?.getText() || binding.getName();
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(property) || /^(?:on[A-Z]|children$|key$|ref$|dangerouslySetInnerHTML$)/.test(property)) return undefined;
  const bindingName = binding.getNameNode(), bindingSymbol = bindingName.getSymbol();
  const valueType=bindingName.getType(),annotation=params[0].getTypeNode();
  const broadString=valueType.isString()||valueType.isUnion()&&valueType.getUnionTypes().some(member=>member.isString());
  const explicitAny=annotation?.getKind()===SyntaxKind.AnyKeyword||annotation&&Node.isTypeLiteral(annotation)&&annotation.getProperties().some(member=>member.getName()===property&&member.getTypeNode()?.getKind()===SyntaxKind.AnyKeyword);
  if(!broadString&&!(valueType.isAny()&&(!annotation&&!variable?.getTypeNode()||explicitAny)))return unavailable('This prop has a constrained or unresolved type. Edit its provider in source.');
  // TS's rename/reference search merges shorthand bindings with similarly named
  // structural properties. Count actual local value reads, including {label}.
  const uses = fn.getDescendantsOfKind(SyntaxKind.Identifier).filter(identifier => {
    if (identifier === bindingName) return false;
    const parent = identifier.getParent();
    return identifier.getSymbol() === bindingSymbol || Node.isShorthandPropertyAssignment(parent) && parent.getNameNode() === identifier && parent.getValueSymbol() === bindingSymbol;
  });
  if (uses.length !== 1 || uses[0] !== expression) return unavailable('This prop also controls other text or behavior. Edit its provider in source.');
  if (providerOnly) { const declaration=variable||(Node.isFunctionDeclaration(fn)?fn:undefined); if(!declaration)return unavailable('This component binding is unsupported.'); return { component: name.getText(), reason: '', binding: undefined, provider: { component: name.getText(), property, declaration } }; }
  if (Node.isFunctionDeclaration(fn) ? fn.isExported() : variable?.getVariableStatement()?.isExported()) return unavailable('This component is exported and may have callers in other files. Edit its provider in source.');
  const references = name.findReferencesAsNodes();
  const calls = references.filter(reference => Node.isJsxSelfClosingElement(reference.getParent()) || Node.isJsxOpeningElement(reference.getParent()));
  if (calls.length !== 1 || references.some(reference => !calls.includes(reference) && !Node.isJsxClosingElement(reference.getParent()))) return unavailable('This component is shared or passed to another provider. Edit its props in source.');
  const call = calls[0].getParent() as Element;
  if (isElementInsideLoop(node) || isElementInsideLoop(call) || isComponentUsedMultipleTimes(call, node.getProject())) return unavailable('This component is repeated. Edit its data provider to change one item.');
  if (call.getAttributes().some(Node.isJsxSpreadAttribute)) return unavailable('This component receives spread props. Edit their provider in source.');
  if (call.getAttributes().filter(attribute => Node.isJsxAttribute(attribute) && attribute.getNameNode().getText() === property).length !== 1) return unavailable('This prop is missing or declared more than once. Edit the component call in source.');
  const attribute = call.getAttribute(property); if (!attribute || !Node.isJsxAttribute(attribute)) return undefined;
  const initial = attribute.getInitializer(), value = initial && Node.isJsxExpression(initial) ? initial.getExpression() : initial;
  if (!value || !Node.isStringLiteral(value)) return unavailable('This prop comes from computed data. Edit its provider in source.');
  return { component: name.getText(), reason: '', binding: { component: name.getText(), property, value: initial && Node.isStringLiteral(initial) ? renderJsxAttribute(initial.getText()) : value.getLiteralValue(), attribute, call } };
}

export function componentTextBinding(node: Element) { return resolveComponentText(node)?.binding; }
export function componentTextProvider(node: Element) { const resolution=resolveComponentText(node,true); return resolution&&'provider' in resolution ? resolution.provider : undefined; }

export function inspectComponentProps(options: { sourceText: string; line: number; column: number }) {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile('/component.tsx', options.sourceText);
  const node = [...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].find(node => { const pos = file.getLineAndColumnAtPos(node.getStart()); return pos.line === options.line && pos.column === options.column; });
  const resolution = node && resolveComponentText(node), binding = resolution?.binding;
  return binding ? { component: binding.component, fields: [{ name: binding.property, value: binding.value, type: 'text' as const }], reason: '', ownership: 'local-call' as const } : { component: resolution?.component || null, fields: [], reason: resolution?.reason || '', ownership: 'unsupported' as const };
}

export function updateComponentProp(options: { sourceText: string; line: number; column: number; property: string; value: string }) {
  if (typeof options.value !== 'string' || options.value.length > 10000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(options.value)) throw new Error('Use text without control characters, up to 10,000 characters.');
  const project = new Project({ useInMemoryFileSystem: true }); const file = project.createSourceFile('/component.tsx', options.sourceText);
  const node = file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).find(node => { const pos = file.getLineAndColumnAtPos(node.getStart()); return pos.line === options.line && pos.column === options.column; });
  const binding = node && componentTextBinding(node);
  if (!binding || binding.property !== options.property) throw new Error('This prop is controlled by shared or computed source. Edit its provider in code.');
  if (binding.value === options.value) return { before: options.sourceText, after: options.sourceText, oldValue: binding.value, newValue: options.value };
  binding.attribute.setInitializer(`{${JSON.stringify(options.value)}}`);
  return { before: options.sourceText, after: file.getFullText(), oldValue: binding.value, newValue: options.value };
}
