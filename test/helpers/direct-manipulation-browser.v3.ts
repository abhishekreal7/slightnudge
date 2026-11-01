import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkDirectManipulation(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  let previews = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/preview') && request.method() === 'POST') previews++; });
  const ready = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/pages'), { timeout: 120000 });
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await ready;
  await page.locator('h1').click();
  await page.evaluate(() => {
    (window as any).__resizeEvents = [];
    for (const type of ['pointermove', 'pointerdown', 'pointerup', 'lostpointercapture', 'scroll', 'blur', 'pointercancel']) window.addEventListener(type, event => {
      if (document.querySelector('[aria-label="Drag to resize width"]')?.getAttribute('aria-pressed') !== 'true') return;
      const events = (window as any).__resizeEvents as unknown[];
      events.push({ type, pointerId: (event as PointerEvent).pointerId, x: (event as PointerEvent).clientX });
      if (events.length > 40) events.shift();
    }, true);
  });
  const grip = page.getByRole('button', { name: 'Drag to resize width', exact: true });
  const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
  const measure = page.getByLabel('Resize measurement', { exact: true });
  const width = () => page.locator('h1').evaluate(element => element.parentElement!.getBoundingClientRect().width);
  const start = async () => {
    await page.waitForFunction(() => {
      const button = document.querySelector('[aria-label="Drag to resize width"]') as HTMLButtonElement | null;
      return button && !button.disabled && document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false';
    });
    const rect = (await grip.boundingBox())!;
    const point = { x: rect.x + 18, y: rect.y + rect.height / 2 };
    await page.mouse.move(point.x, point.y); await page.mouse.down();
    await page.waitForFunction(() => document.querySelector('[aria-label="Drag to resize width"]')?.getAttribute('aria-pressed') === 'true');
    return point;
  };
  const originalWidth = await width();
  console.log('Resize baseline:', JSON.stringify({ width: originalWidth, rem: await page.evaluate(() => getComputedStyle(document.documentElement).fontSize) }));
  for (const label of ['Resize width from left', 'Resize width from right', 'Resize width from bottom left', 'Resize width from bottom right']) {
    const handle = page.getByRole('button', { name: label, exact: true });
    const bounds = (await handle.boundingBox())!;
    assert.ok(bounds.width >= 18 && bounds.height >= 30, 'The visible micro-handle must have a larger usable hit area');
  }
  for (const cancellation of ['Escape', 'blur', 'pointercancel', 'capture', 'scroll', 'scope']) {
    const point = await start();
    await page.mouse.move(point.x - 55, point.y, { steps: 5 });
    await page.waitForFunction(() => document.querySelector('[aria-label="Resize measurement"]')?.textContent?.includes('576px'), undefined, { timeout: 5000 }).catch(async cause => {
      console.log('Resize gesture failure:', { cancellation, pressed: await grip.getAttribute('aria-pressed'), measurement: await measure.textContent({ timeout: 200 }).catch(() => 'missing'), width: await width(), events: await page.evaluate(() => (window as any).__resizeEvents), notice: await page.getByLabel('Editor notice').allTextContents() });
      throw cause;
    });
    assert.ok(Math.abs(await width() - 576) < 1, 'The displayed canvas width must use the same snapped value as the source proposal');
    assert.equal(previews, 0, 'Dragging is local; it does not generate source proposals on pointer movement');
    if (cancellation === 'Escape') await page.keyboard.press('Escape');
    else if (cancellation === 'scope') await page.getByRole('group', { name: 'Element state', exact: true }).getByRole('button', { name: 'Hover', exact: true }).dispatchEvent('click');
    else if (cancellation === 'capture') await page.evaluate(() => window.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 })));
    else await page.evaluate(kind => window.dispatchEvent(kind === 'pointercancel' ? new PointerEvent(kind) : new Event(kind)), cancellation);
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('[aria-label="Drag to resize width"]')?.getAttribute('aria-pressed') === 'false', undefined, { timeout: 3000 }).catch(async cause => {
      console.log('Resize cancellation failure:', { cancellation, count: await grip.count(), pressed: await grip.getAttribute('aria-pressed', { timeout: 100 }).catch(() => 'missing'), events: await page.evaluate(() => (window as any).__resizeEvents) });
      await page.screenshot({ path: path.join(process.cwd(), 'docs/direct-manipulation-cancel-failure.png') });
      throw cause;
    });
    console.log(`PASS: ${cancellation} cancels the active resize and retains selection`);
    if (cancellation === 'scope') await page.getByRole('group', { name: 'Element state', exact: true }).getByRole('button', { name: 'Default', exact: true }).click();
    assert.equal(await measure.count(), 0);
    assert.equal(await apply.count(), 0);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    await page.waitForFunction(expected => Math.abs(document.querySelector('h1')!.parentElement!.getBoundingClientRect().width - expected) < 1, originalWidth);
  }
  console.log('PASS: generous edge/corner targets, live snapped geometry, no per-frame proposals, Escape/blur/cancel/capture/scroll restoration');

  // Use the release coordinate even when the final move has not painted yet.
  const point = await start();
  await page.mouse.move(point.x - 55, point.y);
  await page.getByText('Paragraph', { exact: true }).dispatchEvent('click');
  assert.equal(await page.locator('h1').evaluate(element => Boolean(element.parentElement!.querySelector('[aria-label="Drag to resize width"]'))), true, 'Gesture target is frozen');
  const prepared = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/preview') && response.request().method() === 'POST');
  await page.evaluate(({ x, y }) => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: x - 80, clientY: y })), point);
  await page.mouse.up();
  const proposal = await (await prepared).json(); assert.equal(proposal.success, true, proposal.error);
  assert.ok(proposal.newClassName.includes('max-w-lg'));
  await apply.waitFor();
  assert.equal(previews, 1, 'One completed gesture creates exactly one review');
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.getByRole('button', { name: 'Discard', exact: true }).click(); await apply.waitFor({ state: 'hidden' });
  console.log('PASS: final pointer coordinate determines one proposal; selection stays pinned; Discard leaves source untouched');

  // A scaled canvas needs CSS-space deltas, not raw screen-pixel deltas.
  await page.locator('h1').evaluate(element => { element.parentElement!.style.transform = 'scale(.75)'; });
  const scaled = await start(); await page.mouse.move(scaled.x - 60, scaled.y);
  await page.waitForFunction(() => document.querySelector('[aria-label="Resize measurement"]')?.textContent?.includes('512px'));
  assert.ok(Math.abs(await width() - 384) < 1, '512 CSS pixels rendered at 75% occupy 384 screen pixels');
  await page.screenshot({ path: path.join(process.cwd(), 'docs/direct-manipulation-resize.png'), animations: 'disabled' });
  await page.keyboard.press('Escape'); await page.mouse.up();
  await page.locator('h1').evaluate(element => { element.parentElement!.style.transform = ''; });
  await page.waitForFunction(expected => Math.abs(document.querySelector('h1')!.parentElement!.getBoundingClientRect().width - expected) < 1, originalWidth);
  assert.equal(previews, 1);
  console.log('PASS: scale-aware pointer geometry and live measurement; cancelled scaled gesture generates no proposal');

  await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  await grip.focus(); await grip.press('ArrowLeft'); await apply.waitFor();
  assert.ok((await page.getByLabel('After change').innerText()).includes('max-w-xl'));
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.getByRole('button', { name: 'Discard', exact: true }).click(); await apply.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  await grip.focus(); await grip.press('Home'); await apply.waitFor();
  assert.ok((await page.getByLabel('After change').innerText()).includes('max-w-sm'));
  const saved = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/apply'));
  await apply.click(); assert.equal((await (await saved).json()).success, true); await apply.waitFor({ state: 'hidden' });
  assert.ok(fs.readFileSync(file, 'utf8').includes('max-w-sm'));
  const undone = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/undo'));
  await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click(); assert.equal((await (await undone).json()).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedDuration = await page.getByRole('button', { name: 'Resize width from right', exact: true }).evaluate(element => getComputedStyle(element, '::after').transitionDuration);
  assert.ok(parseFloat(reducedDuration) <= .001, 'Reduced-motion feedback must be immediate (the app-wide rule uses a near-zero duration)');
  console.log('PASS: keyboard presets and limits, exact source Apply/Undo, and reduced-motion handle feedback');
  const move = page.getByRole('button', { name: 'Move element', exact: true });
  await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  await move.focus(); await move.press('ArrowDown'); await apply.waitFor();
  assert.ok((await page.getByLabel('After change').innerText()).includes('translate-y-[4px]'));
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.getByRole('button', { name: 'Discard', exact: true }).click(); await apply.waitFor({ state: 'hidden' });
  console.log('PASS: focused Move control provides keyboard position adjustment with explicit review and source-preserving Discard');
  return 5;
}
