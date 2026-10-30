import assert from 'node:assert/strict';
import type { Page } from 'playwright';

/** Browser messages use the real iframe/origin/session contract; source APIs are mocked. */
export async function checkImportedReview(page: Page, baseURL: string) {
  let applies = 0;
  let previews = 0;
  let rejectApply = true;
  let staleApply = false;
  let lastApply: Record<string, unknown> = {};
  let holdPreview = false;
  let release: (() => void) | undefined;
  let passed = 0;
  await page.route('**/__review-test-frame?*', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Disposable preview</title><h1>First heading</h1><p>Second element</p><script>window.changes=[];addEventListener("message",event=>window.changes.push(event.data))</script>',
  }));
  await page.route('**/api/slightnudge/**', async route => {
    const url = new URL(route.request().url());
    let body: Record<string, unknown> = { success: true };
    let status = 200;
    if (url.pathname.endsWith('/token')) body = { token: 'isolated-browser-test-placeholder' };
    else if (url.pathname.endsWith('/docker-preview')) body = { available: false, state: 'unavailable', logs: '', url: null, message: 'Browser test' };
    else if (url.pathname.endsWith('/preview-check')) body = { url: `${baseURL}/__review-test-frame` };
    else if (url.pathname.endsWith('/source')) body = { content: '<h1 className="text-3xl">First heading</h1>' };
    else if (url.pathname.endsWith('/inspect')) body = { safeToEdit: true, textEditable: true, className: 'text-3xl bg-white p-4', tagName: 'h1' };
    else if (url.pathname.endsWith('/repositories/review-consent')) body = {
      repository: { id: 'review-consent', name: 'Disposable review test', owner: 'test', defaultBranch: 'main', url: 'https://example.com/test' },
      framework: 'Next.js', files: ['app/page.tsx'], sourceAdapterEnabled: true,
    };
    else if (url.pathname.endsWith('/preview') && route.request().method() === 'POST') {
      previews++;
      if (holdPreview) await new Promise<void>(resolve => { release = resolve; });
      body = { success: true, changed: true, id: `imported-${previews}`, filePath: 'app/page.tsx', line: 1, oldValue: 'text-3xl bg-white p-4', newValue: 'font-bold', oldClassName: 'text-3xl bg-white p-4', newClassName: 'text-3xl bg-white p-4 font-bold', summary: 'Change weight', previewType: 'className' };
    } else if (url.pathname.endsWith('/apply')) {
      applies++; lastApply = route.request().postDataJSON();
      status = rejectApply ? 409 : 200;
      body = rejectApply ? { success: false, error: 'Source changed outside the editor. Discard and select again.' } : { success: true };
      if (staleApply) { status = 409; body = { success: false, code: 'SOURCE_CHANGED', error: 'The reviewed source changed. Select the element again.' }; }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(`${baseURL}/studio/review-consent`);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  const frameElement = page.locator('.sn-live-preview-frame');
  await frameElement.waitFor();
  const frame = await (await frameElement.elementHandle())!.contentFrame();
  assert.ok(frame);
  await frame.waitForLoadState();
  const sendSelection = async (line: number) => frame.evaluate((line) => {
    parent.postMessage({
      channel: 'slightnudge', type: 'source-selection', session: new URL(location.href).searchParams.get('__slightnudge_session'),
      selection: { path: 'app/page.tsx', line, column: 1, tagName: line === 1 ? 'h1' : 'p', className: 'text-3xl', textContent: line === 1 ? 'First heading' : 'Second element', rect: { top: 10, left: 10, width: 200, height: 40 } },
    }, location.origin);
  }, line);
  await sendSelection(1);
  await page.getByText('Source verified', { exact: true }).waitFor();
  const weight = page.locator('.sn-imported-control').filter({ has: page.locator('legend', { hasText: /^Weight$/ }) });
  await weight.getByRole('button', { name: 'bold', exact: true }).click();
  const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
  await apply.waitFor();
  const previewed = await frame.evaluate(() => (window as unknown as { changes: Array<{ value?: string }> }).changes.at(-1));
  assert.equal(previewed?.value, 'text-3xl bg-white p-4 font-bold', 'Imported preview must preserve the complete class list'); passed++;
  await sendSelection(2);
  await page.waitForTimeout(200);
  assert.equal(applies, 0, 'Imported selection changes must never apply a proposal'); passed++;
  assert.ok((await page.locator('.sn-live-selection-status').innerText()).includes('app/page.tsx:1:1'), 'Review must retain its original target'); passed++;
  const normal = weight.getByRole('button', { name: 'normal', exact: true });
  if (await normal.isEnabled()) await normal.click();
  await page.waitForTimeout(200);
  assert.equal(applies, 0); assert.equal(previews, 1, 'Another imported control must not replace a pending review'); passed++;
  assert.ok(await page.getByText('Not saved to source', { exact: true }).isVisible());
  assert.ok(await page.getByLabel('Before change').isVisible()); assert.ok(await page.getByLabel('After change').isVisible()); passed++;
  await apply.click();
  await page.getByText('Source changed outside the editor. Discard and select again.', { exact: true }).waitFor();
  assert.ok(await apply.isVisible()); assert.equal(applies, 1); passed++;
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await apply.waitFor({ state: 'hidden' });
  assert.equal(applies, 1);
  const restored = await frame.evaluate(() => (window as unknown as { changes: Array<{ value?: string; selection?: { line?: number } }> }).changes.at(-1));
  assert.equal(restored?.value, 'text-3xl bg-white p-4'); assert.equal(restored?.selection?.line, 1); passed++;
  holdPreview = true;
  await weight.getByRole('button', { name: 'bold', exact: true }).click();
  for (let i = 0; i < 100 && !release; i++) await page.waitForTimeout(20);
  assert.ok(release);
  await sendSelection(2); await page.waitForTimeout(100);
  assert.ok((await page.locator('.sn-live-selection-status').innerText()).includes('app/page.tsx:1:1'), 'Selection must stay pinned while preparing a proposal'); passed++;
  release(); await apply.waitFor(); rejectApply = false;
  await apply.click(); await apply.waitFor({ state: 'hidden' });
  assert.equal(applies, 2); assert.equal(lastApply.sourcePath, 'app/page.tsx'); passed++;
  holdPreview = false;
  await weight.getByRole('button', { name: 'normal', exact: true }).click();
  await apply.waitFor(); staleApply = true;
  await apply.click(); await apply.waitFor({ state: 'hidden' });
  await page.locator('.sn-live-selection-status').waitFor({ state: 'hidden' });
  await page.getByText('The reviewed source changed. Select the element again.', { exact: true }).waitFor();
  assert.equal(applies, 3, 'A detected outside edit must cancel the imported proposal and explain fresh selection'); passed++;
  return passed;
}
