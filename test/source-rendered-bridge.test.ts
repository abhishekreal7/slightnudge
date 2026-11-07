import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getBridgeClient } from '../lib/slightnudge/next-source-adapter';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:46111/**', route => route.fulfill({ contentType: 'text/html', body: route.request().url().includes('/frame')
    ? `<style>.font-normal{font-weight:400}.font-bold{font-weight:700}.forced{font-weight:400!important}.mt-1{margin-top:4px}</style><h1 data-source-file="app/page.tsx" data-source-line="2" data-source-column="1" class="font-normal">First</h1><p data-source-file="app/page.tsx" data-source-line="3" data-source-column="1" class="font-normal forced">Second</p><script>${getBridgeClient()}</script>`
    : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46111"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script>' }));
  await page.goto('http://127.0.0.1:46111/');
  const frame = page.frames()[1];
  await frame.locator('h1').click();
  await page.waitForFunction(() => (window as any).messages.some((m: any) => m.type === 'source-selection'));
  const selection = await page.evaluate(() => (window as any).messages.find((m: any) => m.type === 'source-selection').selection);
  assert.equal(selection.computed.fontWeight, '400');
  let passed = 1;
  assert.equal(await frame.evaluate(() => { const form = document.createElement('form'); document.body.append(form); const submit = new Event('submit', { cancelable: true, bubbles: true }); form.dispatchEvent(submit); return submit.defaultPrevented; }), true); passed++;
  let id = 0;
  async function command(operation: string, extra: Record<string, unknown> = {}) {
    const requestId = String(++id);
    await page.evaluate(data => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(data, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', requestId, operation, selection, kind: 'style', property: 'fontWeight', utility: 'font-bold', value: 'font-normal font-bold', ...extra });
    await page.waitForFunction(id => (window as any).messages.some((m: any) => m.type === 'edit-result' && m.requestId === id), requestId);
    return page.evaluate(id => (window as any).messages.find((m: any) => m.type === 'edit-result' && m.requestId === id), requestId);
  }
  assert.equal((await command('set-mode', { edit: false })).success, true); passed++;
  assert.equal(await frame.evaluate(() => { const key = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }); document.body.dispatchEvent(key); return key.defaultPrevented; }), false, 'Browse mode must preserve website shortcuts'); passed++;
  assert.equal(await frame.evaluate(() => { const submit = new Event('submit', { cancelable: true, bubbles: true }); document.querySelector('form')!.dispatchEvent(submit); return submit.defaultPrevented; }), false, 'Browse mode must let the real page handle its forms'); passed++;
  const selectionsBeforeBrowse = await page.evaluate(() => (window as any).messages.filter((message: any) => message.type === 'source-selection').length);
  await frame.locator('h1').click();
  assert.equal(await page.evaluate(() => (window as any).messages.filter((message: any) => message.type === 'source-selection').length), selectionsBeforeBrowse, 'Browse clicks must not select source elements'); passed++;
  assert.equal((await command('set-mode', { edit: true })).success, true); passed++;
  await frame.locator('h1').click();
  assert.equal((await command('verify', { expectedClass: 'font-normal' })).success, true); passed++;
  assert.equal((await command('verify', { expectedClass: 'font-bold' })).success, false); passed++;
  await frame.locator('h1').evaluate(element => { const duplicate = element.cloneNode(true) as HTMLElement; duplicate.id = 'duplicate-marker'; document.body.append(duplicate); });
  assert.equal((await command('preview')).success, false, 'A source marker rendered more than once must be refused before preview'); passed++;
  assert.equal(await frame.locator('h1').first().getAttribute('class'), 'font-normal'); passed++;
  await frame.locator('#duplicate-marker').evaluate(element => element.remove());
  assert.equal((await command('preview')).success, true); passed++;
  assert.equal(await frame.locator('h1').evaluate(e => getComputedStyle(e).fontWeight), '700'); passed++;
  assert.equal((await command('check')).success, true); passed++;
  await frame.locator('h1').evaluate(element => { element.textContent = 'Updated runtime caption'; });
  assert.equal((await command('check')).success, true, 'A style edit must not confuse an unrelated runtime caption with a new source target'); passed++;
  assert.equal((await command('preview')).success, false); passed++;
  assert.equal((await command('discard')).success, true); passed++;
  assert.equal(await frame.locator('h1').getAttribute('class'), 'font-normal'); passed++;
  assert.equal(await frame.locator('h1').textContent(), 'Updated runtime caption', 'Discarding a style must preserve unrelated runtime text'); passed++;
  assert.equal((await command('preview', { utility: 'font-missing', value: 'font-normal font-missing' })).success, false); passed++;
  assert.equal(await frame.locator('h1').getAttribute('class'), 'font-normal'); passed++;
  assert.equal((await command('preview', { selection: { ...selection, column: 99 } })).success, false); passed++;
  const initialMargin = await frame.locator('h1').evaluate(element => getComputedStyle(element).marginTop);
  assert.equal((await command('preview', { kind: 'nudge', property: 'marginTop', utility: 'mt-1', value: 'font-normal mt-1' })).success, true); passed++;
  assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).marginTop), '4px'); passed++;
  assert.equal((await command('discard')).success, true); passed++;
  assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).marginTop), initialMargin); passed++;
  await frame.locator('h1').evaluate(element => {
    const parent = document.createElement('div'); parent.id = 'width-context'; parent.style.cssText = 'box-sizing:content-box;width:300px;padding:24px;border:1px solid';
    element.replaceWith(parent); parent.append(element);
    (element as HTMLElement).style.cssText = 'box-sizing:border-box;padding:16px;border:1px solid';
    const style = document.createElement('style'); style.textContent = '.width-half{width:50%} .width-full{width:100%}'; document.head.append(style);
  });
  assert.equal((await command('preview', { property: 'width', utility: 'width-half', value: 'font-normal width-half' })).success, true, 'Percentage sizing uses the padded parent content box, not the viewport'); passed++;
  assert.equal(await frame.locator('h1').evaluate(element => element.getBoundingClientRect().width), 150); passed++;
  await command('discard');
  await frame.locator('h1').evaluate(element => element.classList.add('aos-init', 'aos-animate'));
  assert.equal((await command('preview')).success, true, 'Known AOS state classes do not invalidate the authored source'); passed++;
  assert.equal(await frame.locator('h1').getAttribute('class'), 'font-normal font-bold aos-init aos-animate'); passed++;
  await frame.locator('h1').evaluate(element => element.classList.remove('aos-animate'));
  assert.equal((await command('check')).success, true, 'AOS may change its own state while a draft is pending'); passed++;
  assert.equal((await command('discard')).success, true); passed++;
  assert.equal(await frame.locator('h1').getAttribute('class'), 'font-normal aos-init', 'Discard restores authored classes and retains the current animation state'); passed++;
  assert.equal((await command('verify', { expectedClass: 'font-normal' })).success, true); passed++;
  await frame.locator('h1').evaluate(element => element.classList.remove('aos-init'));
  assert.equal((await command('preview', { property: 'width', utility: 'width-full', value: 'font-normal width-full', css: '.width-full{width:100%}' })).success, true); passed++;
  assert.equal(await frame.locator('h1').evaluate(element => element.getBoundingClientRect().width), 300); passed++;
  await command('discard');
  await command('preview');
  await frame.locator('h1').evaluate(e => { if (!(e instanceof HTMLElement)) throw Error('Expected an HTML heading'); e.className = 'outside-change'; });
  assert.equal((await command('check')).success, false); passed++;
  assert.equal((await command('discard')).success, false); passed++;
  assert.equal(await frame.locator('h1').getAttribute('class'), 'outside-change'); passed++;
  await page.reload();
  await page.frames()[1].locator('p').click();
  await page.waitForFunction(() => (window as any).messages.some((m: any) => m.type === 'source-selection'));
  const forced = await page.evaluate(() => (window as any).messages.find((m: any) => m.type === 'source-selection').selection);
  assert.equal((await command('preview', { selection: forced, value: 'font-normal forced font-bold' })).success, false); passed++;
  console.log(`PASS: ${passed} source-rendered bridge cases`);
} finally { await browser.close(); }
