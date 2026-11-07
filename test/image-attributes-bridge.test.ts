import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';

const red = await sharp({ create: { width: 20, height: 10, channels: 3, background: 'red' } }).png().toBuffer();
const blue = await sharp({ create: { width: 20, height: 10, channels: 3, background: 'blue' } }).png().toBuffer();
const asset = '/slightnudge-assets/11111111-1111-1111-1111-111111111111.png';
const broken = '/slightnudge-assets/22222222-2222-2222-2222-222222222222.png';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:46114/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('.png')) return route.fulfill({ contentType: 'image/png', body: url.pathname === asset ? blue : url.pathname === broken ? Buffer.from('not a PNG') : red });
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: url.pathname === '/frame'
      ? `<img data-source-file="page.tsx" data-source-line="1" data-source-column="1" src="/original.png" alt="A &amp; B" /><script>${getSourceCanvasBridge(true)}</script>`
      : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46114"></iframe><script>window.messages=[];addEventListener("message", e=>messages.push(e.data))</script>' });
  });
  await page.goto('http://127.0.0.1:46114/');
  const image = () => page.frames()[1].locator('img'); let id = 0;
  const command = async (operation: string, patches: any[]) => {
    const requestId = String(++id);
    await page.evaluate(message => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(message, window.location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', requestId, operation, patches });
    await page.waitForFunction(id => (window as any).messages.some((m: any) => m.type === 'edit-result' && m.requestId === id), requestId);
    return page.evaluate(id => (window as any).messages.find((m: any) => m.type === 'edit-result' && m.requestId === id), requestId);
  };
  const location = { path: 'page.tsx', line: 1, column: 1 };
  const patch = { before: location, after: location, attributes: { src: asset, alt: 'Blue' }, beforeAttributes: { src: '/original.png', alt: 'A & B' } };
  assert.equal((await command('restore', [patch])).success, true);
  assert.equal(await image().getAttribute('src'), asset); assert.equal(await image().getAttribute('alt'), 'Blue');
  assert.equal((await command('check', [patch])).success, true);
  await image().evaluate(el => el.setAttribute('alt', 'External runtime change'));
  assert.equal((await command('check', [patch])).success, false);
  assert.equal((await command('restore', [])).success, false); assert.equal(await image().getAttribute('alt'), 'External runtime change');
  await page.reload(); await image().waitFor();
  assert.equal((await command('restore', [{ ...patch, attributes: { src: broken, alt: 'Bad' } }])).success, false);
  assert.equal(await image().getAttribute('src'), '/original.png'); assert.equal(await image().getAttribute('alt'), 'A & B');
  assert.equal((await command('restore', [{ ...patch, beforeAttributes: { alt: 'Stale' } }])).success, false);
  assert.equal(await image().getAttribute('src'), '/original.png');
  assert.equal((await command('restore', [patch])).success, true);
  assert.equal((await command('restore', [])).success, true); assert.equal(await image().getAttribute('src'), '/original.png');
  console.log('PASS image attribute bridge: decoded replacements, source revision matching, stale/runtime-edit protection, broken image leaves DOM intact, exact attribute discard');
} finally { await browser.close(); }
