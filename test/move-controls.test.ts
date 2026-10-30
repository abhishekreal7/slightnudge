import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { computeNudgedClass } from '../lib/slightnudge/nudge-calculator';
import { nudgeElement } from '../lib/slightnudge/ast-nudger';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-move-controls-'));
try {
  assert.equal(computeNudgedClass({ currentClassName: 'text-lg', direction: 'left' }).newClass, '-ml-1');
  assert.equal(computeNudgedClass({ currentClassName: 'text-lg', direction: 'up' }).newClass, '-mt-1');
  assert.equal(computeNudgedClass({ currentClassName: 'text-lg', direction: 'right' }).newClass, 'ml-1');
  assert.equal(computeNudgedClass({ currentClassName: 'text-lg', direction: 'down' }).newClass, 'mt-1');
  const file = path.join(root, 'page.tsx');
  const source = (classes: string) => `export default function Page() { return <p id="target" className="${classes}">Move me</p>; }\n`;
  for (const classes of ['mx-auto text-lg', 'ml-[13px] text-lg', 'ml-2 ml-4', 'ml-2 mx-4', '!ml-2', 'ms-2']) {
    fs.writeFileSync(file, source(classes));
    const result = nudgeElement({ filePath: file, elementId: 'target', direction: 'right', dryRun: true });
    assert.equal(result.success, false, classes);
    assert.equal(fs.readFileSync(file, 'utf8'), source(classes));
  }
  fs.writeFileSync(file, source('text-lg ml-2 sm:ml-4'));
  const scoped = nudgeElement({ filePath: file, elementId: 'target', direction: 'right', breakpoint: 'sm', dryRun: true });
  assert.equal(scoped.success, true);
  assert.ok(scoped.updatedSource?.includes('text-lg ml-2 sm:ml-5'));
  assert.equal(fs.readFileSync(file, 'utf8'), source('text-lg ml-2 sm:ml-4'));
  console.log('PASS: four Move directions, negative spacing, responsive scope, and six ambiguous-margin refusals without source writes');
} finally {
  const resolved = path.resolve(root);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('sn-move-controls-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
