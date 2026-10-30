import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
import { prepareSourceProject } from './prepare-source-project';

export async function checkUnifiedCanvas(page: Page, baseURL: string, workspace: string) {
  page.setDefaultTimeout(45000);
  let navigations = 0;
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.stack || error.message));
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++; });
  await page.addInitScript(() => { (window as any).canvasMessages = []; addEventListener('message', event => { if (['source-selection', 'source-rect', 'bridge-ready'].includes(event.data?.type)) { (window as any).canvasMessages.push(event.data); (window as any).canvasMessages = (window as any).canvasMessages.slice(-12); } }); });
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx'), original = fs.readFileSync(file, 'utf8');
  const historyFile = path.join(workspace, '.slightnudge/history/edits.json');
  const initialHistoryCount = fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')).length : 0;
  const secondFile = path.join(workspace, 'fixtures/2-several-utilities.tsx'), secondOriginal = fs.readFileSync(secondFile, 'utf8');
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 });
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const toolbar = page.getByRole('toolbar', { name: 'Selection formatting' });
  const status = page.getByLabel('Draft status', { exact: true });
  const sourceAction = async (operation: 'apply' | 'undo', action: () => Promise<unknown>) => {
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === `/api/slightnudge/${operation}` && response.request().method() === 'POST', { timeout: 90000 }), action()]);
    await idle();
  };
  if (!process.argv.includes('--unified-imported-only')) {
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  await frame.locator('h1').waitFor({ timeout: 120000 }); await idle();
  const context = await page.context().browser()!.newContext({ viewport: { width: 940, height: 720 } });
  try {
    const actual = await context.newPage();
    await actual.goto(`${baseURL}/studio/preview/fixture-1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await actual.locator('[data-source-canvas-root] h1').waitFor({ timeout: 120000 });
    assert.equal(await frame.locator('[data-source-canvas-root]').innerHTML(), await actual.locator('[data-source-canvas-root]').innerHTML(), 'Studio renders the same source component and DOM, not a rebuilt sample');
  } finally { await context.close(); }
  assert.ok(await page.getByLabel('Source layers').getByRole('button').count() > 8);
  assert.equal(await page.locator('h1').count(), 0, 'The parent editor contains no duplicate handcrafted heading');
  await frame.locator('h1').click(); await toolbar.waitFor();
  const initialTranslation = await frame.locator('h1').evaluate(element => getComputedStyle(element).translate);
  const initialX = parseFloat(initialTranslation) || 0;
  assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).fontSize), '24px');
  await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-4xl');
  await status.filter({ hasText: '1 change' }).waitFor();
  assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).fontSize), '36px');
  await page.getByRole('button', { name: 'Move element', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  await status.filter({ hasText: '2 changes' }).waitFor();
  assert.equal(await frame.locator('h1').evaluate(element => parseFloat(getComputedStyle(element).translate) || 0), initialX + 4);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle();
  assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).translate), initialTranslation);
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await idle();
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  await page.waitForTimeout(150);
  assert.equal(await frame.locator('body').evaluate(() => innerWidth), 375, 'Device width is the real iframe viewport width');
  await page.getByRole('button', { name: 'Desktop', exact: true }).click();
  await frame.locator('.sn-playground-description').click();
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLSelectElement>('[role="toolbar"] select')].some(select => select.value === '__computed'));
  assert.equal(await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).inputValue(), '__computed', 'Project CSS overrides are reported as a computed value');
  await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-3xl');
  await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: 'Project CSS overrides' }).waitFor();
  assert.equal(await frame.locator('.sn-playground-description').evaluate(element => getComputedStyle(element).fontSize), '13px');
  assert.match(await status.innerText(), /2 changes/);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  assert.equal(navigations, 1, 'Compiling and connecting another source preview must not reload the editor');
  console.log('PASS actual source DOM identity, real layer tree, rendered size/move, draft Undo/Redo, real device viewport, CSS-layer conflict refusal, untouched source');

  await sourceAction('apply', () => page.getByRole('button', { name: 'Save changes', exact: true }).click());
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  assert.equal(await status.innerText(), 'All changes saved');
  assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).fontSize), '36px');
  assert.equal(await frame.locator('h1').evaluate(element => parseFloat(getComputedStyle(element).translate) || 0), initialX + 4);
  await frame.locator('h1').click(); await toolbar.waitFor();
  await page.screenshot({ path: path.join(process.cwd(), 'docs/unified-source-canvas.png') });
  assert.equal(navigations, 1, 'Saving and refreshing the source iframe must not reload the editor');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  await idle(); await frame.locator('h1').waitFor();
  await frame.locator('h1').click();
  await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click();
  const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true }); await editor.waitFor();
  await editor.press('Control+a'); await editor.pressSequentially('Editing the actual source document');
  await toolbar.getByRole('combobox', { name: 'Typeface', exact: true }).selectOption('font-serif');
  assert.equal(await editor.textContent(), 'Editing the actual source document');
  // Save while the typography request is still in flight: finishing text must
  // queue its own draft revision instead of dropping it or saving stale copy.
  await sourceAction('apply', () => editor.press('Control+s'));
  await page.waitForFunction(() => document.querySelector('[aria-label="Draft status"]')?.textContent?.trim() === 'All changes saved', undefined, { timeout: 60000 });
  await idle();
  assert.ok(fs.readFileSync(file, 'utf8').includes('Editing the actual source document'));
  assert.equal(await frame.locator('h1').textContent(), 'Editing the actual source document');
  assert.equal(JSON.parse(fs.readFileSync(historyFile, 'utf8')).length, initialHistoryCount + 2);
  await sourceAction('undo', () => page.getByRole('button', { name: 'Undo', exact: true }).click());
  assert.equal(await frame.locator('h1').textContent(), 'Make room for your best work.');
  await sourceAction('undo', () => page.getByRole('button', { name: 'Undo', exact: true }).click());
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).fontSize), '24px');
  assert.equal(navigations, 2, 'Text Save and successive Undo must retain the same editor document');
  console.log('PASS source Save confirms classes and computed appearance, saved refresh, native inline editing plus live typography, second Save and successive batch Undo');

  await frame.locator('h1').click(); await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-4xl');
  await status.filter({ hasText: '1 change' }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' }); await idle(); await frame.locator('h1').waitFor();
  await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelector('h1') && getComputedStyle(document.querySelector('iframe')!.contentDocument!.querySelector('h1')!).fontSize === '36px');
  assert.match(await status.innerText(), /1 change/);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  await page.getByText('Several Utilities', { exact: true }).click();
  await frame.getByText('Fixture 2: Several Utilities', { exact: true }).waitFor({ timeout: 120000 });
  await frame.locator('h1').click(); await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-4xl');
  await status.filter({ hasText: '1 change' }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' }); await idle();
  await frame.getByText('Fixture 2: Several Utilities', { exact: true }).waitFor();
  assert.match(await status.innerText(), /1 change/);
  await sourceAction('apply', () => page.getByRole('button', { name: 'Save changes', exact: true }).click());
  assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).fontSize), '36px');
  await sourceAction('undo', () => page.getByRole('button', { name: 'Undo', exact: true }).click());
  assert.equal(fs.readFileSync(secondFile, 'utf8'), secondOriginal);
  assert.equal(navigations, 4, 'Only the two explicit draft-recovery reloads may navigate the editor');
  console.log('PASS draft refresh replays the actual document without source writes; a second source page has its own real DOM, draft recovery, Save and Undo');
  }

  // The imported project uses the same canvas component and browser protocol.
  const repo = path.join(workspace, '.slightnudge/repositories/source-proof'); fs.mkdirSync(repo, { recursive: true });
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1' };
  for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) env[key] = process.env[key];
  prepareSourceProject(process.cwd(), workspace, repo, env);
  const port = await new Promise<number>(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const value = (server.address() as net.AddressInfo).port; server.close(() => resolve(value)); }); });
  const child = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], { cwd: repo, env, stdio: 'ignore' });
  try {
    const projectURL = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) { try { if ((await fetch(projectURL, { signal: AbortSignal.timeout(5000) })).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 300)); }
    assert.ok(ready);
    await page.goto(`${baseURL}/studio/source-proof/edit?preview=${encodeURIComponent(projectURL)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
    const sourceFile = path.join(repo, 'components/Features.tsx'), sourceBefore = fs.readFileSync(sourceFile, 'utf8');
    await frame.locator('h3').first().click();
    await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: 'several rendered instances' }).waitFor();
    assert.equal(fs.readFileSync(sourceFile, 'utf8'), sourceBefore);
    const heading = frame.locator('#features h2'); await heading.click(); await toolbar.waitFor();
    await frame.locator('h3').first().click();
    await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: 'several rendered instances' }).waitFor();
    await toolbar.waitFor();
    await toolbar.getByRole('button', { name: 'Toggle bold', exact: true }).click();
    await status.filter({ hasText: '1 change' }).waitFor(); await idle();
    assert.equal(fs.readFileSync(sourceFile, 'utf8'), sourceBefore);
    assert.equal(await heading.evaluate(element => getComputedStyle(element).fontWeight), '700');
    assert.ok(await page.getByLabel('Source layers').getByRole('button').count() > 3);
    await sourceAction('apply', () => page.getByRole('button', { name: 'Save changes', exact: true }).click());
    assert.notEqual(fs.readFileSync(sourceFile, 'utf8'), sourceBefore);
    assert.equal(await heading.evaluate(element => getComputedStyle(element).fontWeight), '700');
    await sourceAction('undo', () => page.getByRole('button', { name: 'Undo', exact: true }).click());
    assert.equal(fs.readFileSync(sourceFile, 'utf8'), sourceBefore);
    assert.deepEqual(browserErrors, []);
    console.log('PASS imported Next project uses the shared source canvas, actual layers and compiled preview; explicit Save verifies rendered appearance; Undo restores source');
    await page.goto('about:blank');
  } finally { if (child.pid) { try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} } }
  assert.equal(fs.readFileSync(file, 'utf8'), original); assert.equal(fs.readFileSync(secondFile, 'utf8'), secondOriginal);
  return process.argv.includes('--unified-imported-only') ? 1 : 4;
}
