import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const previousCwd = process.cwd(), previousNodeEnv = process.env.NODE_ENV;
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-preview-check-'));
fs.mkdirSync(path.join(workspace, '.slightnudge'), { recursive: true });
fs.writeFileSync(path.join(workspace, '.slightnudge/repositories.json'), JSON.stringify([{ id: 'preview-test' }]));
process.chdir(workspace); Object.assign(process.env, { NODE_ENV: 'development' });
let requests = 0;
const server = http.createServer((request, response) => {
  requests++;
  if (request.url === '/redirect') { response.writeHead(302, { location: '/slow' }); response.end(); return; }
  if (request.url === '/deny') { response.writeHead(200, { 'content-type': 'text/html', 'x-frame-options': 'DENY' }); response.end('<p>Restricted</p>'); return; }
  // An actual delayed loopback response, longer than the former four-second
  // deadline, exercises the route without replacing fetch or timeout APIs.
  setTimeout(() => { response.writeHead(200, { 'content-type': 'text/html' }); response.end('<p>Compiled preview</p>'); }, 4500);
});
try {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const { POST } = await import('../app/api/slightnudge/repositories/[id]/preview-check/route');
  const { getSessionToken } = await import('../lib/slightnudge/auth');
  const request = (url: string, token = getSessionToken()) => POST(new Request('http://localhost:3000/api/slightnudge/repositories/preview-test/preview-check', {
    method: 'POST', headers: { host: 'localhost:3000', 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ url }),
  }), { params: Promise.resolve({ id: 'preview-test' }) });
  const start = Date.now(), slow = await request(`http://127.0.0.1:${port}/slow`);
  assert.equal(slow.status, 200, JSON.stringify(await slow.json())); assert.ok(Date.now() - start >= 4400);
  assert.equal((await request(`http://127.0.0.1:${port}/redirect`)).status, 422);
  assert.equal((await request(`http://127.0.0.1:${port}/deny`)).status, 422);
  const beforeInvalid = requests;
  assert.equal((await request('https://example.com')).status, 400);
  assert.equal((await request(`http://127.0.0.1:${port}/slow`, 'invalid')).status, 403);
  Object.assign(process.env, { NODE_ENV: 'production' });
  assert.equal((await request(`http://127.0.0.1:${port}/slow`)).status, 501);
  assert.equal(requests, beforeInvalid, 'Denied requests must not probe any server');
  console.log('PASS preview connection: real >4s compilation response accepted; redirect, frame-policy, nonlocal URL, invalid token and production boundaries preserved');
} finally {
  server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  process.chdir(previousCwd);
  if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV'); else Object.assign(process.env, { NODE_ENV: previousNodeEnv });
  fs.rmSync(workspace, { recursive: true, force: true });
}
