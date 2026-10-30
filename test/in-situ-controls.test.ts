import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getBridgeClient } from '../lib/slightnudge/next-source-adapter';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.log('In-situ page error:', error.message));
  await page.route('http://127.0.0.1:46113/**', route => route.request().url().includes('/inspect')
    ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ found: true, safeToEdit: true, tagName: 'button', className: 'demo' }) })
    : route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html data-source-file="app/layout.tsx" data-source-line="1" data-source-column="1"><body><button id="native" data-source-file="app/page.tsx" data-source-line="2" data-source-column="1" class="demo" onclick="this.textContent='Opened'">Open dialog</button><script>${getBridgeClient()}</script></body></html>` }));
  await page.goto('http://127.0.0.1:46113/?__slightnudge_backend=http%3A%2F%2F127.0.0.1%3A46113');
  const off = page.getByRole('button', { name: '⌖ Inspect: OFF', exact: true });
  await page.getByRole('button', { name: '⌖ Inspect: ON', exact: true }).click(); await off.waitFor();
  const native = page.locator('#native'); await native.click(); assert.equal(await native.innerText(), 'Opened', 'Browse clicks reach the website with a source-mapped html ancestor');
  await off.click(); await page.getByRole('button', { name: '⌖ Inspect: ON', exact: true }).waitFor();
  await native.evaluate(el => { el.textContent = 'Open dialog'; });
  await native.click(); assert.equal(await native.innerText(), 'Open dialog', 'Inspection still prevents real website actions');
  const close = page.getByRole('button', { name: '✕ Close', exact: true }); await close.waitFor(); await close.click();
  await close.waitFor({ state: 'hidden' });
  console.log('PASS in-situ controls: shadow toolbar clicks bypass mapped document interception; Inspect toggles, native action and Close work; source selection still intercepts site actions');
} finally { await browser.close(); }
