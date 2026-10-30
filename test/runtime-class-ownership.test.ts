import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';
import { sourceClassesMatch, withRuntimeClasses } from '../lib/slightnudge/source-canvas-contract';

assert.equal(sourceClassesMatch('font-bold aos-init aos-animate', 'font-bold'), true);
assert.equal(sourceClassesMatch('font-bold unknown-runtime', 'font-bold'), false);
assert.equal(sourceClassesMatch('font-normal aos-init', 'font-bold'), false);
assert.equal(withRuntimeClasses('font-bold aos-animate', 'font-normal aos-init'), 'font-bold aos-init');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:46112/**', route => route.fulfill({ contentType: 'text/html', body: route.request().url().includes('/frame')
    ? `<style>.font-normal{font-weight:400}.font-bold{font-weight:700}</style><h1 data-source-file="app/page.tsx" data-source-line="2" data-source-column="1" class="font-normal aos-init aos-animate">Original</h1><script>${getSourceCanvasBridge(true)}</script>`
    : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46112"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script>' }));
  await page.goto('http://127.0.0.1:46112/');
  const frame = page.frames()[1], target = frame.locator('h1');
  await target.click(); await page.waitForFunction(() => (window as any).messages.some((m: any) => m.type === 'source-selection'));
  const selection = await page.evaluate(() => (window as any).messages.find((m: any) => m.type === 'source-selection').selection);
  let id = 0;
  const command = async (operation: string, extra: Record<string, unknown> = {}) => {
    const requestId = String(++id);
    await page.evaluate(data => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(data, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', requestId, operation, selection, ...extra });
    await page.waitForFunction(id => (window as any).messages.some((m: any) => m.type === 'edit-result' && m.requestId === id), requestId);
    return page.evaluate(id => (window as any).messages.find((m: any) => m.type === 'edit-result' && m.requestId === id), requestId);
  };
  const location = { path: 'app/page.tsx', line: 2, column: 1 };
  const patch = { before: location, after: location, beforeClassName: 'font-normal', className: 'font-bold', css: '.font-bold{font-weight:700}' };
  assert.equal((await command('restore', { patches: [patch] })).success, true);
  assert.equal(await target.getAttribute('class'), 'font-bold aos-init aos-animate');
  await target.evaluate(el => el.classList.remove('aos-animate'));
  assert.equal((await command('check', { patches: [patch] })).success, true);
  assert.equal((await command('restore', { patches: [] })).success, true);
  assert.equal(await target.getAttribute('class'), 'font-normal aos-init', 'Undo/discard preserves the live animation state');
  await target.evaluate(el => { el.className = 'font-bold aos-init aos-animate'; });
  assert.equal((await command('verify-batch', { patches: [patch] })).success, true, 'Saved authored classes may coexist with AOS state');
  await target.evaluate(el => el.classList.add('unknown-runtime'));
  assert.equal((await command('verify-batch', { patches: [patch] })).success, false, 'Unknown classes still invalidate source verification');
  await target.evaluate(el => { el.classList.remove('unknown-runtime'); el.style.color = 'transparent'; });
  assert.equal((await command('begin-text')).success, true);
  assert.notEqual(await target.evaluate(el => getComputedStyle(el).caretColor), 'rgba(0, 0, 0, 0)', 'The caret stays visible on transparent gradient text');
  await command('cancel-text');
  console.log('PASS runtime class ownership: exact AOS exception; continuous replay/check/Undo and saved-batch verification preserve live state; unknown changes remain refused');
} finally { await browser.close(); }
