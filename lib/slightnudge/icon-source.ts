import { Node, Project, SyntaxKind, SymbolFlags } from 'ts-morph';
import { isComponentUsedMultipleTimes, isElementInsideLoop } from './ast-nudger';
import { renderJsxAttribute } from './jsx-text';
import { validIconValue } from './icon-source-values';
import { isIconElement, isLucideIcon, lucideIconName, type IconElement } from './icon-identity';
export { isIconElement, isLucideIcon } from './icon-identity';
export { validIconValue } from './icon-source-values';

export type IconAppearanceProperty = 'size' | 'strokeWidth' | 'color';
export type IconProperty = IconAppearanceProperty | 'icon';
function literal(element: IconElement, name: string, fallback: string | null = null) {
  const attr = element.getAttribute(name); if (!attr) return fallback;
  if (!Node.isJsxAttribute(attr)) return null;
  const initial = attr.getInitializer(), value = initial && Node.isJsxExpression(initial) ? initial.getExpression() : initial;
  return value && Node.isStringLiteral(value) ? initial && Node.isStringLiteral(initial) ? renderJsxAttribute(initial.getText()) : value.getLiteralValue() : value && Node.isNumericLiteral(value) ? String(Number(value.getText())) : null;
}
export function iconAttributes(element: IconElement): Record<string, string | null> {
  const lucide = isLucideIcon(element);
  return { width: literal(element, 'width', lucide ? literal(element, 'size', '24') : null), height: literal(element, 'height', lucide ? literal(element, 'size', '24') : null), 'stroke-width': literal(element, 'strokeWidth', literal(element, 'stroke-width', lucide ? '2' : null)), stroke: literal(element, 'stroke', lucide ? literal(element, 'color', 'currentColor') : null) };
}
type Options = { sourceText: string; line: number; column: number };
function parse(options: Options) {
  const project = new Project({ useInMemoryFileSystem: true }), file = project.createSourceFile('/icon.tsx', options.sourceText);
  const node = [...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].find(node => { const pos = file.getLineAndColumnAtPos(node.getStart()); return pos.line === options.line && pos.column === options.column; });
  if (!node || !isIconElement(node)) throw new Error('Choose a source-mapped SVG or named Lucide icon.');
  return { project, file, node };
}
export function inspectIconSource(options: Options) {
  const { project, node } = parse(options), lucide = isLucideIcon(node), attributes = iconAttributes(node);
  const reason = isElementInsideLoop(node) || isComponentUsedMultipleTimes(node, project) ? 'This icon is shared or generated. Edit its provider in source.' : node.getAttributes().some(Node.isJsxSpreadAttribute) || node.getAttribute('style') || node.getAttribute('absoluteStrokeWidth') ? 'Code controls this icon’s appearance. Edit its provider in source.' : '';
  const classes = literal(node, 'className', '') || '';
  const fields = Object.fromEntries((['size', 'strokeWidth', 'color'] as const).map(property => {
    const names = property === 'size' ? lucide ? ['size', 'width', 'height'] : ['width', 'height'] : property === 'strokeWidth' ? ['strokeWidth', 'stroke-width'] : lucide ? ['color', 'stroke'] : ['stroke'];
    const dynamic = names.some(name => node.getAttribute(name) && literal(node, name) === null) || !!node.getAttribute('className') && literal(node, 'className') === null;
    const classOwned = classes.split(/\s+/).some(token => property === 'size' ? /(?:^|:)(?:!?)(?:w-|h-|size-)/.test(token) : property === 'strokeWidth' ? /(?:^|:)!?stroke-/.test(token) : /(?:^|:)!?(?:text-|stroke-)/.test(token));
    const shadowed = property === 'size' && lucide && (node.getAttribute('width') || node.getAttribute('height')) || property === 'color' && lucide && node.getAttribute('stroke') || property === 'strokeWidth' && node.getAttribute('stroke-width') && (lucide || node.getAttribute('strokeWidth'));
    const unequal = property === 'size' && attributes.width !== attributes.height;
    const why = reason || (dynamic || shadowed ? 'This value comes from code or an overriding prop.' : classOwned ? lucide ? 'A style class controls this value. Edit its class in source.' : 'A style class controls this value. Adjust it in the style controls.' : unequal ? 'Width and height differ. Edit their source values to preserve this icon’s proportions.' : '');
    return [property, { value: property === 'size' ? attributes.width : property === 'strokeWidth' ? attributes['stroke-width'] : attributes.stroke, editable: !why, reason: why }];
  })) as Record<IconAppearanceProperty, { value: string | null; editable: boolean; reason: string }>;
  const customChildren = Node.isJsxOpeningElement(node) && Node.isJsxElement(node.getParent()) && (node.getParent() as import('ts-morph').JsxElement).getJsxChildren().some(child => !Node.isJsxText(child) || child.getText().trim());
  const replacementReason = !lucide ? 'Shape replacement currently supports named Lucide imports.' : reason || (customChildren || ['children', 'icon', 'iconNode', 'viewBox', 'includeDefaultClasses'].some(name => node.getAttribute(name)) || node.getAttribute('className') && literal(node, 'className') === null ? 'This icon has custom contents or a code-owned shape. Edit its provider in source.' : '');
  return { lucide, fields, reason, replacement: { name: lucideIconName(node) || '', editable: !replacementReason, reason: replacementReason } };
}
export function updateIconSource(options: Options & { property: IconAppearanceProperty; value: string }) {
  const info = inspectIconSource(options), field = info.fields[options.property];
  if (!field?.editable) throw new Error(field?.reason || 'Choose a supported icon property.');
  if (!validIconValue(options.property, options.value)) throw new Error('Use size 8–256 px, stroke 0.25–8, or a six-digit hex color, currentColor or none.');
  const { file, node } = parse(options), before = file.getFullText();
  const names = options.property === 'size' ? info.lucide ? ['size'] : ['width', 'height'] : options.property === 'strokeWidth' ? [node.getAttribute('stroke-width') ? 'stroke-width' : 'strokeWidth'] : [info.lucide ? 'color' : 'stroke'];
  for (const name of names) {
    const attr = node.getAttribute(name), initializer = options.property === 'color' ? `{${JSON.stringify(options.value)}}` : `{${Number(options.value)}}`;
    if (attr && Node.isJsxAttribute(attr)) attr.setInitializer(initializer); else node.addAttribute({ name, initializer });
  }
  return { before, after: file.getFullText(), oldValue: field.value || '', newValue: options.value };
}

