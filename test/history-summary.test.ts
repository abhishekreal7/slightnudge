import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { summarizeHistory } from '../lib/slightnudge/history-summary';
import type { EditRecord } from '../lib/slightnudge/edit-history';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-history-summary-'));
const original = { test: process.env.SLIGHTNUDGE_TEST, workspace: process.env.SLIGHTNUDGE_WORKSPACE_ROOT, data: process.env.SLIGHTNUDGE_DATA_DIR };
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = temp; process.env.SLIGHTNUDGE_DATA_DIR = path.join(temp, '.slightnudge');
const root = path.join(temp, '.slightnudge/repositories/alpha');
const record = (fields: Partial<EditRecord> = {}): EditRecord => ({ id: randomUUID(), repositoryId: 'alpha', filePath: '.slightnudge/repositories/alpha/components/Hero.tsx', createdAt: '2026-10-27T10:00:00.000Z', summary: 'Update heading', before: 'PRIVATE SOURCE BEFORE', after: 'PRIVATE SOURCE AFTER', status: 'applied', ...fields });
try {
  const receipt = record();
  const entries = summarizeHistory([receipt, record({ repositoryId: 'beta' }), record({ filePath: '../outside.tsx' }), record({ filePath: '.slightnudge/repositories/beta/Other.tsx' })], root, 'alpha');
  assert.equal(entries.length, 1, 'Project IDs and source paths must both match the requested scope');
  assert.deepEqual(entries[0].files, ['components/Hero.tsx']);
  assert.equal(entries[0].state, 'saved');
  assert.ok(!JSON.stringify(entries).includes('PRIVATE SOURCE'));
  assert.equal(summarizeHistory([record({ status: 'undone' })], root, 'alpha')[0].state, 'undone');
  assert.equal(summarizeHistory([record({ status: 'undoing' })], root, 'alpha')[0].state, 'attention');
  assert.equal(summarizeHistory([record({ missing: true })], root, 'alpha')[0].state, 'attention');
  const changeSetId = randomUUID();
  const group = summarizeHistory([record({ changeSetId }), record({ changeSetId, filePath: '.slightnudge/repositories/alpha/components/Features.tsx' })], root, 'alpha');
  assert.equal(group.length, 1); assert.equal(group[0].files.length, 2);
  assert.equal(group[0].state, 'attention', 'Missing grouped recovery metadata must not appear confirmed');
  assert.equal(summarizeHistory([record({ repositoryId: undefined }), record({ repositoryId: undefined, filePath: 'fixtures/page.tsx' })], temp).length, 1, 'Local history excludes managed imported project storage');
  const many = Array.from({ length: 70 }, (_, index) => record({ createdAt: new Date(Date.UTC(2026, 9, 27, 10, index)).toISOString() }));
  const limited = summarizeHistory(many, root, 'alpha');
  assert.equal(limited.length, 50); assert.equal(limited[0].createdAt, many[69].createdAt);
  assert.equal(summarizeHistory([record({ summary: '<script>alert(1)</script>' })], root, 'alpha')[0].summary, '<script>alert(1)</script>', 'Summary stays plain text for React escaping');
  console.log('PASS history summary: project/path isolation, no source snapshots, saved/undone/recovery states, missing group metadata, grouped file list and bounded recent receipts.');
} finally {
  for (const [key, value] of Object.entries({ SLIGHTNUDGE_TEST: original.test, SLIGHTNUDGE_WORKSPACE_ROOT: original.workspace, SLIGHTNUDGE_DATA_DIR: original.data })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
  fs.rmSync(temp, { recursive: true, force: true });
}
