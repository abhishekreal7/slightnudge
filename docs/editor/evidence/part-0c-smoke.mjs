import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const listener = net.createServer().listen(0, '127.0.0.1');
await once(listener, 'listening');
const { port } = listener.address();
await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
assert.ok(port > 3002, 'Use a free port outside the reserved range');
const origin = 'http://127.0.0.1:' + port;
const nextBin = './node_modules/next/dist/bin/next';
const args = [nextBin, 'start', '-H', '127.0.0.1', '-p', String(port)];
console.log('> node ' + args.join(' '));
const server = spawn(process.execPath, args, {
  windowsHide: true,
  env: { ...process.env, PORT: String(port), NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production' },
  stdio: ['ignore', 'inherit', 'inherit'],
});
const exited = once(server, 'exit');
const fixture = 'fixtures/1-plain-static.tsx';
let browser;
try {
  const deadline = Date.now() + 30000;
  while (true) {
    assert.equal(server.exitCode, null, 'Production server exited before ready');
    const ready = await fetch(origin + '/studio', { signal: AbortSignal.timeout(2000) }).catch(() => null);
    if (ready) {
      await ready.body?.cancel();
      break;
    }
    assert.ok(Date.now() < deadline, 'Production server did not become reachable');
    await delay(250);
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const response = await page.goto(origin + '/studio');
  assert.equal(response?.status(), 200);
  console.log('Chromium opened /studio (HTTP 200).');
  assert.ok(await page.evaluate(() => /^[a-f0-9]{64}$/.test(window.__SLIGHTNUDGE_TOKEN__)), 'Session token reaches the page');
  console.log('The session token reached the browser.');
  await page.waitForResponse((res) => res.url().endsWith('/api/slightnudge/pages'), { timeout: 5000 }).catch(() => {});
  const before = readFileSync(fixture, 'utf8');
  await page.getByRole('heading', { name: 'Make room for your best work.', exact: true }).click();
  const previewPromise = page.waitForResponse((res) => res.url().endsWith('/api/slightnudge/preview') && res.request().method() === 'POST');
  await page.keyboard.press('ArrowRight');
  const preview = await previewPromise;
  const previewBody = await preview.json();
  console.log('Nudge preview status: ' + preview.status());
  assert.ok(preview.ok() && previewBody.success && previewBody.id, previewBody.reason || previewBody.error || 'Nudge preview succeeds');
  assert.equal(readFileSync(fixture, 'utf8'), before, 'Preview leaves the source byte-identical');
  // The nudge response exposes token changes. Full classes live in the reviewed snapshot.
  assert.match(previewBody.id, /^[a-f0-9-]{36}$/i);
  const pending = JSON.parse(readFileSync('.slightnudge/pending/' + previewBody.id + '.json', 'utf8'));
  Object.assign(previewBody, { oldClassName: pending.oldClassName, newClassName: pending.newClassName });
  assert.ok(before.includes(previewBody.oldClassName), 'Preview identifies existing classes');
  assert.notEqual(previewBody.newClassName, previewBody.oldClassName, 'Nudge changes classes');
  const applyPromise = page.waitForResponse((res) => res.url().endsWith('/api/slightnudge/apply') && res.request().method() === 'POST');
  await page.getByRole('button', { name: 'Apply to Source', exact: true }).click();
  const apply = await applyPromise;
  const applyBody = await apply.json();
  console.log('Apply status: ' + apply.status());
  assert.ok(apply.ok() && applyBody.success, applyBody.error || 'Apply succeeds');
  assert.equal(readFileSync(fixture, 'utf8'), before.replace('className="' + previewBody.oldClassName + '"', 'className="' + previewBody.newClassName + '"'), 'Apply writes only the reviewed class change in the archive');
  console.log('Confirmed source write in the archive: ' + previewBody.oldClassName + ' -> ' + previewBody.newClassName);
} finally {
  try {
    await browser?.close();
  } finally {
    if (server.exitCode === null && server.signalCode === null) server.kill();
    await exited;
    console.log('Stopped the production server on port ' + port + '.');
  }
}
