import { perfSync } from './perf-stages';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { builtinModules } from 'node:module';
import { Project, SyntaxKind, ts, type SourceFile, type JsxOpeningElement, type JsxSelfClosingElement } from 'ts-morph';

export interface ComponentOwner {
  filePath: string;
  line: number;
  column: number;
  tagName: string;
}

export interface ComponentDependency {
  root: string;
  definition: string;
  line: number;
  column: number;
  hash: string;
  caller: string;
  property: string;
  instance?: string;
  nativeIndex?: number;
  callerIndex?: number;
  callerBeforeHash?: string;
  callerAfterHash?: string;
}

export const componentSourceHash = (source: string) => createHash('sha256').update(source).digest('hex');

export const openings = (file: SourceFile) =>
  [...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)]
    .sort((a, b) => a.getStart() - b.getStart());

export const key = (file: string) => path.resolve(file).replaceAll('\\', '/').toLowerCase();
export const componentOverlayKey = (file: string) => key(file);

let graphCache: { signature: string; project: Project; files: Map<string, SourceFile> } | undefined;
const symbolCache = new Map<string, { hash: string; file: SourceFile }>();

export function symbols(file: SourceFile) {
  const name = key(file.getFilePath()),
    hash = componentSourceHash(file.getFullText()),
    cached = symbolCache.get(name);
  if (cached?.hash === hash) return cached.file;
  const local = perfSync('ast-parse', () =>
    perfSync('ast-project', () => new Project({ useInMemoryFileSystem: true, compilerOptions: { noLib: true, noResolve: true, types: [] } }))
      .createSourceFile(file.getFilePath(), file.getFullText())
  );
  symbolCache.set(name, { hash, file: local });
  if (symbolCache.size > 32) symbolCache.delete(symbolCache.keys().next().value!);
  return local;
}

export function inside(root: string, file: string) {
  const relative = path.relative(root, file);
  return !!relative && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);
}

