import { it } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startTestServer } from './helpers/test-server';

it('a refused source-editor drop restores movement transforms on the target and siblings', async () => {
  const server = await startTestServer();
  const browser = await chromium.launch({ headless: true });
  try {
    await (await fetch(server.baseUrl + '/fixtures/1')).text();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(5000);
    await page.route('**/*', (route) => new URL(route.request().url()).origin === server.baseUrl ? route.continue() : route.abort());
    await page.goto(server.baseUrl + '/fixtures/1', { waitUntil: 'domcontentloaded' });
    const target = page.locator('#target');
    await page.waitForFunction((el) => el && Object.keys(el).some((key) => key.startsWith('__reactFiber$')), await target.elementHandle());
    await target.click();
    const mover = page.locator('.sn-drag-move-bar');
    await mover.waitFor({ state: 'visible' });
    const before = await target.locator('..').evaluate((el) => Array.from(el.children).map((child) => (child as HTMLElement).style.transform));
    const handle = await mover.boundingBox();
    assert.ok(handle);
    await page.route('**/api/slightnudge/preview', (route) => route.fulfill({ status: 422, json: { error: 'This element cannot move here.' } }));
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 + 105, { steps: 8 });
    const response = page.waitForResponse((res) => res.url().includes('/api/slightnudge/preview') && res.request().method() === 'POST');
    await page.mouse.up();
    assert.equal((await response).status(), 422);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const after = await target.locator('..').evaluate((el) => Array.from(el.children).map((child) => (child as HTMLElement).style.transform));
    assert.deepEqual(after, before, 'A refused drop must restore every movement transform');
    assert.equal(await page.locator('[data-editor-overlay]:visible').count(), 0);
  } finally {
    await browser.close();
    await server.stop();
  }
});
