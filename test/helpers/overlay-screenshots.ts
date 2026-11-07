import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

const require = createRequire(import.meta.url);
const core = require(path.join(path.dirname(require.resolve('playwright-core/package.json')), 'lib/coreBundle.js'));
const compare = core.utils.getComparator('image/png');

export async function overlayScreenshot(page: Page, name: string, clip: { x: number; y: number; width: number; height: number }) {
  const actual = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
  if (process.env.SLIGHTNUDGE_UPDATE_BASELINES === '1') {
    const output = path.resolve('docs/editor/evidence/overlay-baseline-candidates');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, name + '.png'), actual);
    return;
  }
  const baseline = path.resolve('test/visual-baselines', name + '.png');
  assert.ok(fs.existsSync(baseline), `Missing deliberate baseline ${name}`);
  const mismatch = compare(actual, fs.readFileSync(baseline), { comparator: 'pixelmatch', threshold: 0.15, maxDiffPixelRatio: 0.002 });
  if (mismatch) {
    const output = path.resolve('docs/editor/evidence/overlay-visual-diffs');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, name + '-actual.png'), actual);
    if (mismatch.diff) fs.writeFileSync(path.join(output, name + '-diff.png'), mismatch.diff);
  }
  assert.equal(mismatch, null, mismatch?.errorMessage || `Visual mismatch for ${name}`);
}
