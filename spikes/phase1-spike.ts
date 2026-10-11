import dotenv from 'dotenv';
dotenv.config();

import { createBenchmarkServer } from '../demo-app/server';
import { getBrowserProvider, BrowserSession } from '../lib/browser';
import fs from 'fs';
import path from 'path';

interface SpikeReport {
  timestamp: string;
  provider: string;
  desktop: {
    sessionId: string;
    durationMs: number;
    videoUrl?: string;
    consoleErrors: Array<{ type: string; text: string }>;
    networkFailures: Array<{ url: string; status?: number; error?: string }>;
    screenshots: string[];
    cost: {
      creditsUsed: number;
      estimatedCostUsd: number;
    };
  };
  mobile: {
    sessionId: string;
    durationMs: number;
    overflowDetected: boolean;
    scrollWidth: number;
    viewportWidth: number;
    screenshots: string[];
    cost: {
      creditsUsed: number;
      estimatedCostUsd: number;
    };
  };
  totalEstimatedCostUsd: number;
  apiObservations: string[];
}

export async function runPhase1Spike(): Promise<SpikeReport> {
  console.log('====================================================');
  console.log('🚀 RUNNING SHIPCHECK PHASE 1 SPIKE');
  console.log('====================================================');

  const screenshotsDir = path.resolve(process.cwd(), 'recordings', 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  // Step 1: Start sample benchmark app
  const PORT = 3100;
  const server = await createBenchmarkServer(PORT);
  const targetUrl = `http://localhost:${PORT}`;
  console.log(`[1] Benchmark test app running at ${targetUrl}`);

  const provider = getBrowserProvider();
  console.log(`[2] Using browser provider: ${provider.name}`);

  // Track findings
  const report: SpikeReport = {
    timestamp: new Date().toISOString(),
    provider: provider.name,
    desktop: {
      sessionId: '',
      durationMs: 0,
      consoleErrors: [],
      networkFailures: [],
      screenshots: [],
      cost: { creditsUsed: 0, estimatedCostUsd: 0 },
    },
    mobile: {
      sessionId: '',
      durationMs: 0,
      overflowDetected: false,
      scrollWidth: 0,
      viewportWidth: 0,
      screenshots: [],
      cost: { creditsUsed: 0, estimatedCostUsd: 0 },
    },
    totalEstimatedCostUsd: 0,
    apiObservations: [],
  };

  // =========================================================================
  // PASS 1: DESKTOP VIEWPORT
  // =========================================================================
  console.log('\n--- PASS 1: DESKTOP VIEWPORT (1280x800) ---');
  let desktopSession: BrowserSession | null = null;
  const desktopStart = Date.now();

  try {
    desktopSession = await provider.createSession({
      viewport: 'desktop',
      enableVideo: true,
      enableWebRecording: true,
    });
    report.desktop.sessionId = desktopSession.id;
    console.log(`Created Desktop Session ID: ${desktopSession.id}`);

    const { browser, context, page } = await provider.connectPlaywright(desktopSession);

    // Setup evidence listeners
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        console.log(`  [Console Error Captured]: ${text}`);
        report.desktop.consoleErrors.push({ type: 'error', text });
      }
    });

    page.on('response', (response: any) => {
      if (response.status() >= 400) {
        console.log(`  [Network Failure HTTP ${response.status()}]: ${response.url()}`);
        report.desktop.networkFailures.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    page.on('requestfailed', (request: any) => {
      console.log(`  [Request Failed]: ${request.url()} - ${request.failure()?.errorText}`);
      report.desktop.networkFailures.push({
        url: request.url(),
        error: request.failure()?.errorText || 'Unknown failure',
      });
    });

    // 1. Navigate to target
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Initial screenshot
    const shot1 = path.join(screenshotsDir, `desktop-initial-${Date.now()}.png`);
    await page.screenshot({ path: shot1 });
    report.desktop.screenshots.push(shot1);

    // 2. Trigger 500 error by clicking checkout button
    await page.click('#btn-checkout');
    await page.waitForTimeout(500);

    const shot2 = path.join(screenshotsDir, `desktop-after-checkout-error-${Date.now()}.png`);
    await page.screenshot({ path: shot2 });
    report.desktop.screenshots.push(shot2);

    // 3. Test broken signup validation
    await page.fill('#email', 'invalid-email-string');
    await page.fill('#password', 'secret123');
    await page.click('#submit-signup');
    await page.waitForTimeout(300);

    const shot3 = path.join(screenshotsDir, `desktop-after-signup-${Date.now()}.png`);
    await page.screenshot({ path: shot3 });
    report.desktop.screenshots.push(shot3);

    // 4. Run exploratory agent task
    console.log('Running exploratory agent task...');
    const agentResult = await provider.runAgentTask(
      desktopSession.id,
      'Explore the page, verify forms and check navigation'
    );
    console.log(`Agent task completed: success=${agentResult.success}, steps=${agentResult.steps.length}`);

    // Cost & Recording
    const cost = await provider.getSessionCost(desktopSession.id);
    report.desktop.cost = {
      creditsUsed: cost.creditsUsed,
      estimatedCostUsd: cost.estimatedCostUsd,
    };

    const recordings = await provider.getRecordingUrl(desktopSession.id);
    report.desktop.videoUrl = recordings.videoUrl || 'Pending rendering or stored locally';

    report.desktop.durationMs = Date.now() - desktopStart;
  } catch (err: any) {
    console.error('Desktop pass encountered error:', err.message);
    throw err;
  } finally {
    if (desktopSession) {
      console.log(`Stopping Desktop Session ${desktopSession.id}...`);
      await provider.stopSession(desktopSession.id);
    }
  }

  // =========================================================================
  // PASS 2: MOBILE VIEWPORT (390x844)
  // =========================================================================
  console.log('\n--- PASS 2: MOBILE VIEWPORT (390x844 iPhone) ---');
  let mobileSession: BrowserSession | null = null;
  const mobileStart = Date.now();

  try {
    mobileSession = await provider.createSession({
      viewport: 'mobile',
      enableVideo: false,
    });
    report.mobile.sessionId = mobileSession.id;
    console.log(`Created Mobile Session ID: ${mobileSession.id}`);

    const { page } = await provider.connectPlaywright(mobileSession);

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Check for mobile layout overflow
    const vpSize = page.viewportSize() || { width: 390, height: 844 };
    const layoutMetrics = await page.evaluate((expectedWidth: number) => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: expectedWidth,
        overflow: document.documentElement.scrollWidth > expectedWidth,
      };
    }, vpSize.width);

    report.mobile.scrollWidth = layoutMetrics.scrollWidth;
    report.mobile.viewportWidth = layoutMetrics.viewportWidth;
    report.mobile.overflowDetected = layoutMetrics.overflow;

    console.log(
      `  [Mobile Layout Check]: scrollWidth=${layoutMetrics.scrollWidth}px, viewportWidth=${layoutMetrics.viewportWidth}px`
    );
    console.log(`  [Overflow Detected]: ${report.mobile.overflowDetected}`);

    const shotMobile = path.join(screenshotsDir, `mobile-overflow-${Date.now()}.png`);
    await page.screenshot({ path: shotMobile });
    report.mobile.screenshots.push(shotMobile);

    const cost = await provider.getSessionCost(mobileSession.id);
    report.mobile.cost = {
      creditsUsed: cost.creditsUsed,
      estimatedCostUsd: cost.estimatedCostUsd,
    };
    report.mobile.durationMs = Date.now() - mobileStart;
  } catch (err: any) {
    console.error('Mobile pass encountered error:', err.message);
    throw err;
  } finally {
    if (mobileSession) {
      console.log(`Stopping Mobile Session ${mobileSession.id}...`);
      await provider.stopSession(mobileSession.id);
    }
  }

  // Teardown server
  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log('\nBenchmark server stopped.');

  report.totalEstimatedCostUsd = parseFloat(
    (report.desktop.cost.estimatedCostUsd + report.mobile.cost.estimatedCostUsd).toFixed(4)
  );

  report.apiObservations = [
    'Playwright connects via CDP (connectOverCDP) directly to cloud/local browser wsEndpoint.',
    'Console errors and HTTP 4xx/5xx network failures can be intercepted deterministically via page.on("console") and page.on("response").',
    'Session recordings require polling for cloud render completion after session stop, or local mp4/webm stream.',
    'Sessions must be guaranteed closed in finally blocks to prevent orphaned cloud meter costs.',
    'Mobile emulation requires setting both viewport dimensions and userAgent / touch attributes.',
  ];

  console.log('\n====================================================');
  console.log('📊 PHASE 1 SPIKE RESULTS');
  console.log('====================================================');
  console.log(`Provider: ${report.provider}`);
  console.log(`Console Errors Caught: ${report.desktop.consoleErrors.length}`);
  console.log(`Network Failures Caught: ${report.desktop.networkFailures.length}`);
  console.log(`Mobile Overflow Detected: ${report.mobile.overflowDetected}`);
  console.log(`Total Run Duration: ${(report.desktop.durationMs + report.mobile.durationMs) / 1000}s`);
  console.log(`Estimated Cost: $${report.totalEstimatedCostUsd}`);
  console.log('====================================================\n');

  return report;
}

if (process.argv[1] && process.argv[1].includes('phase1-spike')) {
  runPhase1Spike()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Spike failed:', err);
      process.exit(1);
    });
}
