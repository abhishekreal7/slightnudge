import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const installed = fs.readFileSync(require.resolve('next/dist/client/dev/hot-reloader/app/web-socket.js'), 'utf8');
const transform = require('../lib/slightnudge/next-hmr-sync-loader.cjs');
const types = require('next/dist/server/dev/hot-reloader-types').HMR_MESSAGE_SENT_TO_BROWSER;

// Execute the installed Next runtime, with only the browser transport and its
// unrelated UI imports stubbed. This reproduces the real cross-preview sync bug.
function runtime(source: string) {
  let reloads = 0;
  const delivered: unknown[] = [];
  class Socket { onmessage?: (event: { data: string }) => void; close() {} send() {} }
  const module = { exports: {} as { createWebSocket: (prefix: string, state: unknown) => Socket } };
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require: (name: string) => {
      if (name.endsWith('hot-reloader-types')) return { HMR_MESSAGE_SENT_TO_BROWSER: types };
      if (name.endsWith('get-socket-url')) return { getSocketUrl: () => 'ws://localhost' };
      if (name.endsWith('hot-reloader-app')) return { processMessage: (message: unknown) => delivered.push(message) };
      return {};
    },
    self: { __next_r: 'test-request' }, process: { env: {} },
    window: { WebSocket: Socket, location: { reload: () => reloads++ }, addEventListener() {}, console },
    document: { addEventListener() {} }, setTimeout, clearTimeout, console, TextDecoder,
  });
  const socket = module.exports.createWebSocket('', {});
  return { send: (message: unknown) => socket.onmessage!({ data: JSON.stringify(message) }), reloads: () => reloads, delivered };
}
const original = runtime(installed);
original.send({ type: types.SYNC, hash: 'a' });
original.send({ type: types.BUILT, hash: 'b', errors: [] });
original.send({ type: types.SYNC, hash: 'b' });
assert.equal(original.reloads(), 1, 'The installed runtime reproduces the healthy-preview reload');

const fixed = runtime(transform(installed));
fixed.send({ type: types.SYNC, hash: 'a' });
fixed.send({ type: types.BUILT, hash: 'b', errors: [] });
fixed.send({ type: types.SYNC, hash: 'b' });
assert.equal(fixed.reloads(), 0, 'Another preview can sync after an acknowledged build');
assert.equal(fixed.delivered.length, 3, 'Normal HMR messages still reach the installed Next handler');
fixed.send({ type: types.SYNC, hash: 'server-restarted' });
assert.equal(fixed.reloads(), 1, 'An unacknowledged compilation still triggers restart recovery');

const failedBuild = runtime(transform(installed));
failedBuild.send({ type: types.SYNC, hash: 'a' });
failedBuild.send({ type: types.BUILT, hash: 'b', errors: [{ message: 'Compilation failed' }] });
failedBuild.send({ type: types.SYNC, hash: 'b' });
assert.equal(failedBuild.reloads(), 1, 'A failed build cannot advance the healthy checkpoint');
assert.throws(() => transform('unrecognized Next runtime'), /HMR changed/);
console.log('PASS Next HMR: installed regression reproduced, healthy preview sync preserved, normal updates delivered, real restart and failed-build recovery retained, compatibility guard');