/** Bounded, filesystem-only project graph. No dependency code or config is executed. */
export function graph(rootInput: string, overlays: Record<string, string> = {}) {
  const root = fs.realpathSync(rootInput),
    sources = new Map<string, { file: string; source: string }>();
  let bytes = 0;
  const ignored = new Set(['node_modules', '.git', '.next', '.slightnudge', '.slightnudge-source-adapter', 'dist', 'build', 'coverage']);
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name) || (directory === root && ['test', 'tests', 'docs', 'scratch'].includes(entry.name))) continue;
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Project source contains a symbolic link. Cross-file ownership cannot be proved.');
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      if (/\.(mdx|vue|svelte|astro)$/.test(entry.name)) throw new Error('This project contains template-module callers outside the supported JS/TS ownership scan.');
      if (!/\.[cm]?[jt]sx?$/.test(entry.name) || /\.d\.[cm]?ts$/.test(entry.name)) continue;
      const stat = fs.statSync(file);
      bytes += stat.size;
      if (stat.size > 1024 * 1024 || bytes > 20 * 1024 * 1024 || sources.size >= 1000) throw new Error('This project exceeds the current ownership scan limit. Keep this edit in source.');
      sources.set(key(file), { file, source: fs.readFileSync(file, 'utf8') });
    }
  };
  visit(root);
  const digest = createHash('sha256').update(root);
  for (const [file, value] of [...sources].sort(([a], [b]) => a.localeCompare(b))) digest.update(file).update('\0').update(value.source).update('\0');
  const signature = digest.digest('hex');
  if (graphCache?.signature !== signature) {
    const project = perfSync('ast-project', () => new Project({ useInMemoryFileSystem: true })),
      files = new Map<string, SourceFile>();
    for (const [file, value] of sources) files.set(file, perfSync('ast-parse', () => project.createSourceFile(value.file.replaceAll('\\', '/'), value.source)));
    graphCache = { signature, project, files };
  }
  const { project, files } = graphCache;
  for (const [file, value] of sources) {
    const parsed = files.get(file)!,
      desired = overlays[file] ?? value.source;
    if (parsed.getFullText() !== desired) parsed.replaceWithText(desired);
    if ((parsed.compilerNode as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics.length) throw new Error('A project source file has a syntax error. Fix it before tracing component callers.');
  }
  let aliases: Record<string, string[]> = {},
    base = root,
    baseImports = false;
  const config = ['tsconfig.json', 'jsconfig.json'].map((name) => path.join(root, name)).find((file) => fs.existsSync(file));
  if (config) {
    const parsed = ts.parseConfigFileTextToJson(config, fs.readFileSync(config, 'utf8'));
    if (parsed.error) throw new Error('The project alias configuration cannot be read.');
    if (parsed.config.extends) throw new Error('Inherited import aliases are not supported by this ownership scan.');
    const options = parsed.config.compilerOptions || {};
    aliases = options.paths || {};
    baseImports = typeof options.baseUrl === 'string';
    base = path.resolve(root, options.baseUrl || '.');
    if (!inside(root, base) && base !== root) throw new Error('Project aliases resolve outside this project.');
  }
  const external = (specifier: string) => {
    const packageName = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
    if (builtinModules.includes(specifier) || /^[a-z][a-z-]+:/.test(specifier)) return undefined;
    const packageDirectory = path.join(root, 'node_modules', packageName);
    if (!fs.existsSync(path.join(packageDirectory, 'package.json'))) throw new Error('An import cannot be resolved as a local source or installed package. Cross-file ownership cannot be proved.');
    const realPackage = fs.realpathSync(packageDirectory),
      modules = fs.realpathSync(path.join(root, 'node_modules'));
    if ((realPackage === root || inside(root, realPackage)) && realPackage !== modules && !inside(modules, realPackage)) throw new Error('A workspace package aliases project source. Its callers are not yet supported.');
    return undefined;
  };
  const resolve = (specifier: string, from: string) => {
    let candidates: string[] = [],
      aliased = false;
    if (specifier.startsWith('.')) candidates = [path.resolve(path.dirname(from), specifier)];
    else
      for (const [pattern, targets] of Object.entries(aliases)) {
        const [prefix, suffix = ''] = pattern.split('*');
        if (pattern.includes('*') ? specifier.startsWith(prefix) && specifier.endsWith(suffix) : specifier === pattern) {
          if (!Array.isArray(targets) || targets.length !== 1 || typeof targets[0] !== 'string') throw new Error('This project has ambiguous import aliases.');
          const middle = pattern.includes('*') ? specifier.slice(prefix.length, suffix ? -suffix.length : undefined) : '';
          candidates.push(path.resolve(base, targets[0].replace('*', middle)));
          aliased = true;
        }
      }
    if (!candidates.length && baseImports) candidates = [path.resolve(base, specifier)];
    if (!candidates.length) return external(specifier);
    const matches = new Set<string>();
    for (const candidate of candidates) {
      if (!inside(root, candidate)) throw new Error('A source import resolves outside this project.');
      for (const extension of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js']) {
        const found = key(candidate + extension);
        if (files.has(found)) matches.add(found);
      }
      if (/\.[cm]?jsx?$/.test(candidate))
        for (const extension of ['.ts', '.tsx']) {
          const found = key(candidate.replace(/\.[cm]?jsx?$/, extension));
          if (files.has(found)) matches.add(found);
        }
    }
    if (matches.size > 1) throw new Error('A source import has multiple possible targets.');
    if (!matches.size && specifier.startsWith('.'))
      for (const candidate of candidates)
        for (const extension of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js']) {
          const target = candidate + extension;
          if (/\.[cm]?[jt]sx?$/.test(target) && !/\.d\.[cm]?ts$/.test(target) && fs.existsSync(target) && fs.statSync(target).isFile())
            throw new Error('A source import targets an excluded module. Its component callers cannot be proved.');
        }
    if (!matches.size && !specifier.startsWith('.')) {
      if (aliased) throw new Error('An internal alias has no source target.');
      return external(specifier);
    }
    return [...matches][0];
  };
  return { root, project, files, resolve };
}

export const instanceGraph = graph;
export const instanceSymbols = symbols;
export const instanceOpenings = openings;
