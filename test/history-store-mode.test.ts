import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openStore } from '../lib/slightnudge/history-store/store';
import { createNodeIO } from '../lib/slightnudge/history-store/io';

const entry = (id: string) => ({ id, filePath: 'sample.tsx', status: 'applied' as const, before: Buffer.from('a'), after: Buffer.from('b') });
const store = (directory: string) => openStore({ directory, validateSource: () => {} });
async function temporary(run: (root: string) => void | Promise<void>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-mode-contract-'));
  try { await run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
if (process.argv[2] === '--worker') {
  const root = process.argv[3]; const owner = process.argv[4];
  assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('sn-mode-contract-'));
  const s = store(root);
  for (let i = 0; i < 15; i++) {
    const start = Date.now();
    for (;;) {
      try { s.append(entry(owner + i)); break; }
      catch (error) {
        if ((error as { code?: string }).code !== 'STORE_BUSY' || Date.now() - start > 10000) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
      }
    }
  }
} else {
  it('activates an empty store with a marker and refuses cooperating legacy writers', () => temporary(root => {
    const s = store(root); assert.equal(s.mode(), 'legacy-only'); s.append(entry('a'));
    assert.equal(s.mode(), 'v2-active');
    assert.ok(fs.existsSync(path.join(root, 'edits.json.migrated-to-v2')));
    assert.throws(() => s.assertLegacyWritable(), /STORE_MODE/);
    assert.equal(s.getRecord('a')?.after.toString(), 'b');
  }));
  it('never steals busy or abandoned locks and checks migrating mode while locked', () => temporary(root => {
    const s = store(root); const io = createNodeIO(root);
    io.withMutationLock(() => { assert.throws(() => s.append(entry('a')), /STORE_BUSY/); });
    fs.writeFileSync(path.join(root, 'store-v2-mutation.lock'), '');
    assert.throws(() => s.append(entry('a')), /STORE_BUSY/);
    fs.unlinkSync(path.join(root, 'store-v2-mutation.lock'));
    s.append(entry('a'));
    const file = path.join(root, 'store-v2/active.json'); const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    manifest.mode = 'migrating'; fs.writeFileSync(file, JSON.stringify(manifest));
    assert.throws(() => s.append(entry('b')), /STORE_MODE/);
  }));
  it('legacy content is never activated or overwritten implicitly; corrupt metadata refuses unchanged', () => temporary(root => {
    const legacy = path.join(root, 'edits.json'); fs.writeFileSync(legacy, '[{"synthetic":true}]');
    assert.throws(() => store(root).append(entry('a')), /STORE_MODE/);
    assert.equal(fs.readFileSync(legacy, 'utf8'), '[{"synthetic":true}]');
    fs.unlinkSync(legacy); const s = store(root); s.append(entry('a'));
    const original = fs.readFileSync(path.join(root, 'store-v2/active.json'), 'utf8');
    for (const name of ['active.json', 'generations/' + JSON.parse(original).generation + '/head.json', 'generations/' + JSON.parse(original).generation + '/pages/00000000.json']) {
      const file = path.join(root, 'store-v2', name); const before = fs.readFileSync(file);
      fs.writeFileSync(file, '{bad'); assert.throws(() => s.append(entry('b')), /STORE_INDEX/);
      assert.equal(fs.readFileSync(file, 'utf8'), '{bad'); fs.writeFileSync(file, before);
    }
  }));
  it('two processes appending concurrently lose no committed records', () => temporary(async root => {
    const children = ['left', 'right'].map(owner => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), '--worker', root, owner], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
      let errors = ''; child.stderr.on('data', data => { errors += data; });
      child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error('Worker failed: ' + errors)));
    }));
    await Promise.all(children);
    const records = store(root).listPage().records;
    assert.equal(records.length, 30); assert.equal(new Set(records.map(record => record.id)).size, 30);
  }));
}
