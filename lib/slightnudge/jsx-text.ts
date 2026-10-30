import { ts } from 'ts-morph';

const rendered = new Map<string, string>();
const attributes = new Map<string, string>();

/** Decode a quoted JSX attribute with the compiler, preserving its whitespace. */
export function renderJsxAttribute(sourceLiteral: string): string {
  const cached = attributes.get(sourceLiteral); if (cached !== undefined) return cached;
  const output = ts.transpileModule(`const value = <img alt=${sourceLiteral} />;`, { compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: '__snJsx', target: ts.ScriptTarget.ES2020 }, fileName: 'attribute.tsx' }).outputText;
  const file = ts.createSourceFile('attribute.js', output, ts.ScriptTarget.ES2020, true);
  let result: string | undefined;
  const visit = (node: ts.Node) => { if (ts.isPropertyAssignment(node) && node.name.getText(file) === 'alt' && ts.isStringLiteral(node.initializer)) result = node.initializer.text; ts.forEachChild(node, visit); }; visit(file);
  if (result === undefined) throw new Error('This image attribute is not a literal.');
  if (attributes.size >= 256) attributes.delete(attributes.keys().next().value!);
  attributes.set(sourceLiteral, result); return result;
}

/** JSX text is not a JavaScript string: the compiler folds source line breaks
 * and decodes entities before React renders it. Keep saved-revision checks in
 * that same representation, while retaining the exact source for Undo. */
export function renderJsxText(source: string): string {
  const cached = rendered.get(source);
  if (cached !== undefined) return cached;
  const output = ts.transpileModule(`const value = <span>${source}</span>;`, {
    compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: '__snJsx', target: ts.ScriptTarget.ES2020 },
    fileName: 'text.tsx',
  }).outputText;
  const file = ts.createSourceFile('text.js', output, ts.ScriptTarget.ES2020, true);
  let result = '';
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === '__snJsx') {
      const child = node.arguments[2];
      if (child && ts.isStringLiteral(child)) result = child.text;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (rendered.size >= 256) rendered.delete(rendered.keys().next().value!);
  rendered.set(source, result);
  return result;
}
