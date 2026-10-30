import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';

const red = await sharp({ create: { width: 20, height: 10, channels: 3, background: 'red' } }).png().toBuffer();
const blue = await sharp({ create: { width: 20, height: 10, channels: 3, background: 'blue' } }).png().toBuffer();
const asset = '/slightnudge-assets/11111111-1111-1111-1111-111111111111.png', broken = '/slightnudge-assets/22222222-2222-2222-2222-222222222222.png';
const browser = await chromium.launch();
try {
  const page = await browser.newPage(); let next = false, id = 0;
  await page.route('http://127.0.0.1:46117/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('.png') || url.pathname === '/_next/image') { const source = url.searchParams.get('url') || url.pathname; return route.fulfill({ contentType: 'image/png', body: source === asset ? blue : source === broken ? Buffer.from('broken') : red }); }
    const markup = next
      ? '<img data-source-file="page.tsx" data-source-line="1" data-source-column="2" data-source-image="next" data-source-image-src="/original.png" src="/_next/image?url=%2Foriginal.png&amp;w=256&amp;q=75" srcset="/_next/image?url=%2Foriginal.png&amp;w=256&amp;q=75 1x, /_next/image?url=%2Foriginal.png&amp;w=512&amp;q=75 2x" alt="Original" width="20" height="10"/>'
      : '<picture><source data-source-file="page.tsx" data-source-line="1" data-source-column="1" srcset="/original.png 1x, /original.png 2x"/><img data-source-file="page.tsx" data-source-line="1" data-source-column="2" src="/original.png" alt="Original"/></picture>';
    return route.fulfill({ contentType: 'text/html', body: url.pathname === '/frame' ? markup + `<script>${getSourceCanvasBridge(true)}</script>` : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46117"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script>' });
  });
  const command = async (operation: string, patches: any[]) => { const requestId = String(++id); await page.evaluate(message => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(message, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', requestId, operation, patches }); await page.waitForFunction(requestId => (window as any).messages.some((item: any) => item.requestId === requestId), requestId); return page.evaluate(requestId => (window as any).messages.find((item: any) => item.requestId === requestId), requestId); };
  const locate = (column: number) => ({ path: 'page.tsx', line: 1, column });
  const source = { before: locate(1), after: locate(1), attributes: { srcSet: `${asset} 1x, ${asset} 2x` }, beforeAttributes: { srcSet: '/original.png 1x, /original.png 2x' } };
  const image = { before: locate(2), after: locate(2), attributes: { src: asset, alt: 'Blue' }, beforeAttributes: { src: '/original.png', alt: 'Original' } };
  await page.goto('http://127.0.0.1:46117/');
  const frame = () => page.frames()[1];
  assert.equal((await command('restore', [source, image])).success, true);
  assert.equal((await command('restore', [{ ...source, attributes: { srcSet: `${broken} 1x` } }, image])).success, false);
  assert.equal(await frame().locator('source').getAttribute('srcset'), source.attributes.srcSet, 'Broken candidate preserves the prior entire draft');
  assert.equal((await command('restore', [])).success, true);
  assert.equal(await frame().locator('source').getAttribute('srcset'), source.beforeAttributes.srcSet);
  assert.equal((await command('restore', [source, image])).success, true);
  await frame().locator('source').evaluate(element => element.setAttribute('srcset', '/external.png 1x'));
  assert.equal((await command('check', [source, image])).success, false); assert.equal((await command('restore', [])).success, false);
  assert.equal(await frame().locator('source').getAttribute('srcset'), '/external.png 1x');
  next = true; await page.reload(); await frame().locator('img').waitFor();
  const before = await frame().locator('img').evaluate(element => ({ src: element.getAttribute('src'), srcset: element.getAttribute('srcset') }));
  const optimized = { ...image, nextImage: true };
  assert.equal((await command('restore', [optimized])).success, true);
  assert.match((await frame().locator('img').getAttribute('srcset'))!, /w=256&q=75 1x, .*w=512&q=75 2x/);
  assert.equal((await command('check', [optimized])).success, true);
  assert.equal((await command('verify-batch', [optimized])).success, true);
  assert.equal((await command('restore', [])).success, true);
  assert.deepEqual(await frame().locator('img').evaluate(element => ({ src: element.getAttribute('src'), srcset: element.getAttribute('srcset') })), before);
  await frame().locator('img').evaluate(element => element.setAttribute('src', '/external.png'));
  assert.equal((await command('restore', [optimized])).success, false);
  assert.equal(await frame().locator('img').getAttribute('src'), '/external.png');
  console.log('PASS advanced image bridge: complete responsive decode before mutation, broken candidate preserves draft, exact picture discard, external source-set protection, optimized descriptor/quality preservation, saved verification, exact discard and source mismatch refusal');
} finally { await browser.close(); }
