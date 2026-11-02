import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
import { prepareSourceProject } from './prepare-source-project.v3';

export async function checkImportedResponsive(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  page.setDefaultTimeout(60000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.stack || error.message));
  const repo = path.join(workspace, '.slightnudge/repositories/source-proof'); fs.mkdirSync(repo, { recursive: true });
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1' }; for (const name of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[name]) env[name] = process.env[name];
  prepareSourceProject(process.cwd(), workspace, repo, env);
  fs.appendFileSync(path.join(repo, 'app/globals.css'), '\n@theme { --breakpoint-md:52rem; --breakpoint-tablet:58rem; }\n');
  const port = await new Promise<number>(resolve => { const socket = net.createServer(); socket.listen(0, '127.0.0.1', () => { const port = (socket.address() as net.AddressInfo).port; socket.close(() => resolve(port)); }); });
  const child = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], { cwd: repo, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostics = ''; for (const stream of [child.stdout, child.stderr]) stream?.on('data', value => { diagnostics = (diagnostics + value.toString()).slice(-8000); });
  const file = path.join(repo, 'components/Features.tsx'), original = fs.readFileSync(file, 'utf8');
  const actual = page.frameLocator('iframe[title="Actual project"]'), heading = actual.locator('#features h2');
  const toolbar = page.getByRole('toolbar', { name: 'Selection formatting' }), dock = page.getByRole('banner', { name: 'Editor toolbar' });
  const width = page.getByRole('spinbutton', { name: 'Preview width', exact: true }), scope = page.getByRole('combobox', { name: 'Responsive edit scope', exact: true });
  const openDefinitionStyles = async () => {
    const design = page.getByRole('button', { name: 'Toggle design panel', exact: true });
    if (await design.getAttribute('aria-expanded') !== 'true') await design.click();
    const open = page.getByRole('button', { name: 'Edit shared definition', exact: true });
    if (await open.count()) await open.click();
    await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).waitFor();
  };
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 });
  const setWidth = async (value: number) => { await width.fill(String(value)); await width.press('Enter'); const deadline = Date.now() + 15000; while (Date.now() < deadline) { if (await heading.evaluate(() => innerWidth) === value) return; await page.waitForTimeout(75); } throw new Error(`Imported preview did not reach ${value}px`); };
  const font = async (value: string) => { const deadline = Date.now() + 15000; let current = ''; while (Date.now() < deadline) { current = await heading.evaluate(element => getComputedStyle(element).fontSize); if (current === value) return; await page.waitForTimeout(75); } assert.equal(current, value); };
  const saved = async (kind: 'apply' | 'undo') => { await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === `/api/slightnudge/${kind}` && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: kind === 'apply' ? 'Save changes' : 'Undo', exact: true }).click()]); await idle(); await page.locator('[data-source-ready="true"]').waitFor(); };
  try {
    let started = false; for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(5000) })).ok) { started = true; break; } } catch {} await page.waitForTimeout(300); } assert.ok(started);
    await page.goto(`${baseURL}/studio/source-proof/window?preview=${encodeURIComponent(`http://127.0.0.1:${port}/`)}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
    await heading.click(); await toolbar.waitFor(); await openDefinitionStyles(); await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-4xl'); await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor();
    await saved('apply'); await saved('undo'); assert.equal(fs.readFileSync(file, 'utf8'), original);
    await scope.locator('option[value="tablet"]').waitFor({ state: 'attached' }); assert.match(await scope.locator('option[value="md"]').innerText(), /832/);
    await scope.selectOption('tablet'); await setWidth(375);
    await page.reload({ waitUntil: 'domcontentloaded' }); await idle(); await page.locator('[data-source-ready="true"]').waitFor(); assert.equal(await scope.inputValue(), 'tablet'); assert.equal(await width.inputValue(), '375');
    await scope.selectOption('tablet'); await heading.click(); await toolbar.waitFor(); await openDefinitionStyles();
    await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-7xl'); await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor(); await font('72px'); assert.equal(fs.readFileSync(file, 'utf8'), original);
    await setWidth(375); await font('30px'); await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor({ timeout: 120000 }); await idle(); await page.locator('[data-source-ready="true"]').waitFor(); assert.equal(await scope.inputValue(), 'tablet'); assert.equal(await width.inputValue(), '375'); await font('30px');
    await saved('apply'); assert.ok(fs.readFileSync(file, 'utf8').includes('tablet:text-7xl'));
    await setWidth(928); await font('72px'); await page.screenshot({ path: path.join(process.cwd(), 'docs/responsive-imported-window.png') });
    await saved('undo'); assert.equal(fs.readFileSync(file, 'utf8'), original); await font('30px'); assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS imported responsive browser: custom project scopes, prior Save/Undo checkpoint cannot reset current view, previously unused theme token previews correctly, base inheritance, draft width/scope refresh recovery, Save from mobile, actual saved responsive CSS, exact source Undo');
    return 1;
  } catch (error) { console.log('Imported responsive state', await page.locator('body').innerText().catch(() => 'unavailable')); console.log('Imported project diagnostics', diagnostics); console.log('Browser errors', errors); await page.screenshot({ path: path.join(process.cwd(), 'docs/imported-responsive-failure.png') }).catch(() => {}); throw error; }
  finally { if (child.pid) try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }
}
