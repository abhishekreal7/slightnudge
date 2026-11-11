import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareDraftTarget } from '../lib/slightnudge/source-draft';
import { updateStaticJsxText, updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';
import { applyPendingSourceEdit, readDraftSource, readHistory, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';

const previous = process.cwd(), workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-imported-draft-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = workspace; process.env.SLIGHTNUDGE_DATA_DIR = path.join(workspace, '.slightnudge');
const root = path.join(workspace, '.slightnudge/repositories/project-one'); fs.mkdirSync(root, { recursive: true });
try {
  fs.symlinkSync(path.join(previous, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { tailwindcss: '4.3.3' } }));
  fs.writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss";'); process.chdir(workspace);
  const file = path.join(root, 'page.tsx'), before = 'export default function Page(){return <main><h1 id="title" className="text-xl">Title</h1><button id="cta" className="button">Start <span>→</span></button></main>}';
  fs.writeFileSync(file, before);
  const scope = { repositoryId: 'project-one', root };
  const firstPlan = prepareDraftTarget({ filePath: file, elementId: 'title' }, undefined, scope);
  const changed = updateStaticTailwindClass({ ...firstPlan.target, property: 'fontSize', value: 'text-4xl' }); assert.ok(changed.success);
  const first: any = await firstPlan.create({ filePath: file, before: changed.originalSource!, after: changed.updatedSource!, summary: 'Title size', oldValue: changed.oldToken, newValue: changed.newToken, repositoryId: scope.repositoryId, sourcePath: 'page.tsx' });
  assert.ok(first.id); assert.equal(first.renderPatches[0].before.path, 'page.tsx');
  assert.throws(() => readDraftSource(first.id, file), /different source file or project/);
  assert.throws(() => readDraftSource(first.id, file, 'project-two'), /different source file or project/);
  const other = path.join(root, 'other.tsx'); fs.writeFileSync(other, before);
  assert.throws(() => prepareDraftTarget({ filePath: other, elementId: 'title' }, first.id, scope), /different source file or project/);
  const secondPlan = prepareDraftTarget({ filePath: file, elementId: 'cta' }, first.id, scope);
  const text = updateStaticJsxText({ ...secondPlan.target, value: 'Build locally' }); assert.ok(text.success);
  const second: any = await secondPlan.create({ filePath: file, before: text.originalSource!, after: text.updatedSource!, summary: 'Button label', oldValue: text.oldValue, newValue: text.newValue, repositoryId: scope.repositoryId, sourcePath: 'page.tsx' });
  assert.equal(second.renderPatches.length, 2); assert.ok(second.renderPatches.every((patch: any) => patch.before.path === 'page.tsx'));
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal((await applyPendingSourceEdit(second.id)).success, false);
  const saved = await applyPendingSourceEdit(second.id, undefined, scope.repositoryId, 'page.tsx', file); assert.equal(saved.success, true, saved.error ?? 'Expected the operation to succeed');
  assert.ok(fs.readFileSync(file, 'utf8').includes('text-4xl')); assert.ok(fs.readFileSync(file, 'utf8').includes('Build locally'));
  assert.equal(readHistory().length, 1);
  assert.equal(undoReviewedSourceEdit(second.id, { repositoryId: scope.repositoryId, sourcePath: 'page.tsx', filePath: file }).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  fs.appendFileSync(file, '\n// external edit'); assert.throws(() => readDraftSource(first.id, file, scope.repositoryId), /source changed outside/);
  console.log('PASS imported draft: project/file isolation, project-relative render patches, multi-target composition, no preview writes, one Save, exact Undo, external-source conflict preservation');
} finally {
  process.chdir(previous); fs.unlinkSync(path.join(root, 'node_modules'));
  assert.ok(path.resolve(workspace).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(workspace).startsWith('sn-imported-draft-'));
  fs.rmSync(workspace, { recursive: true, force: true });
}
