import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface CompatibilityCheck {
  id: string;
  label: string;
  state: 'available' | 'setup' | 'limited' | 'unsupported';
  detail: string;
}
export interface ProjectCompatibility {
  framework: string;
  nextVersion?: string;
  tailwindVersion?: string;
  router: 'app' | 'pages' | 'mixed' | 'unknown';
  sourceMapping: boolean;
  checks: CompatibilityCheck[];
}

type Manifest = { version?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; workspaces?: unknown };

async function manifest(file: string): Promise<Manifest | null> {
  try {
    const source = await readFile(file, 'utf8');
    if (source.length > 1024 * 1024) return null;
    const value = JSON.parse(source);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

/** Read package metadata only. Never load a repository's configuration or scripts. */
export async function inspectProjectCompatibility(root: string, files: string[]): Promise<ProjectCompatibility> {
  const pkg = await manifest(path.join(root, 'package.json'));
  const deps = { ...pkg?.devDependencies, ...pkg?.dependencies };
  const installed = async (name: string) => {
    try {
      // Do not climb into the editor's own node_modules when a fresh clone
      // has no installation. Direct paths also work with pnpm junctions.
      const value = (await manifest(path.join(root, 'node_modules', name, 'package.json')))?.version;
      return typeof value === 'string' && /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(value) ? value : undefined;
    } catch { return undefined; }
  };
  const [nextVersion, tailwindVersion] = await Promise.all([installed('next'), installed('tailwindcss')]);
  const framework = deps.next ? 'Next.js' : deps.vite ? 'Vite' : deps.react ? 'React' : 'Web application';
  const app = files.some(file => /^(?:src\/)?app\/(?:.*\/)?page\.[jt]sx?$/.test(file));
  const pages = files.some(file => /^(?:src\/)?pages\/(?!api\/|_app\.|_document\.|_error\.).*\.[jt]sx?$/.test(file));
  const router = app && pages ? 'mixed' : app ? 'app' : pages ? 'pages' : 'unknown';
  const major = nextVersion ? Number(nextVersion.split('.')[0]) : undefined;
  const sourceMapping = framework === 'Next.js' && (major === undefined || major >= 13);
  const checks: CompatibilityCheck[] = [];
  checks.push({ id: 'framework', label: 'Source mapping', state: !sourceMapping ? 'unsupported' : nextVersion ? 'available' : 'setup', detail: framework !== 'Next.js'
    ? pkg?.workspaces ? 'Choose a Next.js app as the project root. Workspace-root editing is not supported yet.' : 'Visual source editing currently requires a Next.js project. You can still inspect source files.'
    : major !== undefined && major < 13 ? `Next.js ${nextVersion} is installed. Source mapping requires Next.js 13 or newer.`
    : nextVersion ? `Next.js ${nextVersion} installed. Use the development adapter with Webpack; a live connection still needs verification.`
    : 'Install this project’s dependencies before enabling source mapping. The declared version is not a verified runtime.' });
  checks.push({ id: 'router', label: 'Page structure', state: router === 'app' ? 'available' : 'limited', detail: router === 'app'
    ? 'App Router detected. Static JSX elements can be inspected once the adapter connects.'
    : router === 'pages' || router === 'mixed' ? `${router === 'mixed' ? 'App and Pages routers' : 'Pages Router'} detected. This layout has not completed the current end-to-end editing qualification.`
    : 'No conventional Next.js page entry was found. Monorepos and custom source roots need an app-level connection.' });
  const tailwindMajor = tailwindVersion?.split('.')[0];
  checks.push({ id: 'styles', label: 'Visual styles', state: tailwindMajor === '3' || tailwindMajor === '4' ? 'available' : deps.tailwindcss && !tailwindVersion ? 'setup' : 'limited', detail: tailwindMajor === '3' || tailwindMajor === '4'
    ? `Tailwind ${tailwindVersion} installed. Each style edit is checked with this project’s compiler; computed class expressions remain protected.`
    : deps.tailwindcss && !tailwindVersion ? 'Tailwind is declared but its installed compiler could not be read. Install dependencies to verify visual style edits.'
    : tailwindVersion ? `Tailwind ${tailwindVersion} is outside the supported compiler versions (3 and 4). Style editing is limited.`
    : 'No installed Tailwind compiler was found. Static text can be edited; CSS modules, CSS-in-JS and arbitrary styles are not rewritten.' });
  checks.push({ id: 'content', label: 'Editable content', state: 'limited', detail: 'Static JSX text and literal classes are supported. Prop-driven labels, repeated elements and dynamic expressions are checked individually and may require source changes.' });
  return { framework, nextVersion, tailwindVersion, router, sourceMapping, checks };
}
