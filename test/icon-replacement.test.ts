import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from '../app/api/slightnudge/preview/route';
import { getSessionToken } from '../lib/slightnudge/auth';
import { applyPendingSourceEdit, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';
import { replaceLucideSource, inspectIconSource } from '../lib/slightnudge/icon-source';
import { openIconLibrary } from '../lib/slightnudge/icon-library';
import { validIconShape } from '../lib/slightnudge/icon-shape-values';

const previous = process.cwd(), root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-icon-replacement-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root; process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge'); process.env.PORT = '3000';
try {
  fs.symlinkSync(path.join(previous, 'node_modules'), path.join(root, 'node_modules'), 'junction'); process.chdir(root);
  const library = openIconLibrary(root); assert.equal(library.choices().length, 30);
  for (const shape of library.choices()) assert.equal(validIconShape(shape), true);
  for (const nodes of [[['script', {}]], [['path', { onload: 'run()' }]], [['path', { fill: 'url(http://evil.test)' }]], [['foreignObject', {}]]]) assert.equal(validIconShape({ name: 'Heart', classes: ['lucide'], nodes }), false);
  const fixture = 'import { ArrowRight as Mark } from "lucide-react";export function Page(){return <button onClick={run}>Continue<Mark id="one" className="inline-block" size={24} color="#123456"/><Mark id="other" size={18}/></button>}';
  const file = path.join(root, 'page.tsx'); fs.writeFileSync(file, fixture);
  const request = async (data: Record<string, unknown>) => { const response = await POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json', 'x-slightnudge-token': getSessionToken() }, body: JSON.stringify({ filePath: 'page.tsx', elementId: 'one', tagName: 'svg', kind: 'icon', draft: true, ...data }) })); return { status: response.status, ...await response.json() }; };
  const info = await request({ operation: 'inspect' }); assert.equal(info.icon.replacement.editable, true); assert.equal(info.icon.choices.length, 30);
  let edit = await request({ property: 'icon', value: 'Heart' }); assert.equal(edit.success, true, edit.error);
  assert.equal(edit.renderPatches[0].icon.before.name, 'ArrowRight'); assert.equal(edit.renderPatches[0].icon.after.name, 'Heart');
  assert.equal(edit.sourceTargets.filter((target: any) => target.tag === 'svg').length, 2);
  assert.equal(edit.renderPatches[0].icon.afterClassName, 'lucide lucide-heart inline-block');
  edit = await request({ property: 'size', value: '40', parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error); assert.equal(edit.renderPatches[0].attributes.width, '40');
  edit = await request({ property: 'icon', value: 'Star', parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error); assert.equal(edit.renderPatches[0].icon.after.name, 'Star'); assert.equal(edit.renderPatches[0].attributes.width, '40');
  assert.equal(fs.readFileSync(file, 'utf8'), fixture);
  assert.equal((await applyPendingSourceEdit(edit.id)).success, true); const saved = fs.readFileSync(file, 'utf8');
  assert.ok(saved.includes('<Mark id="other" size={18}/>')); assert.ok(saved.includes('onClick={run}')); assert.ok(saved.includes('<Star id="one"')); assert.ok(!/import[^;]*Heart/.test(saved), 'Unused intermediate import must be removed');
  assert.equal(undoReviewedSourceEdit(edit.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), fixture);
  for (const value of ['createLucideIcon', 'Icon', '../Heart', 'Heart;run()', 'NotARealIcon']) assert.notEqual((await request({ property: 'icon', value })).success, true);
  assert.notEqual((await request({ property: 'icon', value: 'Heart', breakpoint: 'md' })).success, true);
  const noId = fixture.replace('id="one" ', ''); fs.writeFileSync(file, noId);
  const anonymous = await request({ property: 'icon', value: 'Heart', elementId: undefined, line: 1, column: noId.indexOf('<Mark') + 1 });
  assert.equal(anonymous.success, true, anonymous.error); assert.equal(anonymous.renderPatches[0].before.elementId, undefined);
  assert.ok(anonymous.renderPatches[0].after.column > anonymous.renderPatches[0].before.column);
  assert.equal((await applyPendingSourceEdit(anonymous.id)).success, true); assert.equal(undoReviewedSourceEdit(anonymous.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), noId); fs.writeFileSync(file, fixture);
  const source = 'import { ArrowRight as Mark, Heart } from "lucide-react";export function Page(Heart:any){return <Mark/>}';
  const replaced = replaceLucideSource({ sourceText: source, line: 1, column: source.indexOf('<Mark') + 1, name: 'Heart' }); assert.ok(replaced.after.includes('Heart as IconChoice1')); assert.ok(replaced.after.includes('<IconChoice1/>'));
  for (const props of ['{...props}', 'icon={data}', 'viewBox="0 0 48 48"', 'children={custom}']) {
    const sourceText = `import {ArrowRight as Mark} from 'lucide-react';export function Page(){return <Mark ${props}/>} `;
    assert.equal(inspectIconSource({ sourceText, line: 1, column: sourceText.indexOf('<Mark') + 1 }).replacement.editable, false);
  }
  console.log('PASS icon replacement source/API: installed catalogue, safe static shapes, selected usage only, import reuse/cleanup/shadowing, composed size and shape changes, exact Save/Undo, unsafe/provider/scope refusal');
} finally { process.chdir(previous); }
