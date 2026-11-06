import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkResizeInteraction(page: Page, base: string, workspace: string) {
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  let previews = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/preview') && request.method() === 'POST' && request.postDataJSON()?.operation !== 'inspect') previews++; });
  await page.goto(base + '/editor?view=full', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  await page.evaluate(() => {
    (window as any).__resizeNotices = [];
    new MutationObserver(() => {
      const value = document.querySelector('[aria-label="Editor notice"]')?.textContent;
      const notices = (window as any).__resizeNotices as string[];
      if (value && notices.at(-1) !== value) notices.push(value);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  const heading = page.frameLocator('iframe[title="Actual project"]').locator('h1');
  await heading.click();
  const handle = page.getByRole('button', { name: 'Resize width from right', exact: true });
  const box = (await handle.boundingBox())!;
  // On a short heading, the corner target overlaps the edge midpoint.
  // Hit the upper quarter to exercise the right edge itself.
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 4 };
  const width = await heading.evaluate(el => el.getBoundingClientRect().width);
  console.log('Actual heading width before resize:', width);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x + 80, start.y, { steps: 5 });
  await page.getByLabel('Resize measurement', { exact: true }).waitFor();
  console.log('Width during max-width gesture:', await heading.evaluate(el => el.getBoundingClientRect().width));
  console.log('Focused host element:', await page.evaluate(() => document.activeElement?.tagName));
  assert.equal(await handle.evaluate(el => document.activeElement === el), true, 'Resize handle must own keyboard focus while dragging');
  await page.keyboard.press('Escape');
  assert.equal(await handle.getAttribute('aria-pressed'), 'false', 'Escape from an iframe-origin selection must cancel resize before pointer release');
  await page.mouse.up();
  assert.equal(previews, 0, 'Cancelled gesture must not propose a source edit');
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  // The heading's parent is narrower than every supported max-width preset.
  // Exercise an actual size change on the full-width section instead.
  const section = page.frameLocator('iframe[title="Actual project"]').locator('#overview');
  await section.click({ position: { x: 4, y: 4 } });
  const originalSectionWidth = await section.evaluate(el => el.getBoundingClientRect().width);
  const next = (await handle.boundingBox())!;
  await page.mouse.move(next.x + next.width / 2, next.y + next.height / 2);
  await page.mouse.down();
  const prepared = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/preview') && r.request().method() === 'POST' && r.request().postDataJSON()?.operation !== 'inspect');
  await page.mouse.move(next.x + next.width / 2 - 120, next.y + next.height / 2, { steps: 5 });
  await page.mouse.up();
  const result = await (await prepared).json();
  console.log('Resize proposal:', JSON.stringify({ newValue: result.newValue, newClassName: result.newClassName, css: result.css }));
  assert.equal(result.success, true, result.error);
  await page.waitForFunction(() => localStorage.getItem('slightnudge:studio:continuous-draft:v1') !== null).catch(async error => {
    console.log('Resize notices:', await page.evaluate(() => (window as any).__resizeNotices));
    console.log('Section max-width after refusal:', await section.evaluate(el => ({ classes: el.className, style: el.getAttribute('style'), maxWidth: getComputedStyle(el).maxWidth })));
    throw error;
  });
  assert.ok(await section.evaluate(el => el.getBoundingClientRect().width) < originalSectionWidth, 'Supported section resize changes actual rendered width');
  assert.equal(previews, 1, 'One completed gesture creates one draft proposal');
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  const saved = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/apply') && r.request().method() === 'POST');
  await page.getByLabel('Draft controls', { exact: true }).getByRole('button', { name: 'Save changes', exact: true }).click();
  const saveResult = await (await saved).json();
  assert.equal(saveResult.success, true, saveResult.error);
  assert.ok(fs.readFileSync(file, 'utf8').includes(result.newValue), 'Save writes the resize utility to the disposable source');
  await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  const undone = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/undo') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const undoResult = await (await undone).json();
  assert.equal(undoResult.success, true, undoResult.error);
  assert.equal(fs.readFileSync(file, 'utf8'), original, 'Undo restores the exact original bytes');
  console.log('PASS Escape cancels resize, subsequent resize creates one real draft, source remains unchanged');
  console.log('PASS resize Save and byte-identical source Undo');
  return 1;
}
