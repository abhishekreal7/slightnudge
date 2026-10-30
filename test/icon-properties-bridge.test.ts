import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';
const browser = await chromium.launch();
try {
  const page = await browser.newPage(); let id = 0;
  await page.route('http://127.0.0.1:46119/**', route => route.fulfill({ contentType: 'text/html', body: new URL(route.request().url()).pathname === '/frame'
    ? `<style>.owned{width:19px;stroke:red}</style><button data-source-file="page.tsx" data-source-line="1" data-source-column="2">Go<svg data-source-file="page.tsx" data-source-line="1" data-source-column="1" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12h20"/></svg></button><script>${getSourceCanvasBridge(true)}</script>`
    : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46119"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script>' }));
  await page.goto('http://127.0.0.1:46119/'); const frame = page.frames()[1];
  const command = async (operation: string, patches: any[]) => { const requestId = String(++id); await page.evaluate(message => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(message, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', operation, requestId, patches }); await page.waitForFunction(id => (window as any).messages.some((item: any) => item.requestId === id), requestId); return page.evaluate(id => (window as any).messages.find((item: any) => item.requestId === id), requestId); };
  const location = { path: 'page.tsx', line: 1, column: 1 };
  const patch = { before: location, after: location, attributes: { width: '40', height: '40', 'stroke-width': '1.5', stroke: '#abcdef' }, beforeAttributes: { width: '24', height: '24', 'stroke-width': '2', stroke: 'currentColor' } };
  await frame.locator('svg').click();
  await page.waitForFunction(() => (window as any).messages.some((message: any) => message.type === 'source-selection'));
  assert.equal(await page.evaluate(() => (window as any).messages.filter((m: any) => m.type === 'source-selection').at(-1).selection.tagName), 'svg', 'An icon inside a labeled button must be selectable');
  assert.equal((await command('restore', [patch])).success, true);
  assert.equal(await frame.locator('svg').evaluate(el => getComputedStyle(el).width), '40px');
  assert.equal(await frame.locator('path').getAttribute('d'), 'M1 12h20');
  assert.equal((await command('verify-batch', [patch])).success, true);
  for (const attributes of [{ onload: 'alert(1)' }, { stroke: 'url(https://example.test/x)' }, { width: '9999' }, { 'stroke-width': '-1' }, { fill: 'red' }]) {
    assert.equal((await command('restore', [{ ...patch, attributes }])).success, false);
    assert.equal(await frame.locator('svg').getAttribute('width'), '40');
  }
  assert.equal((await command('restore', [])).success, true); assert.equal(await frame.locator('svg').getAttribute('width'), '24');
  await frame.locator('svg').evaluate(el => el.classList.add('owned'));
  assert.equal((await command('restore', [patch])).success, false, 'CSS ownership must refuse without changing draft DOM');
  assert.equal(await frame.locator('svg').getAttribute('width'), '24'); assert.equal(await frame.locator('svg').getAttribute('stroke'), 'currentColor');
  await frame.locator('svg').evaluate(el => el.classList.remove('owned'));
  assert.equal((await command('restore', [patch])).success, true);
  await frame.locator('svg').evaluate(el => el.setAttribute('stroke', '#123456'));
  assert.equal((await command('check', [patch])).success, false); assert.equal((await command('restore', [])).success, false); assert.equal(await frame.locator('svg').getAttribute('stroke'), '#123456');
  console.log('PASS icon bridge: nested selection, visible size/stroke/color, preserved shape, exact restore, atomic invalid/CSS refusal, Save verification and external-edit protection');
} finally { await browser.close(); }
