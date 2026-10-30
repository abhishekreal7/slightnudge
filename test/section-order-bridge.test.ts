import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:46112/**', route => route.fulfill({ contentType: 'text/html', body: route.request().url().includes('/frame')
    ? `<main style="display:flex;flex-direction:column" data-source-file="page.tsx" data-source-line="1" data-source-column="1"><section data-source-file="page.tsx" data-source-line="2" data-source-column="1">First<button>Continue</button></section><section data-source-file="page.tsx" data-source-line="3" data-source-column="1">Second</section></main><script>${getSourceCanvasBridge(true)}</script>`
    : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46112"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script>' }));
  await page.goto('http://127.0.0.1:46112/'); const frame = page.frames()[1];
  await frame.locator('section').nth(1).click();
  await page.waitForFunction(() => (window as any).messages.some((message: any) => message.type === 'source-selection'));
  const selection = await page.evaluate(() => (window as any).messages.find((message: any) => message.type === 'source-selection').selection);
  const loc = (line: number) => ({ path: 'page.tsx', line, column: 1 });
  const patch = { before: loc(1), after: loc(1), order: [loc(3), loc(2)], orderAfter: [loc(3), loc(2)] };
  let count = 0;
  const command = async (operation: string, extra = {}) => {
    const requestId = String(++count);
    await page.evaluate(data => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(data, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', requestId, operation, selection, kind: 'reorder', patches: [patch], ...extra });
    await page.waitForFunction(id => (window as any).messages.some((message: any) => message.type === 'edit-result' && message.requestId === id), requestId);
    return page.evaluate(id => (window as any).messages.find((message: any) => message.type === 'edit-result' && message.requestId === id), requestId);
  };
  const order = () => frame.locator('main > section').evaluateAll(elements => elements.map(element => element.getAttribute('data-source-line')));
  assert.equal((await command('preview')).success, true); assert.deepEqual(await order(), ['3', '2']); assert.equal(await frame.locator('section').nth(1).getByRole('button').textContent(), 'Continue');
  assert.equal((await command('check')).success, true); assert.equal((await command('verify-batch')).success, true);
  assert.equal((await command('restore', { patches: [] })).success, true); assert.deepEqual(await order(), ['2', '3']);
  assert.equal((await command('verify-batch')).success, false);
  await frame.locator('section').first().evaluate(element => { (element as HTMLElement).style.order = '-1'; });
  assert.equal((await command('preview')).success, false); assert.deepEqual(await order(), ['2', '3']);
  await frame.locator('section').first().evaluate(element => element.removeAttribute('style'));
  await frame.locator('main').evaluate(element => element.append(document.createElement('aside')));
  assert.equal((await command('preview')).success, false); assert.deepEqual(await order(), ['2', '3']);
  await frame.locator('aside').evaluate(element => element.remove());
  assert.equal((await command('preview')).success, true);
  await frame.locator('main').evaluate(element => element.append(document.createComment('external change')));
  assert.equal((await command('check')).success, false); assert.equal((await command('restore', { patches: [] })).success, false);
  assert.equal(await frame.locator('main').evaluate(element => element.lastChild?.nodeValue), 'external change');
  console.log('PASS order bridge: actual node identity and subtree preservation, order verification, restore, explicit CSS refusal, incomplete mapping refusal, external DOM conflict preservation');
} finally { await browser.close(); }
