import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { snapshot, assertUnchanged } from './real-state';

const [label, suite, ...overlays] = process.argv.slice(2);
assert.match(label, /^[a-z0-9-]+$/); assert.match(suite, /^[a-z0-9.-]+$/); assert.ok(!suite.includes('..'));
const root = process.cwd(), main = path.resolve(root, '../..'), evidence = path.join(root, 'docs/editor/evidence');
fs.mkdirSync(evidence, { recursive: true });
const logFile = path.join(evidence, label + '.txt'); fs.writeFileSync(logFile, '', { flag: 'wx' });
const log = (value: string) => { process.stdout.write(value); fs.appendFileSync(logFile, value); };
const before = [snapshot(root), snapshot(main)]; fs.writeFileSync(path.join(evidence, label + '-before.json'), JSON.stringify(before));
const gate = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-perf-' + suite + '-')), source = path.join(gate, 'source'), temporary = path.join(gate, 'temp'), artifacts = path.join(gate, 'artifacts');
let code = 1;
const git = (...args: string[]) => execFileSync('git', args, { cwd: source, encoding: 'utf8' }).trim();
try {
  fs.mkdirSync(temporary); fs.mkdirSync(artifacts);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  log(JSON.stringify({ temporaryRoot: gate, head, suite, overlays }) + '\n');
  execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', '--', root, source]);
  const archive = path.join(gate, 'head.tar'); execFileSync('git', ['archive', '--format=tar', '--output=' + archive, head, '--', '.', ':(exclude).env*', ':(glob,exclude)**/.env*'], { cwd: root });
  execFileSync('tar.exe', ['-xf', archive, '-C', source]); git('config', 'core.autocrlf', 'true'); git('read-tree', 'HEAD'); git('update-index', '--force-remove', '--', '.env.example');
  for (const file of overlays) { assert.ok(!path.isAbsolute(file) && !file.includes('..') && file !== 'next-env.d.ts' && !file.includes('.env')); fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true }); fs.copyFileSync(path.join(root, file), path.join(source, file)); git('add', '--', file); }
  assert.ok(!git('diff', '--cached', '--name-only').split(/\r?\n/).includes('next-env.d.ts'));
  git('-c', 'user.name=Perf isolation', '-c', 'user.email=perf@example.invalid', '-c', 'core.hooksPath=NUL', 'commit', '--quiet', '-m', 'test: seed owned disposable measurement source');
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(source, 'node_modules'), 'junction');
  const args = suite === 'typecheck' ? ['./node_modules/typescript/bin/tsc', '--noEmit'] : ['--import', 'tsx', 'test/' + suite + (suite === 'editor-lag.browser' ? '.ts' : '.test.ts')];
  const child = spawn(process.execPath, args, { cwd: source, windowsHide: true, env: { ...process.env, TEMP: temporary, TMP: temporary, NEXT_TELEMETRY_DISABLED: '1', npm_config_cache: path.join(temporary, 'npm-cache'), PERF_OUTPUT: artifacts }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stdout.on('data', log); child.stderr.on('data', log);
  code = await new Promise<number>((resolve, reject) => { child.on('error', reject); child.on('close', code => resolve(code ?? 1)); });
} finally {
  fs.cpSync(artifacts, path.join(evidence, label + '-artifacts'), { recursive: true });
  function unlinkJunctions(directory: string) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const target = path.join(directory, entry.name); if (entry.isSymbolicLink()) fs.unlinkSync(target); else if (entry.isDirectory()) unlinkJunctions(target); } }
  assert.equal(path.dirname(fs.realpathSync(gate)), fs.realpathSync(os.tmpdir())); unlinkJunctions(gate); fs.rmSync(gate, { recursive: true, force: true }); assert.ok(!fs.existsSync(gate)); log('Confirmed cleanup: ' + gate + '\n');
  const after = [snapshot(root), snapshot(main)]; fs.writeFileSync(path.join(evidence, label + '-after.json'), JSON.stringify(after)); before.forEach((value, index) => assertUnchanged(value, after[index])); log('CONFIRMED protected state and status unchanged in both checkouts.\nexit ' + code + '\n');
}
process.exitCode = code;
