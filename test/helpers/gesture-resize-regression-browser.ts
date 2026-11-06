import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export const resizePointerFixture = `'use client';
export default function ResizePointerPage(){return <main className="min-h-screen bg-white p-8"><section className="w-full"><h1 id="start" className="w-full max-w-2xl text-2xl">A left anchored heading</h1><p id="center" className="mx-auto mt-12 w-full max-w-2xl text-2xl">A centered paragraph</p><p id="end" className="ml-auto mt-12 w-full max-w-2xl text-2xl">A right anchored paragraph</p></section></main>}
`;

export async function checkResizePointer(page: Page, base: string, workspace: string) {
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let proposals = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/preview') && request.method() === 'POST' && request.postDataJSON()?.operation !== 'inspect') proposals++; });
  await page.addInitScript('window.__name = value => value;');
  const full = process.argv.includes('--full');
  await page.goto(base + '/editor?view=' + (full ? 'full' : 'fit'), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  await page.evaluate(() => {
    (window as any).__resizeCatalogs = 0;
    window.addEventListener('message', e => { if (e.data?.type === 'source-tree') (window as any).__resizeCatalogs++; });
  });
  const frame = page.frameLocator('iframe[title="Actual project"]');
  let cases = 0;
  for (const zoom of full ? ['1'] : ['0.75', '1', '1.5']) {
    await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption(zoom);
    for (const [id, side, delta] of [['start', 'right', 96], ['center', 'right', 48], ['end', 'left', -96]] as const) {
      const target = frame.locator('#' + id);
      await target.click();
      const handle = page.getByRole('button', { name: `Resize width from ${side}`, exact: true });
      await handle.scrollIntoViewIfNeeded();
      const box = (await handle.boundingBox())!;
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 4 };
      const scale = Number(zoom);
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      if (await handle.getAttribute('aria-pressed') !== 'true') console.log('Resize did not start', { id, zoom, point, notices: await page.getByLabel('Editor notice', { exact: true }).allTextContents(), target: await target.evaluate(el => ({ tag: el.tagName, rect: el.getBoundingClientRect().toJSON() })) });
      assert.equal(await handle.getAttribute('aria-pressed'), 'true', `Pointer must capture ${id} in ${full ? 'Full' : 'Fit'}`);
      const cursor = await handle.evaluate(el => getComputedStyle(el).cursor);
      await page.mouse.move(point.x + delta * scale, point.y, { steps: 6 });
      await target.evaluate(el => new Promise<void>((resolve, reject) => {
        const deadline = performance.now() + 5000;
        const inspect = () => Math.abs(el.getBoundingClientRect().width - 768) < 1 ? resolve() : performance.now() > deadline ? reject(new Error(`Rendered width is ${el.getBoundingClientRect().width}, expected 768`)) : requestAnimationFrame(inspect);
        inspect();
      }));
      if ((process.argv.includes('--refresh') || process.argv.includes('--change-target')) && id === 'start') {
        const count = await page.evaluate(() => (window as any).__resizeCatalogs);
        await target.evaluate((el, change) => { if (change) el.classList.add('mt-1'); window.dispatchEvent(new Event('resize')); }, process.argv.includes('--change-target'));
        await page.waitForFunction(count => (window as any).__resizeCatalogs > count, count);
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        if (process.argv.includes('--change-target')) {
          assert.equal(await handle.getAttribute('aria-pressed'), 'false', 'An actual source target change must cancel resize');
          await page.mouse.up();
          await page.locator('[data-resize-capture]').waitFor({ state: 'hidden' });
          assert.equal(proposals, 0);
          assert.equal(fs.readFileSync(file, 'utf8'), original);
          assert.deepEqual(errors, []);
          console.log('PASS actual target-class change cancels resize, releases cursor capture and preserves source');
          return 1;
        }
        assert.equal(await handle.getAttribute('aria-pressed'), 'true', 'A read-only source catalog refresh must not cancel an active resize');
      }
      const moved = (await handle.boundingBox())!;
      const offset = moved.x + moved.width / 2 - (point.x + delta * scale);
      assert.ok(Math.abs(offset) <= 1.6 * scale, `Resize edge stays at pointer: ${id} @ ${zoom}, offset ${offset}px`);
      assert.equal(await page.locator('[data-resize-capture]').evaluate(el => getComputedStyle(el).cursor), cursor, 'Cursor remains locked above the iframe');
      assert.equal(await page.evaluate(point => document.elementFromPoint(point.x, point.y)?.hasAttribute('data-resize-capture'), { x: point.x + delta * scale, y: point.y }), true, 'The cursor capture layer is actually above the preview at the pointer');
      console.log(JSON.stringify({ anchor: id, zoom, pointerEdgeOffsetPx: offset }));
      cases++;
      await page.keyboard.press('Escape'); await page.mouse.up();
      await page.locator('[data-resize-capture]').waitFor({ state: 'hidden' });
      await target.evaluate(el => new Promise<void>((resolve, reject) => {
        const deadline = performance.now() + 5000;
        const inspect = () => Math.abs(el.getBoundingClientRect().width - 672) < 1 ? resolve() : performance.now() > deadline ? reject(new Error(`Restored width is ${el.getBoundingClientRect().width}, expected 672`)) : requestAnimationFrame(inspect);
        inspect();
      }));
      assert.equal(proposals, 0);
      assert.equal(fs.readFileSync(file, 'utf8'), original);
    }
  }
  await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1');
  await frame.locator('#start').click();
  const handle = page.getByRole('button', { name: 'Resize width from right', exact: true });
  const box = (await handle.boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 4 };
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  console.log('Final drag started:', await handle.getAttribute('aria-pressed'), 'notices:', await page.getByLabel('Editor notice', { exact: true }).allTextContents(), 'handle:', await handle.boundingBox(), 'target:', await frame.locator('#start').boundingBox());
  await page.screenshot({ path: path.join(process.cwd(), 'docs/gesture-resize-final-start.png') });
  assert.equal(await handle.getAttribute('aria-pressed'), 'true', 'Final resize pointer must capture before proposing');
  const proposed = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/preview') && r.request().method() === 'POST' && r.request().postDataJSON()?.operation !== 'inspect');
  await page.mouse.move(point.x + 96, point.y, { steps: 6 }); await page.mouse.up();
  assert.equal((await (await proposed).json()).success, true);
  await page.waitForFunction(() => localStorage.getItem('slightnudge:studio:continuous-draft:v1') !== null && document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  assert.equal(proposals, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  const saved = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/apply') && r.request().method() === 'POST');
  await page.getByLabel('Draft controls', { exact: true }).getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.equal((await (await saved).json()).success, true);
  assert.match(fs.readFileSync(file, 'utf8'), /max-w-3xl/);
  await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  const undone = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/undo') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal((await (await undone).json()).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  assert.deepEqual(errors, []);
  console.log(`PASS ${cases} anchor/zoom drags, cursor capture, Escape restoration, one proposal, real Save and exact Undo`);
  return 1;
}
