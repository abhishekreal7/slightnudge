import { Project } from 'ts-morph';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import postcss from 'postcss';

export interface ResponsiveScope { name: string; minWidth: number; media: string }

export async function compileScopedProjectClasses(classes: string, projectDir: string, location: { path: string; line: number; column: number; elementId?: string }): Promise<string> {
  const root = path.resolve(projectDir);
  await verifyTailwindClass('block', root);
  const system = v4DesignSystemCache.get(root)?.ds;
  const tokens = [...new Set(classes.split(/\s+/).filter(Boolean))];
  let css: string, layer = false;
  if (system?.getClassOrder && system?.candidatesToCss) {
    const sorted = (system.getClassOrder(tokens) as [string, bigint | null][]).filter((item): item is [string, bigint] => item[1] !== null).sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0).map(item => item[0]);
    css = system.candidatesToCss(sorted).filter(Boolean).join('\n'); layer = true;
  } else {
    const installed = findInstalledPackage('tailwindcss', root);
    if (!installed?.pkg.version?.startsWith('3')) throw new Error('This project compiler cannot verify responsive cascade order.');
    const result = await verifyTailwindClass(tokens.join(' '), root);
    if (!result.verified) throw new Error(result.error || 'The project classes could not be compiled together.');
    css = result.css || '';
  }
  const marker = `[data-source-file=${JSON.stringify(location.path)}]` + (location.elementId ? `[id=${JSON.stringify(location.elementId)}]` : `[data-source-line="${location.line}"][data-source-column="${location.column}"]`);
  const parsed = postcss.parse(css);
  parsed.walkRules(rule => {
    let parent = rule.parent;
    while (parent && parent.type !== 'root') { if (parent.type === 'rule' || parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return; parent = parent.parent; }
    // Pseudo-elements keep their original stylesheet rules; editing them is a
    // separate capability. :where adds no specificity to subject rules.
    rule.selectors = rule.selectors.filter(selector => !/::[a-z-]+/i.test(selector)).map(selector => `${selector}:where(${marker})`);
    if (!rule.selectors.length) rule.remove();
  });
  let themeCss = '';
  if (layer && system?.theme?.entries) {
    const theme = new Map<string, { value: string }>(system.theme.entries());
    const defaults = new Map<string, string>();
    const needed = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1]);
    while (needed.length) {
      const name = needed.pop()!, value = theme.get(name)?.value;
      if (!value || defaults.has(name)) continue;
      defaults.set(name, value);
      for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g)) needed.push(match[1]);
    }
    if (defaults.size) {
      const fallback = postcss.rule({ selector: ':where(:root)' });
      for (const [prop, value] of defaults) fallback.append({ prop, value });
      themeCss = `/*slightnudge-theme*/\n@layer theme {${fallback.toString()}}\n`;
    }
  }
  return layer ? `${themeCss}@layer utilities {\n${parsed.toString()}\n}` : parsed.toString();
}

/** Ask the project's compiler, including custom theme/config names. Never
 * assume the framework's default pixel values match this project. */
export async function getProjectResponsiveScopes(projectDir: string): Promise<ResponsiveScope[]> {
  const root = path.resolve(projectDir);
  // Scope discovery is an explicit configuration read. Rebuild here so edits
  // to imported theme stylesheets cannot leave stale breakpoint values.
  v4DesignSystemCache.delete(root);
  const base = await verifyTailwindClass('block', root);
  if (!base.verified) throw new Error(base.error || 'The project stylesheet could not be verified.');
  const names = new Set(['sm', 'md', 'lg', 'xl', '2xl']);
  const system = v4DesignSystemCache.get(root)?.ds;
  if (system?.theme?.namespace) for (const name of system.theme.namespace('--breakpoint').keys()) if (name) names.add(name);
  const installed = findInstalledPackage('tailwindcss', root);
  if (installed?.pkg.version?.startsWith('3')) {
    const nativeRequire = req || createRequire(path.join(root, 'package.json'));
    const resolveConfig = nativeRequire(path.join(installed.dir, 'resolveConfig.js'));
    const resolved = (resolveConfig.default || resolveConfig)(loadTailwind3Config(root, installed));
    for (const name of Object.keys(resolved.theme?.screens || {})) names.add(name);
  }
  const scopes: ResponsiveScope[] = [];
  for (const name of names) {
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/i.test(name)) continue;
    const result = await verifyTailwindClass(`${name}:block`, root);
    if (!result.verified || !result.css) continue;
    const media = new Set<string>(); postcss.parse(result.css).walkAtRules('media', rule => { media.add(rule.params); });
    if (media.size !== 1) continue;
    const condition = [...media][0];
    const match = condition.match(/^\(\s*(?:min-width\s*:\s*|width\s*>=\s*)(\d+(?:\.\d+)?)(px|rem|em)\s*\)$/i);
    if (!match) continue; // Raw, max-only and compound screens need a different UI.
    const minWidth = Number(match[1]) * (match[2].toLowerCase() === 'px' ? 1 : 16);
    if (minWidth > 0 && minWidth <= 3840) scopes.push({ name, minWidth, media: condition });
  }
  return scopes.sort((a, b) => a.minWidth - b.minWidth || a.name.localeCompare(b.name));
}

