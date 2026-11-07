import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { startTestServer, type TestServer } from './helpers/test-server';

// Cold Next compilation plus both real editor routes can exceed 60 seconds.
// All mutations belong to the server helper's disposable workspace.
let server: TestServer;
let browser: Browser;
async function start() {
  server = await startTestServer();
  for (const route of ['/studio', '/fixtures/1']) await (await fetch(server.baseUrl + route)).text();
  for (const route of ['preview', 'apply', 'undo', 'inspect']) await (await fetch(server.baseUrl + '/api/slightnudge/' + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).text();
}
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); await server?.stop(); });

async function open(surface: string) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(5000);
  await page.route('**/*', route => new URL(route.request().url()).origin === server.baseUrl ? route.continue() : route.abort());
  await page.goto(server.baseUrl + (surface === 'studio' ? '/studio' : '/fixtures/1'), { waitUntil: 'domcontentloaded' });
  const heading = surface === 'studio' ? page.getByRole('heading', { name: 'Make room for your best work.', exact: true }) : page.locator('#target');
  await heading.waitFor();
  await page.waitForFunction(el => el && Object.keys(el).some(key => key.startsWith('__reactFiber$')), await heading.elementHandle());
  const inspected = surface === 'source' ? page.waitForResponse(r => r.url().includes('/api/slightnudge/inspect') && r.request().method() === 'POST') : null;
  await heading.click();
  if (inspected) await (await inspected).json();
  await page.locator('[data-testid=editor-toolbar]').waitFor({ state: 'visible' });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return page;
}
async function preview(page: Page) {
  await page.waitForFunction(() => !(document.querySelector('.sn-inspector-toggle') as HTMLButtonElement | null)?.disabled);
  const response = page.waitForResponse(r => r.url().includes('/api/slightnudge/preview') && r.request().method() === 'POST');
  await page.keyboard.press('ArrowRight');
  assert.equal((await (await response).json()).success, true);
  await page.getByRole('button', { name: /^Apply to (Source|code)$/ }).first().waitFor();
}
async function screen(page: Page, name: string) {
  if (!process.env.SPRINT1_SCREENS) return;
  fs.mkdirSync(process.env.SPRINT1_SCREENS, { recursive: true });
  await page.screenshot({ path: path.join(process.env.SPRINT1_SCREENS, name + '.png'), animations: 'disabled' });
}

if (process.env.SPRINT1_APPLY_CHARACTERIZE) {
  it('both existing playground Apply buttons post the same pending id to the same save route', async () => {
    await start();
    const page = await open('studio');
    try {
      await preview(page);
      await screen(page, 'part-2b-before');
      const requests: unknown[] = [];
      await page.route('**/api/slightnudge/apply', route => { requests.push(route.request().postDataJSON()); return route.fulfill({ status: 422, json: { success: false, error: 'Characterization: retain this draft.' } }); });
      for (const name of ['Apply to Source', 'Apply to code']) {
        const response = page.waitForResponse(r => r.url().includes('/api/slightnudge/apply'));
        await page.getByRole('button', { name, exact: true }).click();
        await response;
      }
      assert.equal(requests.length, 2);
      assert.ok((requests[0] as { previewId?: string }).previewId);
      assert.deepEqual(requests[0], requests[1]);
    } finally { await page.close(); }
  });
 } else {
  for (const surface of ['studio', 'source']) {
    for (const modifier of ['Control', 'Meta']) {
      it(surface + ': one Apply, ' + modifier + '+Enter and ' + modifier + '+Z', async () => {
        await start();
        const page = await open(surface);
        try {
          const sourcePath = path.join(server.wsDir, 'fixtures/1-plain-static.tsx');
          const originalSource = fs.readFileSync(sourcePath);
          await preview(page);
          assert.equal(await page.getByRole('button', { name: /^Apply to (Source|code)$/ }).count(), 1, 'Exactly one save action must remain');
          if (surface === 'studio' && modifier === 'Control') await screen(page, 'part-2b-after');
          const applied = page.waitForResponse(r => r.url().includes('/api/slightnudge/apply') && r.request().method() === 'POST');
          await page.keyboard.press(modifier + '+Enter');
          assert.equal((await (await applied).json()).success, true);
          assert.notDeepEqual(fs.readFileSync(sourcePath), originalSource, 'Apply must write the disposable source');
          await page.getByRole('button', { name: /^Apply to (Source|code)$/ }).first().waitFor({ state: 'hidden' });
          const undone = page.waitForResponse(r => r.url().includes('/api/slightnudge/undo') && r.request().method() === 'POST');
          await page.keyboard.press(modifier + '+z');
          assert.equal((await (await undone).json()).success, true);
          assert.deepEqual(fs.readFileSync(sourcePath), originalSource, 'Undo must restore source bytes');
        } finally { await page.close(); await server.stop(); }
      });
    }
    it(surface + ': Escape discards the reviewed preview', async () => {
      await start();
      const page = await open(surface);
      try {
        await preview(page);
        const discarded = page.waitForResponse(r => r.url().includes('/api/slightnudge/preview') && r.request().method() === 'DELETE');
        await page.keyboard.press('Escape');
        assert.equal((await discarded).ok(), true);
        await page.getByRole('button', { name: /^Apply to (Source|code)$/ }).first().waitFor({ state: 'hidden' });
      } finally { await page.close(); await server.stop(); }
    });
  }
}
