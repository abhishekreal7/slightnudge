/* eslint-disable */
const path = require('node:path');
const { parse } = require('next/dist/compiled/babel/parser');

/** Development-only JSX source markers. This loader only changes compiled output. */
module.exports = function slightNudgeNextSourceLoader(input) {
  const options = this.getOptions();
  if (!options.development || /[\\/]node_modules[\\/]/.test(this.resourcePath)) return input;

  const source = input.toString();
  const root = options.root || process.cwd();
  const relativeFile = path.relative(root, this.resourcePath).split(path.sep).join('/');
  if (!relativeFile || relativeFile.startsWith('../') || path.isAbsolute(relativeFile)) return input;

  let ast;
  try {
    ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'classPrivateProperties', 'classPrivateMethods'],
    });
  } catch {
    // Unsupported syntax is left untouched; a missing mapping is safer than a broken preview.
    return input;
  }

  const edits = [];
  const skippedKeys = new Set(['loc', 'start', 'end', 'tokens', 'comments', 'leadingComments', 'trailingComments', 'extra', 'errors', 'interpreter']);
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node.type === 'JSXOpeningElement') {
      const tag = node.name?.type === 'JSXIdentifier' ? node.name.name : '';
      const hasSource = node.attributes?.some((attribute) => attribute.type === 'JSXAttribute' && attribute.name?.name === 'data-source-file');
      if (/^[a-z][a-z0-9-]*$/.test(tag) && !hasSource && node.loc?.start) {
        const escapedPath = relativeFile.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        edits.push({
          start: node.name.end,
          value: ` data-source-file="${escapedPath}" data-source-line="${node.loc.start.line}" data-source-column="${node.loc.start.column + 1}"`,
        });
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (!skippedKeys.has(key)) visit(value);
    }
  }
  visit(ast);

  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.value + output.slice(edit.start);
  }
  return output;
};
