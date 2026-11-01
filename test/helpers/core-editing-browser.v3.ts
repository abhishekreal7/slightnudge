import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

/** The same authored document and user actions in both workspace presentations. */
export async function checkCoreEditing(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const fixture = `'use client';
export default function Page(){return <main className="bg-white p-10">
<section id="intro" className="mb-8 w-full rounded-xl border p-8"><h1 className="text-3xl font-semibold md:text-4xl">Room for good ideas.</h1><p className="mt-4 text-base text-slate-600">Edit the page, keep your source.</p><button id="cta" type="button" className="mt-6 rounded-lg bg-emerald-700 px-5 py-3 text-white">Start creating <span aria-hidden="true">→</span></button></section>
<section id="details" className="grid grid-cols-1 gap-4 rounded-xl border p-8"><article className="bg-slate-50 p-4"><h2>First detail</h2></article><article className="bg-slate-50 p-4"><h2>Second detail</h2></article></section>
</main>}`;
  page.setDefaultTimeout(45000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/(inspect|preview)$/.test(new URL(request.url()).pathname)) console.log('Core request', request.method(), new URL(request.url()).pathname); });
  try {
    for (const windowMode of [false, true]) {
      fs.writeFileSync(file, fixture);
      await page.goto('about:blank');
      await page.goto(`${baseURL}/studio${windowMode ? '/window' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      const frame = page.frameLocator('iframe[title="Actual project"]');
      const toolbar = page.getByRole('toolbar', { name: 'Selection formatting', exact: true });
      const status = page.getByLabel('Draft status', { exact: true });
      const inspector = page.locator('[data-editor-panel="inspector"]');
      const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
      const preview = async (action: () => Promise<unknown>) => {
        const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/preview' && r.request().method() === 'POST'), action()]);
        const result = await response.json(); assert.equal(result.success, true, result.error);
        await idle();
        assert.equal(fs.readFileSync(file, 'utf8'), fixture, 'Preview must not write source');
      };
      const source = async (kind: 'apply' | 'undo', action: () => Promise<unknown>) => {
        const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === `/api/slightnudge/${kind}` && r.request().method() === 'POST', { timeout: 90000 }), action()]);
        assert.ok(response.ok(), await response.text()); await idle();
        await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      };
      const beginText = async () => {
        const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/inspect' && r.request().method() === 'POST'), toolbar.getByRole('button', { name: 'Edit text', exact: true }).click()]);
        const result = await response.json();
        assert.equal(result.textEditable, true, JSON.stringify(result));
      };
      const selectHeading = async () => { await frame.locator('h1').click(); await toolbar.waitFor(); };
      const heading = frame.locator('h1');
      await selectHeading();
      const originalSize = await heading.evaluate(el => getComputedStyle(el).fontSize);
      const toolbarBox = await toolbar.boundingBox(), headingBox = await heading.boundingBox();
      assert.ok(toolbarBox && headingBox);
      assert.ok(Math.min(Math.abs(toolbarBox.y + toolbarBox.height - headingBox.y), Math.abs(headingBox.y + headingBox.height - toolbarBox.y)) < 90, 'Formatting stays near the selected element');
      await toolbar.getByRole('button', { name: 'Toggle bold', exact: true }).focus();
      await page.keyboard.press('ArrowRight'); await idle();
      assert.equal(await status.innerText(), 'All changes saved', 'Arrow navigation on toolbar controls cannot nudge the page');
      await toolbar.getByRole('button', { name: 'More formatting options', exact: true }).click();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog', { name: 'More formatting options', exact: true }).count(), 0);
      await selectHeading(); await idle();
      await beginText();
      const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true });
      await editor.waitFor();
      assert.equal(await editor.evaluate(el => getComputedStyle(el).fontSize), originalSize);
      await editor.press('Control+a'); await editor.pressSequentially('A clearer place to create.');
      await preview(() => editor.press('Enter'));
      await preview(() => toolbar.getByRole('combobox', { name: 'Text alignment', exact: true }).selectOption('text-center'));
      assert.equal(await heading.evaluate(el => getComputedStyle(el).textAlign), 'center');

      const button = frame.locator('#cta');
      await button.locator('span').click(); await toolbar.waitFor();
      await beginText();
      await editor.waitFor(); await editor.press('Control+a'); await editor.pressSequentially('Open workspace');
      await preview(() => editor.press('Enter'));
      assert.equal(await button.locator('span').textContent(), '→');
      assert.equal(await button.getAttribute('type'), 'button');
      console.log(`Core ${windowMode ? 'window' : 'Studio'}: text and button labels verified`);
      await toolbar.getByRole('button', { name: 'More formatting options', exact: true }).click();
      await preview(() => page.getByRole('button', { name: 'Fill: Blue', exact: true }).click());
      await page.getByRole('button', { name: 'Close formatting options', exact: true }).click();
      assert.notEqual(await button.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');

      if (windowMode) await page.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
      const intro = frame.locator('#intro');
      await intro.click({ position: { x: 8, y: 8 } }); await toolbar.waitFor();
      await preview(() => toolbar.getByRole('combobox', { name: 'Padding', exact: true }).selectOption('p-6'));
      assert.equal(await intro.evaluate(el => getComputedStyle(el).paddingTop), '24px');
      await preview(() => inspector.getByRole('combobox', { name: 'Width', exact: true }).selectOption('w-1/2'));
      const widths = await intro.evaluate(el => { const parent = el.parentElement!, css = getComputedStyle(parent); return [el.getBoundingClientRect().width, parent.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight)]; });
      assert.ok(Math.abs(widths[0] - widths[1] / 2) < 2, `Width is measured in the real document: ${JSON.stringify(widths)}`);
      await preview(() => inspector.getByRole('combobox', { name: 'Width', exact: true }).selectOption('w-full'));
      const before = await intro.evaluate(el => el.getBoundingClientRect().left);
      const move = page.getByRole('button', { name: 'Move element', exact: true });
      await move.focus(); await preview(() => move.press('ArrowRight'));
      assert.equal(await intro.evaluate(el => el.getBoundingClientRect().left), before + 4);
      console.log(`Core ${windowMode ? 'window' : 'Studio'}: width, padding and keyboard movement verified`);
      await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle();
      assert.equal(await intro.evaluate(el => el.getBoundingClientRect().left), before);
      await page.getByRole('button', { name: 'Redo', exact: true }).click(); await idle();
      assert.equal(await intro.evaluate(el => el.getBoundingClientRect().left), before + 4);

      const details = frame.locator('#details');
      // The nearby formatting toolbar may occupy the next section's top edge.
      // Select its exposed side padding, as a user would, without forced clicks.
      await details.click({ position: { x: 8, y: 60 } }); await toolbar.waitFor();
      await preview(() => inspector.getByRole('combobox', { name: 'Layout columns', exact: true }).selectOption('grid-cols-2'));
      const cards = await details.locator('article').evaluateAll(els => els.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
      assert.equal(cards[0].y, cards[1].y); assert.ok(cards[1].x > cards[0].x);
      await toolbar.getByRole('button', { name: 'More formatting options', exact: true }).click();
      await preview(() => page.getByRole('button', { name: 'Move earlier', exact: true }).click());
      assert.deepEqual(await frame.locator('main > section').evaluateAll(els => els.map(el => el.id)), ['details', 'intro']);
      await selectHeading();
      const scope = page.getByRole('combobox', { name: 'Responsive edit scope', exact: true });
      await scope.selectOption('md');
      await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 768);
      await preview(() => toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-5xl'));
      assert.equal(await heading.evaluate(el => getComputedStyle(el).fontSize), '48px');
      const width = page.getByRole('spinbutton', { name: 'Preview width', exact: true });
      await width.fill('375'); await width.press('Enter');
      await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 375);
      assert.equal(await heading.evaluate(el => getComputedStyle(el).fontSize), '30px', 'Responsive edits leave the base size intact');
      await scope.selectOption('');
      await width.fill('1100'); await width.press('Enter');
      await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 1100);
      await page.screenshot({ path: path.join(process.cwd(), `docs/core-editing-${windowMode ? 'window' : 'studio'}.png`) });
      await source('apply', () => page.getByRole('button', { name: 'Save changes', exact: true }).click());
      const saved = fs.readFileSync(file, 'utf8');
      assert.ok(saved.includes('Open workspace') && saved.includes('md:text-5xl') && saved.indexOf('id="details"') < saved.indexOf('id="intro"'));
      await source('undo', () => page.getByRole('button', { name: 'Undo', exact: true }).click());
      assert.equal(fs.readFileSync(file, 'utf8'), fixture, 'One Undo restores the complete saved batch exactly');
      assert.equal(await button.locator('span').textContent(), '→');
      if (windowMode) {
        await page.getByRole('button', { name: 'Browse', exact: true }).click();
        const prevented = await frame.locator('body').evaluate(el => { const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }); el.dispatchEvent(event); return event.defaultPrevented; });
        assert.equal(prevented, false, 'Browse keeps website keyboard behavior');
      }
      assert.deepEqual(errors, []);
      console.log(`PASS core editing ${windowMode ? 'window' : 'Studio'}: original-size text, button/icon, alignment/fill, padding/width, keyboard ownership, Move/Undo/Redo, grid, section order, responsive isolation, grouped Save/exact Undo`);
      await page.context().clearCookies();
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    }
    return 2;
  } catch (error) {
    console.log('Core editor notice:', await page.getByLabel('Editor notice', { exact: true }).textContent().catch(() => 'none'));
    await page.screenshot({ path: path.join(process.cwd(), 'docs/core-editing-failure.png') }).catch(() => {});
    throw error;
  } finally { fs.writeFileSync(file, original); }
}