/** Change one JSX usage; retain every other reference to an existing import. */
export function replaceLucideSource(options: Options & { name: string }) {
  if (!/^[A-Z][A-Za-z0-9]{0,63}$/.test(options.name)) throw new Error('Choose a supported icon.');
  const info = inspectIconSource(options);
  if (!info.replacement.editable) throw new Error(info.replacement.reason);
  const { file, node } = parse(options), before = file.getFullText();
  if (options.name === info.replacement.name) return { before, after: before, oldValue: info.replacement.name, newValue: options.name };
  const oldName = node.getTagNameNode().getText();
  const imports = file.getImportDeclarations().filter(item => item.getModuleSpecifierValue() === 'lucide-react' && !item.isTypeOnly());
  const oldBinding = imports.flatMap(item => item.getNamedImports()).find(binding => (binding.getAliasNode() || binding.getNameNode()).getText() === oldName);
  const visible = node.getSymbolsInScope(SymbolFlags.Value | SymbolFlags.Alias);
  const existing = imports.flatMap(item => item.getNamedImports()).find(binding => binding.getName() === options.name && !binding.isTypeOnly() && visible.some(symbol => symbol.compilerSymbol === (binding.getAliasNode() || binding.getNameNode()).getSymbol()?.compilerSymbol));
  let name = existing && (existing.getAliasNode() || existing.getNameNode()).getText();
  if (!name) {
    const names = new Set(file.getDescendantsOfKind(SyntaxKind.Identifier).map(item => item.getText()));
    name = options.name; let index = 1;
    while (names.has(name)) name = `IconChoice${index++}`;
    const declaration = imports[0] || file.addImportDeclaration({ moduleSpecifier: 'lucide-react', namedImports: [] });
    declaration.addNamedImport(name === options.name ? options.name : { name: options.name, alias: name });
  }
  if (Node.isJsxOpeningElement(node)) {
    const parent = node.getParent();
    if (!Node.isJsxElement(parent)) throw new Error('This icon cannot be replaced safely.');
    parent.getClosingElement().getTagNameNode().replaceWithText(name);
  }
  node.getTagNameNode().replaceWithText(name);
  if (!isLucideIcon(node) || lucideIconName(node) !== options.name) throw new Error('The selected icon binding is shadowed. Nothing was changed.');
  if (oldBinding && !oldBinding.wasForgotten()) {
    const bindingNode = oldBinding.getAliasNode() || oldBinding.getNameNode();
    if (Node.isIdentifier(bindingNode) && !bindingNode.findReferencesAsNodes().some(reference => !reference.getFirstAncestorByKind(SyntaxKind.ImportSpecifier))) {
      const declaration = oldBinding.getImportDeclaration(); oldBinding.remove();
      if (!declaration.getNamedImports().length && !declaration.getDefaultImport() && !declaration.getNamespaceImport()) declaration.remove();
    }
  }
  return { before, after: file.getFullText(), oldValue: info.replacement.name, newValue: options.name };
}
