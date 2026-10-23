import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { setupIsolatedEnv } from './helpers/test-server';
import {
  createPendingSourceEdit,
  applyPendingSourceEdit,
  undoSourceEdit,
  readHistory,
  EditRecord,
} from '../lib/slightnudge/edit-history';

// Load @babel/parser from persistent review tooling folder
let babelParser: any = null;
try {
  const toolingRequire = createRequire('C:\\dev\\vibecheck-review-tools\\package.json');
  babelParser = toolingRequire('@babel/parser');
} catch (err) {
  console.warn('Could not load @babel/parser from review tools:', err);
}

// Simple seeded PRNG (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Multi-Element Stacked Edits Undo Battery', () => {
  const originalEnv = { ...process.env };

  before(() => {
    process.env.SLIGHTNUDGE_TEST = '1';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  });

  after(() => {
    for (const [k, v] of Object.entries(originalEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  // (1) Edit A on elem1, edit B on elem2 (different elements, same file): undo A accepted, elem2 keeps B, then undo B accepted; byte identical
  it('(1) edit A on elem1, edit B on elem2: undo A accepted, then undo B accepted -> byte-identical', async () => {
    const wsRoot = path.join(os.tmpdir(), `stacked-1-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });
    const relPath = 'fixtures/page1.tsx';
    const fullPath = path.join(wsRoot, relPath);

    const originalSource = [
      'export default function Page1() {',
      '  return (',
      '    <div>',
      '      <h1 id="elem1" className="text-xl font-normal">Title</h1>',
      '      <p id="elem2" className="mt-2 text-gray-500">Subtitle</p>',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    fs.writeFileSync(fullPath, originalSource, 'utf8');
    const env = setupIsolatedEnv('stacked-1-env', wsRoot);

    try {
      // Edit A: elem1 text-xl -> text-2xl
      const sourceA = originalSource.replace('text-xl font-normal', 'text-2xl font-normal');
      const pendingA = createPendingSourceEdit({
        filePath: fullPath,
        before: originalSource,
        after: sourceA,
        summary: 'text-xl → text-2xl',
        oldValue: 'text-xl',
        newValue: 'text-2xl',
        line: 4,
        elementId: 'elem1',
        tagName: 'h1',
        previewType: 'className',
        removedTokens: ['text-xl'],
        addedTokens: ['text-2xl'],
      });
      const resA = await applyPendingSourceEdit(pendingA.id);
      assert.strictEqual(resA.success, true);

      // Edit B: elem2 mt-2 -> mt-4
      const sourceB = sourceA.replace('mt-2 text-gray-500', 'mt-4 text-gray-500');
      const pendingB = createPendingSourceEdit({
        filePath: fullPath,
        before: sourceA,
        after: sourceB,
        summary: 'mt-2 → mt-4',
        oldValue: 'mt-2',
        newValue: 'mt-4',
        line: 5,
        elementId: 'elem2',
        tagName: 'p',
        previewType: 'className',
        removedTokens: ['mt-2'],
        addedTokens: ['mt-4'],
      });
      const resB = await applyPendingSourceEdit(pendingB.id);
      assert.strictEqual(resB.success, true);

      // Undo A first (the older edit on elem1)
      const undoResA = await undoSourceEdit({ filePath: relPath, editId: resA.editId });
      assert.strictEqual(undoResA.success, true, `Undo of older edit A must be ACCEPTED, got: ${(undoResA as any).error}`);

      const contentAfterUndoA = fs.readFileSync(fullPath, 'utf8');
      assert.strictEqual(
        contentAfterUndoA.includes('text-xl font-normal'),
        true,
        'elem1 must have reverted back to text-xl'
      );
      assert.strictEqual(
        contentAfterUndoA.includes('mt-4 text-gray-500'),
        true,
        'elem2 must still retain edit B (mt-4)'
      );

      // Then undo B
      const undoResB = await undoSourceEdit({ filePath: relPath, editId: resB.editId });
      assert.strictEqual(undoResB.success, true, `Undo of B must be accepted: ${(undoResB as any).error}`);

      const finalContent = fs.readFileSync(fullPath, 'utf8');
      assert.strictEqual(finalContent, originalSource, 'Final content must be byte-for-byte identical to original');
    } finally {
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
    }
  });

  // (2) Same pair, undo B first then A: same final result
  it('(2) edit A then B, undo B first then A -> byte-identical', async () => {
    const wsRoot = path.join(os.tmpdir(), `stacked-2-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });
    const relPath = 'fixtures/page2.tsx';
    const fullPath = path.join(wsRoot, relPath);

    const originalSource = [
      'export default function Page2() {',
      '  return (',
      '    <div>',
      '      <h1 id="elem1" className="text-xl font-normal">Title</h1>',
      '      <p id="elem2" className="mt-2 text-gray-500">Subtitle</p>',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    fs.writeFileSync(fullPath, originalSource, 'utf8');
    const env = setupIsolatedEnv('stacked-2-env', wsRoot);

    try {
      const sourceA = originalSource.replace('text-xl font-normal', 'text-2xl font-normal');
      const pendingA = createPendingSourceEdit({
        filePath: fullPath,
        before: originalSource,
        after: sourceA,
        summary: 'text-xl → text-2xl',
        oldValue: 'text-xl',
        newValue: 'text-2xl',
        line: 4,
        elementId: 'elem1',
        tagName: 'h1',
        previewType: 'className',
        removedTokens: ['text-xl'],
        addedTokens: ['text-2xl'],
      });
      const resA = await applyPendingSourceEdit(pendingA.id);

      const sourceB = sourceA.replace('mt-2 text-gray-500', 'mt-4 text-gray-500');
      const pendingB = createPendingSourceEdit({
        filePath: fullPath,
        before: sourceA,
        after: sourceB,
        summary: 'mt-2 → mt-4',
        oldValue: 'mt-2',
        newValue: 'mt-4',
        line: 5,
        elementId: 'elem2',
        tagName: 'p',
        previewType: 'className',
        removedTokens: ['mt-2'],
        addedTokens: ['mt-4'],
      });
      const resB = await applyPendingSourceEdit(pendingB.id);

      // Undo B first
      const undoResB = await undoSourceEdit({ filePath: relPath, editId: resB.editId });
      assert.strictEqual(undoResB.success, true);

      // Undo A next
      const undoResA = await undoSourceEdit({ filePath: relPath, editId: resA.editId });
      assert.strictEqual(undoResA.success, true);

      const finalContent = fs.readFileSync(fullPath, 'utf8');
      assert.strictEqual(finalContent, originalSource, 'Final content must be byte-for-byte identical to original');
    } finally {
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
    }
  });

  // (3) Edit A then edit B on the SAME element: undo A refused (message names newer edit), undo B accepted, then undo A accepted
  it('(3) edit A then edit B on the SAME element: undo A refused naming newer edit, undo B accepted, then undo A accepted', async () => {
    const wsRoot = path.join(os.tmpdir(), `stacked-3-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });
    const relPath = 'fixtures/page3.tsx';
    const fullPath = path.join(wsRoot, relPath);

    const originalSource = [
      'export default function Page3() {',
      '  return (',
      '    <div>',
      '      <h1 id="same-elem" className="p-2 text-sm font-normal">Header</h1>',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    fs.writeFileSync(fullPath, originalSource, 'utf8');
    const env = setupIsolatedEnv('stacked-3-env', wsRoot);

    try {
      // Edit A: text-sm -> text-lg
      const sourceA = originalSource.replace('text-sm font-normal', 'text-lg font-normal');
      const pendingA = createPendingSourceEdit({
        filePath: fullPath,
        before: originalSource,
        after: sourceA,
        summary: 'text-sm → text-lg',
        oldValue: 'text-sm',
        newValue: 'text-lg',
        line: 4,
        elementId: 'same-elem',
        tagName: 'h1',
        previewType: 'className',
        removedTokens: ['text-sm'],
        addedTokens: ['text-lg'],
      });
      const resA = await applyPendingSourceEdit(pendingA.id);

      // Edit B: font-normal -> font-bold on SAME element
      const sourceB = sourceA.replace('text-lg font-normal', 'text-lg font-bold');
      const pendingB = createPendingSourceEdit({
        filePath: fullPath,
        before: sourceA,
        after: sourceB,
        summary: 'font-normal → font-bold',
        oldValue: 'font-normal',
        newValue: 'font-bold',
        line: 4,
        elementId: 'same-elem',
        tagName: 'h1',
        previewType: 'className',
        removedTokens: ['font-normal'],
        addedTokens: ['font-bold'],
      });
      const resB = await applyPendingSourceEdit(pendingB.id);

      // Undo A (older edit on same element) -> MUST REFUSE
      const undoResA1 = await undoSourceEdit({ filePath: relPath, editId: resA.editId });
      assert.strictEqual(undoResA1.success, false, 'Undoing older edit A on same element must be refused');
      const errorMsg = undoResA1.error || '';
      console.log('Same element refusal message:', errorMsg);
      assert.strictEqual(
        errorMsg.includes('font-normal → font-bold') || errorMsg.includes('newer edit'),
        true,
        `Refusal message must name the newer edit: ${errorMsg}`
      );

      // Undo B (newer edit) -> MUST SUCCEED
      const undoResB = await undoSourceEdit({ filePath: relPath, editId: resB.editId });
      assert.strictEqual(undoResB.success, true, `Undoing newer edit B must succeed: ${(undoResB as any).error}`);

      // Now undo A -> MUST SUCCEED
      const undoResA2 = await undoSourceEdit({ filePath: relPath, editId: resA.editId });
      assert.strictEqual(undoResA2.success, true, `Undoing older edit A after B is undone must succeed: ${(undoResA2 as any).error}`);

      const finalContent = fs.readFileSync(fullPath, 'utf8');
      assert.strictEqual(finalContent, originalSource, 'Final content must be byte-for-byte identical to original');
    } finally {
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
    }
  });

  // (4) Legacy records without elementId and without derivable identity: undo of older refused with manual instructions
  it('(4) legacy records without elementId and without derivable identity: undo of older refused with manual instructions', async () => {
    const wsRoot = path.join(os.tmpdir(), `stacked-4-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });
    const relPath = 'fixtures/page4.tsx';
    const fullPath = path.join(wsRoot, relPath);

    const initialSource = '/* Arbitrary legacy file without identifiable AST element */\nconst x = 1;\n';
    const modifiedA = '/* Arbitrary legacy file without identifiable AST element */\nconst x = 2;\n';
    const modifiedB = '/* Arbitrary legacy file without identifiable AST element */\nconst x = 3;\n';

    fs.writeFileSync(fullPath, modifiedB, 'utf8');
    const env = setupIsolatedEnv('stacked-4-env', wsRoot);

    try {
      const idA = crypto.randomUUID();
      const idB = crypto.randomUUID();

      // Write legacy records directly into edits.json
      const legacyRecordA: EditRecord = {
        id: idA,
        filePath: relPath,
        createdAt: new Date(Date.now() - 10000).toISOString(),
        summary: 'legacy edit A',
        before: initialSource,
        after: modifiedA,
        status: 'applied',
      };

      const legacyRecordB: EditRecord = {
        id: idB,
        filePath: relPath,
        createdAt: new Date().toISOString(),
        summary: 'legacy edit B',
        before: modifiedA,
        after: modifiedB,
        status: 'applied',
      };

      fs.writeFileSync(env.editsPath, JSON.stringify([legacyRecordA, legacyRecordB], null, 2), 'utf8');

      const undoRes = await undoSourceEdit({ filePath: relPath, editId: idA });
      assert.strictEqual(undoRes.success, false, 'Undo of legacy record without identity must be refused');
      const errorMsg = undoRes.error || '';
      console.log('Legacy record refusal message:', errorMsg);
      assert.strictEqual(
        errorMsg.includes('This file changed after the visual edit') || errorMsg.includes('manual') || errorMsg.includes('identity'),
        true,
        `Legacy refusal must provide manual instructions: ${errorMsg}`
      );
    } finally {
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
    }
  });

  // (5) Newer record of a structural kind (reorder/move/insert/delete) in the same file: undo of older refused
  it('(5) newer record of structural kind (reorder) in same file: undo of older edit refused', async () => {
    const wsRoot = path.join(os.tmpdir(), `stacked-5-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });
    const relPath = 'fixtures/page5.tsx';
    const fullPath = path.join(wsRoot, relPath);

    const initialSource = [
      'export default function Page5() {',
      '  return (',
      '    <div>',
      '      <h1 id="el1" className="text-sm">First</h1>',
      '      <p id="el2" className="mt-2">Second</p>',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    fs.writeFileSync(fullPath, initialSource, 'utf8');
    const env = setupIsolatedEnv('stacked-5-env', wsRoot);

    try {
      const sourceA = initialSource.replace('text-sm', 'text-lg');
      const pendingA = createPendingSourceEdit({
        filePath: fullPath,
        before: initialSource,
        after: sourceA,
        summary: 'text-sm → text-lg',
        oldValue: 'text-sm',
        newValue: 'text-lg',
        line: 4,
        elementId: 'el1',
        tagName: 'h1',
        previewType: 'className',
        removedTokens: ['text-sm'],
        addedTokens: ['text-lg'],
      });
      const resA = await applyPendingSourceEdit(pendingA.id);

      // Create a structural reorder edit as newer edit
      const sourceB = [
        'export default function Page5() {',
        '  return (',
        '    <div>',
        '      <p id="el2" className="mt-2">Second</p>',
        '      <h1 id="el1" className="text-lg">First</h1>',
        '    </div>',
        '  );',
        '}',
        '',
      ].join('\n');

      const pendingB = createPendingSourceEdit({
        filePath: fullPath,
        before: sourceA,
        after: sourceB,
        summary: 'reorder: move earlier',
        oldValue: '',
        newValue: '',
        line: 4,
        previewType: 'reorder',
      });
      const resB = await applyPendingSourceEdit(pendingB.id);

      // Attempt to undo older edit A while newer structural edit is applied
      const undoResA = await undoSourceEdit({ filePath: relPath, editId: resA.editId });
      assert.strictEqual(undoResA.success, false, 'Undoing older edit when newer structural edit exists must be refused');
      const errorMsg = undoResA.error || '';
      console.log('Structural edit refusal message:', errorMsg);
      assert.strictEqual(
        errorMsg.includes('structural') || errorMsg.includes('reorder') || errorMsg.includes('newer edit'),
        true,
        `Must indicate structural edit blockage: ${errorMsg}`
      );
    } finally {
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
    }
  });

  // (6) Different elements on the SAME line (same-line siblings): refused
  it('(6) different elements on the SAME line: refused due to same-line ambiguity', async () => {
    const wsRoot = path.join(os.tmpdir(), `stacked-6-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });
    const relPath = 'fixtures/page6.tsx';
    const fullPath = path.join(wsRoot, relPath);

    // Two buttons on line 4
    const initialSource = [
      'export default function Page6() {',
      '  return (',
      '    <div>',
      '      <button id="btn1" className="btn text-sm">One</button><button id="btn2" className="btn text-sm">Two</button>',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    fs.writeFileSync(fullPath, initialSource, 'utf8');
    const env = setupIsolatedEnv('stacked-6-env', wsRoot);

    try {
      const sourceA = initialSource.replace('id="btn1" className="btn text-sm"', 'id="btn1" className="btn text-lg"');
      const pendingA = createPendingSourceEdit({
        filePath: fullPath,
        before: initialSource,
        after: sourceA,
        summary: 'text-sm → text-lg',
        oldValue: 'text-sm',
        newValue: 'text-lg',
        line: 4,
        elementId: 'btn1',
        tagName: 'button',
        previewType: 'className',
        removedTokens: ['text-sm'],
        addedTokens: ['text-lg'],
      });
      const resA = await applyPendingSourceEdit(pendingA.id);

      const sourceB = sourceA.replace('id="btn2" className="btn text-sm"', 'id="btn2" className="btn text-xl"');
      const pendingB = createPendingSourceEdit({
        filePath: fullPath,
        before: sourceA,
        after: sourceB,
        summary: 'text-sm → text-xl',
        oldValue: 'text-sm',
        newValue: 'text-xl',
        line: 4,
        elementId: 'btn2',
        tagName: 'button',
        previewType: 'className',
        removedTokens: ['text-sm'],
        addedTokens: ['text-xl'],
      });
      const resB = await applyPendingSourceEdit(pendingB.id);

      // Attempt to undo A: shares line 4 with newer edit B on btn2 -> MUST REFUSE
      const undoResA = await undoSourceEdit({ filePath: relPath, editId: resA.editId });
      assert.strictEqual(undoResA.success, false, 'Undoing older edit sharing a line with newer edit must be refused');
      const errorMsg = undoResA.error || '';
      console.log('Same-line refusal message:', errorMsg);
      assert.strictEqual(
        errorMsg.includes('same line') || errorMsg.includes('same element') || errorMsg.includes('newer edit'),
        true,
        `Must indicate same line refusal: ${errorMsg}`
      );
    } finally {
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
    }
  });

  // (7) Randomized order test: N edits (N 2..5) on distinct elements, undo in random order with seeded PRNG (300 cases)
  it('(7) randomized order test: 300 seeded runs with N (2..5) edits undone in random order', async () => {
    assert.ok(babelParser, '@babel/parser must be available for AST oracle check');

    const BASE_SEED = 771234;
    const TOTAL_RUNS = 300;
    console.log(`Starting 300 randomized order test runs (seed base: ${BASE_SEED})...`);

    for (let run = 0; run < TOTAL_RUNS; run++) {
      const rng = mulberry32(BASE_SEED + run);
      const N = 2 + Math.floor(rng() * 4); // 2..5 edits

      const wsRoot = path.join(os.tmpdir(), `random-stacked-${run}-${crypto.randomUUID()}`);
      fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });
      const relPath = 'fixtures/random-page.tsx';
      const fullPath = path.join(wsRoot, relPath);

      // Generate a component with 6 distinct elements on distinct lines
      const elementDefs = [
        { id: 'el-header', tag: 'h1', baseClass: 'text-xl font-medium', newClass: 'text-3xl font-medium', oldTok: 'text-xl', newTok: 'text-3xl' },
        { id: 'el-sub', tag: 'p', baseClass: 'text-sm text-gray-500', newClass: 'text-base text-gray-500', oldTok: 'text-sm', newTok: 'text-base' },
        { id: 'el-btn', tag: 'button', baseClass: 'px-3 py-1 bg-blue-500', newClass: 'px-6 py-1 bg-blue-500', oldTok: 'px-3', newTok: 'px-6' },
        { id: 'el-card', tag: 'div', baseClass: 'rounded-sm shadow-sm', newClass: 'rounded-xl shadow-sm', oldTok: 'rounded-sm', newTok: 'rounded-xl' },
        { id: 'el-note', tag: 'span', baseClass: 'text-xs text-red-500', newClass: 'text-sm text-red-500', oldTok: 'text-xs', newTok: 'text-sm' },
        { id: 'el-foot', tag: 'footer', baseClass: 'mt-4 border-t', newClass: 'mt-8 border-t', oldTok: 'mt-4', newTok: 'mt-8' },
      ];

      // Select N distinct elements for editing
      const shuffledIndices = [0, 1, 2, 3, 4, 5].sort(() => rng() - 0.5).slice(0, N);
      const chosenElements = shuffledIndices.map(i => elementDefs[i]);

      const lines = [
        'export default function RandomComponent() {',
        '  return (',
        '    <main className="container">',
      ];
      for (const def of elementDefs) {
        lines.push(`      <${def.tag} id="${def.id}" className="${def.baseClass}">Content ${def.id}</${def.tag}>`);
      }
      lines.push('    </main>');
      lines.push('  );');
      lines.push('}');
      lines.push('');

      const originalSource = lines.join('\n');
      fs.writeFileSync(fullPath, originalSource, 'utf8');

      const env = setupIsolatedEnv(`rnd-env-${run}`, wsRoot);

      try {
        let currentSource = originalSource;
        const appliedEdits: { id: string; elemId: string; oldTok: string; newTok: string }[] = [];

        // Apply N edits in sequence
        for (let i = 0; i < chosenElements.length; i++) {
          const el = chosenElements[i];
          const before = currentSource;
          const after = currentSource.replace(el.baseClass, el.newClass);
          assert.notStrictEqual(before, after, `Replace must change content for ${el.id}`);

          const pending = createPendingSourceEdit({
            filePath: fullPath,
            before,
            after,
            summary: `${el.oldTok} → ${el.newTok}`,
            oldValue: el.oldTok,
            newValue: el.newTok,
            line: 4 + elementDefs.findIndex(d => d.id === el.id),
            elementId: el.id,
            tagName: el.tag,
            previewType: 'className',
            removedTokens: [el.oldTok],
            addedTokens: [el.newTok],
          });

          const applyRes = await applyPendingSourceEdit(pending.id);
          assert.strictEqual(applyRes.success, true);
          appliedEdits.push({ id: applyRes.editId!, elemId: el.id, oldTok: el.oldTok, newTok: el.newTok });
          currentSource = fs.readFileSync(fullPath, 'utf8');
        }

        // Shuffle applied edit IDs into a random undo order
        const undoOrder = [...appliedEdits].sort(() => rng() - 0.5);

        // Undo in random order
        let preUndoCode = currentSource;
        for (const editToUndo of undoOrder) {
          const res = await undoSourceEdit({ filePath: relPath, editId: editToUndo.id });
          assert.strictEqual(res.success, true, `Undo of ${editToUndo.elemId} in run ${run} failed: ${(res as any).error}`);

          const postUndoCode = fs.readFileSync(fullPath, 'utf8');

          // Babel AST Oracle: verify only className literals changed
          const astBefore = babelParser.parse(preUndoCode, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
          const astAfter = babelParser.parse(postUndoCode, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
          assert.ok(astBefore && astAfter, 'Babel AST parse must succeed');

          // Collect all className values from AST
          const extractClasses = (ast: any) => {
            const map: Record<string, string> = {};
            const walk = (node: any) => {
              if (!node || typeof node !== 'object') return;
              if (node.type === 'JSXOpeningElement') {
                const idAttr = node.attributes?.find((a: any) => a.type === 'JSXAttribute' && a.name?.name === 'id');
                const classAttr = node.attributes?.find((a: any) => a.type === 'JSXAttribute' && a.name?.name === 'className');
                if (idAttr?.value?.value && classAttr?.value?.value) {
                  map[idAttr.value.value] = classAttr.value.value;
                }
              }
              for (const k of Object.keys(node)) {
                if (Array.isArray(node[k])) node[k].forEach(walk);
                else if (node[k] && typeof node[k] === 'object') walk(node[k]);
              }
            };
            walk(ast);
            return map;
          };

          const classesBefore = extractClasses(astBefore);
          const classesAfter = extractClasses(astAfter);

          // Verify: ONLY editToUndo.elemId changed its className
          for (const def of elementDefs) {
            if (def.id === editToUndo.elemId) {
              assert.notStrictEqual(
                classesBefore[def.id],
                classesAfter[def.id],
                `Undone element ${def.id} className must have changed`
              );
            } else {
              assert.strictEqual(
                classesBefore[def.id],
                classesAfter[def.id],
                `Unrelated element ${def.id} className must remain untouched`
              );
            }
          }

          preUndoCode = postUndoCode;
        }

        // Final verification: after all N undos, file must be byte-for-byte identical to original
        const finalFile = fs.readFileSync(fullPath, 'utf8');
        assert.strictEqual(
          finalFile,
          originalSource,
          `Run ${run} (seed ${BASE_SEED + run}): final file must be byte-for-byte identical to original`
        );
      } finally {
        env.cleanup();
        try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
      }
    }
    console.log(`All ${TOTAL_RUNS} randomized order test runs passed successfully!`);
  });
});
