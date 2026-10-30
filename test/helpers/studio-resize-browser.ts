import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Page } from 'playwright';

export async function checkStudioResize(page: Page, baseURL: string, workspace: string) {
  page.on('pageerror', error => console.log('Resize browser error:', error.message));
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const ready = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/pages'), { timeout: 120000 });
  await page.goto(`${baseURL}/studio`); await ready;
  await page.locator('h1').click();
  const grip = page.getByRole('button', { name: 'Drag to resize width' });
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 10);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel')));
  await page.mouse.up();
  assert.equal(await page.getByRole('button', { name: 'Apply to code', exact: true }).count(), 0);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  assert.equal(await grip.getAttribute('aria-pressed'), 'false');
  const start = (await grip.boundingBox())!;
  await page.mouse.move(start.x + 10, start.y + 10); await page.mouse.down();
  assert.equal(await grip.getAttribute('aria-pressed'), 'true', 'A pointer press must start the resize gesture');
  await page.mouse.move(start.x + 100, start.y + 10); await page.mouse.up();
  const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
  await apply.waitFor();
  assert.equal(await grip.getAttribute('aria-pressed'), 'false');
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await apply.waitFor({ state: 'hidden' });
  await page.getByLabel('Maximum width', { exact: true }).selectOption('max-w-lg');
  await apply.waitFor();
  assert.ok((await page.getByLabel('After change').innerText()).includes('max-w-lg'));
  const applied = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/apply'));
  await apply.click();
  assert.equal((await (await applied).json()).success, true, 'Width Apply must be confirmed by the source API');
  await apply.waitFor({ state: 'hidden' });
  assert.ok(fs.readFileSync(file, 'utf8').includes('max-w-lg'));
  const undo = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/undo'));
  await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click(); await undo;
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  for (const cancellation of ['escape', 'blur']) {
    await page.locator('h1').click();
    const bounds = (await grip.boundingBox())!;
    await page.mouse.move(bounds.x + 10, bounds.y + 10); await page.mouse.down();
    await page.mouse.move(bounds.x + 90, bounds.y + 10);
    if (cancellation === 'escape') await page.keyboard.press('Escape');
    else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.mouse.up();
    assert.equal(await apply.count(), 0, `${cancellation} must cancel without preparing an edit`);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
  }
  await page.locator('h1').click();
  const still = (await grip.boundingBox())!;
  await page.mouse.move(still.x + 10, still.y + 10); await page.mouse.down(); await page.mouse.up();
  assert.equal(await apply.count(), 0, 'A click without a drag must not create an edit');
  const move = page.getByRole('button', { name: 'Move element', exact: true });
  await move.click();
  const movePanel = page.getByRole('group', { name: 'Move selected element', exact: true });
  await movePanel.waitFor();
  assert.equal(await move.getAttribute('aria-expanded'), 'true');
  const moveScreenshot = path.join(os.tmpdir(), 'slightnudge-move-control.png');
  await page.screenshot({ path: moveScreenshot, animations: 'disabled' });
  console.log(`Move screenshot: ${moveScreenshot}`);
  await page.keyboard.press('Escape');
  assert.equal(await movePanel.count(), 0);
  assert.equal(await move.count(), 1, 'Escape closes Move while retaining selection');
  await move.click();
  const beforeMargin = await headingMargin(page);
  const preparedMove = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/preview') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Move down', exact: true }).click();
  assert.equal((await (await preparedMove).json()).success, true);
  await apply.waitFor();
  assert.equal(await movePanel.count(), 0);
  assert.equal(await move.isDisabled(), true, 'Move pauses until the current review is resolved');
  assert.notEqual(await headingMargin(page), beforeMargin, 'Move must visibly adjust the selected element');
  assert.equal(fs.readFileSync(file, 'utf8'), original, 'Move preview never writes source');
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await apply.waitFor({ state: 'hidden' });
  await page.waitForFunction(expected => new DOMMatrix(getComputedStyle(document.querySelector('h1')!.parentElement!).transform).m42 === expected, beforeMargin, { timeout: 3000 });
  assert.equal(await headingMargin(page), beforeMargin);
  await move.click(); await page.getByRole('button', { name: 'Move down', exact: true }).click(); await apply.waitFor();
  const savedMove = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/apply'));
  await apply.click(); assert.equal((await (await savedMove).json()).success, true);
  await apply.waitFor({ state: 'hidden' });
  assert.notEqual(fs.readFileSync(file, 'utf8'), original);
  const undoMove = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/undo'));
  await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click(); assert.equal((await (await undoMove).json()).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.waitForFunction(expected => new DOMMatrix(getComputedStyle(document.querySelector('h1')!.parentElement!).transform).m42 === expected, beforeMargin);
  const paragraph = page.getByText('One thoughtful workspace for the people, projects, and plans that move your business forward.', { exact: true });
  await paragraph.click();
  for (const direction of ['up', 'left', 'down', 'right']) {
    console.log('Move pointer regression:', { direction, disabled: await move.isDisabled(), resizing: await grip.getAttribute('aria-pressed'), busy: await page.getByLabel('Visual editing workspace').getAttribute('aria-busy'), pending: await apply.count(), notice: await page.getByLabel('Editor notice').allTextContents() });
    await move.click();
    const prepared = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/preview') && r.request().method() === 'POST');
    await page.getByRole('button', { name: `Move ${direction}`, exact: true }).click();
    const proposal = await (await prepared).json();
    assert.equal(proposal.success, true, proposal.error);
    await apply.waitFor();
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.ok(proposal.newClassName.includes(direction === 'up' ? 'translate-y-[-4px]' : direction === 'left' ? 'translate-x-[-4px]' : direction === 'down' ? 'translate-y-[4px]' : 'translate-x-[4px]'));
    await page.getByRole('button', { name: 'Discard', exact: true }).click(); await apply.waitFor({ state: 'hidden' });
  }
  await move.click();
  await page.screenshot({ path: moveScreenshot, animations: 'disabled' });
  if (process.argv.includes('--screenshot')) {
    const screenshot = path.join(os.tmpdir(), 'slightnudge-resize-control.png');
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    console.log(`Resize screenshot: ${screenshot}`);
  }
  return 23;
}

async function headingMargin(page: Page) { return page.locator('h1').evaluate(element => new DOMMatrix(getComputedStyle(element.parentElement!).transform).m42); }
