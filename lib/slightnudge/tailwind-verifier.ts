import { Project } from 'ts-morph';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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
  while (curr && curr !== root) {
    if (existsSync(path.join(curr, 'package.json'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

function findInstalledPackage(packageName: string, startDir: string): { dir: string; pkg: any } | null {
  let curr = path.resolve(startDir);
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
  const cwdPkgJson = path.join(process.cwd(), 'node_modules', packageName, 'package.json');
  if (existsSync(cwdPkgJson)) {
    try {
      const pkg = JSON.parse(readFileSync(cwdPkgJson, 'utf8'));
      return { dir: path.dirname(cwdPkgJson), pkg };
    } catch {}
  }
  return null;
}

function loadPackage(installed: { dir: string; pkg: any }): any {
  const nativeRequire = eval('require');
  const entryCandidate =
    (typeof installed.pkg.exports === 'object' && installed.pkg.exports?.['.']?.require) ||
    installed.pkg.main ||
    'index.js';
  const fullPath = path.resolve(installed.dir, entryCandidate);
  if (existsSync(fullPath)) {
    return nativeRequire(fullPath);
  }
  for (const alt of ['dist/index.js', 'dist/lib.js', 'lib/index.js', 'index.js']) {
    const altPath = path.resolve(installed.dir, alt);
    if (existsSync(altPath)) {
      return nativeRequire(altPath);
    }
  }
  return nativeRequire(installed.dir);
}

const v4Cache = new Map<string, any>();

export async function verifyTailwindClass(candidate: string, projectDir: string): Promise<{ verified: boolean; css?: string; error?: string }> {
  const twInstalled = findInstalledPackage('tailwindcss', projectDir);
  if (!twInstalled) {
    return { verified: false, error: "can't verify this class: tailwindcss is not installed" };
  }

  const twVersion = twInstalled.pkg.version || '4';

  if (twVersion.startsWith('4')) {
    try {
      let ds = v4Cache.get(projectDir);
      if (!ds) {
        const twNodeInstalled = findInstalledPackage('@tailwindcss/node', projectDir);
        let twNode: any = null;
        if (twNodeInstalled) {
          try {
            twNode = loadPackage(twNodeInstalled);
          } catch {}
        }

        if (twNode && typeof twNode.__unstable__loadDesignSystem === 'function') {
          ds = await twNode.__unstable__loadDesignSystem('@import "tailwindcss";', {
            base: projectDir,
          });
          v4Cache.set(projectDir, ds);
        } else {
          let compileFn: any = null;
          if (twNode && typeof twNode.compile === 'function') {
            compileFn = twNode.compile;
          } else {
            const tw = loadPackage(twInstalled);
            compileFn = tw.compile;
          }
          if (typeof compileFn === 'function') {
            const compiler = await compileFn('@import "tailwindcss";', {
              base: projectDir,
              onDependency: () => {},
            });
            ds = compiler;
            v4Cache.set(projectDir, ds);
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
      const postcss = loadPackage(postcssInstalled);
      const tailwindcss = loadPackage(twInstalled);

      let config: any = {};
      for (const configName of ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs']) {
        const p = path.join(projectDir, configName);
        if (existsSync(p)) {
          try {
            config = eval('require')(p);
            break;
          } catch {}
        }
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