export function verifySyntacticParse(filePath: string, content: string): { valid: boolean; error?: string } {
  try {
    const ext = path.extname(filePath).toLowerCase();
    // Only parse JavaScript/TypeScript/JSX/TSX source files
    if (!['.tsx', '.jsx', '.ts', '.js', '.mjs', '.cjs'].includes(ext)) {
      return { valid: true };
    }
    const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
    const sourceFile = project.createSourceFile(`temp${ext || '.tsx'}`, content);
    const diags = project.getProgram().compilerObject.getSyntacticDiagnostics(sourceFile.compilerNode);
    if (diags.length > 0) {
      const messages = diags.map((d: any) => typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText);
      return { valid: false, error: messages.join(', ') };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function findProjectRoot(filePath: string): string {
  let curr = path.dirname(path.resolve(filePath));
  const root = path.parse(curr).root;
  let fallbackRoot: string | null = null;
  while (curr && curr !== root) {
    const pkgJsonPath = path.join(curr, 'package.json');
    if (existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.tailwindcss) {
          return curr;
        }
        if (!fallbackRoot) fallbackRoot = curr;
      } catch {}
    }
    curr = path.dirname(curr);
  }
  return fallbackRoot || process.cwd();
}

declare const __non_webpack_require__: any;

function getNativeRequire(): any {
  if (typeof __non_webpack_require__ === 'function') {
    return __non_webpack_require__;
  }
  try {
    return createRequire(import.meta.url);
  } catch {}
  return (globalThis as any).require || null;
}

const req = getNativeRequire();

function loadTailwind3Config(root: string, installed: { dir: string; pkg: any }): any {
  const config = findProjectTailwindConfig(root);
  if (!config) return {};
  // Use the project's compiler loader for TS/ESM configurations. A failed
  // configuration must never silently compile with Tailwind's default theme.
  const nativeRequire = req || createRequire(path.join(root, 'package.json'));
  delete nativeRequire.cache[config.filePath];
  const loadConfig = nativeRequire(path.join(installed.dir, 'loadConfig.js'));
  return (loadConfig.default || loadConfig)(config.filePath);
}

function findInstalledPackage(packageName: string, projectDir: string): { dir: string; pkg: any } | null {
  let curr = path.resolve(projectDir);
  const root = path.parse(curr).root;
  while (curr && curr !== root) {
    const pkgJsonPath = path.join(curr, 'node_modules', packageName, 'package.json');
    if (existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        return { dir: path.dirname(pkgJsonPath), pkg };
      } catch {}
    }
    curr = path.dirname(curr);
  }
  return null;
}

function loadPackage(packageName: string, installed: { dir: string; pkg: any }, projectDir?: string): any {
  if (projectDir) {
    try {
      const projReq = createRequire(path.join(projectDir, 'package.json'));
      return projReq(packageName);
    } catch {}
  }
  try {
    const parentPkgJson = path.resolve(installed.dir, '..', '..', 'package.json');
    if (existsSync(parentPkgJson)) {
      const parentReq = createRequire(parentPkgJson);
      return parentReq(packageName);
    }
  } catch {}
  const entryCandidate =
    (typeof installed.pkg.exports === 'object' && installed.pkg.exports?.['.']?.require) ||
    installed.pkg.main ||
    'index.js';
  const fullPath = path.resolve(installed.dir, entryCandidate);
  if (existsSync(fullPath)) {
    try {
      const fileReq = createRequire(fullPath);
      return fileReq(fullPath);
    } catch {
      if (req) {
        try {
          return req(fullPath);
        } catch {}
      }
    }
  }
  for (const alt of ['dist/index.js', 'dist/lib.js', 'lib/index.js', 'index.js']) {
    const altPath = path.resolve(installed.dir, alt);
    if (existsSync(altPath)) {
      try {
        const fileReq = createRequire(altPath);
        return fileReq(altPath);
      } catch {
        if (req) {
          try {
            return req(altPath);
          } catch {}
        }
      }
    }
  }
  if (req) {
    try {
      return req(packageName);
    } catch {}
  }
  throw new Error(`Cannot load package ${packageName}`);
}

