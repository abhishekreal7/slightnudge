import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, type Browser, type Page } from 'playwright';
import { startTestServer, type TestServer } from './helpers/test-server';
import { overlayScreenshot } from './helpers/overlay-screenshots';

type Surface = 'studio' | 'source';
let server: TestServer;
let browser: Browser;
before(async () => {
  server = await startTestServer();
  for (const route of ['/studio', '/fixtures/1']) {
    const response = await fetch(server.baseUrl + route);
    assert.equal(response.status, 200);
    await response.text();
  }
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  await server?.stop();
});

const settle = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const heading = (page: Page, surface: Surface) => surface === 'source' ? page.locator('#target') : page.getByRole('heading', { name: 'Make room for your best work.', exact: true });
const target = (page: Page, surface: Surface) => surface === 'source' ? heading(page, surface) : heading(page, surface).locator('..');
const toolbar = (page: Page, surface: Surface) => surface === 'source' ? page.locator('.sn-canvas-hud') : page.getByTitle('Edit text directly on canvas').locator('../..');
const mover = (page: Page, surface: Surface) => surface === 'source' ? page.locator('.sn-drag-move-bar') : page.getByTitle('Drag to reorder element (iOS style)');
const resizer = (page: Page, surface: Surface) => surface === 'source' ? page.locator('.sn-corner-slider') : page.getByTitle('Drag side to resize width').last();
const line = (page: Page) => page.locator('[data-testid="editor-drop-indicator"], .sn-drop-line, div[class*="h-1 bg-gradient-to-r from-emerald-400"]').first();

async function open(surface: Surface) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  page.setDefaultTimeout(5000);
  await page.route('**/*', (route) => new URL(route.request().url()).origin === server.baseUrl ? route.continue() : route.abort());
  await page.goto(server.baseUrl + (surface === 'source' ? '/fixtures/1' : '/studio'), { waitUntil: 'domcontentloaded' });
  await heading(page, surface).waitFor({ state: 'visible' });
  await page.waitForFunction((el) => el && Object.keys(el).some((key) => key.startsWith('__reactFiber$')), await heading(page, surface).elementHandle());
  await page.addStyleTag({ content: '* { font-family: Arial, sans-serif !important; animation: none !important; transition: none !important; }' });
  await settle(page);
  return page;
}

async function select(page: Page, surface: Surface) {
  const inspected = surface === 'source' ? page.waitForResponse((response) => response.url().includes('/api/slightnudge/inspect') && response.request().method() === 'POST') : null;
  await heading(page, surface).click();
  if (inspected) await (await inspected).json();
  await toolbar(page, surface).waitFor({ state: 'visible' });
  await settle(page);
}

async function drag(page: Page, surface: Surface) {
  const box = await mover(page, surface).boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 105, { steps: 8 });
  await settle(page);
}

