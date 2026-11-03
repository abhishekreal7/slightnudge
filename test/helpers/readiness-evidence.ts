import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

/** Observation only. No retries, navigation, selection or deadline changes. */
export async function observeReadiness(page: Page, root: string) {
  const folder = path.join(root, 'docs/readiness-evidence');
  fs.mkdirSync(folder, { recursive: true });
  const log = (event: unknown) => fs.appendFileSync(path.join(folder, 'events.jsonl'), JSON.stringify({ time: Date.now(), event }) + '\n');
  const pending = new Map<string, string>();
  page.on('request', request => pending.set(request.url(), request.resourceType()));
  page.on('requestfinished', request => pending.delete(request.url()));
  page.on('requestfailed', request => { pending.delete(request.url()); log({ kind: 'requestfailed', url: request.url(), failure: request.failure() }); });
  page.on('response', response => { if (response.status() >= 400) log({ kind: 'http-error', url: response.url(), status: response.status() }); });
  page.on('console', message => log({ kind: 'console', level: message.type(), text: message.text() }));
  page.on('pageerror', error => log({ kind: 'pageerror', text: error.stack || error.message }));
  await page.exposeFunction('__recordReadiness', (event: unknown) => log(event));
  await page.addInitScript(() => {
    addEventListener('message', event => {
      if (event.data?.channel === 'slightnudge') void (window as any).__recordReadiness({ kind: 'bridge-message', type: event.data.type, protocol: event.data.protocol });
    });
  });
  let sequence = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];
  page.on('framenavigated', frame => {
    if (frame !== page.mainFrame()) return;
    timers.forEach(clearTimeout); timers = [];
    if (!new URL(frame.url()).pathname.startsWith('/editor')) return;
    const id = ++sequence;
    for (const delay of [30000, 90000, 110000]) timers.push(setTimeout(async () => {
      try {
        const state = await page.evaluate(() => {
          const clone = document.body.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('script').forEach(node => node.remove());
          return { ready: !!document.querySelector('[data-source-ready="true"]'), text: document.body.innerText.slice(0, 6000), html: clone.outerHTML, frames: [...document.querySelectorAll('iframe')].map(frame => ({ src: frame.src, rect: frame.getBoundingClientRect().toJSON() })) };
        });
        log({ kind: 'snapshot', id, delay, ready: state.ready, text: state.text, frames: state.frames, pending: [...pending] });
        if (!state.ready) {
          fs.writeFileSync(path.join(folder, `${id}-${delay}.html`), state.html);
          await page.screenshot({ path: path.join(folder, `${id}-${delay}.png`), timeout: 5000 });
        }
      } catch (error) { log({ kind: 'snapshot-error', id, delay, error: String(error) }); }
    }, delay));
  });
  page.on('close', () => timers.forEach(clearTimeout));
}
