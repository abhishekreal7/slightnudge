import { describe, it } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

describe('S1: Authenticated, local-only mutating requests', () => {
  const baseUrl = 'http://127.0.0.1:3000';

  async function fetchToken(): Promise<string> {
    const res = await fetch(`${baseUrl}/api/slightnudge/token`);
    assert.strictEqual(res.status, 200, `Failed to fetch session token: ${res.status}`);
    const data = await res.json();
    assert.ok(data.token && typeof data.token === 'string' && data.token.length === 64, 'Token must be a 64-char hex string');
    return data.token;
  }

  it('rejects mutating request with no Origin and no token with 403 (not 404)', async () => {
    const res = await fetch(`${baseUrl}/api/slightnudge/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previewId: randomUUID() })
    });
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  it('rejects mutating request with wrong Host with 403', async () => {
    const token = await fetchToken();
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1',
        port: 3000,
        path: '/api/slightnudge/apply',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'attacker.evil.com',
          'Origin': 'http://localhost:3000',
          'x-slightnudge-token': token,
        }
      }, (res) => {
        resolve(res.statusCode || 0);
      });
      req.on('error', reject);
      req.write(JSON.stringify({ previewId: randomUUID() }));
      req.end();
    });
    assert.strictEqual(status, 403, `Expected 403 on invalid Host, got ${status}`);
  });

  it('rejects mutating request with valid Origin but missing token with 403', async () => {
    const res = await fetch(`${baseUrl}/api/slightnudge/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({ previewId: randomUUID() })
    });
    assert.strictEqual(res.status, 403, `Expected 403 on missing token, got ${res.status}`);
  });

  it('rejects mutating request with valid Origin but invalid token with 403', async () => {
    const res = await fetch(`${baseUrl}/api/slightnudge/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'x-slightnudge-token': 'bad-token-0000000000000000000000000000000000000000000000000000000000000000'
      },
      body: JSON.stringify({ previewId: randomUUID() })
    });
    assert.strictEqual(res.status, 403, `Expected 403 on invalid token, got ${res.status}`);
  });

  it('returns normal not-found error for fake previewId with valid token and valid Origin', async () => {
    const token = await fetchToken();
    const fakeId = randomUUID();
    const res = await fetch(`${baseUrl}/api/slightnudge/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'x-slightnudge-token': token,
      },
      body: JSON.stringify({ previewId: fakeId })
    });
    assert.notStrictEqual(res.status, 403, 'Must not return 403 when token and origin are valid');
    assert.strictEqual([400, 404, 409].includes(res.status), true, `Expected not-found error status, got ${res.status}`);
  });

  it('allows missing Origin when valid token is present and proceeds to normal handling', async () => {
    const token = await fetchToken();
    const fakeId = randomUUID();
    const res = await fetch(`${baseUrl}/api/slightnudge/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-slightnudge-token': token,
      },
      body: JSON.stringify({ previewId: fakeId })
    });
    assert.notStrictEqual(res.status, 403, 'Missing Origin must be allowed when token is valid');
    assert.strictEqual([400, 404, 409].includes(res.status), true, `Expected normal error status, got ${res.status}`);
  });

  it('completes preview, apply, and undo flow in a temp copy with valid token and Origin', async () => {
    const token = await fetchToken();
    const scratchDir = path.join(process.cwd(), 'scratch');
    fs.mkdirSync(scratchDir, { recursive: true });

    const tempFile = path.join(scratchDir, 's1-auth-flow.tsx');
    const initialCode = 'export default function TempPage() {\n  return <div className="text-sm">Hello</div>;\n}\n';
    fs.writeFileSync(tempFile, initialCode, 'utf8');

    try {
      // 1. Preview
      const previewRes = await fetch(`${baseUrl}/api/slightnudge/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
          'x-slightnudge-token': token,
        },
        body: JSON.stringify({
          kind: 'style',
          filePath: path.relative(process.cwd(), tempFile),
          line: 2,
          property: 'fontSize',
          value: 'text-xl',
        })
      });
      assert.strictEqual(previewRes.status, 200, `Preview failed with status ${previewRes.status}`);
      const previewData = await previewRes.json();
      assert.ok(previewData.id, 'Preview ID must be returned');

      // 2. Apply
      const applyRes = await fetch(`${baseUrl}/api/slightnudge/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
          'x-slightnudge-token': token,
        },
        body: JSON.stringify({ previewId: previewData.id })
      });
      assert.strictEqual(applyRes.status, 200, `Apply failed with status ${applyRes.status}`);
      const diskCode = fs.readFileSync(tempFile, 'utf8');
      assert.match(diskCode, /text-xl/, 'File should have updated content');

      // 3. Undo
      const undoRes = await fetch(`${baseUrl}/api/slightnudge/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
          'x-slightnudge-token': token,
        },
        body: JSON.stringify({ filePath: path.relative(process.cwd(), tempFile) })
      });
      assert.strictEqual(undoRes.status, 200, `Undo failed with status ${undoRes.status}`);
      const revertedCode = fs.readFileSync(tempFile, 'utf8');
      assert.strictEqual(revertedCode, initialCode, 'File should be restored to initial code');
    } finally {
      // Clean up history entry for tempFile to prevent future realpathSync ENOENT
      const historyFile = path.join(process.cwd(), '.slightnudge', 'history', 'edits.json');
      try {
        if (fs.existsSync(historyFile)) {
          const h = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
          const filtered = h.filter((r: any) => !r.filePath.includes('s1-auth-flow'));
          fs.writeFileSync(historyFile, JSON.stringify(filtered, null, 2), 'utf8');
        }
      } catch {}
      try { fs.unlinkSync(tempFile); } catch {}
    }
  });
});
