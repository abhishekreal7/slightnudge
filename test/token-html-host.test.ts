import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { startTestServer, TestServer } from './helpers/test-server';

describe('P0: Token HTML Host Header Validation', () => {
  let server: TestServer;
  let port: number;
  let token: string;

  before(async () => {
    server = await startTestServer();
    port = server.port;
    token = server.token;
    assert.ok(token && token.length === 64, 'Must obtain 64-char session token from allowed host');
  });

  after(async () => {
    if (server) await server.stop();
  });

  function getRaw(urlPath: string, headers: Record<string, string | undefined>): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
      const cleanHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(headers)) {
        if (v !== undefined) cleanHeaders[k] = v;
      }
      const hasHost = cleanHeaders.Host !== undefined && cleanHeaders.Host !== '';
      if (!hasHost) {
        delete cleanHeaders.Host;
      }
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: urlPath,
          method: 'GET',
          setHost: hasHost,
          headers: cleanHeaders,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve({
              status: res.statusCode || 0,
              headers: res.headers,
              body,
            });
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  const pathsToTest = ['/', '/studio'];

  const disallowedHostCases = [
    { name: 'evil.localhost', headers: (p: number) => ({ Host: `evil.localhost:${p}` }) },
    { name: 'attacker.example', headers: () => ({ Host: 'attacker.example' }) },
    { name: 'wrong port (port+1)', headers: (p: number) => ({ Host: `localhost:${p + 1}` }) },
    { name: 'missing Host', headers: () => ({ Host: '' }) },
    { name: 'valid Host + X-Forwarded-Host: evil.localhost', headers: (p: number) => ({ Host: `localhost:${p}`, 'X-Forwarded-Host': 'evil.localhost' }) },
    { name: 'valid Host + Forwarded: host=evil.localhost', headers: (p: number) => ({ Host: `localhost:${p}`, Forwarded: 'host=evil.localhost' }) },
    { name: 'valid 127.0.0.1 + X-Forwarded-Host: evil.localhost', headers: (p: number) => ({ Host: `127.0.0.1:${p}`, 'X-Forwarded-Host': 'evil.localhost' }) },
    { name: 'valid 127.0.0.1 + Forwarded: host=evil.localhost', headers: (p: number) => ({ Host: `127.0.0.1:${p}`, Forwarded: 'host=evil.localhost' }) },
  ];

  for (const urlPath of pathsToTest) {
    for (const testCase of disallowedHostCases) {
      it(`disallows token in HTML for ${urlPath} with ${testCase.name}`, async () => {
        const res = await getRaw(urlPath, testCase.headers(port));
        assert.ok(
          !res.body.includes(token),
          `Session token was leaked in response body for ${urlPath} under ${testCase.name}`
        );
        assert.ok(
          !res.body.includes('__SLIGHTNUDGE_TOKEN__'),
          `__SLIGHTNUDGE_TOKEN__ string was rendered in response body for ${urlPath} under ${testCase.name}`
        );
      });
    }

    it(`renders token in HTML for ${urlPath} with valid Host localhost:PORT`, async () => {
      const res = await getRaw(urlPath, { Host: `localhost:${port}` });
      assert.strictEqual(res.status, 200, `Expected 200 OK for localhost:${port}`);
      assert.ok(
        res.body.includes(token),
        `Session token was missing from HTML response for ${urlPath} under valid localhost:${port}`
      );
      assert.ok(
        res.body.includes('__SLIGHTNUDGE_TOKEN__'),
        `__SLIGHTNUDGE_TOKEN__ was missing from HTML response for ${urlPath} under valid localhost:${port}`
      );
    });

    it(`renders token in HTML for ${urlPath} with valid Host 127.0.0.1:PORT`, async () => {
      const res = await getRaw(urlPath, { Host: `127.0.0.1:${port}` });
      assert.strictEqual(res.status, 200, `Expected 200 OK for 127.0.0.1:${port}`);
      assert.ok(
        res.body.includes(token),
        `Session token was missing from HTML response for ${urlPath} under valid 127.0.0.1:${port}`
      );
      assert.ok(
        res.body.includes('__SLIGHTNUDGE_TOKEN__'),
        `__SLIGHTNUDGE_TOKEN__ was missing from HTML response for ${urlPath} under valid 127.0.0.1:${port}`
      );
    });
  }

  it('refuses token endpoint for disallowed host (evil.localhost) with 403', async () => {
    const res = await getRaw('/api/slightnudge/token', { Host: `evil.localhost:${port}` });
    assert.strictEqual(res.status, 403, `Expected 403 on evil.localhost, got ${res.status}`);
  });

  it('refuses token endpoint when X-Forwarded-Host is evil.localhost with 403', async () => {
    const res = await getRaw('/api/slightnudge/token', {
      Host: `localhost:${port}`,
      'X-Forwarded-Host': 'evil.localhost',
    });
    assert.strictEqual(res.status, 403, `Expected 403 on forwarded evil host, got ${res.status}`);
  });

  it('token endpoint response includes Cache-Control: no-store', async () => {
    const res = await getRaw('/api/slightnudge/token', { Host: `localhost:${port}` });
    assert.strictEqual(res.status, 200);
    const cc = res.headers['cache-control'] || '';
    assert.ok(
      cc.includes('no-store'),
      `Expected Cache-Control to include no-store, got: ${cc}`
    );
  });
});
