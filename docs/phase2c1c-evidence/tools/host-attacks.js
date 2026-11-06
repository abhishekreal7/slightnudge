import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createArchiveCopy, findFreePort, computeBaselineHashes, assertBaselineUnchanged, REPO_ROOT } from './helpers.js';

function rawHttpGet(hostHeader, reqPath, port, extraHeaders = {}) {
  return new Promise((resolve) => {
    const headers = { ...extraHeaders };
    if (hostHeader !== null) {
      headers['Host'] = hostHeader;
    }
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: reqPath,
        method: 'GET',
        headers,
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c.toString('utf8')));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body,
          });
        });
      }
    );
    req.on('error', (err) => resolve({ statusCode: 0, headers: {}, body: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 0, headers: {}, body: 'timeout' });
    });
    req.end();
  });
}

export async function runHostAttacks() {
  const baselineBefore = computeBaselineHashes();
  console.log('Starting Token and Host Attacks Battery (Dev & Prod)...\n');

  const copy = createArchiveCopy('HEAD', 'host-attacks-copy');
  const results = {
    headerMatrix: [],
    browserAttacks: [],
    reorderPathAttack: {},
    routeInventory: [],
  };

  try {
    // 1. Build and start production server on an isolated port
    const port = await findFreePort(3500);
    console.log(`Starting Next.js production server on 127.0.0.1:${port}...`);
    execSync('npm run build', { cwd: copy.dir, stdio: ['ignore', 'pipe', 'pipe'] });

    const serverProc = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['next', 'start', '-H', '127.0.0.1', '-p', String(port)],
      { cwd: copy.dir, stdio: ['ignore', 'pipe', 'pipe'], shell: true }
    );

    // Wait for server ready
    const startWait = Date.now();
    let ready = false;
    while (Date.now() - startWait < 40000) {
      try {
        const check = await rawHttpGet(`127.0.0.1:${port}`, '/', port);
        if (check.statusCode === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!ready) {
      throw new Error(`Production server failed to start on port ${port}`);
    }

    // Get real session token from allowed token endpoint
    const tokenRes = await rawHttpGet(`127.0.0.1:${port}`, '/api/slightnudge/token', port);
    let realToken = '';
    try {
      realToken = JSON.parse(tokenRes.body).token || '';
    } catch {}

    console.log(`Real session token obtained: ${realToken ? realToken.slice(0, 8) + '...' : 'NONE'}`);

    // (a) Header Matrix Evaluation
    const hostHeaders = [
      { name: 'allowed-127', host: `127.0.0.1:${port}`, extra: {}, allowed: true },
      { name: 'allowed-localhost', host: `localhost:${port}`, extra: {}, allowed: true },
      { name: 'disallowed-evil', host: `evil.localhost:${port}`, extra: {}, allowed: false },
      { name: 'disallowed-attacker', host: 'attacker.example', extra: {}, allowed: false },
      { name: 'disallowed-wrongport', host: `localhost:${port + 1}`, extra: {}, allowed: false },
      { name: 'disallowed-nohost', host: null, extra: {}, allowed: false },
      {
        name: 'contradictory-x-forwarded',
        host: `localhost:${port}`,
        extra: { 'X-Forwarded-Host': 'evil.localhost' },
        allowed: false,
      },
      {
        name: 'contradictory-forwarded',
        host: `localhost:${port}`,
        extra: { Forwarded: 'host=evil.localhost' },
        allowed: false,
      },
    ];

    for (const route of ['/', '/studio', '/api/slightnudge/token']) {
      for (const h of hostHeaders) {
        const res = await rawHttpGet(h.host, route, port, h.extra);
        const containsToken = Boolean(realToken && res.body.includes(realToken));
        const containsTokenName = res.body.includes('__SLIGHTNUDGE_TOKEN__');
        const cacheControl = res.headers['cache-control'] || '';

        const pass = h.allowed
          ? (route === '/api/slightnudge/token' ? res.statusCode === 200 : res.statusCode === 200 && containsToken && containsTokenName)
          : (!containsToken && !containsTokenName && (route === '/api/slightnudge/token' ? res.statusCode === 403 : true));

        results.headerMatrix.push({
          route,
          scenario: h.name,
          hostHeader: h.host,
          extraHeaders: h.extra,
          statusCode: res.statusCode,
          containsRealToken: containsToken,
          containsTokenString: containsTokenName,
          cacheControl,
          pass,
        });
      }
    }

    // (b) Playwright Chromium Hostile Browser Attacks
    const attackerPort = await findFreePort(port + 10);
    const attackerServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><body><h1>Attacker Server</h1></body></html>`);
    });
    await new Promise((r) => attackerServer.listen(attackerPort, '127.0.0.1', r));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Cross-origin attacks from evil.localhost
    const attacks = [
      {
        name: 'CORS token fetch',
        action: async () => {
          return await page.evaluate(async (targetPort) => {
            try {
              const res = await fetch(`http://127.0.0.1:${targetPort}/api/slightnudge/token`, { mode: 'cors' });
              const data = await res.json();
              return { status: res.status, token: data.token };
            } catch (e) {
              return { error: e.message };
            }
          }, port);
        },
      },
      {
        name: 'Cross-origin POST apply with json',
        action: async () => {
          return await page.evaluate(async (targetPort) => {
            try {
              const res = await fetch(`http://127.0.0.1:${targetPort}/api/slightnudge/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: 'dummy' }),
              });
              return { status: res.status };
            } catch (e) {
              return { error: e.message };
            }
          }, port);
        },
      },
      {
        name: 'Cross-origin POST apply with text/plain (no-preflight)',
        action: async () => {
          return await page.evaluate(async (targetPort) => {
            try {
              const res = await fetch(`http://127.0.0.1:${targetPort}/api/slightnudge/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ id: 'dummy' }),
              });
              return { status: res.status };
            } catch (e) {
              return { error: e.message };
            }
          }, port);
        },
      },
    ];

    await page.goto(`http://localhost:${attackerPort}`);
    for (const att of attacks) {
      const outcome = await att.action();
      results.browserAttacks.push({
        name: att.name,
        outcome,
        tokenLeaked: Boolean(outcome.token),
        mutationSucceeded: outcome.status === 200,
      });
    }

    await browser.close();
    attackerServer.close();

    // Kill production server
    try {
      execSync(`taskkill /pid ${serverProc.pid} /T /F`, { stdio: 'ignore' });
    } catch {}

    // (c) Re-test original bug in a directory path containing 'reorder-safety'
    console.log('Testing branch tip behavior in reorder-safety directory path...');
    const reorderCopy = createArchiveCopy('HEAD', 'p2c1c-reorder-safety-check');
    try {
      const authPath = path.join(reorderCopy.dir, 'lib/slightnudge/auth.ts');
      const authModule = await import(pathToFileURL(authPath).href);

      // Call validateMutatingRequest without SLIGHTNUDGE_TEST
      const mockReq = new Request(`http://127.0.0.1:${port}/api/slightnudge/apply`, {
        method: 'POST',
        headers: { host: `127.0.0.1:${port}` },
      });

      const prevEnv = process.env.SLIGHTNUDGE_TEST;
      delete process.env.SLIGHTNUDGE_TEST;
      const prevArgv = process.argv;
      process.argv = [...prevArgv, 'reorder-safety-trigger'];

      const valRes = authModule.validateMutatingRequest(mockReq);

      results.reorderPathAttack = {
        argvTriggerPresent: true,
        slightnudgeTestUnset: true,
        bypassed: valRes.valid === true,
        refused: valRes.valid === false,
      };

      if (prevEnv) process.env.SLIGHTNUDGE_TEST = prevEnv;
      process.argv = prevArgv;
    } finally {
      reorderCopy.cleanup();
    }

    // (d) Route Inventory
    const routesDir = path.join(copy.dir, 'app/api');
    function scanRoutes(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanRoutes(full);
        } else if (entry.isFile() && entry.name === 'route.ts') {
          const rel = path.relative(path.join(copy.dir, 'app/api'), full).replace(/\\/g, '/');
          const content = fs.readFileSync(full, 'utf8');
          const hasPost = content.includes('export async function POST');
          const hasDelete = content.includes('export async function DELETE');
          const hasPatch = content.includes('export async function PATCH');
          const isMutating = hasPost || hasDelete || hasPatch;
          const invokesValidate = content.includes('validateMutatingRequest(');
          results.routeInventory.push({
            route: `app/api/${rel}`,
            isMutating,
            invokesValidateMutatingRequest: invokesValidate,
            protected: !isMutating || invokesValidate,
          });
        }
      }
    }
    scanRoutes(routesDir);
  } finally {
    copy.cleanup();
    assertBaselineUnchanged(baselineBefore, 'Host Attacks');
  }

  const outPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step7-host-attacks.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Host attacks complete. Summary written to ${outPath}\n`);
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('host-attacks.js')) {
  runHostAttacks().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
