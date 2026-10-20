import { Project } from 'ts-morph';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

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

function loadPackage(packageName: string, installed: { dir: string; pkg: any }): any {
  if (req) {
    try {
      return req(packageName);
    } catch {}
    const entryCandidate =
      (typeof installed.pkg.exports === 'object' && installed.pkg.exports?.['.']?.require) ||
      installed.pkg.main ||
      'index.js';
    const fullPath = path.resolve(installed.dir, entryCandidate);
    if (existsSync(fullPath)) {
      try {
        return req(fullPath);
      } catch {}
    }
    for (const alt of ['dist/index.js', 'dist/lib.js', 'lib/index.js', 'index.js']) {
      const altPath = path.resolve(installed.dir, alt);
      if (existsSync(altPath)) {
        try {
          return req(altPath);
        } catch {}
      }
    }
    try {
      return req(installed.dir);
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

export async function verifyTailwindClass(candidate: string, projectDir: string): Promise<{ verified: boolean; css?: string; error?: string }> {
  const twInstalled = findInstalledPackage('tailwindcss', projectDir);
  if (!twInstalled) {
    return { verified: false, error: "can't verify this class: tailwindcss is not installed" };
  }

  const targetPkgJsonPath = path.join(projectDir, 'package.json');
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
      const cssEntry = findProjectCssEntry(projectDir);
      const config = findProjectTailwindConfig(projectDir);

      const cacheKey = `${projectDir}|${cssEntry?.filePath || ''}:${cssEntry?.mtimeMs || 0}|${config?.filePath || ''}:${config?.mtimeMs || 0}`;

      let ds: any = null;
      const cached = v4DesignSystemCache.get(projectDir);
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
          baseDir = projectDir;
        } else {
          cssInput = '@import "tailwindcss";\n';
          baseDir = projectDir;
        }

        const twNodeInstalled = findInstalledPackage('@tailwindcss/node', projectDir);
        let twNode: any = null;
        if (twNodeInstalled) {
          try {
            twNode = loadPackage('@tailwindcss/node', twNodeInstalled);
          } catch {}
        }

        if (twNode && typeof twNode.__unstable__loadDesignSystem === 'function') {
          ds = await twNode.__unstable__loadDesignSystem(cssInput, {
            base: baseDir,
          });
          v4DesignSystemCache.set(projectDir, { cacheKey, ds });
        } else {
          let compileFn: any = null;
          if (twNode && typeof twNode.compile === 'function') {
            compileFn = twNode.compile;
          } else {
            const tw = loadPackage('tailwindcss', twInstalled);
            compileFn = tw.compile;
          }
          if (typeof compileFn === 'function') {
            const compiler = await compileFn(cssInput, {
              base: baseDir,
              onDependency: () => {},
            });
            ds = compiler;
            v4DesignSystemCache.set(projectDir, { cacheKey, ds });
          }
        }
      }

      if (ds) {
        if (typeof ds.candidatesToCss === 'function') {
          const css = ds.candidatesToCss([candidate]);
          if (Array.isArray(css) && css[0] && typeof css[0] === 'string' && css[0].trim().length > 0) {
            return { verified: true, css: css[0] };
          }
          return { verified: false, error: `can't verify this class: "${candidate}" produced no CSS` };
        }
        if (typeof ds.build === 'function') {
          const empty = ds.build([]);
          const generated = ds.build([candidate]);
          if (generated !== empty && generated.length > empty.length) {
            return { verified: true, css: generated };
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
      const postcssInstalled = findInstalledPackage('postcss', projectDir);
      if (!postcssInstalled) {
        return { verified: false, error: "can't verify this class: postcss not found in project" };
      }
      const postcss = loadPackage('postcss', postcssInstalled);
      const tailwindcss = loadPackage('tailwindcss', twInstalled);

      const configInfo = findProjectTailwindConfig(projectDir);
      let config: any = {};
      if (configInfo) {
        try {
          config = req(configInfo.filePath);
          if (config && config.default) config = config.default;
        } catch {}
      }

      const plugin = tailwindcss({
        ...config,
        content: [{ raw: `<div class="${candidate}"></div>` }],
      });

      const res = await postcss([plugin]).process('@tailwind utilities;', { from: undefined });
      const css = (res.css || '').trim();
      if (css.length > 0 && css.includes(candidate)) {
        return { verified: true, css };
      }
      return { verified: false, error: `can't verify this class: "${candidate}" produced no CSS in v3` };
    } catch (err: any) {
      return { verified: false, error: `can't verify this class: ${err.message}` };
    }
  }

  return { verified: false, error: `can't verify this class: unsupported tailwindcss version ${twVersion}` };
}
