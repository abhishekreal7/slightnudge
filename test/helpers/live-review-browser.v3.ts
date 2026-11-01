import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

/** No API mocks. Every writable file lives in the throwaway application copy. */
export async function checkLiveReview(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const classes = original.match(/<h1\s+id="target"[^>]*className="([^"]*)"/)?.[1];
  assert.ok(classes);
  const expectedClasses = `${classes} font-bold`;
  const expected = original.replace(`className="${classes}"`, `className="${expectedClasses}"`);
  let applies = 0;
  if (process.argv.includes('--trace')) {
    page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/slightnudge/')) console.log(`API request: ${request.method()} ${url.pathname}`); });
    page.on('response', response => { const url = new URL(response.url()); if (url.pathname.startsWith('/api/slightnudge/')) console.log(`API response: ${response.status()} ${url.pathname}`); });
  }
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/slightnudge/apply') applies++; });
  await page.goto(`${baseURL}/fixtures/1`);
  const heading = page.locator('.sn-preview-content h1#target');
  await heading.click();
  await page.locator('#slightnudge-safety-ok').waitFor();
  const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
  const prepare = async () => {
    const prepared = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST');
    await page.getByTitle('Toggle bold', { exact: true }).click();
    const response = await prepared;
    const proposal = await response.json();
    assert.ok(response.ok() && proposal.success, proposal.error || 'Real preview must succeed');
    await apply.waitFor();
    return proposal;
  };
  await prepare();
  assert.equal(fs.readFileSync(file, 'utf8'), original, 'Real Preview must leave the source bytes unchanged');
  assert.equal(await heading.getAttribute('class'), expectedClasses, 'Real preview must preserve every unrelated class');
  await page.locator('.sn-preview-content p').first().click({ force: true });
  await page.waitForTimeout(150);
  assert.equal(applies, 0); assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await apply.waitFor({ state: 'hidden' });
  assert.equal(await heading.getAttribute('class'), classes);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await prepare();
  const applied = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply');
  await apply.click();
  assert.equal((await (await applied).json()).success, true, 'Real Apply must succeed');
  await apply.waitFor({ state: 'hidden' });
  assert.equal(fs.readFileSync(file, 'utf8'), expected, 'Apply must change only the intended class literal');
  assert.equal(await heading.getAttribute('class'), expectedClasses, 'Successful Apply must keep the full class list in the canvas');
  const undone = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal((await (await undone).json()).success, true, 'Real Undo must succeed');
  assert.equal(fs.readFileSync(file, 'utf8'), original, 'Undo must restore the exact original bytes');
  await page.reload(); await heading.click(); await page.locator('#slightnudge-safety-ok').waitFor();
  await page.getByTitle('Toggle bold', { exact: true }).waitFor();
  await page.waitForTimeout(100);
  const nudged = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST');
  await page.keyboard.press('ArrowRight');
  const nudgeResult = await (await nudged).json();
  assert.equal(nudgeResult.success, true);
  assert.equal(nudgeResult.oldClassName, classes, 'Nudge response must include the full original class list');
  assert.equal(nudgeResult.newClassName, classes.replace('ml-2.5', 'ml-3'), 'Nudge must preserve all unrelated classes');
  await apply.waitFor();
  assert.equal(await heading.getAttribute('class'), classes.replace('ml-2.5', 'ml-3'));
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await apply.waitFor({ state: 'hidden' });
  assert.equal(await heading.getAttribute('class'), classes);
  await prepare();
  // Simulate an outside edit in the COPY ONLY, while a proposal is pending.
  const external = original + '\n// Disposable external change\n';
  fs.writeFileSync(file, external);
  const stale = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply');
  await apply.click();
  const rejected = await stale;
  assert.equal(rejected.status(), 409, 'Apply must refuse an outside source edit');
  assert.equal((await rejected.json()).code, 'SOURCE_CHANGED');
  await apply.waitFor({ state: 'hidden' });
  await page.locator('#slightnudge-selected-box').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#slightnudge-selected-box').count(), 0, 'A detected outside edit must cancel the proposal and require fresh selection');
  assert.equal(fs.readFileSync(file, 'utf8'), external, 'Refusal must preserve the outside edit');
  assert.equal(applies, 2, 'Only the two explicit Apply clicks may reach the real backend');
  return 7;
}