async function noOverlays(page: Page, surface: Surface) {
  await settle(page);
  assert.equal(await toolbar(page, surface).isVisible(), false, 'Toolbar must disappear after a gesture');
  assert.equal(await page.locator('[data-editor-overlay]:visible').count(), 0, 'Gesture completion must leave no transient overlays');
  assert.equal(await page.locator('.sn-drop-line').count(), 0);
  assert.equal(await target(page, surface).evaluate((el) => Number(getComputedStyle(el).opacity)), 1, 'The element must stop being ghosted');
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

for (const surface of ['studio', 'source'] as const) {
  describe(surface + ' overlay contract', () => {
    it('places above, flips below, clamps at both horizontal edges and never covers the target', async () => {
      const page = await open(surface);
      try {
        await select(page, surface);
        for (const [top, left, placement] of [[300, 260, 'above'], [4, 260, 'below'], [300, 0, 'above'], [300, 1340, 'above']] as const) {
          await target(page, surface).evaluate((el, position) => Object.assign((el as HTMLElement).style, { position: 'fixed', top: position.top + 'px', left: position.left + 'px', width: '100px', margin: '0', zIndex: '45' }), { top, left });
          await page.evaluate(() => window.dispatchEvent(new Event('resize')));
          await settle(page);
          assert.equal(await page.locator('[data-editor-state]').count(), 1, 'Surface must expose its current overlay state');
          const selected = await target(page, surface).boundingBox();
          const hud = await toolbar(page, surface).boundingBox();
          assert.ok(selected && hud);
          assert.equal(intersects(selected, hud), false, 'Toolbar must not cover the selected element');
          assert.ok(hud.x >= 8 && hud.x + hud.width <= 1432, 'Toolbar must remain within viewport margins');
          assert.ok(hud.y >= 8 && hud.y + hud.height <= 992);
          assert.ok(placement === 'above' ? hud.y + hud.height <= selected.y : hud.y >= selected.y + selected.height, 'Toolbar must prefer above and flip below');
        }
      } finally { await page.close(); }
    });

    it('shows only a 2px undecorated parent-width destination and a ghosted target during drag', async () => {
      const page = await open(surface);
      try {
        await select(page, surface);
        const parent = await target(page, surface).locator('..').boundingBox();
        assert.ok(parent);
        await drag(page, surface);
        assert.equal(await toolbar(page, surface).isVisible(), false, 'Toolbar must hide during dragging');
        assert.deepEqual(await page.locator('[data-editor-overlay]:visible').evaluateAll((elements) => elements.map((el) => el.getAttribute('data-editor-overlay')).sort()), ['destination', 'outline']);
        const destination = await line(page).boundingBox();
        assert.ok(destination);
        assert.equal(destination.height, 2, 'Destination line must be exactly 2 CSS pixels');
        assert.ok(Math.abs(destination.x - parent.x) <= 1 && Math.abs(destination.width - parent.width) <= 1, 'Destination must span the parent');
        const decorations = await line(page).evaluate((el) => ({ children: el.childElementCount, text: el.textContent, shadow: getComputedStyle(el).boxShadow, before: getComputedStyle(el, '::before').content, after: getComputedStyle(el, '::after').content }));
        assert.equal(decorations.children, 0);
        assert.equal(decorations.text, '');
        assert.equal(decorations.shadow, 'none');
        assert.ok(['none', 'normal'].includes(decorations.before) && ['none', 'normal'].includes(decorations.after), 'Line must have no pseudo-element dots');
        assert.ok(await target(page, surface).evaluate((el) => Number(getComputedStyle(el).opacity) <= 0.3));
        assert.equal(await page.locator('.sn-drag-ghost-chip, .sn-move-feedback-badge:visible, .sn-resize-badge:visible').count(), 0);
        await page.mouse.up();
        await noOverlays(page, surface);
      } finally { await page.close(); }
    });

    it('cleans successful, refused and cancelled drops, Escape, pointercancel and blur', async () => {
      for (const finish of ['drop', 'failure', 'escape', 'pointercancel', 'blur'] as const) {
        const page = await open(surface);
        try {
          let previews = 0;
          page.on('request', (request) => { if (request.method() === 'POST' && request.url().includes('/api/slightnudge/preview')) previews++; });
          if (finish === 'failure') await page.route('**/api/slightnudge/preview', (route) => route.fulfill({ status: 422, json: { error: 'This element cannot move here.' } }));
          await select(page, surface);
          await drag(page, surface);
          if (finish === 'escape') await page.keyboard.press('Escape');
          else if (finish === 'pointercancel' || finish === 'blur') await page.evaluate((event) => window.dispatchEvent(new Event(event)), finish);
          else {
            const response = page.waitForResponse((res) => res.url().includes('/api/slightnudge/preview') && res.request().method() === 'POST');
            await page.mouse.up();
            const result = await response;
            assert.equal(result.status(), finish === 'drop' ? 200 : 422);
            if (finish === 'drop') assert.equal((await result.json()).success, true, 'A successful drop must prepare a real preview');
          }
          await page.mouse.up();
          await noOverlays(page, surface);
          if (['escape', 'pointercancel', 'blur'].includes(finish)) assert.equal(previews, 0, 'A cancelled gesture must not request a preview');
        } finally { await page.close(); }
      }
    });

    it('hides the toolbar throughout resize and scrolling', async () => {
      const page = await open(surface);
      try {
        await select(page, surface);
        const handle = await resizer(page, surface).boundingBox();
        assert.ok(handle);
        await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
        await page.mouse.down();
        await settle(page);
        assert.equal(await toolbar(page, surface).isVisible(), false, 'Toolbar must hide while resizing');
        await page.keyboard.press('Escape');
        await page.mouse.up();
        await noOverlays(page, surface);
        await select(page, surface);
        await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
        assert.equal(await toolbar(page, surface).isVisible(), false, 'Toolbar must hide while scrolling');
        await toolbar(page, surface).waitFor({ state: 'visible' });
      } finally { await page.close(); }
    });

    it('matches deliberate screenshots for all nine overlay states', async () => {
      for (const state of ['Idle', 'Hover', 'Selected', 'TextEditing', 'Dragging', 'Resizing', 'Previewing', 'Applying', 'Error']) {
        const page = await open(surface);
        let release = () => {};
        try {
          const box = await target(page, surface).boundingBox();
          assert.ok(box);
          const clip = { x: Math.max(0, Math.min(720, box.x + box.width / 2 - 360)), y: Math.max(0, Math.min(560, box.y - 100)), width: 720, height: 440 };
          if (state === 'Hover') await heading(page, surface).hover();
          else if (state !== 'Idle') await select(page, surface);
          if (state === 'TextEditing') await heading(page, surface).dblclick();
          if (state === 'Dragging') await drag(page, surface);
          if (state === 'Resizing') {
            const handle = await resizer(page, surface).boundingBox();
            assert.ok(handle);
            await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
            await page.mouse.down();
          }
          if (['Previewing', 'Applying', 'Error'].includes(state)) {
            if (state === 'Error') await page.route('**/api/slightnudge/preview', (route) => route.fulfill({ status: 422, json: { error: 'This change could not be prepared.' } }));
            const response = page.waitForResponse((res) => res.url().includes('/api/slightnudge/preview') && res.request().method() === 'POST');
            await page.keyboard.press('ArrowRight');
            await response;
            if (state === 'Applying') {
              const wait = new Promise<void>((resolve) => { release = resolve; });
              await page.route('**/api/slightnudge/apply', async (route) => { await wait; await route.fulfill({ status: 200, json: { success: true } }); });
              await page.getByRole('button', { name: /^Apply to (Source|code)$/ }).first().click();
            }
          }
          await settle(page);
          assert.equal(await page.locator('[data-editor-state]').first().getAttribute('data-editor-state'), state);
          await overlayScreenshot(page, surface + '-' + state.toLowerCase(), clip);
        } finally { release(); await page.mouse.up().catch(() => {}); await page.close(); }
      }
    });
  });
}
