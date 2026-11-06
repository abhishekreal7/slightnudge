import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkConsecutiveMove(page: Page, base: string, workspace: string) {
  assert.notEqual(path.resolve(workspace), path.resolve(process.cwd()));
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\btranslate-[xy]-\[-?\d+px\]/g, ''));
  const original = fs.readFileSync(file, 'utf8');
  const pageErrors: string[] = [];
  const recordPageError = (error: Error) => pageErrors.push(error.message);
  page.on('pageerror', recordPageError);
  const moves: any[] = [];
  const refusal = process.argv.includes('--refusal');
  const cancel = process.argv.includes('--cancel');
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let reached!: () => void;
  const responseHeld = new Promise<void>(resolve => { reached = resolve; });
  let firstId: string | undefined;
  await page.route('**/api/slightnudge/preview', async route => {
    const body = route.request().postDataJSON();
    if (body?.kind !== 'move' || body.operation === 'inspect') return route.continue();
    moves.push(body);
    if (refusal && moves.length === 2) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Controlled move refusal for recovery verification' }) });
    const response = await route.fetch();
    if (moves.length === 1) {
      firstId = (await response.json()).id;
      reached(); await held;
    }
    await route.fulfill({ response });
  });
  try {
    const fit = process.argv.includes('--fit');
    await page.goto(base + '/editor?view=' + (fit ? 'fit' : 'full'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
    if (fit) await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('0.75');
    const heading = page.frameLocator('iframe[title="Actual project"]').locator('h1');
    await heading.click();
    await page.evaluate(() => {
      const samples: number[] = [];
      (window as any).__moveLatency = samples;
      let start: { x: number; y: number; left: number; top: number; scale: number } | null = null;
      let pending: { left: number; top: number; at: number } | null = null;
      window.addEventListener('pointerdown', e => {
        if (!(e.target as Element)?.closest('[aria-label="Move element"]')) return;
        const el = document.querySelector('iframe')?.contentDocument?.querySelector('h1');
        if (el) { const r = el.getBoundingClientRect(), frame = document.querySelector('iframe')!; start = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, scale: frame.getBoundingClientRect().width / frame.clientWidth }; }
      }, true);
      window.addEventListener('pointermove', e => {
        if (start && e.buttons === 1) pending = { left: start.left + Math.round((e.clientX - start.x) / start.scale / 4) * 4, top: start.top + Math.round((e.clientY - start.y) / start.scale / 4) * 4, at: performance.now() };
      }, true);
      window.addEventListener('pointerup', () => { start = null; }, true);
      window.addEventListener('message', e => {
        const rect = e.data?.type === 'source-rect' ? e.data.selection?.rect : null;
        if (pending && rect && Math.abs(rect.left - pending.left) < 1 && Math.abs(rect.top - pending.top) < 1) {
          samples.push(performance.now() - pending.at); pending = null;
        }
      });
    });
    const origin = (await heading.boundingBox())!;
    const scale = await page.locator('iframe[title="Actual project"]').evaluate(el => el.getBoundingClientRect().width / (el as HTMLIFrameElement).clientWidth);
    const handle = page.getByRole('button', { name: 'Move element', exact: true });
    const drag = async (dx: number, dy: number, releasePointer = true) => {
      const box = (await handle.boundingBox())!;
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x + dx * scale, y + dy * scale, { steps: 4 });
      if (releasePointer) await page.mouse.up();
    };
    await drag(24, 16);
    await responseHeld;
    assert.equal(await handle.isEnabled(), true, 'Move must remain available while the previous real response is held');
    const start = performance.now();
    await drag(24, 16, false);
    await page.waitForFunction(({ x, y }) => {
      const frame = document.querySelector('iframe')!;
      const el = frame.contentDocument?.querySelector('h1');
      if (!el) return false;
      const rect = el.getBoundingClientRect(), outer = frame.getBoundingClientRect(), scale = outer.width / frame.clientWidth;
      return Math.abs(rect.x * scale + outer.x - x) < 1 && Math.abs(rect.y * scale + outer.y - y) < 1;
    }, { x: origin.x + 48 * scale, y: origin.y + 32 * scale });
    console.log('Second drag visible while first response held; browser automation elapsed ms:', Math.round(performance.now() - start));
    assert.equal(moves.length, 1, 'A second validation must wait for the first');
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    if (cancel) await page.keyboard.press('Escape');
    release();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null')?.cursor === 1);
    if (!cancel) assert.equal(await handle.getAttribute('aria-pressed'), 'true', 'An in-progress second drag survives the first validation completing');
    await page.mouse.up();
    if (cancel || refusal) {
      await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
      assert.equal(moves.length, cancel ? 1 : 2);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null')?.cursor), 1);
      const restored = (await heading.boundingBox())!;
      assert.ok(Math.abs(restored.x - origin.x - 24 * scale) < 1);
      assert.ok(Math.abs(restored.y - origin.y - 16 * scale) < 1);
      assert.equal(fs.readFileSync(file, 'utf8'), original);
      assert.equal(await handle.isEnabled(), true);
      assert.deepEqual(pageErrors, [], 'No browser runtime errors');
      console.log(cancel ? 'PASS Escape cancels only the in-progress drag; first real move remains and controls recover' : 'PASS MOCKED second-response refusal restores verified first position, preserves its draft, and unlocks controls');
      return 1;
    }
    await page.waitForFunction(() => {
      const draft = JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null');
      return draft?.cursor === 2 && document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false';
    });
    assert.equal(moves.length, 2);
    assert.equal(moves[1].parentPreviewId, firstId, 'Second move builds on the verified first draft');
    console.log('Pointer-to-preview-geometry acknowledgment ms:', await page.evaluate(() => (window as any).__moveLatency));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null')?.cursor === 1 && document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
    const firstPosition = (await heading.boundingBox())!;
    assert.ok(Math.abs(firstPosition.x - origin.x - 24 * scale) < 1);
    assert.ok(Math.abs(firstPosition.y - origin.y - 16 * scale) < 1);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('slightnudge:studio:continuous-draft:v1') || 'null')?.cursor === 2 && document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
    const finalPosition = (await heading.boundingBox())!;
    assert.ok(Math.abs(finalPosition.x - origin.x - 48 * scale) < 1);
    assert.ok(Math.abs(finalPosition.y - origin.y - 32 * scale) < 1);
    const saved = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/apply') && r.request().method() === 'POST');
    await page.getByLabel('Draft controls', { exact: true }).getByRole('button', { name: 'Save changes', exact: true }).click();
    assert.equal((await (await saved).json()).success, true);
    assert.match(fs.readFileSync(file, 'utf8'), /translate-x-\[48px\] translate-y-\[32px\]/);
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
    const undone = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/undo') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal((await (await undone).json()).success, true);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.deepEqual(pageErrors, [], 'No browser runtime errors');
    console.log('PASS consecutive visual moves during delayed real validation; serialized parents, two Undo steps, Save and exact source Undo');
    return 1;
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }); page.off('pageerror', recordPageError); }
}
