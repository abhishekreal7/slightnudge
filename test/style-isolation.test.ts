import assert from 'node:assert/strict';
import { updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';

const edit = (classes: string, property: 'backgroundColor' | 'textColor', value: string, breakpoint = '') => updateStaticTailwindClass({
  sourceText: `export default function Example() { return <a id="target" className="${classes}" href="#demo">Demo</a>; }`,
  filePath: 'style-isolation.tsx', elementId: 'target', property, value, breakpoint, dryRun: true,
});
const preserved = 'bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] before:[background:linear-gradient(white,black)_border-box] hover:bg-[length:100%_150%]';
const surface = edit(preserved, 'backgroundColor', 'bg-blue-600');
assert.equal(surface.success, true, surface.success ? '' : surface.reason);
if (surface.success) assert.equal(surface.newClassName, `${preserved} bg-blue-600`);
for (const current of ['text-indigo-200/65', 'text-white/50', 'text-slate-950/100']) {
  const result = edit(`${current} text-xl md:text-indigo-200/65`, 'textColor', 'text-white');
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.newClassName, 'text-white text-xl md:text-indigo-200/65');
}
for (const size of ['text-[14px]', 'text-[length:var(--title-size)]', 'text-[clamp(1rem,2vw,3rem)]']) {
  const result = edit(`${size} text-indigo-200/65`, 'textColor', 'text-white');
  assert.equal(result.success, true, result.success ? '' : result.reason);
  if (result.success) assert.equal(result.newClassName, `${size} text-white`);
}
const responsive = edit('bg-gray-900/90 md:bg-gray-800/65 md:bg-[length:100%_100%] hover:bg-white/20', 'backgroundColor', 'bg-blue-600', 'md');
assert.equal(responsive.success, true);
if (responsive.success) assert.equal(responsive.newClassName, 'bg-gray-900/90 md:bg-blue-600 md:bg-[length:100%_100%] hover:bg-white/20');
for (const property of ['backgroundColor', 'textColor'] as const) {
  const prefix = property === 'textColor' ? 'text' : 'bg';
  for (const custom of ['[color:var(--brand)]', '[var(--brand)]', '[oklch(.7_.2_260)]']) {
    const result = edit(`${prefix}-${custom}`, property, property === 'textColor' ? 'text-white' : 'bg-blue-600');
    assert.equal(result.success, false, 'Custom/ambiguous colors must retain the existing explicit safety refusal');
  }
}
assert.equal(edit('bg-gray-800 bg-white/50', 'backgroundColor', 'bg-blue-600').success, false, 'Real color conflicts must still be refused');
console.log('PASS style isolation: fill preserves gradient/image/size/position/pseudo utilities; alpha colors replace in their exact scope; arbitrary type sizes stay intact; custom colors and real conflicts remain protected');
