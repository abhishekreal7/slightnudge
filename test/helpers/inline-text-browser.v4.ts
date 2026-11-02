import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkInlineText(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  page.setDefaultTimeout(30000);
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  let previews = 0, saves = 0;
  page.on('request', request => {
    if (request.method() !== 'POST') return;
    if (new URL(request.url()).pathname.endsWith('/preview') && request.postDataJSON()?.operation !== 'inspect') previews++;
    if (new URL(request.url()).pathname.endsWith('/apply')) saves++;
  });
  await page.goto(`${baseURL}/studio`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('[data-source-ready="true"]').waitFor();
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 30000 });
  await idle(); await page.locator('h1').click();
  const toolbar = page.getByRole('toolbar', { name: 'Selection formatting' });
  const heading = page.frameLocator('iframe[title="Actual project"]').getByRole('textbox', { name: 'Edit selected text', exact: true });
  const metrics = () => page.locator('h1').evaluate(element => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    return { size: style.fontSize, family: style.fontFamily, weight: style.fontWeight, lineHeight: style.lineHeight, spacing: style.letterSpacing, align: style.textAlign, width: rect.width, height: rect.height };
  });
  const before = await metrics();
  const originalText = await page.locator('h1').textContent();
  await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click(); await heading.waitFor();
  assert.deepEqual(await metrics(), before, 'Editing preserves every typography metric and wrapping');
  await heading.press('Control+a'); await heading.pressSequentially('Native caret editing');
  await heading.press('ArrowLeft'); await heading.pressSequentially('!');
  assert.equal(await heading.textContent(), 'Native caret editin!g');
  await heading.press('Control+z'); assert.equal(previews, 0, 'Native text Undo must not trigger source Undo or movement');
  await heading.press('Escape'); assert.equal(await page.locator('h1').textContent(), originalText);
  assert.equal(previews, 0);
  console.log('PASS identical heading typography/wrapping, caret insertion, native Undo, Escape without source proposals');

  await page.locator('h1').dblclick(); await heading.waitFor();
  await heading.press('Control+a'); await heading.pressSequentially('Editing typography directly on the canvas');
  const typed = await heading.textContent();
  for (const [name, value] of [['Font size', 'text-4xl'], ['Typeface', 'font-serif'], ['Text alignment', 'text-left']]) {
    const response = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/preview'));
    await toolbar.getByRole('combobox', { name, exact: true }).selectOption(value);
    const result = await (await response).json(); assert.equal(result.success, true, result.error); await idle();
    assert.equal(await heading.textContent(), typed, 'Typography changes must not replace the uncommitted wording');
    assert.equal(await heading.getAttribute('contenteditable'), 'plaintext-only');
  }
  assert.equal((await metrics()).size, '36px');
  assert.equal((await metrics()).align, 'left');
  await heading.focus(); await page.screenshot({ path: path.join(process.cwd(), 'docs/inline-text-editing.png'), animations: 'disabled' });
  const save = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/apply'));
  await page.keyboard.press('Control+s'); assert.equal((await (await save).json()).success, true); await idle();
  assert.equal(saves, 1);
  assert.ok(fs.readFileSync(file, 'utf8').includes(typed!));
  const history = JSON.parse(fs.readFileSync(path.join(workspace, '.slightnudge/history/edits.json'), 'utf8'));
  assert.equal(history.length, 1, 'Text and typography are saved together once');
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle();
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  console.log('PASS live size/typeface/alignment preserve typed text; Ctrl+S saves text plus typography once; saved batch Undo restores bytes');

  const paragraphText = 'One thoughtful workspace for the people, projects, and plans that move your business forward.';
  const paragraph = page.frameLocator('iframe[title="Actual project"]').getByRole('textbox', { name: 'Edit selected text', exact: true });
  await page.getByText(paragraphText, { exact: true }).dblclick(); await paragraph.waitFor();
  const initialCount = previews;
  await paragraph.dispatchEvent('compositionstart', { data: '' }); await paragraph.press('Enter');
  assert.equal(previews, initialCount, 'Composition Enter must not commit text');
  await paragraph.dispatchEvent('compositionend', { data: '' }); await paragraph.press('Escape');
  await page.getByText(paragraphText, { exact: true }).click();
  await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click(); await paragraph.waitFor();
  await paragraph.press('Control+a');
  await paragraph.evaluate(element => {
    const clipboard = new DataTransfer(); clipboard.setData('text/plain', 'Pasted <b>plain</b>\ntext'); clipboard.setData('text/html', '<img src=x onerror=alert(1)>');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
  });
  assert.equal(await paragraph.textContent(), 'Pasted <b>plain</b> text');
  assert.equal(await paragraph.locator('img,b').count(), 0);
  const committed = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/preview'));
  await paragraph.press('Enter'); assert.equal((await (await committed).json()).success, true); await idle();
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.getByText('Pasted <b>plain</b> text', { exact: true }).dblclick(); await paragraph.waitFor();
  await paragraph.press('Control+a'); await paragraph.pressSequentially('Commit on selection change');
  const blurred = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/preview'));
  await page.locator('h1').click(); assert.equal((await (await blurred).json()).success, true); await idle();
  const headingBox = await page.locator('h1').boundingBox(), selectionBox = await page.getByLabel('Selected source element', { exact: true }).boundingBox();
  assert.equal(Boolean(headingBox && selectionBox && Math.abs(headingBox.x-selectionBox.x)<1 && Math.abs(headingBox.y-selectionBox.y)<1 && Math.abs(headingBox.width-selectionBox.width)<1 && Math.abs(headingBox.height-selectionBox.height)<1), true);
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  assert.equal(fs.readFileSync(file, 'utf8'), original); assert.equal(saves, 1);
  console.log('PASS direct paragraph editing, composition guard, plain-text paste, Enter and blur commit, selection handoff, draft discard without source writes');
  return 3;
}