export interface CssEntryInfo {
  filePath: string;
  content: string;
  mtimeMs: number;
}

export function findProjectCssEntry(projectDir: string): CssEntryInfo | null {
  const rootLayoutCandidates = [
    'app/layout.tsx',
    'app/layout.jsx',
    'app/layout.js',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
    'src/app/layout.js',
    'pages/_app.tsx',
    'pages/_app.jsx',
    'pages/_app.js',
    'src/pages/_app.tsx',
    'src/pages/_app.jsx',
  ];

  let importedCssPath: string | null = null;
  for (const relLayout of rootLayoutCandidates) {
    const layoutPath = path.join(projectDir, relLayout);
    if (existsSync(layoutPath)) {
      try {
        const layoutSrc = readFileSync(layoutPath, 'utf8');
        const importMatches = layoutSrc.matchAll(/import\s+['"]([^'"]+\.css)['"]/g);
        for (const match of importMatches) {
          const specifier = match[1];
          let resolvedCss = '';
          if (specifier.startsWith('.')) {
            resolvedCss = path.resolve(path.dirname(layoutPath), specifier);
          } else if (specifier.startsWith('@/')) {
            resolvedCss = path.resolve(projectDir, specifier.slice(2));
          } else if (specifier.startsWith('/')) {
            resolvedCss = path.resolve(projectDir, specifier.slice(1));
          } else {
            resolvedCss = path.resolve(projectDir, specifier);
          }
          if (existsSync(resolvedCss)) {
            importedCssPath = resolvedCss;
            break;
          }
        }
      } catch {}
      if (importedCssPath) break;
    }
  }

  const commonNames = [
    'app/globals.css',
    'src/app/globals.css',
    'globals.css',
    'src/index.css',
    'index.css',
    'styles/globals.css',
    'src/styles/globals.css',
    'styles/index.css',
    'app/main.css',
    'src/main.css',
    'main.css',
  ];

  const candidatePaths: string[] = [];
  if (importedCssPath) {
    candidatePaths.push(importedCssPath);
  }
  for (const cn of commonNames) {
    const p = path.resolve(projectDir, cn);
    if (!candidatePaths.includes(p)) candidatePaths.push(p);
  }

  function scanForCssFiles(dir: string, depth = 0): string[] {
    if (depth > 4) return [];
    let results: string[] = [];
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (['node_modules', '.next', 'dist', 'build', '.git', '.slightnudge'].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(scanForCssFiles(full, depth + 1));
        } else if (entry.isFile() && entry.name.endsWith('.css')) {
          results.push(full);
        }
      }
    } catch {}
    return results;
  }

  const allScanned = scanForCssFiles(projectDir);
  for (const sc of allScanned) {
    if (!candidatePaths.includes(sc)) candidatePaths.push(sc);
  }

  const tailwindIndicator = /@import\s+['"]tailwindcss['"]|@tailwind\s+(base|components|utilities)/;

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf8');
        if (tailwindIndicator.test(content)) {
          const stat = statSync(p);
          return { filePath: p, content, mtimeMs: stat.mtimeMs };
        }
      } catch {}
    }
  }

  return null;
}

export function findProjectTailwindConfig(projectDir: string): { filePath: string; mtimeMs: number } | null {
  for (const name of [
    'tailwind.config.js',
    'tailwind.config.cjs',
    'tailwind.config.mjs',
    'tailwind.config.ts',
  ]) {
    const p = path.join(projectDir, name);
    if (existsSync(p)) {
      try {
        const stat = statSync(p);
        return { filePath: p, mtimeMs: stat.mtimeMs };
      } catch {}
    }
  }
  return null;
}

interface V4CacheEntry {
  cacheKey: string;
  ds: any;
}

const v4DesignSystemCache = new Map<string, V4CacheEntry>();

