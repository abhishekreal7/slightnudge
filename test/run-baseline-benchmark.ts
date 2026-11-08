import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { chromium, type Page, type BrowserContext, type CDPSession } from 'playwright';

export interface BenchmarkResult {
  mode: 'dev' | 'production';
  canvas: 'sample' | 'source';
  zoom: number;
  pageComplexity: 'small' | 'heavy';
  gesture: 'resize' | 'move';
  runs: number;
  medianFrameMs: number;
  p95FrameMs: number;
  shareOver33MsPct: number;
  longtasksOver50Count: number;
  maxLongtaskMs: number;
  reactCommitsPerSec: number;
  requestsPerSec: number;
  bridgeMessagesPerSec: number;
  layoutReadsPerFrame: number;
  pointerToVisualLatencyMs: number;
  pointerUpToAcceptedMs: number;
}

export async function findFreePort(startPort = 3120): Promise<number> {
  for (let port = startPort; port < startPort + 500; port++) {
    if (port >= 3000 && port <= 3002) continue;
    const isFree = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });
    if (isFree) return port;
  }
  throw new Error('No free TCP port found');
}

export function createTempWorkspace(prefix = 'sn-perf-ws', options?: { heavy?: boolean }) {
  const id = Math.random().toString(36).substring(2, 9);
  const wsDir = path.join(os.tmpdir(), `${prefix}-${id}`);
  fs.mkdirSync(wsDir, { recursive: true });

  const projectRoot = process.cwd();
  const trackedFiles = execSync('git ls-files', { cwd: projectRoot, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);

  for (const file of trackedFiles) {
    const src = path.join(projectRoot, file);
    const dest = path.join(wsDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  // Junction node_modules
  const srcModules = path.join(projectRoot, 'node_modules');
  const destModules = path.join(wsDir, 'node_modules');
  if (fs.existsSync(srcModules)) {
    fs.symlinkSync(srcModules, destModules, 'junction');
  }

  // If heavy page requested, inject 2000 DOM nodes into fixtures/1-plain-static.tsx
  if (options?.heavy) {
    const fixturePath = path.join(wsDir, 'fixtures', '1-plain-static.tsx');
    if (fs.existsSync(fixturePath)) {
      let code = fs.readFileSync(fixturePath, 'utf8');
      const nodes = Array.from({ length: 2000 }, (_, i) => `<span key={${i}} className="inline-block p-0.5 text-[8px] text-slate-300">#${i}</span>`).join('');
      code = code.replace(
        '</main>',
        `<div className="sn-perf-heavy-container flex flex-wrap opacity-40">${nodes}</div></main>`
      );
      fs.writeFileSync(fixturePath, code, 'utf8');
    }
  }

  // Isolated data dir
  const dataDir = path.join(wsDir, '.slightnudge');
  const historyDir = path.join(dataDir, 'history');
  const pendingDir = path.join(dataDir, 'pending');
  const editsPath = path.join(historyDir, 'edits.json');

  fs.mkdirSync(historyDir, { recursive: true });
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.writeFileSync(editsPath, '[]', 'utf8');

  const cleanup = async () => {
    try {
      if (fs.existsSync(destModules)) fs.unlinkSync(destModules);
    } catch {}
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.rmSync(wsDir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  };

  return { wsDir, dataDir, editsPath, pendingDir, cleanup };
}

export async function startServer(wsDir: string, port: number, mode: 'dev' | 'production'): Promise<{ stop: () => Promise<void> }> {
  if (mode === 'production') {
    // Run next build first
    execSync('npx next build --webpack', {
      cwd: wsDir,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production' },
      stdio: 'pipe',
    });
  }

  const env = {
    ...process.env,
    PORT: String(port),
    SLIGHTNUDGE_TEST: '1',
    SLIGHTNUDGE_WORKSPACE_ROOT: wsDir,
    SLIGHTNUDGE_DATA_DIR: path.join(wsDir, '.slightnudge'),
    SLIGHTNUDGE_HISTORY_PATH: path.join(wsDir, '.slightnudge', 'history', 'edits.json'),
    SLIGHTNUDGE_PENDING_DIR: path.join(wsDir, '.slightnudge', 'pending'),
    NODE_ENV: mode === 'production' ? 'production' : 'development',
    NEXT_TELEMETRY_DISABLED: '1',
  };

  const args = mode === 'production'
    ? ['./node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)]
    : ['./node_modules/next/dist/bin/next', 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)];

  const serverProc: ChildProcess = spawn(process.execPath, args, {
    cwd: wsDir,
    env: env as NodeJS.ProcessEnv,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    try {
      if (serverProc.pid) {
        execSync(`taskkill /pid ${serverProc.pid} /T /F`, { stdio: 'ignore' });
      }
    } catch {}
    try {
      serverProc.kill('SIGTERM');
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  };

  // Wait for server ready
  const start = Date.now();
  const timeoutMs = 90000;
  let ready = false;

  while (Date.now() - start < timeoutMs) {
    if (serverProc.exitCode !== null) {
      await stop();
      throw new Error(`Test server exited prematurely with code ${serverProc.exitCode}`);
    }
    try {
      const res = await new Promise<{ status: number }>((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            path: '/api/slightnudge/token',
            method: 'GET',
            headers: {
              Host: `127.0.0.1:${port}`,
              Origin: `http://127.0.0.1:${port}`,
            },
            timeout: 2000,
          },
          (r) => resolve({ status: r.statusCode || 0 })
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('timeout'));
        });
        req.end();
      });
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }

  if (!ready) {
    await stop();
    throw new Error('Test server failed to start within timeout');
  }

  return { stop };
}

export async function setupBenchmarkContext(browser: any) {
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const probeScript = `
    (function() {
      var win = window;
      win.__bench = {
        isDragging: false,
        dragFrames: [],
        longtasks: [],
        reactCommits: 0,
        networkRequests: 0,
        bridgeMessages: 0,
        visualUpdates: [],
        lastFrameTime: performance.now()
      };

      function onFrame(now) {
        var delta = now - win.__bench.lastFrameTime;
        win.__bench.lastFrameTime = now;
        if (win.__bench.isDragging) {
          win.__bench.dragFrames.push(delta);
        }
        requestAnimationFrame(onFrame);
      }
      requestAnimationFrame(onFrame);

      try {
        new PerformanceObserver(function(list) {
          var entries = list.getEntries();
          for (var i = 0; i < entries.length; i++) {
            if (win.__bench.isDragging && entries[i].duration >= 50) {
              win.__bench.longtasks.push(entries[i].duration);
            }
          }
        }).observe({ type: 'longtask', buffered: false });
      } catch (e) {}

      var devHook = win.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!devHook) {
        devHook = {
          renderers: new Map(),
          supportsFiber: true,
          inject: function() { return 1; },
          onCommitFiberRoot: function() {}
        };
        win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = devHook;
      }
      var origCommit = devHook.onCommitFiberRoot;
      devHook.onCommitFiberRoot = function() {
        if (win.__bench.isDragging) {
          win.__bench.reactCommits++;
        }
        if (typeof origCommit === 'function') origCommit.apply(this, arguments);
      };

      var origFetch = win.fetch;
      win.fetch = async function() {
        if (win.__bench.isDragging) {
          win.__bench.networkRequests++;
        }
        return origFetch.apply(this, arguments);
      };

      win.addEventListener('message', function(event) {
        if (win.__bench.isDragging && event.data && event.data.channel === 'slightnudge') {
          win.__bench.bridgeMessages++;
        }
      });

      win.__benchStart = function() {
        win.__bench.isDragging = true;
        win.__bench.dragFrames = [];
        win.__bench.longtasks = [];
        win.__bench.reactCommits = 0;
        win.__bench.networkRequests = 0;
        win.__bench.bridgeMessages = 0;
        win.__bench.visualUpdates = [];
        win.__bench.lastFrameTime = performance.now();
      };

      win.__benchEnd = function() {
        win.__bench.isDragging = false;
        return {
          dragFrames: win.__bench.dragFrames.slice(),
          longtasks: win.__bench.longtasks.slice(),
          reactCommits: win.__bench.reactCommits,
          networkRequests: win.__bench.networkRequests,
          bridgeMessages: win.__bench.bridgeMessages
        };
      };
    })();
  `;

  await context.addInitScript({ content: probeScript });
  return context;
}

export async function runGestureBenchmark(
  page: Page,
  cdp: CDPSession,
  gesture: 'resize' | 'move',
  runs: number
): Promise<Omit<BenchmarkResult, 'mode' | 'canvas' | 'zoom' | 'pageComplexity' | 'gesture' | 'runs'>> {
  const allFrameTimes: number[] = [];
  const allLongtasks: number[] = [];
  let totalCommits = 0;
  let totalRequests = 0;
  let totalBridgeMsgs = 0;
  let totalLayoutReads = 0;
  let totalFrames = 0;
  const latencies: number[] = [];
  const acceptanceDelays: number[] = [];

  for (let r = 0; r < runs; r++) {
    // Select headline inside the preview iframe
    const target = page.frameLocator('iframe[title="Actual project"]').locator('h1').first();
    await target.waitFor({ state: 'visible', timeout: 15000 });
    await target.click({ force: true });
    await page.waitForTimeout(200);

    let handleLocator;
    if (gesture === 'resize') {
      handleLocator = page.locator('button[aria-label="Resize width from bottom right"], button[aria-label*="Resize"]').first();
    } else {
      handleLocator = page.locator('button[aria-label="Move element"]').first();
    }

    await handleLocator.waitFor({ state: 'visible', timeout: 5000 });
    const box = await handleLocator.boundingBox();
    if (!box) throw new Error(`Bounding box not found for gesture handle: ${gesture}`);

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Read CDP layout metrics before
    const metricsBefore = await cdp.send('Performance.getMetrics');
    const layoutBefore = metricsBefore.metrics.find((m) => m.name === 'LayoutCount')?.value || 0;

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Start benchmark window
    await page.evaluate(() => {
      if (typeof (window as any).__benchStart === 'function') {
        (window as any).__benchStart();
      }
    });

    // 60 Hz synthetic pointer path over 2.0 seconds (120 steps, ~16.6ms each)
    const steps = 120;
    const stepDurationMs = 2000 / steps;
    const tStart = Date.now();

    for (let s = 1; s <= steps; s++) {
      const angle = (s / steps) * Math.PI * 2;
      const offsetX = Math.sin(angle) * (gesture === 'resize' ? 120 : 80);
      const offsetY = (1 - Math.cos(angle)) * (gesture === 'resize' ? 60 : 40);

      const targetX = startX + offsetX;
      const targetY = startY + offsetY;

      const tEvent = Date.now();
      await page.mouse.move(targetX, targetY);

      if (s === 60) {
        // Measure pointer-to-visual latency at midpoint
        const tVisual = await page.evaluate(() => performance.now());
        latencies.push(Math.max(1, tVisual - tEvent));
      }

      const elapsed = Date.now() - tStart;
      const expected = s * stepDurationMs;
      const wait = Math.max(0, expected - elapsed);
      if (wait > 0) await page.waitForTimeout(wait);
    }

    // Stop benchmark window before mouseup
    const data = await page.evaluate(() => {
      if (typeof (window as any).__benchEnd === 'function') {
        return (window as any).__benchEnd();
      }
      return { dragFrames: [], longtasks: [], reactCommits: 0, networkRequests: 0, bridgeMessages: 0 };
    });

    // Measure pointerup to next interaction accepted
    const tUp = Date.now();
    await page.mouse.up();

    // Wait until editor accepts next click
    try {
      await page.frameLocator('iframe[title="Actual project"]').locator('.sn-playground-description, p').first().click({ force: true, timeout: 5000 });
    } catch {}
    const tAccepted = Date.now();
    acceptanceDelays.push(tAccepted - tUp);

    // Read CDP layout metrics after
    const metricsAfter = await cdp.send('Performance.getMetrics');
    const layoutAfter = metricsAfter.metrics.find((m) => m.name === 'LayoutCount')?.value || 0;
    const layoutDiff = Math.max(0, layoutAfter - layoutBefore);

    allFrameTimes.push(...data.dragFrames);
    allLongtasks.push(...data.longtasks);
    totalCommits += data.reactCommits;
    totalRequests += data.networkRequests;
    totalBridgeMsgs += data.bridgeMessages;
    totalLayoutReads += layoutDiff;
    totalFrames += data.dragFrames.length || steps;

    // Reset selection for next run
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }

  // Statistical calculations
  allFrameTimes.sort((a, b) => a - b);
  const medianFrameMs = allFrameTimes.length > 0 ? allFrameTimes[Math.floor(allFrameTimes.length / 2)] : 16.6;
  const p95Index = Math.min(allFrameTimes.length - 1, Math.floor(allFrameTimes.length * 0.95));
  const p95FrameMs = allFrameTimes.length > 0 ? allFrameTimes[p95Index] : 16.6;
  const framesOver33 = allFrameTimes.filter((f) => f > 33.3).length;
  const shareOver33MsPct = allFrameTimes.length > 0 ? (framesOver33 / allFrameTimes.length) * 100 : 0;

  const totalDurationSec = runs * 2.0;
  const reactCommitsPerSec = totalCommits / totalDurationSec;
  const requestsPerSec = totalRequests / totalDurationSec;
  const bridgeMessagesPerSec = totalBridgeMsgs / totalDurationSec;
  const layoutReadsPerFrame = totalFrames > 0 ? totalLayoutReads / totalFrames : 0;

  latencies.sort((a, b) => a - b);
  const medianLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 16.6;

  acceptanceDelays.sort((a, b) => a - b);
  const medianAcceptance = acceptanceDelays.length > 0 ? acceptanceDelays[Math.floor(acceptanceDelays.length / 2)] : 50;

  return {
    medianFrameMs: Math.round(medianFrameMs * 10) / 10,
    p95FrameMs: Math.round(p95FrameMs * 10) / 10,
    shareOver33MsPct: Math.round(shareOver33MsPct * 10) / 10,
    longtasksOver50Count: allLongtasks.length,
    maxLongtaskMs: allLongtasks.length > 0 ? Math.round(Math.max(...allLongtasks)) : 0,
    reactCommitsPerSec: Math.round(reactCommitsPerSec * 10) / 10,
    requestsPerSec: Math.round(requestsPerSec * 10) / 10,
    bridgeMessagesPerSec: Math.round(bridgeMessagesPerSec * 10) / 10,
    layoutReadsPerFrame: Math.round(layoutReadsPerFrame * 100) / 100,
    pointerToVisualLatencyMs: Math.round(medianLatency * 10) / 10,
    pointerUpToAcceptedMs: Math.round(medianAcceptance * 10) / 10,
  };
}
