import { Node, Project, SyntaxKind, ts } from 'ts-morph';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { isImageElement, isNextImage, type ImageElement } from './image-identity';
import { renderJsxAttribute } from './jsx-text';

export function imageAttribute(element: ImageElement, name: string): string | null {
  const attr = element.getAttribute(name), initial = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
  const value = initial && Node.isJsxExpression(initial) ? initial.getExpression() : initial;
  return value && Node.isStringLiteral(value) ? initial && Node.isStringLiteral(initial) ? renderJsxAttribute(initial.getText()) : value.getLiteralValue() : null;
}
function numberAttribute(element: ImageElement, name: string) {
  const attr = element.getAttribute(name), initial = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
  const value = initial && Node.isJsxExpression(initial) ? initial.getExpression() : initial;
  const number = value && (Node.isNumericLiteral(value) || Node.isStringLiteral(value)) ? Number(value.getLiteralValue()) : NaN;
  return Number.isFinite(number) && number > 0 ? number : undefined;
}
export function parseSourceSet(value: string) {
  let kind = '';
  const entries = value.split(',').map(part => {
    const match = part.trim().match(/^(\S+?)(?:\s+(\d+(?:\.\d+)?x|\d+w))?$/);
    if (!match || /^(?:data:|javascript:)/i.test(match[1])) throw new Error('Use a literal responsive source list with width or density descriptors.');
    const descriptor = match[2] || '', type = (descriptor || '1x').slice(-1), amount = Number((descriptor || '1x').slice(0, -1));
    if (kind && kind !== type || !Number.isFinite(amount) || amount <= 0) throw new Error('This responsive source list cannot be replaced safely.');
    kind = type;
    return { descriptor, type, amount };
  });
  if (entries.length > 24 || new Set(entries.map(item => item.descriptor || '1x')).size !== entries.length) throw new Error('This image has too many or duplicate responsive candidates.');
  return entries;
}
async function containedFile(root: string, relative: string) {
  const absolute = path.resolve(root, relative), relativePath = path.relative(root, absolute);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) throw new Error('The image asset is outside its project.');
  let current = root;
  for (const part of relativePath.split(path.sep)) { current = path.join(current, part); if ((await lstat(current)).isSymbolicLink()) throw new Error('Use an image stored inside this project.'); }
  if (!(await lstat(absolute)).isFile()) throw new Error('The image asset is unavailable.');
  return absolute;
}
async function importedFile(root: string, filePath: string, specifier: string) {
  if (specifier.startsWith('.')) return containedFile(root, path.relative(root, path.resolve(path.dirname(filePath), specifier)));
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json') || ts.findConfigFile(root, ts.sys.fileExists, 'jsconfig.json');
  if (!configPath || path.relative(root, configPath).startsWith('..')) throw new Error('The static image alias could not be resolved inside this project.');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error('The image alias configuration could not be read.');
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  const base = parsed.options.baseUrl || (typeof parsed.options.pathsBasePath === 'string' ? parsed.options.pathsBasePath : root);
  for (const [pattern, replacements] of Object.entries(parsed.options.paths || {})) {
    const [prefix, suffix = ''] = pattern.split('*');
    if (pattern.includes('*') ? !specifier.startsWith(prefix) || !specifier.endsWith(suffix) : specifier !== pattern) continue;
    const middle = pattern.includes('*') ? specifier.slice(prefix.length, suffix ? -suffix.length : undefined) : '';
    for (const replacement of replacements) {
      const candidate = path.resolve(base, replacement.replace('*', middle));
      if (!ts.sys.fileExists(candidate)) continue;
      return containedFile(root, path.relative(root, candidate));
    }
  }
  throw new Error('The static image alias could not be resolved inside this project.');
}
function assign(element: ImageElement, name: string, value: string) {
  const attr = element.getAttribute(name);
  if (attr && Node.isJsxAttribute(attr)) attr.setInitializer(`{${JSON.stringify(value)}}`);
  else element.addAttribute({ name, initializer: `{${JSON.stringify(value)}}` });
}

