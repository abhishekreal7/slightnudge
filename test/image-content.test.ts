import sharp from 'sharp';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from '../app/api/slightnudge/preview/route';
import { getSessionToken } from '../lib/slightnudge/auth';
import { applyPendingSourceEdit, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';
import { updateImageAttribute } from '../lib/slightnudge/image-source';
import { renderJsxAttribute } from '../lib/slightnudge/jsx-text';

const previous = process.cwd(), root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-image-content-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root; process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge'); process.env.PORT = '3000';
try {
  fs.symlinkSync(path.join(previous, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { tailwindcss: '4.3.3' } })); fs.writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss";');
  const file = path.join(root, 'page.tsx'), asset = '/slightnudge-assets/11111111-1111-1111-1111-111111111111.png';
  fs.mkdirSync(path.join(root, 'public/slightnudge-assets'), { recursive: true }); fs.writeFileSync(path.join(root, 'public', asset), await sharp({ create: { width: 200, height: 100, channels: 3, background: 'blue' } }).png().toBuffer());
  const before = 'export default function Page(){return <img id="photo" src="/original.png" alt="Original" width={200} height={100} className="object-cover" />}'; fs.writeFileSync(file, before); process.chdir(root);
  const request = async (data: Record<string, unknown>) => (await POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json', 'x-slightnudge-token': getSessionToken() }, body: JSON.stringify({ filePath: 'page.tsx', kind: 'image', draft: true, elementId: 'photo', ...data }) }))).json();
  let edit = await request({ property: 'alt', value: 'A "quoted" & <clear> description' }); assert.equal(edit.success, true, edit.error);
  assert.deepEqual(edit.renderPatches[0].attributes, { alt: 'A "quoted" & <clear> description' });
  edit = await request({ property: 'alt', value: 'Second description', parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error);
  edit = await request({ property: 'src', value: asset, parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error);
  assert.deepEqual(edit.renderPatches[0].attributes, { src: asset, alt: 'Second description' });
  assert.deepEqual(edit.renderPatches[0].beforeAttributes, { src: '/original.png', alt: 'Original' });
  edit = await request({ kind: 'style', property: 'objectFit', value: 'object-contain', parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error);
  assert.equal(edit.renderPatches[0].attributes.src, asset); assert.match(edit.renderPatches[0].className, /object-contain/);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  const saved = await applyPendingSourceEdit(edit.id); assert.equal(saved.success, true, saved.error);
  assert.ok(fs.readFileSync(file, 'utf8').includes('width={200} height={100} className="object-contain"'));
  assert.equal(undoReviewedSourceEdit(edit.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal((await request({ property: 'src', value: '/etc/passwd' })).success, undefined);
  assert.equal((await request({ property: 'alt', value: 'x', breakpoint: 'md' })).success, undefined);
  assert.equal((await request({ property: 'alt', value: 'x', breakpoint: 0 })).success, undefined);
  assert.equal(renderJsxAttribute('"A &amp; &quot;B&quot;  C"'), 'A & "B"  C');
  assert.equal(renderJsxAttribute('"line one\nline two"'), 'line one\nline two');
  const classless = before.replace(' className="object-cover"', ''); fs.writeFileSync(file, classless);
  assert.equal((await request({ property: 'alt', value: 'An accessible image without utility classes' })).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), classless); fs.writeFileSync(file, before);
  fs.writeFileSync(file, before.replace(' alt="Original"', ''));
  const decorative = await request({ property: 'alt', value: '' }); assert.equal(decorative.success, true, decorative.error);
  assert.equal(decorative.renderPatches[0].beforeAttributes.alt, null); assert.equal(decorative.renderPatches[0].attributes.alt, '');
  assert.equal((await applyPendingSourceEdit(decorative.id)).success, true); assert.equal(undoReviewedSourceEdit(decorative.id).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), before.replace(' alt="Original"', '')); fs.writeFileSync(file, before);
  for (const source of ['<img src={image} />', '<img src="/a.png" srcSet={sources} />', '<img src="/a.png" {...props} />', '<picture><source srcSet={sources}/><img src="/a.png" /></picture>']) {
    const column = source.indexOf('<img') + 1;
    await assert.rejects(() => updateImageAttribute({ root, filePath: file, sourceText: source, line: 1, column, property: 'src', value: asset }));
  }
  console.log('PASS image content source: composed alt/replacement drafts, escaped text, exact attributes/revision ownership, no source writes before Save, exact Undo, dynamic/shared/responsive/path/state refusals');
} finally { process.chdir(previous); fs.unlinkSync(path.join(root, 'node_modules')); assert.ok(root.startsWith(os.tmpdir()) && path.basename(root).startsWith('sn-image-content-')); fs.rmSync(root, { recursive: true, force: true }); }
