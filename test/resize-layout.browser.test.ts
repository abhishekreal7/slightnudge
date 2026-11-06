import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readResizeLayout } from '../lib/slightnudge/resize-layout';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(`<style>html{font-size:20px}section{width:1000px;position:relative}.t{width:400px;height:24px}</style>
    <section><div id="start" class="t"></div><div id="center" class="t" style="margin-inline:auto"></div><div id="end" class="t" style="margin-left:auto"></div><div id="contentBox" class="t" style="padding-inline:24px;border:2px solid"></div></section>
    <section style="display:flex;flex-direction:column;align-items:center"><div id="flexCenter" class="t"></div></section>
    <section style="display:flex;flex-direction:column;align-items:flex-end"><div id="flexEnd" class="t"></div></section>
    <section style="direction:rtl"><div id="rtl" class="t"></div></section>
    <section style="display:flex;justify-content:center"><div id="rowCenter" class="t"></div></section>
    <section style="display:grid;grid-template-columns:1000px"><div id="gridCenter" class="t" style="justify-self:center"></div></section>
    <section style="display:grid;grid-template-columns:1000px;direction:rtl"><div id="selfStart" class="t" style="direction:ltr;justify-self:self-start"></div></section>
    <section style="display:flex;flex-direction:row-reverse;justify-content:right"><div id="reverseRight" class="t"></div></section>
    <section style="height:24px"><div id="absolute" class="t" style="position:absolute;left:10px"></div><div id="absoluteAuto" class="t" style="position:absolute;left:10px;margin-inline:auto"></div></section>
    <section><div id="rotate" class="t" style="transform:rotate(8deg)"></div><div id="scale" class="t" style="transform:scale(.8)"></div><div id="vertical" class="t" style="writing-mode:vertical-rl"></div><div id="percent" class="t" style="transform:translateX(50%)"></div><div id="float" class="t" style="float:right"></div></section>
    <section style="display:flex"><div id="sharedRow" class="t"></div><div class="t"></div></section>`);
  await page.evaluate('window.__name = value => value');
  const before = await page.locator('body').innerHTML();
  const values = await page.evaluate(source => {
    const read = (0, eval)('(' + source + ')');
    return [...document.querySelectorAll<HTMLElement>('[id]')].map(el => {
      try { return { id: el.id, result: read(el) }; }
      catch (error) { return { id: el.id, error: (error as Error).message }; }
    });
  }, readResizeLayout.toString());
  for (const [id, anchor] of Object.entries({ start: 'start', center: 'center', end: 'end', flexCenter: 'center', flexEnd: 'end', rtl: 'end', rowCenter: 'center', gridCenter: 'center', absolute: 'start', absoluteAuto: 'start', contentBox: 'start', selfStart: 'start', reverseRight: 'end' })) {
    const value = values.find(item => item.id === id)!;
    assert.equal(value.result?.anchor, anchor, JSON.stringify(value));
    assert.equal(value.result?.rem, 20);
    assert.equal(value.result?.width, 400);
  }
  for (const id of ['rotate', 'scale', 'vertical', 'sharedRow', 'percent', 'float']) assert.ok(values.find(item => item.id === id)?.error, `${id} must refuse rather than guess an anchor`);
  assert.equal(await page.locator('body').innerHTML(), before, 'Measuring anchors never changes page markup/styles');
  console.log(JSON.stringify(values));
  console.log('PASS thirteen CSS anchor layouts, content-box units, iframe-root units, six unsafe-layout refusals and no DOM writes');
} finally { await browser.close(); }
