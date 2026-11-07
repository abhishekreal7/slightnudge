import { it } from 'node:test';
import assert from 'node:assert/strict';
import { syntheticSource, syntheticHistory, summarize } from './perf/fixtures';

it('generates deterministic source sizes and realistic history records without reading developer files', () => {
  for (const lines of [20, 2000]) {
    const before = syntheticSource(lines);
    assert.equal(before.split('\n').length, lines);
    for (const count of [0, 100, 500, 2000]) {
      const records = syntheticHistory(count, before);
      assert.equal(records.length, count);
      assert.deepEqual(records, syntheticHistory(count, before));
      assert.equal(new Set(records.map(r => r.id)).size, count);
      for (const record of records) {
        assert.equal(record.filePath, 'sample.tsx');
        assert.equal(record.before, before);
        assert.ok(record.after.includes('ml-3'));
        assert.equal(record.status, 'applied');
      }
    }
  }
});

it('reports nearest-rank median and p95 without mutating samples or imposing timing gates', () => {
  const values = Array.from({ length: 20 }, (_, i) => 20 - i);
  assert.deepEqual(summarize(values), { runs: 20, median: 10, p95: 19 });
  assert.equal(values[0], 20);
  assert.throws(() => summarize([]));
});
