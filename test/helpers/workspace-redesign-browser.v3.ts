import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import type { Page } from 'playwright';

export async function checkWorkspaceRedesign(page: Page, baseURL: string) {
 page=iframePageV3(page);

  let imports = 0;
  let received: unknown;
  await page.route('**/api/slightnudge/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: { token: 'disposable-test-placeholder' } });
    if (route.request().method() === 'POST') { imports++; received = route.request().postDataJSON(); return route.fulfill({ status: 422, json: { error: 'This repository is unavailable. Check the URL and try again.' } }); }
    return route.fulfill({ json: { repositories: [
      { id: 'test-landing', name: 'Landing', owner: 'acme', defaultBranch: 'main', importedAt: '2026-10-24T00:00:00Z', url: 'https://github.com/acme/landing' },
      { id: 'test-dashboard', name: 'Dashboard', owner: 'studio', defaultBranch: 'develop', importedAt: '2026-10-23T00:00:00Z', url: 'https://github.com/studio/dashboard' },
      { id: 'local-lab', name: 'm0-control-lab', owner: 'local', defaultBranch: 'main', importedAt: '', url: '' },
    ] } });
  });
  await page.goto(`${baseURL}/workspace`);
  await page.getByRole('link', { name: /Landing.*acme/ }).waitFor();
  assert.equal(await page.getByText('m0-control-lab', { exact: true }).count(), 0); assert.equal(imports, 0);
  assert.equal(await page.getByRole('button', { name: 'Share', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Imported', exact: true }).click();
  assert.equal(await page.getByRole('link', { name: /Open playground/ }).count(), 0);
  const search = page.getByRole('searchbox', { name: 'Search projects', exact: true });
  await search.fill('develop');
  assert.equal(await page.getByRole('link', { name: /Landing.*acme/ }).count(), 0);
  assert.ok(await page.getByRole('link', { name: /Dashboard.*studio/ }).isVisible());
  await search.fill('nothing-matches'); await page.getByText('No projects found', { exact: true }).waitFor();
  await search.fill('');
  await page.getByRole('button', { name: 'Import project', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import a project', exact: true }); await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); assert.equal(imports, 0);
  await page.getByRole('button', { name: 'Import project', exact: true }).click();
  await page.getByLabel('Public GitHub repository', { exact: true }).fill('https://github.com/acme/landing');
  await dialog.getByRole('button', { name: 'Import repository', exact: true }).click();
  await dialog.getByRole('alert').waitFor(); assert.equal(imports, 1); assert.deepEqual(received, { url: 'https://github.com/acme/landing' });
  assert.equal(await page.getByLabel('Public GitHub repository', { exact: true }).inputValue(), 'https://github.com/acme/landing');
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  await page.keyboard.press('Control+k'); assert.equal(await search.evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  assert.equal(await page.getByRole('link', { name: /Landing.*acme/ }).getAttribute('href'), '/studio/test-landing');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (process.argv.includes('--screenshot')) {
    await page.screenshot({ path: path.join(os.tmpdir(), 'slightnudge-workspace-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.screenshot({ path: path.join(os.tmpdir(), 'slightnudge-workspace-desktop.png'), fullPage: true });
  }
  return 9;
}
