import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';

const browser = await chromium.launch();
try {
  for (const legacy of [false, true]) {
    const page = await browser.newPage();
    const rules = (x: number, y: number) => { const selector = `.translate-x-\\[${x}px\\].translate-y-\\[${y}px\\]`; return legacy ? `${selector}{transform:translate(${x}px,${y}px)}` : `${selector}{translate:${x}px ${y}px}`; };
    await page.route('http://127.0.0.1:46113/**', route => route.fulfill({ contentType: 'text/html', body: route.request().url().includes('/frame') ? `<style>body{margin:0}h1{margin:0;width:100px;height:30px}.custom{transform:rotate(12deg)}${rules(4, 8)}</style><h1 class="translate-x-[4px] translate-y-[8px]" data-source-file="page.tsx" data-source-line="1" data-source-column="1">Move</h1><script>window.__slightnudge_hydrated=true;${getSourceCanvasBridge(true, 'sample')}</script>` : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46113&__slightnudge_draft=1"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script>' }));
    await page.goto('http://127.0.0.1:46113/'); const frame = page.frames()[1]; await frame.locator('h1').click(); await page.waitForFunction(() => (window as any).messages.some((message: any) => message.type === 'source-selection'));
    const selection = await page.evaluate(() => (window as any).messages.find((message: any) => message.type === 'source-selection').selection); let count = 0;
    const command = async (operation: string, extra = {}) => { const requestId = String(++count); await page.evaluate(data => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(data, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', requestId, operation, selection, ...extra }); await page.waitForFunction(id => (window as any).messages.some((message: any) => message.type === 'edit-result' && message.requestId === id), requestId); return page.evaluate(id => (window as any).messages.find((message: any) => message.type === 'edit-result' && message.requestId === id), requestId); };
    for (const [x, y] of [[24, 20], [40, 32]]) { assert.equal((await command('gesture', { x, y })).success, true); const rect = await frame.locator('h1').boundingBox(); const offset = await page.locator('iframe').boundingBox(); assert.ok(rect && offset); assert.ok(Math.abs(rect.x - offset.x - 2 - x) < 1); assert.ok(Math.abs(rect.y - offset.y - 2 - y) < 1); }
    assert.equal((await command('cancel-gesture')).success, true);
    assert.equal((await command('preview', { kind: 'move', x: 24, y: 20, value: 'translate-x-[24px] translate-y-[20px]', css: rules(24, 20) })).success, true);
    assert.equal((await command('restore', { patches: [] })).success, true);
    await frame.locator('h1').evaluate(element => { element.classList.add('custom'); (element as HTMLElement).style.setProperty('transform', 'rotate(12deg)', 'important'); });
    assert.equal((await command('gesture', { x: 24, y: 20 })).success, false, 'Custom transforms must be refused before a gesture');
    await page.close();
  }
  console.log('PASS move CSS compatibility: imported bridge supports individual translate and legacy matrix transforms, consecutive gestures do not double offsets, exact cancel/preview, custom transforms refused');
} finally { await browser.close(); }