/** Replaces this JSX usage and its literal responsive candidates as one draft. */
export async function updateAdvancedImage(options: { root: string; filePath: string; sourceText: string; line: number; column: number; property: 'src' | 'alt'; value: string }) {
  const { property, value, root } = options;
  if (value.length > 2000 || /[\u0000-\u001f]/.test(value)) throw new Error('Use plain text under 2,000 characters.');
  const project = new Project({ useInMemoryFileSystem: true }), file = project.createSourceFile('/image.tsx', options.sourceText);
  const image = [...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].find(element => { const at = file.getLineAndColumnAtPos(element.getStart()); return at.line === options.line && at.column === options.column; });
  if (!image || !isImageElement(image)) throw new Error('Choose an image with an exact source mapping.');
  const next = isNextImage(image), before = file.getFullText(), oldValue = imageAttribute(image, property);
  if (image.getAttributes().some(Node.isJsxSpreadAttribute)) throw new Error('This image receives shared properties. Its provider was preserved.');
  if (property === 'alt') {
    if (image.getAttribute('alt') && oldValue === null) throw new Error('This image description comes from code. Its provider was preserved.');
    assign(image, 'alt', value); return { before, after: file.getFullText(), oldValue: oldValue || '', newValue: value };
  }
  if (!/^\/slightnudge-assets\/[a-f0-9-]{36}\.(?:png|jpe?g|webp|gif)$/i.test(value)) throw new Error('Choose an imported image.');
  const uploaded = await containedFile(root, 'public' + value), bytes = await readFile(uploaded);
  const uploadedMeta = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
  if (!uploadedMeta.width || !uploadedMeta.height) throw new Error('The uploaded image dimensions are unavailable.');
  const rotated = uploadedMeta.orientation !== undefined && uploadedMeta.orientation >= 5;
  const uploadedWidth = rotated ? uploadedMeta.height : uploadedMeta.width, uploadedHeight = rotated ? uploadedMeta.width : uploadedMeta.height;
  let imported: string | undefined;
  const attr = image.getAttribute('src'), initial = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
  const expr = initial && Node.isJsxExpression(initial) ? initial.getExpression() : undefined;
  if (next && expr && Node.isIdentifier(expr)) imported = file.getImportDeclarations().find(item => item.getDefaultImport()?.getText() === expr.getText() && item.getDefaultImport()?.getSymbol()?.compilerSymbol === expr.getSymbol()?.compilerSymbol && /\.(png|jpe?g|webp|gif|avif)$/i.test(item.getModuleSpecifierValue()))?.getModuleSpecifierValue();
  if (!attr || oldValue === null && !imported) throw new Error('This image source comes from code. Its provider was preserved.');
  if (next) {
    if (['loader', 'overrideSrc', 'srcSet'].some(name => image.getAttribute(name))) throw new Error('This image uses a custom source provider. Its output was preserved.');
    if (image.getAttribute('placeholder') && imageAttribute(image, 'placeholder') !== 'empty') throw new Error('Update this image and its authored blur placeholder together in code.');
    const fillAttribute = image.getAttribute('fill'), fillInitial = fillAttribute && Node.isJsxAttribute(fillAttribute) ? fillAttribute.getInitializer() : undefined;
    const fillExpression = fillInitial && Node.isJsxExpression(fillInitial) ? fillInitial.getExpression() : undefined;
    if (fillAttribute && fillInitial && (!fillExpression || ![SyntaxKind.TrueKeyword, SyntaxKind.FalseKeyword].includes(fillExpression.getKind()))) throw new Error('The image fill mode comes from code. Its provider was preserved.');
    const fill = !!fillAttribute && (!fillInitial || fillExpression?.getKind() === SyntaxKind.TrueKeyword);
    if (imported && !fill) {
      const original = await importedFile(root, options.filePath, imported);
      const dimensions = await sharp(await readFile(original), { limitInputPixels: 40000000 }).metadata();
      if (!dimensions.width || !dimensions.height) throw new Error('The original image dimensions could not be read.');
      const width = numberAttribute(image, 'width'), height = numberAttribute(image, 'height');
      if (dimensions.orientation && dimensions.orientation !== 1 && (!width || !height)) throw new Error('Set explicit dimensions on this oriented static image before replacing it.');
      if (image.getAttribute('width') && !width || image.getAttribute('height') && !height) throw new Error('The image dimensions come from code. Its provider was preserved.');
      if (!width) image.addAttribute({ name: 'width', initializer: `{${height ? Math.round(height * dimensions.width / dimensions.height) : dimensions.width}}` });
      if (!height) image.addAttribute({ name: 'height', initializer: `{${width ? Math.round(width * dimensions.height / dimensions.width) : dimensions.height}}` });
    }
  } else {
    const picture = image.getAncestors().find(node => Node.isJsxElement(node) && node.getOpeningElement().getTagNameNode().getText() === 'picture');
    if (picture && Node.isJsxElement(picture) && picture.getJsxChildren().some(child => Node.isJsxExpression(child) && !!child.getExpression())) throw new Error('This picture has computed children. Its responsive provider was preserved.');
    const siblings: ImageElement[] = picture && Node.isJsxElement(picture) ? picture.getJsxChildren().flatMap<ImageElement>(child => Node.isJsxSelfClosingElement(child) ? [child] : Node.isJsxElement(child) ? [child.getOpeningElement()] : []) : [image];
    if (siblings.some(element => !['source', 'img'].includes(element.getTagNameNode().getText()))) throw new Error('This picture has a custom source component. Its provider was preserved.');
    if (picture && siblings.filter(node => node.getTagNameNode().getText() === 'img').length !== 1) throw new Error('This picture has multiple fallback images. Its structure was preserved.');
    const affected = siblings.filter(node => ['source', 'img'].includes(node.getTagNameNode().getText()));
    const plans = affected.map(element => {
      if (element.getAttributes().some(Node.isJsxSpreadAttribute)) throw new Error('A responsive source receives shared properties. Its provider was preserved.');
      const name = element.getAttribute('srcSet') ? 'srcSet' : element.getAttribute('srcset') ? 'srcset' : undefined;
      if (!name) { if (element !== image) throw new Error('This picture source has no literal source set.'); return null; }
      const source = imageAttribute(element, name); if (!source) throw new Error('A responsive source comes from code. Its provider was preserved.');
      const type = imageAttribute(element, 'type');
      if (element.getAttribute('type') && !type) throw new Error('The responsive image format comes from code.');
      const formats: Record<string, 'png' | 'jpeg' | 'webp' | 'avif' | 'gif'> = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' };
      const format = type ? formats[type] : uploadedMeta.format === 'jpeg' ? 'jpeg' : uploadedMeta.format === 'webp' ? 'webp' : uploadedMeta.format === 'gif' ? 'gif' : 'png';
      if (!format) throw new Error('This responsive image format cannot be generated safely.');
      const entries = parseSourceSet(source).map(item => ({ ...item, width: item.type === 'w' ? item.amount : Math.round((numberAttribute(image, 'width') || uploadedWidth) * item.amount) }));
      for (const item of entries) if (item.width < 1 || item.width > 10000 || item.width * Math.ceil(item.width * uploadedHeight / uploadedWidth) > 40000000) throw new Error('This responsive variant exceeds the image size limit.');
      return { element, name, format, entries };
    });
    const generated = new Map<string, { url: string; bytes: Buffer }>(); let total = 0;
    for (const plan of plans) if (plan) for (const item of plan.entries) {
      const key = `${plan.format}:${item.width}`; if (generated.has(key)) continue;
      if (generated.size >= 24 || uploadedMeta.pages && uploadedMeta.pages > 1) throw new Error('This responsive image requires unsupported animated or excessive variants.');
      const result = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().resize({ width: item.width }).toFormat(plan.format).toBuffer(); total += result.length;
      if (total > 32 * 1024 * 1024) throw new Error('The responsive image set exceeds 32 MB.');
      generated.set(key, { url: `/slightnudge-assets/${randomUUID()}.${plan.format}`, bytes: result });
    }
    // Validate and encode the complete plan before publishing any variant files.
    for (const item of generated.values()) await writeFile(path.join(root, 'public', item.url), item.bytes, { flag: 'wx' });
    for (const plan of plans) if (plan) assign(plan.element, plan.name, plan.entries.map(item => generated.get(`${plan.format}:${item.width}`)!.url + (item.descriptor ? ` ${item.descriptor}` : '')).join(', '));
  }
  assign(image, 'src', value);
  return { before, after: file.getFullText(), oldValue: oldValue || '', newValue: value };
}
