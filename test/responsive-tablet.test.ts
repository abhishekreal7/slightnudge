import assert from 'node:assert';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';

async function getFreePort(): Promise<number> {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const port = (server.address() as net.AddressInfo).port;
  await new Promise(r => server.close(r));
  return port;
}

async function runResponsiveTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING TABLET 768PX RESPONSIVE & OVERFLOW TEST');
  console.log('====================================================\n');

  const port = await getFreePort();
  const base = `http://127.0.0.1:${port}`;
  console.log(`Starting dev server on ${base}...`);

  const devProc = spawn('npx', ['next', 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    shell: true,
    stdio: 'ignore'
  });

  const cleanup = async () => {
    try {
      devProc.kill('SIGKILL');
    } catch {}
  };

  try {
    // Wait for server ready
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`${base}/`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    assert.ok(ready, 'Dev server started successfully');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 768, height: 900 }
    });
    const page = await context.newPage();

    console.log('Navigating to Home at 768x900 viewport...');
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const brand = document.querySelector('.sn-brand');
      const brandRect = brand ? brand.getBoundingClientRect() : null;
      let brandElementAtPoint = null;
      if (brandRect) {
        brandElementAtPoint = document.elementFromPoint(brandRect.left + brandRect.width / 2, brandRect.top + brandRect.height / 2)?.tagName;
      }
      return {
        innerWidth: window.innerWidth,
        scrollWidth: doc.scrollWidth,
        brandVisible: Boolean(brandRect && brandRect.width > 0),
        brandElementAtPoint,
        mobileMenuVisible: Boolean(document.querySelector('.sn-mobile-menu-button')?.getBoundingClientRect().width)
      };
    });

    console.log('Measured Metrics at 768px viewport:', metrics);

    assert.equal(metrics.innerWidth, 768, 'Viewport innerWidth must be 768px');
    assert.ok(metrics.scrollWidth <= 768, `scrollWidth (${metrics.scrollWidth}px) must not exceed 768px (no horizontal overflow)`);
    assert.ok(metrics.brandVisible, 'Brand link must be visible');
    assert.ok(metrics.mobileMenuVisible, 'Mobile/tablet menu button must be displayed at 768px');

    console.log('\n====================================================');
    console.log('🎉 ALL TABLET 768PX RESPONSIVE CHECKS PASSED (0px overflow)!');
    console.log('====================================================\n');

    await browser.close();
  } finally {
    await cleanup();
  }
}

runResponsiveTest().catch(err => {
  console.error(err);
  process.exit(1);
});
