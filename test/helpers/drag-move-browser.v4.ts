import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkDragMove(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  // The historical workflow expects a zero-offset fixture, not the author's
  // saved playground positions. Only prepare the disposable checkout copy.
  if (path.resolve(workspace) === path.resolve(process.cwd())) throw new Error('Movement fixture setup requires a disposable workspace');
  const fixture = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, fixture.replace(/\btranslate-[xy]-\[-?\d+px\]/g, ''));
  const original = fs.readFileSync(file, 'utf8');
  let previews = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/preview') && request.method() === 'POST' && request.postDataJSON()?.operation !== 'inspect') previews++; });
  const ready = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/pages'), { timeout: 120000 });
  await page.goto(`${baseURL}/studio?view=fit`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await ready;
  await page.locator('[data-source-ready="true"]').waitFor();
  await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1');
  await page.locator('h1').click();
  const handle = page.getByRole('button', { name: 'Move element', exact: true });
  const apply = page.getByLabel('Draft controls', { exact: true }).getByRole('button', { name: 'Save changes', exact: true }).and(page.locator('button:enabled'));
  const measurement = page.getByLabel('Move measurement', { exact: true });
  // Playwright's boundingBox includes the iframe offset and canvas transform.
  // The real preview selects the heading itself, not a synthetic parent wrapper.
  const rectangle = async () => (await page.locator('h1').boundingBox())!;
  const origin = await rectangle();
  const button = (await handle.boundingBox())!;
  assert.ok(Math.abs(button.x + button.width / 2 - origin.x - origin.width / 2) < 1, 'Move handle is centered above the selection');
  await handle.click(); await page.getByRole('group', { name: 'Move selected element', exact: true }).waitFor();
  await handle.click(); assert.equal(await page.getByRole('group', { name: 'Move selected element', exact: true }).count(), 0, 'A second click closes the precise controls without creating a drag');
  const start = async () => { const box = (await handle.boundingBox())!; const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }; await page.mouse.move(point.x, point.y); await page.mouse.down(); return point; };
  const restored = () => page.waitForFunction(expected => { const iframe=document.querySelector('iframe')!;const r=iframe.contentDocument!.querySelector('h1')!.getBoundingClientRect(),outer=iframe.getBoundingClientRect(),sx=outer.width/iframe.offsetWidth,sy=outer.height/iframe.offsetHeight; return Math.abs(outer.x+r.x*sx - expected.x) < 1 && Math.abs(outer.y+r.y*sy - expected.y) < 1; }, origin);
  for (const cancellation of ['Escape', 'blur', 'pointercancel', 'capture', 'scroll', 'scope']) {
    const point = await start(); await page.mouse.move(point.x + 25, point.y + 15, { steps: 5 });
    await measurement.waitFor();
    const moved = await rectangle(); assert.ok(Math.abs(moved.x - origin.x - 24) < 1); assert.ok(Math.abs(moved.y - origin.y - 16) < 1);
    assert.equal(previews, 0); assert.equal(fs.readFileSync(file, 'utf8'), original);
    if (cancellation === 'Escape') await page.keyboard.press('Escape');
    else if (cancellation === 'scope') await page.getByRole('group', { name: 'Element state' }).getByRole('button', { name: 'Hover', exact: true }).dispatchEvent('click');
    else if (cancellation === 'capture') await page.evaluate(() => window.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 })));
    else await page.evaluate(kind => window.dispatchEvent(kind === 'pointercancel' ? new PointerEvent(kind) : new Event(kind)), cancellation);
    await page.mouse.up();
    console.log('CANCEL_DIAGNOSTIC', JSON.stringify({cancellation, origin, current: await rectangle(), measurementVisible: await measurement.isVisible(), state: await page.locator('h1').evaluate(e=>({style:e.getAttribute('style'),translate:getComputedStyle(e).translate,rect:e.getBoundingClientRect().toJSON()}))}));
    try { await restored(); } catch(error) { await page.screenshot({path:'docs/movement-cancel-failure.png'}); console.log('CANCEL_FAILURE',JSON.stringify({cancellation,origin,current:await rectangle(),state:await page.locator('h1').evaluate(e=>({style:e.getAttribute('style'),translate:getComputedStyle(e).translate,rect:e.getBoundingClientRect().toJSON()}))})); throw error; }
    assert.equal(await apply.count(), 0);
    if (cancellation === 'scope') await page.getByRole('group', { name: 'Element state' }).getByRole('button', { name: 'Default', exact: true }).click();
  }
  console.log('PASS: centered Move handle, live two-axis snapped geometry and six cancellation paths; no source proposals while dragging');
  await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('0.75');
  await page.waitForFunction(() => { const element = document.querySelector('[data-selection-artboard]') as HTMLElement; return Math.abs(element.getBoundingClientRect().width / element.offsetWidth - .75) < .001; });
  const scaledOrigin = await rectangle();
  let scaledPoint = await start(); await page.mouse.move(scaledPoint.x + 18, scaledPoint.y + 12); await measurement.waitFor();
  const scaledRect = await rectangle(); assert.ok(Math.abs(scaledRect.x - scaledOrigin.x - 18) < 1); assert.ok(Math.abs(scaledRect.y - scaledOrigin.y - 12) < 1);
  assert.ok((await measurement.textContent())?.includes('24px'));
  await page.keyboard.press('Escape'); await page.mouse.up();
  await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1'); await restored();
  assert.equal(previews, 0);
  console.log('PASS: scaled-canvas drag tracks CSS coordinates and cancels without preparing source');
  let point = await start(); await page.keyboard.down('Shift'); await page.mouse.move(point.x + 40, point.y + 27);
  await measurement.waitFor();
  assert.ok(Math.abs((await rectangle()).y - origin.y) < 1, 'Shift locks the dominant axis');
  const proposed = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/preview') && response.request().method() === 'POST');
  await page.mouse.up(); await page.keyboard.up('Shift');
  const locked = await (await proposed).json(); assert.equal(locked.success, true, locked.error);
  assert.ok(locked.newClassName.includes('translate-x-[40px]')); assert.ok(locked.newClassName.includes('translate-y-[0px]'));
  await apply.waitFor(); assert.equal(previews, 1);
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click(); await apply.waitFor({ state: 'hidden' }); await restored();
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  console.log('PASS: Shift axis lock, one review per completed drag, exact Discard restoration');
  point = await start(); await page.mouse.move(point.x + 24, point.y + 16, { steps: 4 }); await measurement.waitFor();
  await page.screenshot({ path: path.join(process.cwd(), 'docs/center-move-drag.png'), animations: 'disabled' });
  await page.mouse.up(); await apply.waitFor(); assert.equal(previews, 2);
  const accepted = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/apply'));
  await apply.click(); assert.equal((await (await accepted).json()).success, true); await apply.waitFor({ state: 'hidden' });
  assert.ok(fs.readFileSync(file, 'utf8').includes('translate-x-[24px] translate-y-[16px]'));
  const actualContext = await page.context().browser()!.newContext({ viewport: { width: 1600, height: 1000 } });
  const actual = await actualContext.newPage();
  try {
    await actual.goto(`${baseURL}/fixtures/1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const translation = (expected: { x: number; y: number }) => actual.waitForFunction(value => {
      const element = document.querySelector('#target'); if (!element) return false;
      const css = getComputedStyle(element);
      const independent = css.translate === 'none' ? [0, 0] : css.translate.split(' ').map(parseFloat);
      const matrix = css.transform === 'none' ? new DOMMatrix() : new DOMMatrix(css.transform);
      return Math.abs((independent[0] || 0) + matrix.m41 - value.x) < .1 && Math.abs((independent[1] || 0) + matrix.m42 - value.y) < .1;
    }, expected, { timeout: 5000 });
    const confirm = async (expected: { x: number; y: number }) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try { await translation(expected); return; }
        catch (error) {
          console.log('Source render not current:', await actual.locator('#target').evaluate(element => ({ className: element.className, translate: getComputedStyle(element).translate, transform: getComputedStyle(element).transform })));
          if (attempt === 3) throw error;
          await actual.goto(`${baseURL}/fixtures/1?source-check=${attempt}-${Date.now()}`, { waitUntil: 'domcontentloaded' });
        }
      }
    };
    await confirm({ x: 24, y: 16 });
    const undone = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/undo'));
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); assert.equal((await (await undone).json()).success, true);
    assert.equal(fs.readFileSync(file, 'utf8'), original); await restored();
    await actual.reload({ waitUntil: 'domcontentloaded' }); await confirm({ x: 0, y: 0 });
  } finally { await actualContext.close(); }
  console.log('PASS: Apply and exact Undo; actual source-rendered page confirms the same X/Y movement and restoration');
  await page.getByText('One thoughtful workspace for the people, projects, and plans that move your business forward.', { exact: true }).click();
  const paragraph = (await page.getByText('One thoughtful workspace for the people, projects, and plans that move your business forward.', { exact: true }).boundingBox())!;
  const centered = (await handle.boundingBox())!;
  assert.ok(Math.abs(centered.x + centered.width / 2 - paragraph.x - paragraph.width / 2) < 1);
  await page.screenshot({ path: path.join(process.cwd(), 'docs/center-move-selection.png'), animations: 'disabled' });
  await page.screenshot({ path: path.join(process.cwd(), 'docs/center-move-detail.png'), clip: { x: Math.floor(paragraph.x - 18), y: Math.floor(paragraph.y - 38), width: Math.ceil(paragraph.width + 36), height: Math.ceil(paragraph.height + 58) }, animations: 'disabled' });
  await handle.click(); await page.getByRole('button', { name: 'Move right', exact: true }).click(); await apply.waitFor();
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  assert.ok((await page.getByLabel('After change').innerText()).includes('translate-x-[4px]'));
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click(); await apply.waitFor({ state: 'hidden' });
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  console.log('PASS: paragraph selection matches the centered-handle design; click opens precise movement controls');
  return 4;
}