export async function verifyTailwindClass(candidate: string, projectDir: string): Promise<{ verified: boolean; css?: string; layer?: 'utilities'; error?: string }> {
  let rootDir = path.resolve(projectDir);
  if (existsSync(rootDir)) {
    try {
      if (statSync(rootDir).isFile()) {
        rootDir = findProjectRoot(rootDir);
      } else if (!existsSync(path.join(rootDir, 'package.json'))) {
        rootDir = findProjectRoot(rootDir);
      }
    } catch {
      rootDir = findProjectRoot(rootDir);
    }
  } else {
    rootDir = findProjectRoot(rootDir);
  }

  const twInstalled = findInstalledPackage('tailwindcss', rootDir);
  if (!twInstalled) {
    return { verified: false, error: "can't verify this class: tailwindcss is not installed" };
  }

  const targetPkgJsonPath = path.join(rootDir, 'package.json');
  if (existsSync(targetPkgJsonPath)) {
    try {
      const targetPkg = JSON.parse(readFileSync(targetPkgJsonPath, 'utf8'));
      const deps = { ...targetPkg.dependencies, ...targetPkg.devDependencies };
      if (!deps.tailwindcss) {
        return { verified: false, error: "can't verify this class: tailwindcss is not installed" };
      }
    } catch {}
  }

  const twVersion = twInstalled.pkg.version || '4';

  if (twVersion.startsWith('4')) {
    try {
      const cssEntry = findProjectCssEntry(rootDir);
      const config = findProjectTailwindConfig(rootDir);

      const cacheKey = `${rootDir}|${cssEntry?.filePath || ''}:${cssEntry?.mtimeMs || 0}|${config?.filePath || ''}:${config?.mtimeMs || 0}`;

      let ds: any = null;
      const cached = v4DesignSystemCache.get(rootDir);
      if (cached && cached.cacheKey === cacheKey) {
        ds = cached.ds;
      }

      if (!ds) {
        let cssInput: string;
        let baseDir: string;

        if (cssEntry) {
          cssInput = cssEntry.content;
          baseDir = path.dirname(cssEntry.filePath);
        } else if (config) {
          const normalizedConfigPath = config.filePath.split(path.sep).join('/');
          cssInput = `@import "tailwindcss";\n@config "${normalizedConfigPath}";\n`;
          baseDir = rootDir;
        } else {
          cssInput = '@import "tailwindcss";\n';
          baseDir = rootDir;
        }

        const twNodeInstalled = findInstalledPackage('@tailwindcss/node', rootDir);
        let twNode: any = null;
        if (twNodeInstalled) {
          try {
            twNode = loadPackage('@tailwindcss/node', twNodeInstalled, rootDir);
          } catch {}
        }

        if (twNode && typeof twNode.__unstable__loadDesignSystem === 'function') {
          ds = await twNode.__unstable__loadDesignSystem(cssInput, {
            base: baseDir,
          });
          v4DesignSystemCache.set(rootDir, { cacheKey, ds });
        } else {
          let compileFn: any = null;
          if (twNode && typeof twNode.compile === 'function') {
            compileFn = twNode.compile;
          } else {
            const tw = loadPackage('tailwindcss', twInstalled, rootDir);
            compileFn = tw.compile;
          }
          if (typeof compileFn === 'function') {
            const compiler = await compileFn(cssInput, {
              base: baseDir,
              onDependency: () => {},
            });
            ds = compiler;
            v4DesignSystemCache.set(rootDir, { cacheKey, ds });
          }
        }
      }

      if (ds) {
        if (typeof ds.candidatesToCss === 'function') {
          const css = ds.candidatesToCss([candidate]);
          if (Array.isArray(css) && css[0] && typeof css[0] === 'string' && css[0].trim().length > 0) {
            return { verified: true, css: css[0], layer: 'utilities' };
          }
          return { verified: false, error: `can't verify this class: "${candidate}" produced no CSS` };
        }
        if (typeof ds.build === 'function') {
          const empty = ds.build([]);
          const generated = ds.build([candidate]);
          if (generated !== empty && generated.length > empty.length) {
            return { verified: true, css: generated, layer: 'utilities' };
          }
          return { verified: false, error: `can't verify this class: "${candidate}" produced no CSS` };
        }
      }

      return { verified: false, error: "can't verify this class: no compile API available in tailwindcss v4" };
    } catch (err: any) {
      return { verified: false, error: `can't verify this class: ${err.message}` };
    }
  }

  if (twVersion.startsWith('3')) {
    try {
      const postcssInstalled = findInstalledPackage('postcss', rootDir);
      if (!postcssInstalled) {
        return { verified: false, error: "can't verify this class: postcss not found in project" };
      }
      const postcss = loadPackage('postcss', postcssInstalled, rootDir);
      const tailwindcss = loadPackage('tailwindcss', twInstalled, rootDir);

      const config = loadTailwind3Config(rootDir, twInstalled);

      const plugin = tailwindcss({
        ...config,
        content: [{ raw: `<div class="${candidate}"></div>` }],
      });

      const res = await postcss([plugin]).process('@tailwind components;\n@tailwind utilities;', { from: undefined });
      const css = (res.css || '').trim();
      if (css.length > 0) {
        return { verified: true, css };
      }
      return { verified: false, error: `can't verify this class: "${candidate}" produced no CSS in v3` };
    } catch (err: any) {
      return { verified: false, error: `can't verify this class: ${err.message}` };
    }
  }

  return { verified: false, error: `can't verify this class: unsupported tailwindcss version ${twVersion}` };
}
