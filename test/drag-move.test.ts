import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readTranslation, translatedClasses, snappedMove } from '../lib/slightnudge/translation';
import { nudgeElement } from '../lib/slightnudge/ast-nudger';
import { POST } from '../app/api/slightnudge/preview/route';
import { applyPendingSourceEdit, readHistory, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';
import { getSessionToken } from '../lib/slightnudge/auth';

const previous = process.cwd();
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-drag-move-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root;
process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge'); process.env.PORT = '3000';
try {
  const bounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 };
  assert.deepEqual(snappedMove(25, 15, 1, bounds), { x: 24, y: 16 });
  assert.deepEqual(snappedMove(12, 8, .5, bounds), { x: 24, y: 16 });
  assert.deepEqual(snappedMove(25, 15, 1, bounds, true), { x: 24, y: 0 });
  assert.deepEqual(snappedMove(1000, -1000, 1, bounds), { x: 100, y: -100 });
  assert.equal(translatedClasses('text-xl ml-2', { x: 24, y: -16 }), 'text-xl ml-2 translate-x-[24px] translate-y-[-16px]');
  assert.deepEqual(readTranslation('text-xl translate-x-[24px] translate-y-[-16px]'), { x: 24, y: -16 });
  for (const classes of ['rotate-6', 'scale-110', 'sm:translate-x-4', 'transform-gpu', 'translate-x-4', 'translate-x-[4px] translate-x-[8px]']) assert.throws(() => readTranslation(classes));
  assert.throws(() => translatedClasses('text-xl', { x: Infinity, y: 0 }));

  fs.symlinkSync(path.join(previous, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, dependencies: { tailwindcss: JSON.parse(fs.readFileSync(path.join(previous, 'node_modules/tailwindcss/package.json'), 'utf8')).version } }));
  fs.writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss";');
  process.chdir(root);
  const file = path.join(root, 'page.tsx');
  const before = 'export default function Page() { return <h1 id="target" className="text-xl ml-2">Move this</h1>; }\n';
  fs.writeFileSync(file, before);
  const request = (x: unknown, y: unknown, token = getSessionToken()) => new Request('http://127.0.0.1:3000/api/slightnudge/preview', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ kind: 'move', filePath: 'page.tsx', elementId: 'target', x, y }) });
  assert.equal((await POST(request(24, 16, 'wrong'))).status, 403);
  for (const [x, y] of [[4096, 0], ['24', 0], [1.5, 0]]) assert.equal((await POST(request(x, y))).status, 400);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  const response = await POST(request(24, 16)); assert.equal(response.status, 200);
  const proposal = await response.json(); assert.equal(proposal.success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'Drag preview must not write source');
  const accepted = await applyPendingSourceEdit(proposal.id); assert.equal(accepted.success, true, accepted.error || 'Move must apply successfully');
  assert.equal(readHistory().length, 1);
  assert.ok(fs.readFileSync(file, 'utf8').includes('translate-x-[24px] translate-y-[16px]'));
  const firstPosition = fs.readFileSync(file, 'utf8');
  const second = await (await POST(request(40, 20))).json(); assert.equal(second.success, true);
  assert.equal((await applyPendingSourceEdit(second.id)).success, true);
  assert.equal(readHistory().length, 2);
  assert.equal(undoReviewedSourceEdit(second.id).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), firstPosition, 'A second move replaces its coordinates and undoes to the first accepted position');
  fs.appendFileSync(file, '// Unrelated outside edit\n');
  assert.equal(undoReviewedSourceEdit(proposal.id).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), before + '// Unrelated outside edit\n', 'Token Undo preserves unrelated changes');
  for (const source of [before.replace('text-xl', 'text-xl rotate-6'), before.replace('className=', 'style={{transform: "rotate(6deg)"}} className=')]) {
    fs.writeFileSync(file, source);
    assert.equal(nudgeElement({ filePath: file, elementId: 'target', direction: 'right', translation: { x: 12, y: 4 }, dryRun: true }).success, false);
    assert.equal(fs.readFileSync(file, 'utf8'), source);
  }
  const section = 'export default function Page(){return <section id="target" className="grid gap-8"><div className="content"><h1>Keep this heading</h1><button>Keep this button</button></div><aside>Keep this card</aside></section>}';
  fs.writeFileSync(file, section);
  const sectionPreview = await (await POST(request(0, 24))).json(); assert.equal(sectionPreview.success, true, sectionPreview.error);
  assert.equal(fs.readFileSync(file, 'utf8'), section);
  assert.equal((await applyPendingSourceEdit(sectionPreview.id)).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), section.replace('grid gap-8', 'grid gap-8 translate-x-[0px] translate-y-[24px]'));
  assert.equal(undoReviewedSourceEdit(sectionPreview.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), section);
  console.log('PASS: snapping, axis lock, scale, bounds, transform refusals, authorized API, unchanged preview, repeated moves, whole-section child preservation and exact Undo');
} finally {
  process.chdir(previous);
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('sn-drag-move-'));
  if (fs.existsSync(path.join(root, 'node_modules'))) fs.unlinkSync(path.join(root, 'node_modules'));
  fs.rmSync(root, { recursive: true, force: true });
}
