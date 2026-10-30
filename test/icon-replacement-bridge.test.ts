import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { openIconLibrary } from '../lib/slightnudge/icon-library';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';
const library = openIconLibrary(process.cwd()), arrow = library.shape('ArrowRight'), heart = library.shape('Heart'), star = library.shape('Star');
const markup = arrow.nodes.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([name, value]) => `${name}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join(' ')}></${tag}>`).join('');
const browser = await chromium.launch();
try {
  const page = await browser.newPage(); let id = 0;
  await page.route('http://127.0.0.1:46119/**', route => route.fulfill({ contentType: 'text/html', body: new URL(route.request().url()).pathname === '/frame'
    ? `<style id="rule"></style><button>Continue<svg data-source-file="page.tsx" data-source-line="1" data-source-column="1" class="lucide lucide-arrow-right custom" viewBox="0 0 24 24" width="24" height="24" stroke="#123456" stroke-width="2" fill="none">${markup}</svg></button><script>window.originalPath=document.querySelector('svg').firstChild;</script><script>${getSourceCanvasBridge(true)}</script>`
    : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46119"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script>' }));
  await page.goto('http://127.0.0.1:46119/'); const frame = page.frames()[1];
  const command = async (operation: string, patches: any[]) => { const requestId = String(++id); await page.evaluate(message => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(message, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', operation, requestId, patches }); await page.waitForFunction(id => (window as any).messages.some((item: any) => item.requestId === id), requestId); return page.evaluate(id => (window as any).messages.find((item: any) => item.requestId === id), requestId); };
  const location = { path: 'page.tsx', line: 1, column: 1 };
  const patch = { before: location, after: location, icon: { before: arrow, after: heart, beforeClassName: 'lucide lucide-arrow-right custom', afterClassName: 'lucide lucide-heart custom' }, attributes: { width: '40', height: '40' }, beforeAttributes: { width: '24', height: '24' } };
  const result = await command('restore', [patch]); assert.equal(result.success, true, result.reason);
  assert.equal(await frame.locator('svg path').count(), heart.nodes.length); assert.equal(await frame.locator('svg').getAttribute('width'), '40'); assert.equal(await frame.locator('svg').getAttribute('stroke'), '#123456');
  assert.equal((await command('verify-batch', [patch])).success, true);
  const next = { ...patch, icon: { ...patch.icon, after: star, afterClassName: 'lucide lucide-star custom' } };
  assert.equal((await command('restore', [next])).success, true); assert.equal(await frame.locator('svg').getAttribute('class'), 'lucide lucide-star custom');
  for (const nodes of [[['script', {}]], [['path', { onload: 'run()' }]], [['path', { d: 'M1 2', fill: 'url(http://example.test)' }]]]) {
    assert.equal((await command('restore', [{ ...patch, icon: { ...patch.icon, after: { ...heart, nodes } } }])).success, false);
    assert.equal(await frame.locator('svg').getAttribute('class'), 'lucide lucide-star custom');
  }
  await frame.locator('#rule').evaluate(el => { el.textContent = '.lucide-heart.custom{width:99px}'; });
  assert.equal((await command('restore', [patch])).success, false); assert.equal(await frame.locator('svg').getAttribute('class'), 'lucide lucide-star custom'); assert.equal(await frame.locator('svg').getAttribute('width'), '40');
  await frame.locator('#rule').evaluate(el => { el.textContent = ''; });
  assert.equal((await command('restore', [])).success, true);
  assert.equal(await frame.locator('svg').getAttribute('width'), '24'); assert.equal(await frame.evaluate(() => document.querySelector('svg')!.firstChild === (window as any).originalPath), true, 'Discard restores original DOM node identities');
  assert.equal((await command('restore', [patch])).success, true);
  await frame.locator('svg path').first().evaluate(el => el.setAttribute('d', 'M0 0h10'));
  assert.equal((await command('check', [patch])).success, false); assert.equal((await command('restore', [])).success, false); assert.equal(await frame.locator('svg path').first().getAttribute('d'), 'M0 0h10');
  console.log('PASS icon replacement bridge: geometry and library classes, preserved props, successive replay, saved verification, exact original node restoration, atomic unsafe/CSS refusal, external geometry protection');
} finally { await browser.close(); }
