import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkEditorErgonomics(page: Page, baseURL: string, workspace: string) {
  page.setDefaultTimeout(45000);
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const fixture = `'use client';export default function Page(){return <main className="min-h-screen bg-white p-10"><header className="mb-12 flex items-center justify-between"><a href="#details" className="font-semibold text-emerald-800">Northstar</a><nav className="flex gap-5"><a href="#details">Overview</a><a href="#contact">Contact</a></nav></header><section id="details" className="grid grid-cols-2 items-center gap-10"><div className="flex flex-col gap-5"><p className="text-sm text-emerald-700">A little room to create</p><h1 className="text-4xl font-semibold tracking-tight text-slate-900">Make something meaningful.</h1><p className="text-base leading-relaxed text-slate-500">A thoughtful workspace for ideas, people, and the details that make good work feel effortless.</p><button className="w-fit rounded-lg bg-emerald-800 px-5 py-3 text-white">Open settings</button></div><div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-8"><svg viewBox="0 0 100 100" aria-label="Preview illustration" className="h-24 w-24 text-emerald-600"><rect x="10" y="10" width="80" height="80" rx="18" fill="currentColor"/></svg><p className="self-center text-sm text-slate-500">Designed with care.</p></div></section><form id="contact" className="mt-12 flex gap-3"><input aria-label="Your email" placeholder="Your email" className="rounded-lg border p-3"/><button className="rounded-lg border px-4">Join the list</button></form><footer className="mt-12 text-sm text-slate-400">Made for your next idea.</footer></main>}`;
  fs.writeFileSync(file, fixture);
  try {
    await page.goto(baseURL + '/studio', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
    const layers = page.getByRole('navigation', { name: 'Source layers', exact: true });
    const search = page.getByRole('searchbox', { name: 'Search layers', exact: true });
    await layers.locator('[data-layer-tag="h1"]').waitFor();
    for (const [tag, kind] of [['main','frame'], ['h1','text'], ['button','action'], ['a','action'], ['input','field'], ['svg','media']]) {
      assert.equal(await layers.locator('[data-layer-tag="'+tag+'"]').first().getAttribute('data-layer-kind'), kind);
    }
    assert.ok(await layers.locator('[data-layer-kind="layout"]').count());
    await layers.getByRole('button', { name: 'Collapse Page', exact: true }).click();
    assert.equal(await layers.locator('[data-layer-tag="h1"]').count(), 0);
    await search.fill('Open settings');
    await layers.getByRole('button', { name: 'Open settings', exact: true }).click();
    await page.getByRole('toolbar', { name: 'Selection formatting', exact: true }).waitFor();
    assert.equal(await layers.locator('[data-selected="true"]').getAttribute('data-layer-tag'), 'button');
    assert.equal(await layers.locator('[data-layer-tag="main"]').count(), 1, 'Search preserves parent context');
    await search.fill('no-such-layer'); await page.getByText('No matching layers.', { exact: true }).waitFor();
    await search.press('Escape'); assert.equal(await search.inputValue(), '');
    assert.equal(await layers.locator('[data-selected="true"]').getAttribute('data-layer-tag'), 'button', 'Search Escape keeps selection');
    await search.fill('Open settings'); await page.frameLocator('iframe').locator('h1').click();
    await page.waitForFunction(() => (document.querySelector('[aria-label="Search layers"]') as HTMLInputElement)?.value === '');
    assert.equal(await layers.locator('[data-selected="true"]').getAttribute('data-layer-tag'), 'h1');
    const divider = page.getByRole('separator', { name: 'Resize design panel', exact: true });
    await divider.focus(); await divider.press('ArrowLeft'); await divider.press('Home');
    assert.ok(await page.getByRole('button', { name: 'Save changes', exact: true }).isDisabled(), 'Panel resizing must not nudge source elements');
    for (const hostWidth of [1600,1280,1024,760,390]) {
      await page.setViewportSize({ width: hostWidth, height: 1000 });
      for (const focus of [false,true]) {
        if (focus) await page.getByRole('button', { name: 'Focus canvas', exact: true }).click();
        const dock = page.getByRole('region', { name: 'Canvas controls', exact: true });
        const d = await dock.boundingBox(), c = await page.locator('[data-editor-canvas]').boundingBox();
        assert.ok(d && c); assert.ok(d.x >= c.x + 10 && d.x+d.width <= c.x+c.width-10);
        assert.ok(d.y+d.height <= 988); assert.ok(d.y >= c.y+c.height);
        assert.ok(Math.abs(d.x+d.width/2-c.x-c.width/2)<2);
        // Trial clicks verify that no neighboring control covers a target.
        await page.getByRole('spinbutton', { name: 'Preview width', exact: true }).click({ trial: true });
        if (focus) {
          assert.ok(await dock.getByRole('button', { name: 'Save changes', exact: true }).isVisible());
          await page.getByRole('button', { name: 'Restore sidebars', exact: true }).click();
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(process.cwd(), 'docs/editor-ergonomics-selected.png') });
    assert.equal(fs.readFileSync(file, 'utf8'), fixture);
    console.log('PASS editor ergonomics: semantic icons, layout groups, search with ancestor context, selection sync, collapse recovery, Escape, non-mutating keyboard resize, detached dock without overlap at 390/760/1024/1280/1600 and in focus mode');
  } finally { fs.writeFileSync(file, original); }
}
