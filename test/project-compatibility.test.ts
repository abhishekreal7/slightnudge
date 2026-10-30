import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectProjectCompatibility } from '../lib/slightnudge/project-compatibility';
import { editingCapabilities, nextDevCommand } from '../lib/slightnudge/editing-capabilities';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'sn-compatibility-'));
async function sample(name: string, pkg: unknown, versions: Record<string, string> = {}) {
  const root = path.join(temp, name);
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg));
  for (const [dependency, version] of Object.entries(versions)) {
    const directory = path.join(root, 'node_modules', dependency);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({ name: dependency, version }));
  }
  // Inspection must never execute repository config or package entry points.
  await fs.writeFile(path.join(root, 'next.config.js'), 'throw new Error("Do not execute project configuration")');
  return root;
}
try {
  const current = await sample('current', { dependencies: { next: '^16', tailwindcss: '^4' } }, { next: '16.4.3', tailwindcss: '4.3.3' });
  const result = await inspectProjectCompatibility(current, ['src/app/(marketing)/page.tsx']);
  assert.equal(result.router, 'app');
  assert.equal(result.sourceMapping, true);
  assert.equal(result.nextVersion, '16.4.3');
  assert.equal(result.checks.find(check => check.id === 'styles')?.state, 'available');
  const capabilities = editingCapabilities(result);
  assert.equal(capabilities.items.find(item => item.id === 'text')?.state, 'available');
  assert.equal(capabilities.items.find(item => item.id === 'responsive')?.state, 'available');
  assert.equal(capabilities.items.find(item => item.id === 'generated')?.state, 'limited');
  assert.match(capabilities.nextStep, /connect its local preview/);
  const pages = await sample('pages', { dependencies: { next: '^14', tailwindcss: '^3' } }, { next: '14.2.35', tailwindcss: '3.4.17' });
  assert.equal((await inspectProjectCompatibility(pages, ['pages/index.tsx'])).router, 'pages');
  assert.equal((await inspectProjectCompatibility(pages, ['pages/index.tsx', 'app/page.jsx'])).router, 'mixed');
  assert.equal((await inspectProjectCompatibility(pages, ['pages/api/hello.ts', 'pages/_app.tsx'])).router, 'unknown');
  const old = await sample('old', { dependencies: { next: '^12' } }, { next: '12.3.4' });
  assert.equal((await inspectProjectCompatibility(old, [])).sourceMapping, false);
  const pending = await sample('pending', { dependencies: { next: '^16', tailwindcss: '^4' } });
  const setup = await inspectProjectCompatibility(pending, ['app/page.tsx']);
  assert.equal(setup.nextVersion, undefined, 'Declared ranges are not installed versions');
  assert.equal(setup.checks.find(check => check.id === 'framework')?.state, 'setup');
  assert.equal(setup.checks.find(check => check.id === 'styles')?.state, 'setup');
  assert.equal(editingCapabilities(setup).items.find(item => item.id === 'text')?.state, 'setup');
  assert.match(editingCapabilities(setup).nextStep, /Install dependencies/);
  await fs.mkdir(path.join(temp, 'node_modules/next'), { recursive: true });
  await fs.writeFile(path.join(temp, 'node_modules/next/package.json'), JSON.stringify({ version: '16.4.3' }));
  assert.equal((await inspectProjectCompatibility(pending, [])).nextVersion, undefined, 'Never borrow the editor or ancestor installation');
  const vite = await sample('vite', { devDependencies: { vite: '^7' }, dependencies: { react: '^19' } });
  assert.equal((await inspectProjectCompatibility(vite, ['src/App.tsx'])).sourceMapping, false);
  assert.equal(editingCapabilities(await inspectProjectCompatibility(vite, ['src/App.tsx'])).items.find(item => item.id === 'styles')?.state, 'unsupported');
  const workspace = await sample('workspace', { workspaces: ['apps/*'] });
  assert.match((await inspectProjectCompatibility(workspace, ['apps/web/app/page.tsx'])).checks[0].detail, /app as the project root/);
  const css = await sample('css', { dependencies: { next: '^16' } }, { next: '16.4.3' });
  assert.match((await inspectProjectCompatibility(css, ['app/page.tsx'])).checks.find(check => check.id === 'styles')!.detail, /Static text can be edited/);
  assert.equal(editingCapabilities(await inspectProjectCompatibility(css, ['app/page.tsx'])).items.find(item => item.id === 'styles')?.state, 'limited');
  assert.doesNotMatch(nextDevCommand('14.2.35'), /--webpack/);
  assert.doesNotMatch(nextDevCommand('15.5.0'), /--webpack/);
  assert.match(nextDevCommand('15.6.0-canary.59'), /--webpack/);
  assert.match(nextDevCommand('16.4.3'), /--webpack/);
  const future = await sample('future', { dependencies: { next: '^16', tailwindcss: '^5' } }, { next: '16.4.3', tailwindcss: '5.0.0' });
  assert.equal((await inspectProjectCompatibility(future, [])).checks.find(check => check.id === 'styles')?.state, 'limited');
  await fs.writeFile(path.join(vite, 'package.json'), '{malformed');
  assert.equal((await inspectProjectCompatibility(vite, [])).sourceMapping, false);
  console.log('PASS compatibility metadata matrix: App/Pages/mixed routers, Next 12/14/16, Tailwind 3/4/5, missing dependencies, CSS-only, Vite, monorepo and malformed manifest; no project code executed.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
