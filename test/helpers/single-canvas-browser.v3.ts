import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkSingleCanvas(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  page.setDefaultTimeout(45000);
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = `'use client';export default function Page(){return <main className="min-h-[2200px] bg-white p-10"><h1 id="canvas-heading" className="max-w-xl text-4xl font-semibold">One page. Room to create.</h1><p className="mt-6 text-lg text-slate-600">Move around your work without changing its layout.</p><section className="mt-16 h-[1700px] rounded-xl bg-slate-50 p-8"><p>A full page on the canvas.</p></section><footer className="mt-12 text-sm text-slate-500">The end of the page.</footer></main>}`;
  fs.writeFileSync(file, original);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 });
  await page.goto(baseURL + '/studio', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  const stage = page.locator('[data-canvas-stage]'), iframe = page.locator('iframe'), frame = page.frameLocator('iframe'), heading = frame.locator('#canvas-heading');
  const zoom = page.getByRole('combobox', { name: 'Canvas zoom', exact: true });
  assert.equal(await iframe.count(), 1);
  await page.waitForFunction(() => (document.querySelector('iframe')?.clientHeight || 0) >= 2200);
  assert.equal(await heading.evaluate(() => innerWidth), 1200);
  assert.equal(await heading.evaluate(() => getComputedStyle(document.documentElement).overflow), 'hidden');
  await heading.evaluate(() => {
    const style = document.createElement('style'); style.textContent = 'html,body{overflow:scroll!important;scrollbar-gutter:stable both-edges!important}'; document.head.append(style);
  });
  const chrome = () => heading.evaluate(() => ({ html: getComputedStyle(document.documentElement).overflow, body: getComputedStyle(document.body).overflow, bars: getComputedStyle(document.documentElement).scrollbarWidth, gutter: getComputedStyle(document.documentElement).scrollbarGutter, width: innerWidth-document.documentElement.clientWidth }));
  assert.deepEqual(await chrome(), { html: 'hidden', body: 'hidden', bars: 'none', gutter: 'auto', width: 0 });
  const navigation = page.waitForEvent('framenavigated', target => target.url().includes('/studio/preview/'));
  await iframe.evaluate(element => (element as HTMLIFrameElement).contentWindow!.location.reload()); await navigation;
  await frame.locator('html[data-editor-canvas-page]').waitFor({state:'attached'}); await heading.waitFor();
  assert.deepEqual(await chrome(), { html: 'hidden', body: 'hidden', bars: 'none', gutter: 'auto', width: 0 });
  assert.equal(await iframe.getAttribute('scrolling'), 'no');
  console.log('PASS canvas document chrome: html/body scrollbar and gutter suppression beats authored root scroll rules and survives iframe-only reload');
  const pageBox = await iframe.boundingBox(), stageBox = await stage.boundingBox();
  assert.ok(pageBox && stageBox); assert.ok(pageBox.y >= stageBox.y + 30 && pageBox.y + pageBox.height <= stageBox.y + stageBox.height - 30, 'Fit shows the full page');
  await zoom.selectOption('0.25'); await page.waitForFunction(() => document.querySelector('[data-canvas-stage]')?.getAttribute('data-zoom') === '0.25');
  assert.equal(await heading.evaluate(() => innerWidth), 1200); assert.equal(await heading.evaluate(element => getComputedStyle(element).fontSize), '36px');
  await heading.click(); const move = page.getByRole('button', { name: 'Move element', exact: true }); await move.waitFor();
  const smallMove = await move.boundingBox(); assert.ok(smallMove); assert.ok(smallMove.width >= 25, 'Move keeps its existing 27px screen size when zoomed out');
  await zoom.selectOption('0.5');
  const bigMove = await move.boundingBox(); assert.ok(bigMove); assert.ok(Math.abs(bigMove.width-smallMove.width)<2, 'Move keeps its screen size');
  const before = await heading.evaluate(element => element.getBoundingClientRect().x);
  await page.mouse.move(bigMove.x+bigMove.width/2,bigMove.y+bigMove.height/2); await page.mouse.down(); await page.mouse.move(bigMove.x+bigMove.width/2+24,bigMove.y+bigMove.height/2,{steps:6}); await page.mouse.up();
  await page.getByLabel('Draft status', { exact: true }).filter({hasText:'1 change'}).waitFor(); await idle();
  const after = await heading.evaluate(element => element.getBoundingClientRect().x); assert.ok(Math.abs(after-before-48)<2, '24 screen pixels at 50% equals 48 source pixels');
  assert.equal(fs.readFileSync(file,'utf8'),original);
  const position = await stage.evaluate(element => ({ x: element.scrollLeft, y: element.scrollTop }));
  await page.getByRole('button', { name: 'Pan canvas', exact: true }).click();
  const box = await stage.boundingBox(); assert.ok(box);
  await page.mouse.move(box.x+80,box.y+100); await page.mouse.down(); await page.mouse.move(box.x+140,box.y+160,{steps:5}); await page.mouse.up();
  const panned = await stage.evaluate(element => ({x:element.scrollLeft,y:element.scrollTop}));assert.ok(Math.abs(panned.x-position.x)>40 && Math.abs(panned.y-position.y)>40);
  await page.getByRole('button', { name: 'Select elements', exact: true }).click();
  await page.getByRole('button', { name: 'Fit page to canvas', exact: true }).click();
  await heading.click();
  const outer = await stage.evaluate(element=>element.scrollTop);
  const h = await heading.boundingBox(); assert.ok(h); await page.mouse.move(h.x+20,h.y+5);await page.mouse.wheel(0,100);await page.waitForTimeout(100);
  assert.ok(await stage.evaluate(element=>element.scrollTop)>outer, 'Wheel over the page pans the canvas');
  assert.equal(await heading.evaluate(()=>scrollY),0,'The page does not become a nested scroller');
  await page.getByRole('button', { name: 'Fit page to canvas', exact: true }).click();
  await page.getByRole('button', { name:'Save changes',exact:true }).click();await idle();try { await page.getByLabel('Draft status',{exact:true}).filter({hasText:'All changes saved'}).waitFor(); } catch (error) { console.log('Canvas Save state',await page.locator('body').innerText()); console.log('Saved source',fs.readFileSync(file,'utf8')); await page.screenshot({path:path.join(process.cwd(),'docs/single-canvas-save-failure.png')}); throw error; }
  assert.ok(fs.readFileSync(file,'utf8').includes('translate-x-[48px]'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();await idle();assert.equal(fs.readFileSync(file,'utf8'),original);
  await page.getByRole('button', { name: 'Fit page to canvas', exact: true }).click();
  await page.screenshot({path:path.join(process.cwd(),'docs/single-page-canvas.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS single-page canvas: one full-height page, no nested scroller, fit/25%/50%, unchanged responsive width and typography, constant-size Move control, scaled drag coordinates, pan, wheel forwarding, Save and exact source Undo');
  return 1;
}
