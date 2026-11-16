import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from '../app/api/slightnudge/preview/route';
import { getSessionToken } from '../lib/slightnudge/auth';
import { applyPendingSourceEdit, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';

const previous = process.cwd(), root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-button-editing-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root;
process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge'); process.env.PORT = '3000';
try {
  fs.symlinkSync(path.join(previous, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { tailwindcss: '4.3.3' } }));
  fs.writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss";'); process.chdir(root);
  const file = path.join(root, 'page.tsx');
  const before = 'export default function Page({label}) { return <div><a id="cta" href="#start" className="cta">Get started <span aria-hidden="true">→</span></a><button id="native" type="button" className="cta">Save <svg><path d="M0 0"/></svg></button><button id="dynamic" className="cta">{label}<span>→</span></button><p id="paragraph" className="text-sm">Before <span>middle</span> after</p></div>; }';
  fs.writeFileSync(file, before);
  const preview = async (body: Record<string, unknown>) => (await POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json', 'x-slightnudge-token': getSessionToken() }, body: JSON.stringify({ filePath: 'page.tsx', draft: true, ...body }) }))).json();
  let edit = await preview({ kind: 'text', elementId: 'cta', value: 'Start <building> & create' }); assert.equal(edit.success, true, edit.error);
  edit = await preview({ kind: 'style', elementId: 'cta', property: 'backgroundColor', value: 'bg-blue-600', important: true, parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error);
  assert.equal(edit.newValue, '!bg-blue-600'); assert.ok(edit.css.includes('!important'));
  edit = await preview({ kind: 'style', elementId: 'cta', property: 'backgroundColor', value: 'bg-rose-500', important: true, parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error);
  edit = await preview({ kind: 'text', elementId: 'native', value: 'Save changes', parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  const saved = await applyPendingSourceEdit(edit.id); assert.equal(saved.success, true, saved.error ?? 'Expected the operation to succeed');
  const after = fs.readFileSync(file, 'utf8');
  assert.ok(after.includes('<span aria-hidden="true">→</span>') && after.includes('<svg><path d="M0 0"/></svg>'));
  assert.ok(after.includes('href="#start"') && after.includes('type="button"'));
  assert.ok(after.includes('Start <building> & create') && after.includes('Save changes'));
  assert.ok(after.includes('!bg-rose-500') && !after.includes('!bg-blue-600'));
  assert.equal(undoReviewedSourceEdit(edit.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal((await preview({ kind: 'text', elementId: 'dynamic', value: 'Static' })).success, undefined);
  assert.equal((await preview({ kind: 'text', elementId: 'paragraph', value: 'Replaced' })).success, undefined);
  assert.equal((await preview({ kind: 'style', elementId: 'paragraph', property: 'fontSize', value: 'text-xl', important: true })).success, undefined);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  for (const draft of [false, true]) {
    const bomSource = Buffer.from('\uFEFF' + before);
    const expected = Buffer.from('\uFEFF' + before.replace('className="text-sm"', 'className="text-xl"'));
    fs.writeFileSync(file, bomSource);
    const style = await preview({
      kind: 'style', draft, line: 1, column: before.indexOf('<p id="paragraph"') + 1,
      tagName: 'p', property: 'fontSize', value: 'text-xl',
    });
    assert.equal(style.success, true, style.error);
    assert.deepEqual(fs.readFileSync(file), bomSource, 'Preview must leave source bytes intact');
    const applied = await applyPendingSourceEdit(style.id);
    assert.equal(applied.success, true, applied.error ?? 'Expected the BOM style edit to apply');
    assert.deepEqual(fs.readFileSync(file), expected, 'Apply must preserve the BOM');
    assert.equal(undoReviewedSourceEdit(style.id).success, true);
    assert.deepEqual(fs.readFileSync(file), bomSource, 'Undo must restore the original bytes');
  }
  console.log('PASS button source: static link/native labels preserve icons, attributes and markup; verified priority utilities replace cleanly; grouped Save/Undo; dynamic and ambiguous text refused; BOM preserved through style Preview/Apply/Undo');
} finally {
  process.chdir(previous); fs.unlinkSync(path.join(root, 'node_modules'));
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('sn-button-editing-'));
  fs.rmSync(root, { recursive: true, force: true });
}
