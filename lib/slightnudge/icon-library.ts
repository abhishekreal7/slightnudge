import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { ts } from 'ts-morph';
import { validIconShape, type IconShape } from './icon-shape-values';

export const replacementIcons = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Check', 'Plus', 'Minus', 'X', 'Search', 'Heart', 'Star', 'Mail', 'ExternalLink', 'Download', 'Upload', 'Settings', 'ChevronRight', 'ChevronDown', 'Menu', 'Copy', 'Trash2', 'User', 'Calendar', 'Clock', 'Home', 'Play', 'Pause', 'ShoppingCart', 'Bell', 'Globe'] as const;
function literal(node: ts.Expression): any {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(element => literal(element as ts.Expression));
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
    if (!ts.isPropertyAssignment(property) || !property.name || !ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) throw new Error('Unsupported icon data.');
    return [property.name.text, literal(property.initializer)];
  }));
  throw new Error('This icon uses computed shape data.');
}
function read(root: string, relative: string, limit: number) {
  const target = path.resolve(root, relative), inside = path.relative(root, target);
  if (inside.startsWith('..') || path.isAbsolute(inside) || statSync(target).size > limit) throw new Error('Unsupported icon library path.');
  return readFileSync(target, 'utf8');
}
/** Inspect static installed package data; never evaluate project dependency code. */
export function openIconLibrary(root: string) {
  let directory = path.resolve(root), packageFile = '';
  for (;;) {
    const candidate = path.join(directory, 'node_modules/lucide-react/package.json');
    if (existsSync(candidate)) { packageFile = candidate; break; }
    const parent = path.dirname(directory); if (parent === directory) break; directory = parent;
  }
  if (!packageFile) throw new Error('Install Lucide in this project before replacing icons.');
  const packageRoot = path.dirname(packageFile), pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
  if (pkg.name !== 'lucide-react') throw new Error('This project uses a custom icon provider.');
  if (typeof pkg.module !== 'string') throw new Error('This Lucide build does not expose supported static icon data.');
  const entryPath = path.resolve(packageRoot, pkg.module), entry = ts.createSourceFile('library.js', read(packageRoot, pkg.module, 2_000_000), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const exports = new Map<string, string>();
  for (const declaration of entry.statements) if (ts.isExportDeclaration(declaration) && declaration.moduleSpecifier && ts.isStringLiteral(declaration.moduleSpecifier) && /^\.\/icons\/[a-z0-9-]+\.m?js$/.test(declaration.moduleSpecifier.text) && declaration.exportClause && ts.isNamedExports(declaration.exportClause)) {
    for (const binding of declaration.exportClause.elements) if (binding.propertyName?.text === 'default') exports.set(binding.name.text, declaration.moduleSpecifier.text);
  }
  function shape(name: string): IconShape {
    const module = exports.get(name); if (!module) throw new Error('This icon is not available in the installed Lucide version.');
    const relative = path.relative(packageRoot, path.resolve(path.dirname(entryPath), module));
    const file = ts.createSourceFile('icon.js', read(packageRoot, relative, 64_000), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const variables = file.statements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []);
    const data = variables.find(item => ts.isIdentifier(item.name) && item.name.text === '__iconData')?.initializer;
    let nodes: any, classes: string[];
    if (data) { const value = literal(data); if (value.size !== 24 || !/^[a-z0-9-]+$/.test(value.name)) throw new Error('This icon uses a custom coordinate system.'); nodes = value.node; classes = ['lucide', `lucide-${value.name}`, ...(value.aliases || []).map((alias: string) => `lucide-${alias}`)]; }
    else {
      const data = variables.find(item => ts.isIdentifier(item.name) && item.name.text === '__iconNode')?.initializer;
      const factory = variables.map(item => item.initializer).find(item => item && ts.isCallExpression(item) && item.arguments[0] && ts.isStringLiteral(item.arguments[0]));
      if (!data || !factory || !ts.isCallExpression(factory) || !ts.isStringLiteral(factory.arguments[0])) throw new Error('This icon uses unsupported shape data.');
      nodes = literal(data); classes = ['lucide', 'lucide-' + factory.arguments[0].text.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()];
    }
    const attrs: Record<string, string> = { strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', fillRule: 'fill-rule', clipRule: 'clip-rule' };
    const result = { name, classes: [...new Set(classes)], nodes: nodes.map(([tag, values]: any[]) => [tag, Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'key').map(([key, value]) => [attrs[key] || key, String(value)]))]) };
    if (!validIconShape(result)) throw new Error('This icon has unsupported geometry.');
    return result;
  }
  return { shape, choices: () => replacementIcons.flatMap(name => { try { return [shape(name)]; } catch { return []; } }) };
}
