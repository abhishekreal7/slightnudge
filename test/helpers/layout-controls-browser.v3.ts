import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkLayoutControls(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  page.setDefaultTimeout(45000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.stack || error.message));
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx'), before = `'use client';export default function Page(){return <main className="p-12"><section id="layout" className="grid grid-cols-1 gap-4 rounded-xl border p-8"><article className="rounded-lg bg-slate-50 p-6"><h2>First card</h2></article><article className="rounded-lg bg-slate-50 p-6"><h2>Second card</h2></article></section></main>}`;
  fs.writeFileSync(file, before);
  const frame = page.frameLocator('iframe[title="Actual project"]'), grid = frame.locator('#layout'), dock = page.getByRole('banner', { name: 'Editor toolbar' });
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 });
  const select = async (label: string, value: string, changes: number) => { await page.getByRole('combobox', { name: `Layout ${label}`, exact: true }).selectOption(value); await page.getByLabel('Draft status', { exact: true }).filter({ hasText: `${changes} ${changes === 1 ? 'change' : 'changes'}` }).waitFor(); await idle(); assert.equal(fs.readFileSync(file, 'utf8'), before); };
  try {
    await page.goto(`${baseURL}/studio/window`, { waitUntil: 'networkidle', timeout: 120000 }); await grid.click({ position: { x: 8, y: 8 }, timeout: 120000 });
    await dock.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
    await page.getByRole('combobox', { name: 'Layout columns', exact: true }).waitFor();
    await select('columns', 'grid-cols-2', 1);
    const boxes = await grid.locator('article').evaluateAll(elements => elements.map(element => ({ x: element.getBoundingClientRect().left, y: element.getBoundingClientRect().top }))); assert.equal(boxes[0].y, boxes[1].y); assert.ok(boxes[1].x > boxes[0].x);
    await select('gap', 'gap-8', 2); assert.equal(await grid.evaluate(element => getComputedStyle(element).gap), '32px');
    await page.screenshot({ path: path.join(process.cwd(), 'docs/layout-grid-ready.png') });
    await select('display', 'flex', 3); await select('wrapping', 'flex-wrap', 4); await select('direction', 'flex-col', 5);
    assert.equal(await grid.evaluate(element => getComputedStyle(element).flexDirection), 'column'); assert.equal(await grid.evaluate(element => getComputedStyle(element).flexWrap), 'wrap');
    await page.reload({ waitUntil: 'networkidle' }); await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '5 changes' }).waitFor(); await idle();
    assert.equal(await grid.evaluate(element => getComputedStyle(element).display), 'flex'); assert.equal(await grid.evaluate(element => getComputedStyle(element).flexDirection), 'column');
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply' && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle(); assert.ok(fs.readFileSync(file, 'utf8').includes('flex-wrap')); assert.equal(await grid.evaluate(element => getComputedStyle(element).flexDirection), 'column');
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo' && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle(); assert.equal(fs.readFileSync(file, 'utf8'), before); assert.equal(await grid.evaluate(element => getComputedStyle(element).display), 'grid');
    assert.equal(errors.length, 0, errors.join('\n')); console.log('PASS layout controls: actual grid columns and geometry, gap, flex/wrapping/direction, honest computed values, source unchanged in preview, refresh, one Save and exact Undo');
  } catch (error) { console.log('Layout state', await page.locator('body').innerText().catch(() => 'unavailable')); console.log('Browser errors', errors); await page.screenshot({ path: path.join(process.cwd(), 'docs/layout-controls-failure.png') }).catch(() => {}); throw error; }
  return 1;
}
