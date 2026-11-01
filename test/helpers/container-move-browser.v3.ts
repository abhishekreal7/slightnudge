import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkContainerMove(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  page.setDefaultTimeout(45000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.stack || error.message));
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const empty = process.argv.includes('--empty-destination');
  const destinationMarkup = empty ? '<section id="empty-destination" className="rounded-xl border border-slate-200 p-8" />' : '<section className="rounded-xl border border-slate-200 p-8"><h2 className="text-2xl font-semibold">Next steps</h2><p className="mt-4 text-slate-600">Make the next action easy to find.</p></section>';
  const buttonClasses = empty ? '' : ' className="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-white"';
  const before = `'use client';export default function Page(){return <main className="grid gap-6 p-12 md:grid-cols-2"><section className="rounded-xl border border-slate-200 p-8"><h2 className="text-2xl font-semibold">Your story</h2><button type="button"${buttonClasses}>Explore <span>→</span></button></section>${destinationMarkup}</main>}`;
  fs.writeFileSync(file, before);
  const frame = page.frameLocator('iframe[title="Actual project"]'), toolbar = page.getByRole('toolbar', { name: 'Selection formatting' }), dock = page.getByRole('banner', { name: 'Editor toolbar' });
  const destination = frame.locator('section').nth(1), source = frame.locator('section').first();
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 });
  // Hit the label below the centered Move handle, rather than clicking that
  // separate control when the small button is already selected.
  const start = async () => { await frame.getByRole('button', { name: 'Explore', exact: false }).click({ position: { x: 20, y: 18 } }); await toolbar.getByRole('button', { name: 'More formatting options', exact: true }).click(); await page.getByRole('button', { name: 'Move to…', exact: true }).click(); await page.getByLabel('Choose move destination', { exact: true }).waitFor(); };
  const order = async () => [await source.locator('button').count(), await destination.locator('button').count()];
  try {
    await page.goto(`${baseURL}/studio/window`, { waitUntil: 'networkidle', timeout: 120000 }); await frame.getByRole('button', { name: 'Explore', exact: false }).waitFor({ timeout: 120000 });
    await start(); await destination.hover({ position: { x: 8, y: 8 } }); await page.getByLabel('Move destination preview', { exact: true }).waitFor();
    await page.keyboard.press('Escape'); await page.getByLabel('Choose move destination', { exact: true }).waitFor({ state: 'hidden' }); assert.deepEqual(await order(), [1, 0]); assert.equal(fs.readFileSync(file, 'utf8'), before);
    await start(); await destination.hover({ position: { x: 8, y: 8 } }); await page.getByLabel('Move destination preview', { exact: true }).waitFor(); await page.screenshot({ path: path.join(process.cwd(), 'docs/container-move-destination.png') });
    const preview = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST'); await destination.click({ position: { x: 8, y: 8 } }); const proposal = await (await preview).json(); assert.equal(proposal.success, true, proposal.error);
    await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor(); await idle(); assert.deepEqual(await order(), [0, 1]); assert.equal(fs.readFileSync(file, 'utf8'), before);
    await dock.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); assert.deepEqual(await order(), [1, 0]);
    await dock.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); assert.deepEqual(await order(), [0, 1]);
    await destination.locator('button').click({ position: { x: 20, y: 18 } }); await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click(); const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true }); await editor.press('Control+a'); await editor.pressSequentially('Get started'); await editor.press('Enter');
    await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '2 changes' }).waitFor(); assert.equal(await destination.locator('button span').textContent(), '→');
    await page.reload({ waitUntil: 'networkidle' }); await destination.getByRole('button', { name: 'Get started', exact: false }).waitFor({ timeout: 120000 }); assert.deepEqual(await order(), [0, 1]); assert.equal(fs.readFileSync(file, 'utf8'), before);
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply' && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle(); assert.ok(fs.readFileSync(file, 'utf8').indexOf(empty ? 'empty-destination' : 'Next steps') < fs.readFileSync(file, 'utf8').indexOf('Get started'));
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo' && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle(); assert.equal(fs.readFileSync(file, 'utf8'), before); assert.deepEqual(await order(), [1, 0]);
    assert.equal(errors.length, 0, errors.join('\n')); console.log('PASS container UI: destination highlight/insertion indicator, Escape cancellation, real parent change, draft Undo/Redo, inline edit with icon preservation, refresh recovery, grouped Save and exact source/DOM Undo');
  } catch (error) { console.log('Container editor state', await page.locator('body').innerText().catch(() => 'unavailable')); console.log('Browser errors', errors); await page.screenshot({ path: path.join(process.cwd(), 'docs/container-move-failure.png') }).catch(() => {}); throw error; }
  return 1;
}
