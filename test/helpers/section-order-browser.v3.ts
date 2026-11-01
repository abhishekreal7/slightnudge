import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkSectionOrder(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  page.setDefaultTimeout(45000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.stack || error.message));
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const before = `'use client';
export default function Page(){return <main className="flex flex-col gap-6 p-12 bg-white">
<section className="rounded-xl border border-slate-200 p-8"><h2 className="text-2xl font-semibold">First section</h2><p className="text-slate-600">Your opening story.</p></section>
<nav className="order-first text-sm text-slate-600">Navigation stays above the sections</nav>
<section className="rounded-xl border border-slate-200 p-8"><h2 className="text-2xl font-semibold">Second section</h2><p className="text-slate-600">Everything in this section moves together.</p><button className="rounded-lg bg-emerald-700 px-4 py-2 text-white">Explore <span>→</span></button></section>
<section className="rounded-xl border border-slate-200 p-8"><h2 className="text-2xl font-semibold">Third section</h2><p className="text-slate-600">A useful next step.</p></section>
</main>}`;
  fs.writeFileSync(file, before);
  const frame = page.frameLocator('iframe[title="Actual project"]'), toolbar = page.getByRole('toolbar', { name: 'Selection formatting' });
  const dock = page.getByRole('banner', { name: 'Editor toolbar' });
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 });
  const headings = () => frame.locator('section > h2').allTextContents();
  const selectSection = async (text: string) => { await frame.locator('section').filter({ has: frame.getByRole('heading', { name: text, exact: true }) }).click({ position: { x: 8, y: 8 } }); await toolbar.waitFor(); };
  const menu = () => toolbar.getByRole('button', { name: 'More formatting options', exact: true }).click();
  try {
    await page.goto(`${baseURL}/studio/window`, { waitUntil: 'networkidle', timeout: 120000 });
    await frame.getByRole('heading', { name: 'Second section', exact: true }).waitFor({ timeout: 120000 });
    await selectSection('Second section'); await menu();
    const responseEvent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Move earlier', exact: true }).click();
    const response = await (await responseEvent).json(); assert.equal(response.success, true, response.error);
    await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor(); await idle();
    assert.deepEqual(await headings(), ['Second section', 'First section', 'Third section']);
    assert.ok((await frame.locator('nav').boundingBox())!.y < (await frame.locator('section').first().boundingBox())!.y, 'CSS-pinned navigation must stay above reordered sections');
    assert.equal(fs.readFileSync(file, 'utf8'), before);
    const boxes = await frame.locator('section').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top)); assert.ok(boxes[0] < boxes[1] && boxes[1] < boxes[2]);
    await dock.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); assert.deepEqual(await headings(), ['First section', 'Second section', 'Third section']);
    await dock.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); assert.deepEqual(await headings(), ['Second section', 'First section', 'Third section']);
    await selectSection('Second section'); await menu(); assert.equal(await page.getByRole('button', { name: 'Move earlier', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Close formatting options', exact: true }).click();
    await frame.getByRole('heading', { name: 'Second section', exact: true }).click(); await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click();
    const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true }); await editor.press('Control+a'); await editor.pressSequentially('Second section, refined'); await editor.press('Enter');
    await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '2 changes' }).waitFor(); assert.equal(fs.readFileSync(file, 'utf8'), before);
    await page.reload({ waitUntil: 'networkidle' }); await frame.getByRole('heading', { name: 'Second section, refined', exact: true }).waitFor({ timeout: 120000 });
    assert.deepEqual(await headings(), ['Second section, refined', 'First section', 'Third section']);
    await selectSection('Second section, refined'); await page.screenshot({ path: path.join(process.cwd(), 'docs/section-order-ready.png') });
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply' && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle();
    assert.ok(fs.readFileSync(file, 'utf8').indexOf('Second section, refined') < fs.readFileSync(file, 'utf8').indexOf('First section'));
    assert.deepEqual(await headings(), ['Second section, refined', 'First section', 'Third section']);
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo' && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle();
    assert.equal(fs.readFileSync(file, 'utf8'), before); assert.deepEqual(await headings(), ['First section', 'Second section', 'Third section']); await page.locator('[data-source-ready="true"]').waitFor();
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS section layout: real DOM and visual order, whole subtrees, source unchanged until Save, draft Undo/Redo, edge controls, text edit after reorder, refresh recovery, grouped Save and exact source/DOM Undo');
  } catch (error) { await page.screenshot({ path: path.join(process.cwd(), 'docs/section-order-failure.png') }).catch(() => {}); console.log('Section editor state', await page.locator('body').innerText().catch(() => 'unavailable')); console.log('Browser errors', errors); throw error; }
  return 1;
}
