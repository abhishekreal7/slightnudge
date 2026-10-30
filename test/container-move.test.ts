import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { moveIntoContainer } from '../lib/slightnudge/container-move';
import { prepareDraftTarget, readRenderableDraft } from '../lib/slightnudge/source-draft';
import { updateStaticJsxText } from '../lib/slightnudge/ast-nudger';
import { applyPendingSourceEdit, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';

const previous = process.cwd(), root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-container-move-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root; process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge');
try {
  fs.symlinkSync(path.join(previous, 'node_modules'), path.join(root, 'node_modules'), 'junction'); process.chdir(root);
  fs.writeFileSync('package.json', JSON.stringify({ dependencies: { tailwindcss: '4.3.3' } })); fs.writeFileSync('styles.css', '@import "tailwindcss";');
  const file = path.join(root, 'page.tsx');
  const before = 'export default function Page(){return <main><section><h2 className="text-xl">First</h2><button type="button" className="rounded">Continue <span>→</span></button></section><aside><h2 className="text-xl">Second</h2></aside></main>}'; fs.writeFileSync(file, before);
  const source = { filePath: file, line: 1, column: before.indexOf('<button') + 1, tagName: 'button' }, destination = { filePath: file, line: 1, column: before.indexOf('<aside') + 1, tagName: 'aside' };
  const plan = prepareDraftTarget(source, undefined, { structural: true }), to = prepareDraftTarget(destination, undefined, { structural: true });
  const moved = moveIntoContainer({ ...plan.target, sourceText: plan.target.sourceText!, destination: to.target });
  const draft = await plan.create({ filePath: file, before, after: moved.after, summary: 'Move button', oldValue: '', newValue: '' }, false, moved.sourceOrder); assert.ok(draft.id);
  assert.equal(draft.renderPatches.filter(patch => patch.order).length, 2); assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.deepEqual((await readRenderableDraft(draft.id, file)).renderPatches, draft.renderPatches);
  const editPlan = prepareDraftTarget(source, draft.id); const edited = updateStaticJsxText({ ...editPlan.target, value: 'Start here' }); assert.ok(edited.success, edited.reason);
  const composed = await editPlan.create({ filePath: file, before: edited.originalSource!, after: edited.updatedSource!, summary: 'Edit moved button', oldValue: 'Continue', newValue: 'Start here' }); assert.ok(composed.id);
  assert.equal((await applyPendingSourceEdit(composed.id)).success, true); const after = fs.readFileSync(file, 'utf8'); assert.ok(after.indexOf('<aside>') < after.indexOf('Start here')); assert.ok(after.includes('type="button"')); assert.ok(after.includes('<span>→</span>'));
  assert.equal(undoReviewedSourceEdit(composed.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.throws(() => moveIntoContainer({ ...source, sourceText: before, destination: { line: 1, column: before.indexOf('<section') + 1 } }), /already/);
  assert.throws(() => moveIntoContainer({ ...source, column: before.indexOf('<section') + 1, tagName: 'section', sourceText: before, destination: { line: 1, column: before.indexOf('<button') + 1 } }));
  const dynamic = before.replace('<aside>', '<aside>{items.map(item => <div>{item}</div>)}'); assert.throws(() => moveIntoContainer({ ...source, sourceText: dynamic, destination }), /dynamic/);
  const crossComponent = before.replace('</section><aside>', '</section></main>} function Other(){return <aside>').replace('</aside></main>', '</aside>'); assert.throws(() => moveIntoContainer({ ...source, sourceText: crossComponent, destination: { line: 1, column: crossComponent.indexOf('<aside') + 1 } }), /component/);
  for (const earlier of [false, true]) {
    const button = '<button type="button">Continue <span>→</span></button>', empty = '<aside id="destination" className="flex" />';
    const original = `export default function Page(){return <main>${earlier ? empty : ''}<section>${button}</section>${earlier ? '' : empty}</main>}`;
    fs.writeFileSync(file, original);
    const from = { filePath: file, line: 1, column: original.indexOf('<button') + 1, tagName: 'button' };
    const into = { filePath: file, line: 1, column: original.indexOf('<aside') + 1, tagName: 'aside' };
    const base = prepareDraftTarget(from, undefined, { structural: true });
    const result = moveIntoContainer({ ...base.target, sourceText: original, destination: into });
    assert.ok(result.after.includes('id="destination" className="flex" >' + button));
    const pending = await base.create({ filePath: file, before: original, after: result.after, summary: 'Move into empty container', oldValue: '', newValue: '' }, false, result.sourceOrder);
    assert.ok(pending.id);
    const destinationPatch = pending.renderPatches.find(patch => patch.before.elementId === 'destination');
    assert.equal(destinationPatch?.order?.length, 1);
    assert.deepEqual(destinationPatch?.beforeOrder, [], 'Self-closing containers have no prior children');
    assert.throws(() => prepareDraftTarget(from, pending.id), /className/, 'Text support must not bypass the separate style-editing checks');
    const continued = prepareDraftTarget(from, pending.id, { text: true });
    const changed = updateStaticJsxText({ ...continued.target, value: 'Moved into empty container' }); assert.ok(changed.success, changed.reason);
    const saved = await continued.create({ filePath: file, before: changed.originalSource!, after: changed.updatedSource!, summary: 'Edit after moving into empty container', oldValue: 'Continue', newValue: 'Moved into empty container' }); assert.ok(saved.id);
    assert.equal((await applyPendingSourceEdit(saved.id)).success, true);
    assert.ok(fs.readFileSync(file, 'utf8').includes('Moved into empty container'));
    assert.equal(undoReviewedSourceEdit(saved.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), original);
  }
  const generatedLabel = 'export default function Page({label}){return <main><button>{label}</button></main>}';
  fs.writeFileSync(file, generatedLabel);
  assert.throws(() => prepareDraftTarget({ filePath: file, line: 1, column: generatedLabel.indexOf('<button') + 1 }, undefined, { text: true }), /prop|dynamic/i, 'Dynamic labels must remain protected without a className');
  console.log('PASS container move: subtree/attribute/icon preservation, stable identity, edit after moving, refresh reconstruction, no preview writes, grouped Save and exact Undo, cycle/same-parent/dynamic/component refusal');
} finally { process.chdir(previous); assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('sn-container-move-')); fs.unlinkSync(path.join(root, 'node_modules')); fs.rmSync(root, { recursive: true, force: true }); }
