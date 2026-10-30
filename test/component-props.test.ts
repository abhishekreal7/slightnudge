import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';
import { inspectComponentProps, updateComponentProp } from '../lib/slightnudge/component-props';
import { POST } from '../app/api/slightnudge/preview/route';
import { getSessionToken } from '../lib/slightnudge/auth';
import { applyPendingSourceEdit, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';
const fixture = 'function Callout({label: copy}: {label:string}) { return <button id="message" onClick={run}>{copy}</button> } export default function Page(){ return <main><Callout label="Start &amp; go"/></main> }';
const arrowFixture = 'const Callout = ({label: copy}: {label:string}) => <button id="message" onClick={run}>{copy}</button>; export default function Page(){ return <main><Callout label="Start &amp; go"/></main> }';
const blockArrow = arrowFixture.replace('=> <button', '=> { return <button').replace('</button>;', '</button> };');
const shorthand = fixture.replace('label: copy', 'label').replace('{copy}</button>', '{label}</button>');
const position = (text: string) => { const file = new Project({ useInMemoryFileSystem: true }).createSourceFile('/test.tsx', text); const node = file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).find(node => node.getTagNameNode().getText() === 'button')!; return file.getLineAndColumnAtPos(node.getStart()); };
const info = (text: string) => inspectComponentProps({ sourceText: text, ...position(text) });
assert.equal(info(fixture).fields[0]?.value, 'Start & go');
for (const text of [arrowFixture, blockArrow, shorthand, shorthand + ' function Another({label}:{label:string}){return <p>{label}</p>}']) {
  assert.equal(info(text).component, 'Callout'); assert.equal(info(text).fields[0]?.value, 'Start & go');
  assert.ok(updateComponentProp({ sourceText: text, ...position(text), property: 'label', value: 'Arrow ✓' }).after.includes('label={"Arrow ✓"}'));
}
assert.equal(info(shorthand.replace('return <button', 'consume({label}); return <button')).fields.length, 0);
assert.match(info(shorthand.replace('label="Start &amp; go"', 'label={data}')).reason, /computed data/);
for (const text of [arrowFixture.replace('const Callout', 'export const Callout'), arrowFixture + ' export {Callout};', arrowFixture.replace('const Callout', 'let Callout'), arrowFixture.replace('const Callout', 'var Callout'), arrowFixture.replace('<Callout label="Start &amp; go"/>', '<Callout label="one"/><Callout label="two"/>')]) {
  assert.equal(info(text).fields.length, 0, text); assert.ok(info(text).reason);
}
assert.match(info(fixture.replace('label="Start &amp; go"', 'label={data}')).reason, /computed data/);
assert.match(info(fixture.replace('function Callout', 'export function Callout')).reason, /exported/);
for(const text of [fixture.replace('label:string','label:"Start & go"|"Other"'),fixture.replace('label:string','label:number'),fixture.replace('{label:string}','ImportedProps')]){assert.equal(info(text).fields.length,0);assert.match(info(text).reason,/constrained or unresolved type/);}
assert.equal(info('type Props={label:string};'+fixture.replace('{label:string}','Props')).fields[0].value,'Start & go');
const edited = updateComponentProp({ sourceText: fixture, ...position(fixture), property: 'label', value: 'Next <step> "now"\n✓' });
assert.ok(edited.after.includes('label={"Next <step> \\"now\\"\\n✓"}'.replaceAll('\\\\', '\\')));
assert.ok(edited.after.includes('{copy}</button>')); assert.ok(edited.after.includes('onClick={run}'));
for (const text of [
  fixture.replace('function Callout', 'export function Callout'),
  fixture.replace('<Callout label="Start &amp; go"/>', '<Callout label="one"/><Callout label="two"/>'),
  fixture.replace('label="Start &amp; go"', 'label={data}'),
  fixture.replace('label="Start &amp; go"', 'label="Start" {...data}'),
  fixture.replace('{copy}</button>', '{copy.toUpperCase()}</button>'),
  fixture.replace('return <button', 'consume(copy); return <button'),
  fixture.replace('return <button', 'consume(arguments[0]); return <button'),
  fixture.replace('return <button', 'eval("copy"); return <button'),
  fixture.replace('label="Start &amp; go"', 'label="Start" label="Other"'),
  fixture.replace('label: copy}', 'label: copy = "default"}'),
  fixture.replace('<Callout label="Start &amp; go"/>', '{items.map(item => <Callout label="Start"/>)}'),
]) { assert.equal(info(text).fields.length, 0, text); assert.throws(() => updateComponentProp({ sourceText: text, ...position(text), property: 'label', value: 'No' })); }
const previous = process.cwd(), root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-component-props-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root; process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge'); process.env.PORT = '3000';
try {
  process.chdir(root);
  const request = async (data: Record<string, unknown>) => { const response = await POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json', 'x-slightnudge-token': getSessionToken() }, body: JSON.stringify({ filePath: 'page.tsx', elementId: 'message', tagName: 'button', kind: 'component', draft: true, ...data }) })); return { status: response.status, ...await response.json() }; };
  for (const fixture of [arrowFixture, blockArrow, shorthand, 'function Callout({label: copy}: {label:string}) { return <button id="message" onClick={run}>{copy}</button> } export default function Page(){ return <main><Callout label="Start &amp; go"/></main> }']) {
  fs.writeFileSync('page.tsx', fixture);
  assert.equal((await request({ operation: 'inspect' })).component.fields[0].name, 'label');
  let edit = await request({ property: 'label', value: 'Continue' }); assert.equal(edit.success, true, edit.error);
  assert.equal(edit.renderPatches.length, 1); assert.equal(edit.renderPatches[0].beforeText, 'Start & go'); assert.equal(edit.renderPatches[0].text, 'Continue');
  edit = await request({ property: 'label', value: '', parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error); assert.equal(edit.renderPatches[0].text, '');
  edit = await request({ property: 'label', value: 'Saved ✓', parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error);
  assert.equal(fs.readFileSync('page.tsx', 'utf8'), fixture);
  assert.equal((await applyPendingSourceEdit(edit.id)).success, true); assert.ok(fs.readFileSync('page.tsx', 'utf8').includes('label={"Saved ✓"}'));
  assert.equal(undoReviewedSourceEdit(edit.id).success, true); assert.equal(fs.readFileSync('page.tsx', 'utf8'), fixture);
  for (const data of [{ property: 'other', value: 'No' }, { property: 'label', value: 'No', breakpoint: 'hover' }, { property: 'label', value: '\u0000' }, { property: 'label', value: 'a'.repeat(10001) }]) assert.notEqual((await request(data)).success, true);
  }
  console.log('PASS component text props: local ownership, aliased binding, escaped text, unsafe/provider/shared refusal, composed drafts, no early writes, exact Save/Undo');
} finally { process.chdir(previous); }
