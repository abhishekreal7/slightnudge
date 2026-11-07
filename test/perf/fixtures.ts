import assert from 'node:assert/strict';
import type { EditRecord } from '../../lib/slightnudge/edit-history';

// Shape comes from EditRecord, never from developer history contents.
export function syntheticSource(lines: number): string {
  assert.ok(Number.isInteger(lines) && lines >= 3 && lines <= 10000);
  return ['export default function Sample() {', 'return <div><h1 id="target" className="ml-2.5 text-xl font-bold p-4">Sample</h1>',
    ...Array.from({ length: lines - 3 }, (_, index) => `<p data-row="${index}" className="p-2 text-sm">Synthetic paragraph ${index}</p>`),
    '</div>; }'].join('\n');
}
export function syntheticHistory(count: number, before: string): EditRecord[] {
  assert.ok(Number.isInteger(count) && count >= 0 && count <= 2000);
  const after = before.replace('ml-2.5', 'ml-3');
  return Array.from({ length: count }, (_, index) => ({
    id: `synthetic-${index}`, filePath: 'sample.tsx', createdAt: '2026-01-01T00:00:00.000Z',
    summary: 'Synthetic spacing adjustment', before, after,
    status: 'applied', previewType: 'className', line: 2, tagName: 'h1', elementId: 'target',
    oldClassName: 'ml-2.5 text-xl font-bold p-4', newClassName: 'ml-3 text-xl font-bold p-4',
    removedTokens: ['ml-2.5'], addedTokens: ['ml-3'],
  }));
}
export function summarize(samples: number[]) {
  assert.ok(samples.length > 0 && samples.every(value => Number.isFinite(value) && value >= 0));
  const sorted = [...samples].sort((a, b) => a - b);
  return { runs: sorted.length, median: sorted[Math.ceil(sorted.length * 0.5) - 1], p95: sorted[Math.ceil(sorted.length * 0.95) - 1] };
}
