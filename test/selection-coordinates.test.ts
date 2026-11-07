import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { probeElement, logicalToScreen, hitSource } from './helpers/selection-gate-v3-coordinates';

// Owned in-memory documents only: no editor server or live URL is contacted.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await page.setContent('<iframe title="Actual project" style="position:absolute;left:30px;top:40px;width:500px;height:300px;border:2px solid;transform:scale(.8);transform-origin:top left"></iframe>');
  await page.locator('iframe').evaluate(iframe => {
    if (!(iframe instanceof HTMLIFrameElement)) throw Error('Expected iframe');
    iframe.srcdoc = '<style>body{margin:0}h1{margin:10px;padding:20px;width:220px;height:60px}p{margin:10px}</style><h1 data-source-file="app/page.tsx" data-source-line="2" data-source-column="4">Heading</h1><p>Without source metadata</p>';
  });
  const iframe = await page.locator('iframe').elementHandle(); assert.ok(iframe);
  const frame = await iframe.contentFrame(); assert.ok(frame);
  await frame.locator('h1').waitFor();
  const probe = await probeElement(frame.locator('h1'));
  assert.ok(probe.source); assert.equal(probe.source.path, 'app/page.tsx');
  assert.equal(probe.source.line, 2); assert.equal(probe.source.column, 4);
  assert.ok(probe.candidates.length > 0);
  const conversions = await logicalToScreen(page, probe.candidates);
  assert.equal(conversions.length, probe.candidates.length);
  const point = conversions.find(candidate => candidate.parentHit?.isIframe); assert.ok(point);
  const hit = await hitSource(frame, point.logical); assert.deepEqual(hit.source, probe.source);
  assert.ok(Math.abs(point.scale.x - .8) < .001); assert.ok(Math.abs(point.scale.y - .8) < .001);
  const single = await logicalToScreen(page, point.logical); assert.deepEqual(single.screen, point.screen);
  assert.equal((await probeElement(frame.locator('p'))).source, null);
  console.log('PASS coordinate helper: serialized typed probe, source metadata, absent metadata, candidate-array and single-point overloads, transformed iframe geometry and exact physical hit');
} finally { await browser.close(); }
