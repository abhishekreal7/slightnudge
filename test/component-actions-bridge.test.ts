import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';

const browser = await chromium.launch();
try {
  const page = await browser.newPage(); let id = 0;
  await page.route('http://127.0.0.1:46119/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: new URL(route.request().url()).pathname === '/frame'
    ? `<a data-source-file="page.tsx" data-source-line="1" data-source-column="1" href="#old" rel="nofollow">Open <span>→</span></a><button data-source-file="page.tsx" data-source-line="1" data-source-column="2" type="button">Create</button><script>${getSourceCanvasBridge(true)}</script>`
    : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46119"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script>' }));
  await page.goto('http://127.0.0.1:46119/'); const frame = page.frames()[1];
  const command = async (operation: string, patches: any[]) => { const requestId = String(++id); await page.evaluate(message => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(message, window.location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', operation, requestId, patches }); await page.waitForFunction(id => (window as any).messages.some((item: any) => item.requestId === id), requestId); return page.evaluate(id => (window as any).messages.find((item: any) => item.requestId === id), requestId); };
  const location = (column: number) => ({ path: 'page.tsx', line: 1, column });
  const link = { before: location(1), after: location(1), attributes: { href: '#new', target: '_blank', rel: 'nofollow noopener noreferrer' }, beforeAttributes: { href: '#old', target: null, rel: 'nofollow' } };
  const button = { before: location(2), after: location(2), attributes: { type: 'reset', disabled: '' }, beforeAttributes: { type: 'button', disabled: null } };
  assert.equal((await command('restore', [link, button])).success, true); assert.equal(await frame.locator('a').getAttribute('href'), '#new'); assert.equal(await frame.locator('button').isDisabled(), true); assert.equal(await frame.locator('a span').innerText(), '→');
  assert.equal((await command('verify-batch', [link, button])).success, true);
  for (const attributes of [{ href: 'javascript:alert(1)' }, { onClick: 'alert(1)' }, { src: '/x.png' }, { target: '_parent' }]) {
    assert.equal((await command('restore', [{ ...link, attributes }, button])).success, false);
    assert.equal(await frame.locator('a').getAttribute('href'), '#new'); assert.equal(await frame.locator('button').isDisabled(), true);
  }
  assert.equal((await command('restore', [])).success, true); assert.equal(await frame.locator('a').getAttribute('target'), null); assert.equal(await frame.locator('a').getAttribute('rel'), 'nofollow'); assert.equal(await frame.locator('button').isEnabled(), true);
  assert.equal((await command('restore', [link])).success, true); await frame.locator('a').evaluate(element => element.setAttribute('href', '#external'));
  assert.equal((await command('check', [link])).success, false); assert.equal((await command('restore', [])).success, false); assert.equal(await frame.locator('a').getAttribute('href'), '#external');
  console.log('PASS component action bridge: atomic attribute replay, disabled reflection, preserved nested icon, saved verification, unsafe URL/event/cross-element/target refusal preserving draft, exact discard, external destination protection');
} finally { await browser.close(); }
