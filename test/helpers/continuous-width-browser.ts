import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
export { resizePointerFixture } from './resize-pointer-browser';
export async function checkContinuousWidth(page: Page, base: string, workspace: string) {
  const original = fs.readFileSync(path.join(workspace, 'fixtures/1-plain-static.tsx'), 'utf8');
  const full = process.argv.includes('--full');
  await page.goto(base + '/editor?view=' + (full ? 'full' : 'fit'), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const waitForSelection = async (target: ReturnType<typeof frame.locator>) => {
    const expected = (await target.boundingBox())!;
    await page.waitForFunction(expected => {
      const selected = document.querySelector('[aria-label="Selected source element"]')?.getBoundingClientRect();
      return selected && Math.abs(selected.x - expected.x) <= 2 && Math.abs(selected.y - expected.y) <= 2 && Math.abs(selected.width - expected.width) <= 2;
    }, expected);
  };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const zoom of full ? [1] : [.75, 1, 1.5]) {
    if (!full) await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption(String(zoom));
    for (const [id, side, sign, factor] of [['start', 'right', 1, 1], ['center', 'right', 1, 2], ['end', 'left', -1, 1]] as const) {
      const target = frame.locator('#' + id);
      await target.click();
      await waitForSelection(target);
      const handle = page.getByRole('button', { name: 'Resize width from ' + side, exact: true });
      await handle.scrollIntoViewIfNeeded();
      const box = (await handle.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 4;
      await page.mouse.move(x, y); await page.mouse.down();
      assert.equal(await handle.getAttribute('aria-pressed'), 'true');
      for (const delta of [8, 19, 31, 47]) {
        await page.mouse.move(x + delta * zoom * sign, y, { steps: 3 });
        await page.waitForTimeout(50);
        const moved = (await handle.boundingBox())!;
        const offset = moved.x + moved.width / 2 - (x + delta * zoom * sign);
        console.log(JSON.stringify({ id, zoom, delta, offset }));
        assert.ok(Math.abs(offset) <= 1.5, 'Handle must follow the pointer between presets, not only at preset stops');
        assert.ok(Math.abs(await target.evaluate(el => el.getBoundingClientRect().width) - (672 + delta * factor)) <= 1, 'Native CSS width follows the unsnapped pointer');
      }
      await page.keyboard.press('Escape'); await page.mouse.up();
      await page.waitForFunction(() => !document.querySelector('[data-resize-capture]'));
      assert.equal(fs.readFileSync(path.join(workspace, 'fixtures/1-plain-static.tsx'), 'utf8'), original);
      for (const corner of ['left', 'right']) {
        const control = page.getByRole('button', { name: 'Resize width from bottom ' + corner, exact: true });
        assert.equal(await control.isDisabled(), true, 'A corner must not advertise unsupported two-axis resizing');
        assert.match(await control.getAttribute('title') || '', /height|two.axis/i);
      }
    }
  }
  if (!full) await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1');
  const target = frame.locator('#start');
  await target.click();
  await waitForSelection(target);
  const handle = page.getByRole('button', { name: 'Resize width from right', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  if (await handle.getAttribute('aria-pressed') !== 'true') console.log('Final pickup obstruction:', await page.evaluate(({x,y}) => { const el=document.elementFromPoint(x,y); return {point:{x,y},tag:el?.tagName,label:el?.getAttribute('aria-label'),disabled:el?.hasAttribute('disabled'),rect:el?.getBoundingClientRect().toJSON()}; }, {x,y}));
  assert.equal(await handle.getAttribute('aria-pressed'), 'true');
  await page.mouse.move(x + 77, y, { steps: 5 });
  await page.waitForFunction(() => Math.abs(document.querySelector('iframe')!.contentDocument!.querySelector('#start')!.getBoundingClientRect().width - 749) < 1);
  const preview = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/preview') && r.request().method() === 'POST' && r.request().postDataJSON()?.operation !== 'inspect');
  await page.mouse.up();
  const proposed = await (await preview).json();
  assert.equal(proposed.success, true, proposed.error);
  assert.equal(proposed.newValue, 'max-w-3xl', 'A non-preset live width releases to an existing utility');
  await page.waitForFunction(() => localStorage.getItem('slightnudge:studio:continuous-draft:v1') !== null && document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  assert.equal(await target.evaluate(el => el.getBoundingClientRect().width), 768);
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
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
  console.log('PASS intermediate tracking, native widths, Escape, corner refusals, non-preset release snaps to existing utility, real Save and exact Undo');
  return 1;
}
