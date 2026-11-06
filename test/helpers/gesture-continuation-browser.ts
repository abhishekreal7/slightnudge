import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
export { resizePointerFixture } from './resize-pointer-browser';

export async function checkGestureContinuation(page: Page, base: string, workspace: string) {
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let release!: () => void, reached!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const responseHeld = new Promise<void>(resolve => { reached = resolve; });
  const requests: any[] = [];
  const cancel = process.argv.includes('--cancel-next');
  const refuse = process.argv.includes('--refuse-next');
  const moveFirst = process.argv.includes('--move-first');
  await page.route('**/api/slightnudge/preview', async route => {
    const body = route.request().postDataJSON();
    if (body.operation === 'inspect') return route.continue();
    requests.push(body);
    if (refuse && requests.length === 2) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Controlled second gesture refusal' }) });
    const response = await route.fetch();
    if (requests.length === 1) { reached(); await held; }
    await route.fulfill({ response });
  });
  try {
    const fit = !process.argv.includes('--full');
    await page.goto(base + '/editor?view=' + (fit ? 'fit' : 'full'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
    if (fit) await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('0.75');
    const heading = page.frameLocator('iframe[title="Actual project"]').locator('#start');
    await heading.click();
    const edge = page.getByRole('button', { name: 'Resize width from right', exact: true });
    const move = page.getByRole('button', { name: 'Move element', exact: true });
    const scale = fit ? .75 : 1;
    const drag = async (handle: typeof edge, dx: number, dy = 0, up = true) => {
      await handle.scrollIntoViewIfNeeded();
      const box = (await handle.boundingBox())!;
      const x = box.x + box.width / 2, y = box.y + box.height / 4;
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x + dx * scale, y + dy * scale, { steps: 4 });
      if (up) await page.mouse.up();
    };
    console.log('Ready; scenario:', cancel ? 'Escape second resize' : refuse ? 'refuse second resize' : moveFirst ? 'Move then resize' : 'resize then resize');
    await drag(moveFirst ? move : edge, moveFirst ? 24 : 96, moveFirst ? 16 : 0);
    await Promise.race([responseHeld, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('First gesture did not reach the preview endpoint within 10 seconds')), 10000))]);
    assert.equal(await edge.isEnabled(), true, 'Resize remains available while the previous real response is held');
    assert.equal(await move.isEnabled(), true, 'Move remains available after a resize while validation runs');
    await drag(edge, moveFirst ? 224 : 128, 0, false);
    await page.waitForFunction(() => Math.abs(document.querySelector('iframe')!.contentDocument!.querySelector('#start')!.getBoundingClientRect().width - 896) < 1);
    assert.equal(requests.length, 1, 'Only one validation runs at a time');
    await page.screenshot({ path: path.join(process.cwd(), 'docs/gesture-continuation-held.png') });
    release();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null')?.cursor === 1);
    assert.equal(await edge.getAttribute('aria-pressed'), 'true', 'The active second resize survives first validation');
    if (cancel) await page.keyboard.press('Escape');
    await page.mouse.up();
    if (cancel || refuse) {
      await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null')?.cursor), 1);
      assert.equal(requests.length, cancel ? 1 : 2);
      assert.equal(await heading.evaluate(el => el.getBoundingClientRect().width), 768, 'Cancellation/refusal restores last verified width');
    } else {
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null')?.cursor === 2);
      assert.equal(requests.length, 2);
      assert.ok(requests[1].parentPreviewId, 'Second edit is based on the first verified draft');
      assert.equal(requests[1].value, 'max-w-4xl');
    }
    // Also prove a subsequent valid gesture works after success, cancellation or refusal.
    await page.unroute('**/api/slightnudge/preview');
    await drag(move, moveFirst ? 48 : 24, 16);
    await page.waitForFunction(cursor => JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null')?.cursor === cursor, cancel || refuse ? 2 : 3);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    const saved = page.waitForResponse(r => r.url().includes('/apply') && r.request().method() === 'POST');
    await page.getByLabel('Draft controls', { exact: true }).getByRole('button', { name: 'Save changes', exact: true }).click();
    const result = await (await saved).json();
    assert.equal(result.success, true, result.error);
    assert.match(fs.readFileSync(file, 'utf8'), cancel || refuse ? /max-w-3xl/ : /max-w-4xl/);
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
    const undone = page.waitForResponse(r => r.url().includes('/undo') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal((await (await undone).json()).success, true);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.deepEqual(errors, []);
    console.log('PASS immediate second resize; first validation preserves active drag; serialized parents; continuation after success/cancel/refusal; real Save and byte-identical Undo');
    return 1;
  } finally { release(); }
}
