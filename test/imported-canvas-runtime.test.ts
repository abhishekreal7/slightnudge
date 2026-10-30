import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { importedCanvasRuntime } from '../lib/slightnudge/imported-canvas-runtime';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 720 } });
  await page.setContent(`<style>#hero{min-height:100vh;--space100vh:12px;padding-bottom:var(--space100vh)}#hero::before{content:"100vh"}body{margin:0}</style><main id="hero">Viewport-aware page</main><footer style="height:1000px">Footer</footer>`);
  await page.addScriptTag({ content: `(() => { const __name = value => value; (${importedCanvasRuntime.toString()})(() => {}); })();` });
  await page.waitForFunction(() => (document.styleSheets[0].cssRules[0] as CSSStyleRule).style.minHeight === '720px');
  const inspect = () => page.locator('#hero').evaluate(element => ({ padding: getComputedStyle(element).paddingBottom, height: getComputedStyle(element).minHeight, content: getComputedStyle(element, '::before').content }));
  assert.deepEqual(await inspect(), { padding: '12px', height: '720px', content: '"100vh"' });
  await page.setViewportSize({ width: 1200, height: 4000 });
  assert.deepEqual(await inspect(), { padding: '12px', height: '720px', content: '"100vh"' });
  await page.locator('#hero').evaluate(element => { (element as HTMLElement).style.minHeight = '50vh'; });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#hero')!).minHeight === '360px');
  assert.equal((await inspect()).padding, '12px');
  console.log('PASS imported canvas runtime: pinned viewport units, unchanged custom-property identifiers and quoted content, stable iframe expansion and dynamically authored viewport styles.');
} finally { await browser.close(); }
