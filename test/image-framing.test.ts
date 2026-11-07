import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from '../app/api/slightnudge/preview/route';
import { updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';
import { getSessionToken } from '../lib/slightnudge/auth';
import { applyPendingSourceEdit, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';

const previous = process.cwd(), root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-image-framing-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root; process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge'); process.env.PORT = '3000';
try {
  fs.symlinkSync(path.join(previous, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { tailwindcss: '4.3.3' } })); fs.writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss";'); process.chdir(root);
  const file = path.join(root, 'page.tsx'), baseline = 'export default function Page(){return <main id="box" className="p-6"><img id="photo" src="/original.webp" srcSet="/original.webp 1x, /large.webp 2x" sizes="50vw" width={640} height={360} loading="lazy" alt="An original" className="object-contain object-center md:object-right hover:opacity-80" /></main>}'; fs.writeFileSync(file, baseline);
  const preview = async (data: Record<string, unknown>) => (await POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json', 'x-slightnudge-token': getSessionToken() }, body: JSON.stringify({ filePath: 'page.tsx', kind: 'style', draft: true, elementId: 'photo', ...data }) }))).json();
  let edit = await preview({ property: 'objectFit', value: 'object-cover' }); assert.equal(edit.success, true, edit.error);
  edit = await preview({ property: 'objectPosition', value: 'object-right', parentPreviewId: edit.id }); assert.equal(edit.success, true, edit.error);
  assert.equal(fs.readFileSync(file, 'utf8'), baseline);
  const saved = await applyPendingSourceEdit(edit.id); assert.equal(saved.success, true, saved.error ?? 'Expected the operation to succeed');
  const after = fs.readFileSync(file, 'utf8'); assert.ok(after.includes('object-cover object-right md:object-right hover:opacity-80')); assert.ok(after.includes('srcSet="/original.webp 1x, /large.webp 2x" sizes="50vw" width={640} height={360} loading="lazy" alt="An original"'));
  assert.equal(undoReviewedSourceEdit(edit.id).success, true); assert.equal(fs.readFileSync(file, 'utf8'), baseline);
  assert.equal((await preview({ property: 'objectFit', value: 'object-cover', elementId: 'box' })).success, undefined);
  assert.equal((await preview({ property: 'objectPosition', value: 'object-[999px]' })).success, undefined);
  const custom = updateStaticTailwindClass({ sourceText: baseline.replace('object-center', 'object-[25%_75%]'), filePath: file, elementId: 'photo', property: 'objectPosition', value: 'object-right', dryRun: true });
  assert.equal(custom.success, false, 'Custom focal values require an explicit supported control before replacing them');
  console.log('PASS image framing source: verified project CSS, independent fit/focus ownership, responsive/hover/image attributes preserved, draft-only preview, Save/exact Undo, non-image and arbitrary values refused');
} finally { process.chdir(previous); fs.unlinkSync(path.join(root, 'node_modules')); assert.ok(root.startsWith(os.tmpdir()) && path.basename(root).startsWith('sn-image-framing-')); fs.rmSync(root, { recursive: true, force: true }); }
