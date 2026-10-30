import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';
import { verifyTailwindClass } from '../lib/slightnudge/tailwind-verifier';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-m1-controls-'));
const file = path.join(temp, 'page.tsx');
let passed = 0;
const source = (classes: string) => `export default function Page(){return <button id="target" className="${classes}">Continue</button>}`;
function edit(before: string, property: string, value: string, breakpoint = '') {
  fs.writeFileSync(file, before);
  const result = updateStaticTailwindClass({ filePath: file, elementId: 'target', property: property as any, value, breakpoint, dryRun: true });
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'Dry runs must never write source');
  return result;
}
try {
  for (const state of ['hover', 'focus-visible', 'active']) {
    const before = source(`font-normal ${state}:font-medium md:font-bold dark:font-black`);
    const result = edit(before, 'fontWeight', 'font-semibold', state);
    assert.equal(result.success, true);
    assert.equal(result.updatedSource, before.replace(`${state}:font-medium`, `${state}:font-semibold`)); passed++;
  }
  for (const [property, value] of [
    ['transitionProperty', 'transition-colors'], ['transitionDuration', 'duration-200'],
    ['transitionDelay', 'delay-100'], ['transitionTimingFunction', 'ease-in-out'],
  ]) {
    const before = source('font-normal hover:font-bold');
    const result = edit(before, property, value);
    assert.equal(result.success, true);
    assert.equal(result.updatedSource, source(`font-normal hover:font-bold ${value}`)); passed++;
  }
  const mixed = source('duration-100 hover:duration-300 dark:duration-500 md:duration-700');
  assert.equal(edit(mixed, 'transitionDuration', 'duration-200').updatedSource, mixed.replace('duration-100 ', 'duration-200 ')); passed++;
  const hover = source('duration-100 hover:duration-300 dark:duration-500');
  assert.equal(edit(hover, 'transitionDuration', 'duration-200', 'hover').updatedSource, hover.replace('hover:duration-300', 'hover:duration-200')); passed++;
  const duplicate = edit(source('duration-100 duration-300'), 'transitionDuration', 'duration-200');
  assert.equal(duplicate.success, false, 'Conflicting same-scope styles must refuse, not replace one and leave the other');
  assert.match(duplicate.reason!, /conflict/i); passed++;
  const arbitrary = edit(source('duration-[350ms]'), 'transitionDuration', 'duration-200');
  assert.equal(arbitrary.success, false, 'Existing arbitrary values must not be guessed or silently overwritten'); passed++;
  const conditionalSource = `declare function cn(...x:any[]):string; const enabled=true;export default function Page(){return <button id="target" className={cn('duration-100', enabled && 'duration-300')}>Continue</button>}`;
  assert.equal(edit(conditionalSource, 'transitionDuration', 'duration-200').success, false); passed++;
  assert.throws(() => edit(source('duration-100'), 'transitionDuration', 'duration-[42ms]'), /not supported/i); passed++;
  assert.throws(() => edit(source('font-normal'), 'fontWeight', 'font-bold', 'md:hover'), /not supported/i); passed++;
  const unchanged = source('duration-200  font-normal');
  assert.equal(edit(unchanged, 'transitionDuration', 'duration-200').updatedSource, unchanged, 'A no-op must preserve exact whitespace and bytes'); passed++;
  const noClasses = 'export default function Page(){return <button id="target" style={{color:"red"}}>Continue</button>}';
  assert.equal(edit(noClasses, 'transitionDuration', 'duration-200').success, false); passed++;
  const shared = 'function Shared(){return <button id="target" className="duration-100">Continue</button>} export default function Page(){return <><Shared/><Shared/></>}';
  assert.equal(edit(shared, 'transitionDuration', 'duration-200').success, false); passed++;
  console.log(`PASS: ${passed} interaction source cases (disposable files)`);
  let compiled = 0;
  for (const utility of ['transition-none', 'transition', 'transition-colors', 'transition-opacity', 'transition-transform', 'transition-all', 'duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700', 'duration-1000', 'delay-0', 'delay-75', 'delay-100', 'delay-150', 'delay-200', 'delay-300', 'delay-500', 'delay-700', 'delay-1000', 'ease-linear', 'ease-in', 'ease-out', 'ease-in-out', 'hover:font-bold', 'focus-visible:font-bold', 'active:font-bold']) {
    const verified = await verifyTailwindClass(utility, process.cwd());
    assert.equal(verified.verified, true, `Project Tailwind must compile ${utility}: ${verified.error}`); compiled++;
  }
  console.log(`PASS: ${compiled} offered Tailwind utilities compile in the installed project version`);
} finally {
  assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(temp).startsWith('sn-m1-controls-'));
  try { fs.rmSync(temp, { recursive: true, force: true }); }
  catch { console.log(`Manual cleanup: ${temp}`); }
}
