import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveRepositoryRoot } from './repository-store';

const adapterDirectoryName = '.slightnudge-source-adapter';
const stateFileName = 'state.json';
const generatedConfigMarker = 'slightnudge-source-adapter';

export const bridgeClient = `
(() => {
  const currentUrl = new URL(window.location.href);
  const session = currentUrl.searchParams.get('__slightnudge_session');
  const parentOrigin = currentUrl.searchParams.get('__slightnudge_parent');
  if (!session || !parentOrigin || window.parent === window) return;
  let parsedParent;
  try { parsedParent = new URL(parentOrigin); } catch { return; }
  if (!['http:', 'https:'].includes(parsedParent.protocol) || parsedParent.origin !== parentOrigin) return;

  let selected = null;
  function send(type, target, clicked) {
    if (!target?.isConnected) return;
    const marker = target.closest('[data-source-file]');
    if (!marker) return;
    const rect = marker.getBoundingClientRect();
    const clickedEl = (clicked instanceof Element && clicked.isConnected) ? clicked : marker;
    const clickedRect = clickedEl.getBoundingClientRect();
    const selection = {
      path: marker.dataset.sourceFile,
      line: Number(marker.dataset.sourceLine),
      column: Number(marker.dataset.sourceColumn),
      tagName: clickedEl.tagName.toLowerCase(),
      sourceTagName: marker.tagName.toLowerCase(),
      elementId: marker.id || undefined,
      className: typeof clickedEl.className === 'string' ? clickedEl.className : '',
      textContent: marker.textContent || '',
      imageSource: marker instanceof HTMLImageElement ? marker.getAttribute('src') || '' : undefined,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      clickedRect: { top: clickedRect.top, left: clickedRect.left, width: clickedRect.width, height: clickedRect.height },
    };
    if (!selection.path || !Number.isSafeInteger(selection.line) || !Number.isSafeInteger(selection.column)) return;
    window.parent.postMessage({ channel: 'slightnudge', type, session, selection }, parentOrigin);
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const marker = event.target.closest('[data-source-file]');
    if (!marker) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selected = marker;
    send('source-selection', marker, event.target);
  }, true);

  window.addEventListener('message', (event) => {
    if (event.origin !== parentOrigin || event.source !== window.parent) return;
    const message = event.data;
    if (!selected || !message || message.channel !== 'slightnudge' || message.session !== session || message.type !== 'preview-change') return;
    const target = message.selection;
    if (!target || target.path !== selected.dataset.sourceFile || Number(target.line) !== Number(selected.dataset.sourceLine) || Number(target.column) !== Number(selected.dataset.sourceColumn)) return;
    if (!selected.isConnected) {
      selected = Array.from(document.querySelectorAll('[data-source-file]')).find((element) =>
        element.getAttribute('data-source-file') === target.path && Number(element.getAttribute('data-source-line')) === Number(target.line) && Number(element.getAttribute('data-source-column')) === Number(target.column),
      ) || null;
      if (!selected) return;
    }
    if (message.property === 'className' && typeof message.value === 'string' && message.value.length <= 1200) selected.className = message.value;
    if (message.property === 'textContent' && typeof message.value === 'string' && message.value.length <= 2000) selected.textContent = message.value;
    if (message.property === 'imageSource' && selected instanceof HTMLImageElement && typeof message.value === 'string' && /^\\/slightnudge-assets\\/[a-f0-9-]{36}\\.(?:png|jpe?g|webp|gif)$/i.test(message.value)) selected.setAttribute('src', message.value);
    if (message.property === 'reorder') {
      if (message.direction === 'earlier') {
        const prev = selected.previousElementSibling;
        if (prev) prev.before(selected);
      } else if (message.direction === 'later') {
        const next = selected.nextElementSibling;
        if (next) next.after(selected);
      }
    }
    send('source-rect', selected);
  });

  window.addEventListener('scroll', () => { if (selected) send('source-rect', selected); }, { passive: true });
  window.addEventListener('resize', () => { if (selected) send('source-rect', selected); }, { passive: true });
})();
`;

