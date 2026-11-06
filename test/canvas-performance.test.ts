import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { importedCanvasRuntime } from '../lib/slightnudge/imported-canvas-runtime';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';

let runtimeScript = `const __name = value => value; (${importedCanvasRuntime.toString()})(() => {});`;
if (process.argv.includes('--baseline')) {
  const source = execFileSync('git', ['show', 'HEAD:lib/slightnudge/imported-canvas-runtime.ts'], { encoding: 'utf8' });
  runtimeScript = `${stripTypeScriptTypes(source).replace('export function importedCanvasRuntime', 'function importedCanvasRuntime')}; importedCanvasRuntime(() => {});`;
}

// Exercise the serialized runtime in a real browser with a large stylesheet.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 720 } });
  await page.setContent(`<style>${Array.from({ length: 2000 }, (_, i) => `.rule${i}{padding:4px;color:red;min-height:10vh}`).join('')}#hero{min-height:100vh;width:50vmin}</style><main id="hero">Canvas</main>`);
  await page.evaluate(() => {
    const original = CSSStyleDeclaration.prototype.getPropertyValue;
    const frame = window.requestAnimationFrame.bind(window);
    (window as any).frameWorkMs = 0;
    window.requestAnimationFrame = callback => frame(time => {
      const start = performance.now();
      try { callback(time); } finally { (window as any).frameWorkMs += performance.now() - start; }
    });
    (window as any).propertyReads = 0;
    CSSStyleDeclaration.prototype.getPropertyValue = function (property) {
      (window as any).propertyReads++;
      return original.call(this, property);
    };
  });
  await page.addScriptTag({ content: `(() => { ${runtimeScript} })();` });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#hero')!).minHeight === '720px');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const result = await page.evaluate(async () => {
    (window as any).propertyReads = 0;
    (window as any).frameWorkMs = 0;
    const start = performance.now();
    for (let i = 0; i < 30; i++) {
      (document.querySelector('#hero') as HTMLElement).style.transform = `translateX(${i}px)`;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    return { propertyReads: (window as any).propertyReads, frameWorkMs: Math.round((window as any).frameWorkMs), elapsedMs: Math.round(performance.now() - start) };
  });
  console.log('Canvas repeated style updates:', JSON.stringify(result));
  // CSSOM edits, inline edits and width-dependent units must remain live.
  await page.evaluate(() => {
    const rule = document.styleSheets[0].cssRules[2000] as CSSStyleRule;
    rule.style.minHeight = '50vh';
    (document.querySelector('#hero') as HTMLElement).style.height = '25vh';
  });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#hero')!).minHeight === '360px');
  assert.equal(await page.locator('#hero').evaluate(e => getComputedStyle(e).height), '360px');
  await page.setViewportSize({ width: 400, height: 900 });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#hero')!).width === '200px');
  await page.evaluate(() => {
    const sheet = document.createElement('style');
    sheet.textContent = '#hero{min-height:75vh!important}';
    document.head.append(sheet);
  });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#hero')!).minHeight === '540px');
  assert.equal(await page.evaluate(() => (document.styleSheets[document.styleSheets.length - 1].cssRules[0] as CSSStyleRule).style.getPropertyPriority('min-height')), 'important');
  if (!process.argv.includes('--baseline')) assert.ok(result.propertyReads < 1000, 'Unchanged declarations should not be re-parsed on every gesture frame');
  console.log('PASS canvas performance: live CSSOM/inline edits and responsive viewport units preserved.');
} finally { await browser.close(); }
