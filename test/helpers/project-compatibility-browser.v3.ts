import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Page } from 'playwright';

export async function checkProjectCompatibility(page: Page, baseURL: string, workspace: string, evidenceRoot: string) {
 page=iframePageV3(page);

  const storage = path.join(workspace, '.slightnudge');
  fs.mkdirSync(storage, { recursive: true });
  const repositories = [];
  for (const [id, version] of [['compatible', '16.4.3'], ['old-next', '12.3.4'], ['pending-install', 'pending'], ['tailwind-ready', '14.2.35'], ['vite-project', '']] as const) {
    const localPath = path.join(storage, 'repositories', id);
    fs.mkdirSync(path.join(localPath, 'app'), { recursive: true });
    fs.writeFileSync(path.join(localPath, 'package.json'), JSON.stringify({ dependencies: version ? { next: version } : { vite: '^7' } }));
    fs.writeFileSync(path.join(localPath, 'app/page.tsx'), 'export default function Page() { return <h1>Local project</h1>; }');
    if (version && version !== 'pending') {
      fs.mkdirSync(path.join(localPath, 'node_modules/next'), { recursive: true });
      fs.writeFileSync(path.join(localPath, 'node_modules/next/package.json'), JSON.stringify({ version }));
    }
    if (id === 'tailwind-ready') {
      fs.mkdirSync(path.join(localPath, 'node_modules/tailwindcss'), { recursive: true });
      fs.writeFileSync(path.join(localPath, 'node_modules/tailwindcss/package.json'), JSON.stringify({ version: '3.4.17' }));
    }
    execFileSync('git', ['init', '--quiet'], { cwd: localPath, windowsHide: true });
    execFileSync('git', ['add', 'package.json', 'app/page.tsx'], { cwd: localPath, windowsHide: true });
    repositories.push({ id, localPath, name: id, owner: 'qualification', defaultBranch: 'main', url: `https://github.com/qualification/${id}` });
  }
  fs.writeFileSync(path.join(storage, 'repositories.json'), JSON.stringify(repositories));
  await page.route('**/docker-preview', route => route.fulfill({ json: { available: false, state: 'unavailable', message: 'Not started during compatibility inspection.' } }));
  const errors: string[] = [];
  const errorListener = (error: Error) => errors.push(error.message);
  page.on('pageerror', errorListener);
  try {
    await page.goto(`${baseURL}/studio/compatible`);
    const details = page.locator('details').filter({ has: page.getByText('Editing compatibility', { exact: true }) });
    await details.locator(':scope > summary').waitFor();
    assert.equal(await details.getAttribute('open'), null, 'Details stay collapsed to avoid setup clutter');
    await details.locator(':scope > summary').focus();
    await details.locator(':scope > summary').press('Enter');
    await details.getByText('Project details', { exact: true }).click();
    await details.getByText(/Next.js 16.4.3 installed/).waitFor();
    await details.getByText(/Static text can be edited/).waitFor();
    assert.equal(await details.locator('[data-capability="text"]').getAttribute('data-state'), 'available');
    assert.equal(await details.locator('[data-capability="styles"]').getAttribute('data-state'), 'limited');
    assert.equal(await details.locator('[data-capability="generated"]').getAttribute('data-state'), 'limited');
    await details.getByText(/Each edit is verified before it enters your draft/).waitFor();
    await details.getByText('Project details', { exact: true }).click();
    await page.screenshot({ path: path.join(evidenceRoot, 'docs/project-compatibility.png'), fullPage: true });
    await page.goto(`${baseURL}/studio/old-next`);
    await page.getByRole('button', { name: 'Enable source mapping', exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Enable source mapping', exact: true }).isDisabled());
    await page.getByText('Editing compatibility', { exact: true }).click();
    await page.locator('[data-compatibility-next-step]').filter({ hasText: 'requires Next.js 13 or newer' }).waitFor();
    await page.goto(`${baseURL}/studio/pending-install`);
    await page.getByRole('button', { name: 'Enable source mapping', exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Enable source mapping', exact: true }).isDisabled());
    await page.getByText('Editing compatibility', { exact: true }).click();
    await page.getByText(/Install dependencies in this app’s folder/).waitFor();
    assert.equal(await page.locator('[data-capability="text"]').getAttribute('data-state'), 'setup');
    await page.goto(`${baseURL}/studio/tailwind-ready`);
    await page.getByText('Editing compatibility', { exact: true }).click();
    assert.equal(await page.locator('[data-capability="responsive"]').getAttribute('data-state'), 'available');
    assert.equal(await page.locator('[data-capability="generated"]').getAttribute('data-state'), 'limited');
    await page.goto(`${baseURL}/studio/vite-project`);
    await page.getByText('Editing compatibility', { exact: true }).click();
    await page.locator('[data-compatibility-next-step]').filter({ hasText: 'Visual source editing currently requires a Next.js project' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enable source mapping', exact: true }).count(), 0);
    for (const repository of repositories) assert.ok(!fs.existsSync(path.join(repository.localPath, '.slightnudge-source-adapter')), 'Read-only compatibility must not install adapters');
    assert.deepEqual(errors, []);
    console.log('PASS real project setup/API compatibility: keyboard expansion, installed versions and CSS-only limits, older Next enable refusal, Vite guidance; no source/config writes or browser errors.');
    return 1;
  } finally { page.off('pageerror', errorListener); }
}
