import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import type { Page } from 'playwright';

// Contracts are checked against the existing Studio, in an isolated app copy.
export async function checkCurrentStudioReview(page: Page, baseURL: string) {
  let passed = 0, previews = 0, applies = 0, undos = 0;
  let rejectPreview = false, staleApply = false, failApply = false, failUndo = false;
  let refuseInspection = false;
  let delay = false, release: (() => void) | undefined;
  await page.route('**/api/slightnudge/**', async route => {
    const url = new URL(route.request().url());
    let body: object = { success: true }, status = 200;
    if (url.pathname.endsWith('/token')) body = { token: 'disposable-test-only' };
    if (url.pathname.endsWith('/pages')) body = { allPages: [] };
    if (url.pathname.endsWith('/inspect')) {
      const p = route.request().postDataJSON();
      body = { found: true, safeToEdit: true, textEditable: true, filePath: p.filePath, line: p.line, column: p.column, tagName: p.tagName, className: p.className };
      if (refuseInspection) body = { found: true, safeToEdit: false, reason: 'Test refusal: source target is ambiguous.', filePath: p.filePath };
    }
    if (url.pathname.endsWith('/preview') && route.request().method() === 'POST') {
      previews++;
      const p = route.request().postDataJSON();
      if (delay) await new Promise<void>(resolve => { release = resolve; });
      body = { success: true, changed: true, id: `proposal-${previews}`, filePath: p.filePath, line: p.line, summary: 'Change font weight', oldValue: p.kind === 'text' ? 'Make room for your best work.' : p.className, newValue: p.kind === 'text' ? p.value : 'font-bold', oldClassName: p.className, newClassName: `${p.className} font-bold` };
      if (rejectPreview) { status = 422; body = { success: false, error: 'Test refusal: dynamic value cannot be edited.' }; }
    }
    if (url.pathname.endsWith('/apply')) {
      applies++;
      if (staleApply) { status = 409; body = { success: false, code: 'SOURCE_CHANGED', error: 'Source changed after preview. Select again.' }; }
      else if (failApply) { status = 500; body = { success: false, error: 'Test apply failure.' }; }
    }
    if (url.pathname.endsWith('/undo')) {
      undos++;
      if (failUndo) { status = 500; body = { success: false, error: 'Test undo failure.' }; }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const hydrated = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/pages'));
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded' });
  await hydrated;
  const heading = page.locator('h1').filter({ hasText: 'Make room for your best work.' });
  await heading.click();
  const weight = () => heading.evaluate(el => getComputedStyle(el).fontWeight);
  const originalWeight = await weight();
  rejectPreview = true;
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await page.getByText(/Test refusal: dynamic/).waitFor();
  assert.equal(await weight(), originalWeight, 'Refused style must leave canvas unchanged'); passed++;
  rejectPreview = false; delay = true;
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await expectUntil(() => Boolean(release), page);
  assert.equal(await weight(), originalWeight, 'In-flight change must not appear accepted'); passed++;
  await page.keyboard.press('Escape');
  await page.locator('p').filter({ hasText: 'One thoughtful workspace for the people' }).first().click();
  release!(); delay = false;
  const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
  await apply.waitFor();
  assert.ok(await page.getByTitle('Toggle bold', { exact: true }).isVisible(), 'In-flight selection must remain pinned to heading'); passed++;
  assert.ok(await page.getByText('Not saved to source', { exact: true }).isVisible());
  assert.ok(await page.getByLabel('Before change').isVisible());
  assert.ok(await page.getByLabel('After change').isVisible()); passed++;
  if (process.argv.includes('--screenshot')) {
    const file = path.join(os.tmpdir(), 'slightnudge-review-polish.png');
    await page.locator('aside').filter({ has: page.getByRole('heading', { name: 'Review change', exact: true }) }).screenshot({ path: file, animations: 'disabled' });
    console.log(`Inspector screenshot: ${file}`);
  }
  const count = previews;
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);
  assert.equal(previews, count); assert.equal(applies, 0); assert.equal(undos, 0); passed++;
  await page.getByRole('button', { name: 'Discard', exact: true }).last().click();
  await apply.waitFor({ state: 'hidden' });
  assert.equal(await weight(), originalWeight, 'Discard restores exact original visual'); passed++;
  await page.getByTitle('Edit text directly on canvas').click();
  const input = page.locator('input:focus');
  await input.fill('A draft that must be refused');
  rejectPreview = true;
  await input.press('Enter');
  await page.getByText(/Test refusal: dynamic/).waitFor();
  assert.equal(await heading.textContent(), 'Make room for your best work.', 'Refused text must restore original'); passed++;
  rejectPreview = false;
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await apply.waitFor();
  failApply = true;
  await apply.click();
  await page.getByText(/Test apply failure/).waitFor();
  assert.ok(await apply.isVisible(), 'Generic failure retains review'); passed++;
  failApply = false; staleApply = true;
  await apply.click();
  await apply.waitFor({ state: 'hidden' });
  assert.equal(await weight(), originalWeight, 'Outside edit cancels preview and restores snapshot'); passed++;
  staleApply = false;
  await heading.click();
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await apply.waitFor();
  const beforeApplyCount = applies;
  await apply.click();
  await apply.waitFor({ state: 'hidden' });
  assert.equal(applies, beforeApplyCount + 1); passed++;
  failUndo = true;
  await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click();
  await page.getByText(/Test undo failure/).waitFor();
  assert.equal(await weight(), '700', 'Failed undo must preserve applied visual'); passed++;
  failUndo = false;
  await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click();
  await expectUntil(async () => (await weight()) === originalWeight, page); passed++;
  await page.getByTitle('Edit text directly on canvas').click();
  await page.locator('input:focus').fill('A reviewed temporary heading');
  await page.locator('input:focus').press('Enter');
  await apply.waitFor();
  assert.equal(await page.locator('h1').textContent(), 'A reviewed temporary heading');
  await page.getByRole('button', { name: 'Discard', exact: true }).last().click();
  await page.getByText('Not saved to source', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await heading.textContent(), 'Make room for your best work.'); passed++;
  const beforeReorder = previews;
  await page.getByTitle('More actions', { exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Move earlier', exact: true }).count(), 0);
  assert.equal(previews, beforeReorder, 'Removed reorder controls must not request edits'); passed++;
  await page.getByTitle('More actions', { exact: true }).click();
  const beforeInspectionRefusal = previews;
  refuseInspection = true;
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await page.getByText(/source target is ambiguous/).waitFor();
  assert.equal(previews, beforeInspectionRefusal, 'Unsafe source inspection must prevent a preview request');
  assert.equal(await weight(), originalWeight); passed++;
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  assert.equal(await page.locator('span').filter({ hasText: /^Home$/ }).count(), 0, 'Unrendered page entries must be removed');
  assert.equal(previews, beforeInspectionRefusal); passed++;
  return passed;
}

async function expectUntil(check: () => boolean | Promise<boolean>, page: Page) {
  for (let i = 0; i < 150; i++) { if (await check()) return; await page.waitForTimeout(20); }
  assert.fail('Expected browser condition was not reached');
}
