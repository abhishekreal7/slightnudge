import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { POST } from '../app/api/slightnudge/assets/route';
import { getSessionToken } from '../lib/slightnudge/auth';

const previous = process.cwd(), root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-image-assets-'));
const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-image-outside-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root; process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge'); process.env.PORT = '3000';
try {
  process.chdir(root);
  const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: 'blue' } }).png().toBuffer();
  const request = (token = getSessionToken(), bytes = png) => {
    const form = new FormData(); form.set('file', new File([new Uint8Array(bytes)], 'test.png', { type: 'image/png' }));
    return new Request('http://127.0.0.1:3000/api/slightnudge/assets', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'x-slightnudge-token': token }, body: form });
  };
  assert.equal((await POST(request('invalid'))).status, 403);
  fs.symlinkSync(outside, path.join(root, 'public'), 'junction');
  assert.equal((await POST(request())).status, 400); assert.deepEqual(fs.readdirSync(outside), []);
  fs.unlinkSync(path.join(root, 'public')); fs.mkdirSync(path.join(root, 'public'));
  fs.symlinkSync(outside, path.join(root, 'public/slightnudge-assets'), 'junction');
  assert.equal((await POST(request())).status, 400); assert.deepEqual(fs.readdirSync(outside), []);
  fs.unlinkSync(path.join(root, 'public/slightnudge-assets'));
  assert.equal((await POST(request(getSessionToken(), Buffer.from('not an image')))).status, 415);
  const response = await POST(request()); assert.equal(response.status, 201); const body = await response.json();
  assert.deepEqual(fs.readFileSync(path.join(root, 'public', body.asset.url)), png);
  assert.deepEqual(fs.readdirSync(outside), []);
  console.log('PASS image assets: token required, public/library junctions refused without external writes, MIME mismatch refused, valid PNG stored in this project');
} finally {
  process.chdir(previous);
  for (const candidate of [path.join(root, 'public/slightnudge-assets'), path.join(root, 'public')]) { try { if (fs.lstatSync(candidate).isSymbolicLink()) fs.unlinkSync(candidate); } catch {} }
  assert.ok(root.startsWith(os.tmpdir()) && path.basename(root).startsWith('sn-image-assets-')); assert.ok(outside.startsWith(os.tmpdir()) && path.basename(outside).startsWith('sn-image-outside-'));
  fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true });
}