interface AdapterState {
  version: 1;
  backupName: string | null;
  wrapperName: 'next.config.mjs';
  installedAt: string;
}

async function exists(filePath: string) {
  try { await lstat(filePath); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function getState(root: string): Promise<AdapterState | null> {
  const statePath = path.join(root, adapterDirectoryName, stateFileName);
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8')) as AdapterState;
    return state?.version === 1 && state.wrapperName === 'next.config.mjs' ? state : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error('SlightNudge found an unreadable Next.js adapter state file.');
  }
}

export async function getNextSourceAdapterStatus(repositoryId: string) {
  const root = await resolveRepositoryRoot(repositoryId);
  return { enabled: Boolean(await getState(root)) };
}

export async function installNextSourceAdapter(repositoryId: string) {
  const root = await resolveRepositoryRoot(repositoryId);
  const existingState = await getState(root);
  if (existingState) return { success: true as const, alreadyInstalled: true, restartRequired: true };

  const packagePath = path.join(root, 'package.json');
  const packageInfo = JSON.parse(await readFile(packagePath, 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const declaredNext = packageInfo.dependencies?.next || packageInfo.devDependencies?.next || '';
  if (!declaredNext) throw new Error('This adapter currently supports Next.js repositories only.');
  const nextVersionPath = path.join(root, 'node_modules', 'next', 'package.json');
  let nextVersion = declaredNext;
  try { nextVersion = (JSON.parse(await readFile(nextVersionPath, 'utf8')) as { version: string }).version; } catch { /* Resolve from the manifest when dependencies are not installed yet. */ }
  const match = nextVersion.match(/(?:^|[^0-9])(\d+)\.(\d+)/);
  if (!match || Number(match[1]) < 16 || (Number(match[1]) === 16 && Number(match[2]) < 3)) {
    throw new Error('Click-to-source needs Next.js 16.3 or newer. This adapter will not change an older Next.js configuration.');
  }

  const configNames = ['next.config.js', 'next.config.mjs', 'next.config.cjs', 'next.config.ts', 'next.config.mts', 'next.config.cts'];
  const configs = [] as string[];
  for (const name of configNames) if (await exists(path.join(root, name))) configs.push(name);
  if (configs.length > 1) throw new Error('This repository has multiple Next.js config files. Remove the duplicate config before enabling source mapping.');
  const originalName = configs[0] || null;
  if (originalName && /\.tsx?$|\.mts$|\.cts$/i.test(originalName)) {
    throw new Error('This first adapter supports JavaScript Next.js config files (.js, .mjs, or .cjs). Your TypeScript config is unchanged.');
  }

  const adapterRoot = path.join(root, adapterDirectoryName);
  if (await exists(adapterRoot)) throw new Error('A .slightnudge-source-adapter folder already exists in this repository. Rename it before enabling the adapter.');
  const configPath = path.join(root, 'next.config.mjs');
  if (originalName !== 'next.config.mjs' && await exists(configPath)) {
    throw new Error('A next.config.mjs file already exists. Resolve the duplicate Next.js config before enabling source mapping.');
  }

  await mkdir(adapterRoot, { recursive: false });
  let backupName: string | null = null;
  try {
    const loaderSource = await readFile(path.join(process.cwd(), 'lib', 'slightnudge', 'next-source-loader.cjs'), 'utf8');
    await writeFile(path.join(adapterRoot, 'next-source-loader.cjs'), loaderSource, { encoding: 'utf8', flag: 'wx' });
    await writeFile(path.join(adapterRoot, 'bridge-client.mjs'), bridgeClient, { encoding: 'utf8', flag: 'wx' });

    if (originalName) {
      const extension = path.extname(originalName);
      backupName = `next.config.slightnudge-original${extension}`;
      const backupPath = path.join(root, backupName);
      if (await exists(backupPath)) throw new Error(`The preserved config path ${backupName} already exists.`);
      await rename(path.join(root, originalName), backupPath);
    }

    const originalImport = backupName ? `const importedConfig = await import('./${backupName}');\n  const baseConfig = importedConfig.default ?? importedConfig;` : 'const baseConfig = {};';
    const wrapper = `/* eslint-disable */\n// ${generatedConfigMarker}: generated for development previews; remove through SlightNudge to restore the original config.\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nconst projectRoot = path.dirname(fileURLToPath(import.meta.url));\n${originalImport}\n\nexport default async function slightNudgeNextConfig(phase, context) {\n  const resolved = typeof baseConfig === 'function' ? await baseConfig(phase, context) : baseConfig;\n  const config = { ...resolved };\n  config.instrumentationClientInject = [...(config.instrumentationClientInject || []), './${adapterDirectoryName}/bridge-client.mjs'];\n  const originalWebpack = config.webpack;\n  config.webpack = (webpackConfig, options) => {\n    const applyAdapter = (nextConfig) => {\n      const result = nextConfig || webpackConfig;\n      if (options.dev) {\n        result.module.rules.push({\n          test: /\\.[jt]sx?$/,\n          include: [projectRoot],\n          enforce: 'pre',\n          use: [{ loader: path.join(projectRoot, '${adapterDirectoryName}', 'next-source-loader.cjs'), options: { development: true, root: projectRoot } }],\n        });\n      }\n      return result;\n    };\n    const previous = originalWebpack ? originalWebpack(webpackConfig, options) : webpackConfig;\n    return previous && typeof previous.then === 'function' ? previous.then(applyAdapter) : applyAdapter(previous);\n  };\n  return config;\n}\n`;
    await writeFile(configPath, wrapper, { encoding: 'utf8', flag: 'wx' });
    const state: AdapterState = { version: 1, backupName, wrapperName: 'next.config.mjs', installedAt: new Date().toISOString() };
    await writeFile(path.join(adapterRoot, stateFileName), JSON.stringify(state, null, 2), { encoding: 'utf8', flag: 'wx' });
    return { success: true as const, alreadyInstalled: false, restartRequired: true };
  } catch (error) {
    await rm(configPath, { force: true }).catch(() => undefined);
    if (backupName && await exists(path.join(root, backupName))) {
      await rename(path.join(root, backupName), path.join(root, originalName!)).catch(() => undefined);
    }
    await rm(adapterRoot, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

export async function removeNextSourceAdapter(repositoryId: string) {
  const root = await resolveRepositoryRoot(repositoryId);
  const state = await getState(root);
  if (!state) return { success: true as const, removed: false, restartRequired: false };
  const configPath = path.join(root, state.wrapperName);
  const wrapper = await readFile(configPath, 'utf8').catch(() => '');
  if (!wrapper.includes(generatedConfigMarker)) throw new Error('The Next.js config changed after adapter setup. Restore or merge it manually before removing the adapter.');

  await rm(configPath, { force: true });
  if (state.backupName) {
    const backupPath = path.join(root, state.backupName);
    if (!(await exists(backupPath))) throw new Error('The original Next.js config backup is missing; it was not deleted.');
    await rename(backupPath, path.join(root, `next.config${path.extname(state.backupName)}`));
  }
  const adapterRoot = path.join(root, adapterDirectoryName);
  for (const name of ['next-source-loader.cjs', 'bridge-client.mjs', stateFileName]) {
    const target = path.join(adapterRoot, name);
    if (await exists(target)) {
      const info = await lstat(target);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('An adapter file was replaced; it was left untouched.');
      await rm(target);
    }
  }
  await rm(adapterRoot, { recursive: false }).catch(() => undefined);
  return { success: true as const, removed: true, restartRequired: true };
}
