import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareDraftTarget, readRenderableDraft } from '../lib/slightnudge/source-draft';
import { reorderElement, updateStaticJsxText } from '../lib/slightnudge/ast-nudger';
import { applyPendingSourceEdit, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';

const root = process.cwd(), workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-section-order-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = workspace; process.env.SLIGHTNUDGE_DATA_DIR = path.join(workspace, '.slightnudge');
try {
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ dependencies: { tailwindcss: '4.3.3' } }));
  fs.writeFileSync(path.join(workspace, 'styles.css'), '@import "tailwindcss";'); process.chdir(workspace);
  const file = path.join(workspace, 'page.tsx');
  const before = 'export default function Page(){return <main className="flex flex-col"><section className="p-4"><h2 className="text-xl">First</h2></section><section className="p-4"><h2 className="text-xl">Second</h2><button className="rounded">Continue <span>→</span></button></section><section className="p-4"><h2 className="text-xl">Third</h2></section></main>}';
  fs.writeFileSync(file, before);
  const line = 1, column = before.indexOf('<section', before.indexOf('</section>')) + 1;
  const plan = prepareDraftTarget({ filePath: file, line, column, tagName: 'section' });
  const result = reorderElement({ ...plan.target, direction: 'earlier' }); assert.ok(result.success, result.reason);
  const moved = await plan.create({ filePath: file, before: result.originalSource!, after: result.updatedSource!, oldValue: '', newValue: '', summary: 'Move section earlier' }, false, result.sourceOrder);
  assert.ok(moved.id); assert.equal(fs.readFileSync(file, 'utf8'), before);
  const order = moved.renderPatches.find(patch => patch.order); assert.ok(order); assert.equal(order.order!.length, 3);
  const restored = await readRenderableDraft(moved.id, file); assert.deepEqual(restored.renderPatches, moved.renderPatches);
  const headingColumn = before.indexOf('<h2', column) + 1;
  const next = prepareDraftTarget({ filePath: file, line, column: headingColumn, tagName: 'h2' }, moved.id);
  const edited = updateStaticJsxText({ ...next.target, value: 'Second, edited after moving' }); assert.ok(edited.success, edited.reason);
  const composed = await next.create({ filePath: file, before: edited.originalSource!, after: edited.updatedSource!, oldValue: 'Second', newValue: 'Second, edited after moving', summary: 'Edit moved section' }); assert.ok(composed.id);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.ok((await readRenderableDraft(composed.id, file)).renderPatches.some(patch => patch.order));
  assert.equal((await applyPendingSourceEdit(composed.id)).success, true);
  const saved = fs.readFileSync(file, 'utf8'); assert.ok(saved.indexOf('Second, edited') < saved.indexOf('First')); assert.ok(saved.includes('Continue <span>→</span>'));
  assert.equal(undoReviewedSourceEdit(composed.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);
  const reversePlan = prepareDraftTarget({ filePath: file, line, column, tagName: 'section' }, moved.id);
  const reverse = reorderElement({ ...reversePlan.target, direction: 'later' }); assert.ok(reverse.success);
  const clean = await reversePlan.create({ filePath: file, before: reverse.originalSource!, after: reverse.updatedSource!, oldValue: '', newValue: '', summary: 'Return section' }, false, reverse.sourceOrder); assert.ok(clean.draftClean);
  const dynamic = before.replace('</section><section', '</section>{items.map(item => <section>{item}</section>)}<section'); fs.writeFileSync(file, dynamic);
  assert.equal(reorderElement({ filePath: file, line: 1, column: dynamic.indexOf('<section') + 1, tagName: 'section', direction: 'later', dryRun: true }).success, false);
  const bare = 'export default function Page(){return <main><section><h2>First</h2></section><section><h2>Second</h2></section></main>}'; fs.writeFileSync(file, bare);
  const barePlan = prepareDraftTarget({ filePath: file, line: 1, column: bare.lastIndexOf('<section') + 1, tagName: 'section' }, undefined, { structural: true });
  const bareResult = reorderElement({ ...barePlan.target, direction: 'earlier' }); assert.ok(bareResult.success);
  const bareDraft = await barePlan.create({ filePath: file, before: bare, after: bareResult.updatedSource!, oldValue: '', newValue: '', summary: 'Arrange unstyled section' }, false, bareResult.sourceOrder); assert.ok(bareDraft.id);
  assert.ok((await readRenderableDraft(bareDraft.id, file)).renderPatches.some(patch => patch.order)); assert.equal(fs.readFileSync(file, 'utf8'), bare);
  console.log('PASS section order: unequal subtrees without IDs, stable identities, edit after move, refresh reconstruction, return to baseline, no preview writes, grouped Save/exact Undo, dynamic-boundary refusal');
} finally {
  process.chdir(root); assert.ok(path.resolve(workspace).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(workspace).startsWith('sn-section-order-'));
  fs.unlinkSync(path.join(workspace, 'node_modules')); fs.rmSync(workspace, { recursive: true, force: true });
}
