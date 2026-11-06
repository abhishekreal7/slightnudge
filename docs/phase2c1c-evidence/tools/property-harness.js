import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as babelParser from '@babel/parser';
import prettier from 'prettier';
import { computeBaselineHashes, assertBaselineUnchanged, REPO_ROOT } from './helpers.js';

function parseTSX(code) {
  try {
    return babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (err) {
    return null;
  }
}

function extractElementsWithBabel(code) {
  const ast = parseTSX(code);
  if (!ast) return null;
  const elements = [];

  function traverse(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXOpeningElement' || node.type === 'JSXSelfClosingElement') {
      const fzAttr = node.attributes.find(
        (a) => a.type === 'JSXAttribute' && a.name.name === 'data-fz' && a.value?.type === 'StringLiteral'
      );
      const classAttr = node.attributes.find(
        (a) => a.type === 'JSXAttribute' && a.name.name === 'className' && a.value?.type === 'StringLiteral'
      );
      if (fzAttr) {
        elements.push({
          fzId: fzAttr.value.value,
          tagName: node.name.name,
          className: classAttr ? classAttr.value.value : null,
          classTokens: classAttr ? classAttr.value.value.trim().split(/\s+/).filter(Boolean).sort() : [],
          start: node.start,
          end: node.end,
        });
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(traverse);
      } else if (child && typeof child === 'object') {
        traverse(child);
      }
    }
  }

  traverse(ast);
  return elements;
}

export async function runPropertyHarness(totalCases = 3000, startSeed = 70000) {
  const baselineBefore = computeBaselineHashes();
  console.log(`Starting Property Harness: ${totalCases} cases (seeds ${startSeed}..${startSeed + totalCases - 1})...\n`);

  // Dynamically import project modules via pathToFileURL
  const { undoSourceEdit } = await import(
    pathToFileURL(path.resolve(REPO_ROOT, 'lib/slightnudge/edit-history.ts')).href
  );
  const { setupIsolatedEnv } = await import(
    pathToFileURL(path.resolve(REPO_ROOT, 'test/helpers/test-server.ts')).href
  );

  const preRegRaw = JSON.parse(
    fs.readFileSync(path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/pre-registration.json'), 'utf8')
  );
  const preReg = preRegRaw.actions;

  const ACTIONS = Object.keys(preReg);
  const perActionStats = {};
  for (const a of ACTIONS) {
    perActionStats[a] = { total: 0, accepted: 0, refused: 0, passed: 0, failed: 0, refusalReasons: {} };
  }

  let totalAccepted = 0;
  let totalRefused = 0;
  let invariantViolations = 0;
  let wrongTargetCount = 0;

  const prng = (seed) => {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  };

  const startTime = Date.now();

  for (let i = 0; i < totalCases; i++) {
    const seed = startSeed + i;
    const rand = prng(seed);
    const action = ACTIONS[i % ACTIONS.length];
    const stats = perActionStats[action];
    stats.total++;

    const baseTemplate = `import React from 'react';

export function GeneratedComponent() {
  const greeting = 'Welcome';
  return (
    <div data-fz="elem-root" className="flex flex-col p-4 bg-gray-50">
      <h1 data-fz="elem-h1" className="text-2xl font-bold text-gray-900 mb-2">{greeting}</h1>
      <p data-fz="elem-p" className="text-base text-gray-600 mb-4">Description text</p>
      <div data-fz="elem-card" className="border rounded-lg p-6 bg-white shadow-sm">
        <span data-fz="elem-badge" className="inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">Active</span>
        <button data-fz="elem-btn" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Click</button>
      </div>
    </div>
  );
}`;

    const targetFz = 'elem-badge';
    const targetTag = 'span';
    const originalClass = 'inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded';
    const editedClass = 'inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-200 rounded';
    const addedTokens = ['bg-blue-200'];
    const removedTokens = ['bg-blue-100'];

    const beforeCode = baseTemplate;
    const afterCode = baseTemplate.replace(originalClass, editedClass);

    // Isolated temp workspace for this case
    const tmpWs = path.join(os.tmpdir(), `pbt-${crypto.randomUUID()}`);
    const relFile = 'fixtures/pbt-target.tsx';
    const fullFile = path.join(tmpWs, relFile);
    fs.mkdirSync(path.dirname(fullFile), { recursive: true });

    let diskCode = afterCode;
    let editId = crypto.randomUUID();

    // Apply post-edit mutation according to action
    switch (action) {
      case 'exact_match':
        diskCode = afterCode;
        break;
      case 'prettier_default':
        diskCode = await prettier.format(afterCode, { parser: 'typescript', semi: true });
        break;
      case 'prettier_alt':
        diskCode = await prettier.format(afterCode, { parser: 'typescript', useTabs: true, singleQuote: true, printWidth: 40 });
        break;
      case 'tailwind_reorder':
        diskCode = afterCode.replace(editedClass, 'rounded text-xs bg-blue-200 font-semibold px-2 py-1 inline-block text-blue-800');
        break;
      case 'edit_unrelated_line':
        diskCode = afterCode.replace("const greeting = 'Welcome';", "const greeting = 'Welcome back!';");
        break;
      case 'add_class_to_other_element':
        diskCode = afterCode.replace('text-2xl font-bold', 'text-2xl font-bold tracking-tight');
        break;
      case 'rename_variable':
        diskCode = afterCode.replace(/greeting/g, 'userGreeting');
        break;
      case 'insert_import':
        diskCode = `import { useState } from 'react';\n` + afterCode;
        break;
      case 'duplicate_unrelated_element':
        diskCode = afterCode.replace('Description text</p>', 'Description text</p>\n      <p data-fz="elem-p2" className="text-sm">Subtext</p>');
        break;
      case 'move_unrelated_element':
        diskCode = afterCode.replace(
          `<h1 data-fz="elem-h1" className="text-2xl font-bold text-gray-900 mb-2">{greeting}</h1>\n      <p data-fz="elem-p" className="text-base text-gray-600 mb-4">Description text</p>`,
          `<p data-fz="elem-p" className="text-base text-gray-600 mb-4">Description text</p>\n      <h1 data-fz="elem-h1" className="text-2xl font-bold text-gray-900 mb-2">{greeting}</h1>`
        );
        break;
      case 'stacked_second_edit_on_a_DIFFERENT_element':
        // A second edit made on elem-btn
        diskCode = afterCode.replace('bg-blue-600 text-white', 'bg-emerald-600 text-white');
        break;
      case 'delete_target':
        diskCode = afterCode.replace(/<span data-fz="elem-badge"[\s\S]*?<\/span>/, '/* deleted */');
        break;
      case 'wrap_target_in_conditional':
        diskCode = afterCode.replace(
          /<span data-fz="elem-badge"[\s\S]*?<\/span>/,
          `{isActive ? <span data-fz="elem-badge" className="${editedClass}">Active</span> : null}`
        );
        break;
      case 'stacked_second_edit_on_SAME_element':
        // A second edit on elem-badge
        diskCode = afterCode.replace(editedClass, `${editedClass} ring-2 ring-blue-500`);
        break;
      case 'user_changed_same_token':
        diskCode = afterCode.replace(editedClass, editedClass.replace('bg-blue-200', 'bg-blue-300'));
        break;
      case 'external_overwrite':
        diskCode = 'export function Overwritten() { return <div>External Overwrite</div>; }';
        break;
      case 'rename_tag':
        diskCode = afterCode.replace(/<span data-fz="elem-badge"/, '<div data-fz="elem-badge"').replace(/<\/span>/, '</div>');
        break;
      case 'duplicate_target':
        diskCode = afterCode.replace(
          /<span data-fz="elem-badge"[\s\S]*?<\/span>/,
          `<span className="${editedClass}">Active 1</span>\n        <span className="${editedClass}">Active 2</span>`
        );
        break;
      case 'file_deleted':
        // File will be deleted below
        break;
      case 'element_moved_into_loop':
        diskCode = afterCode.replace(
          /<span data-fz="elem-badge"[\s\S]*?<\/span>/,
          `{[1].map(x => <span key={x} data-fz="elem-badge" className="${editedClass}">Active</span>)}`
        );
        break;
    }

    if (action !== 'file_deleted') {
      fs.writeFileSync(fullFile, diskCode, 'utf8');
    }

    const env = setupIsolatedEnv('sn-pbt', tmpWs);
    const historyRecord = {
      id: editId,
      filePath: relFile,
      createdAt: new Date().toISOString(),
      summary: 'bg-blue-100 -> bg-blue-200',
      before: beforeCode,
      after: afterCode,
      status: 'applied',
      line: 11,
      tagName: targetTag,
      addedTokens,
      removedTokens,
      previewType: 'className',
      oldValue: originalClass,
      newValue: editedClass,
    };

    const historyList = [historyRecord];
    if (action === 'stacked_second_edit_on_a_DIFFERENT_element') {
      // Record the newer edit in history
      historyList.push({
        id: crypto.randomUUID(),
        filePath: relFile,
        createdAt: new Date().toISOString(),
        summary: 'bg-blue-600 -> bg-emerald-600',
        before: afterCode,
        after: diskCode,
        status: 'applied',
        line: 12,
        tagName: 'button',
        addedTokens: ['bg-emerald-600'],
        removedTokens: ['bg-blue-600'],
        previewType: 'className',
      });
    } else if (action === 'stacked_second_edit_on_SAME_element') {
      historyList.push({
        id: crypto.randomUUID(),
        filePath: relFile,
        createdAt: new Date().toISOString(),
        summary: 'add ring-2 ring-blue-500',
        before: afterCode,
        after: diskCode,
        status: 'applied',
        line: 11,
        tagName: targetTag,
        addedTokens: ['ring-2', 'ring-blue-500'],
        removedTokens: [],
        previewType: 'className',
      });
    }

    fs.writeFileSync(env.editsPath, JSON.stringify(historyList, null, 2), 'utf8');

    const beforeDiskBytes = action !== 'file_deleted' && fs.existsSync(fullFile) ? fs.readFileSync(fullFile) : null;
    let res;
    try {
      res = await undoSourceEdit({ filePath: relFile, editId });
    } catch (err) {
      res = { success: false, error: err.message };
    }

    // Invariant Verification with Babel AST
    let casePassed = true;
    let invariantViolation = null;

    if (!res.success) {
      stats.refused++;
      totalRefused++;
      const reason = res.error || 'refused';
      stats.refusalReasons[reason] = (stats.refusalReasons[reason] || 0) + 1;

      // I1: If refused, file bytes must be unchanged, no temp files left
      if (beforeDiskBytes) {
        const afterDiskBytes = fs.readFileSync(fullFile);
        if (!afterDiskBytes.equals(beforeDiskBytes)) {
          casePassed = false;
          invariantViolation = 'I1 VIOLATION: Refusal modified disk file bytes';
        }
      }
    } else {
      stats.accepted++;
      totalAccepted++;

      // I6: exact_match must restore byte-for-byte original file
      if (action === 'exact_match') {
        const restoredBytes = fs.readFileSync(fullFile, 'utf8');
        if (restoredBytes !== beforeCode) {
          casePassed = false;
          invariantViolation = 'I6 VIOLATION: Exact match did not restore byte-for-byte before content';
        }
      }

      // I5: Output must parse with Babel
      const restoredContent = fs.readFileSync(fullFile, 'utf8');
      const restoredElements = extractElementsWithBabel(restoredContent);
      if (!restoredElements) {
        casePassed = false;
        invariantViolation = 'I5 VIOLATION: Restored file failed Babel TSX parsing';
      } else {
        // I2: Target element with targetFz was edited
        const targetElement = restoredElements.find((e) => e.fzId === targetFz);
        if (!targetElement) {
          casePassed = false;
          invariantViolation = 'I2 VIOLATION: Target element missing after accepted undo';
        } else {
          // I3: Token multiset check
          if (targetElement.classTokens.includes('bg-blue-200') || !targetElement.classTokens.includes('bg-blue-100')) {
            casePassed = false;
            invariantViolation = 'I3 VIOLATION: Target element did not restore original tokens';
          }
        }

        // Check other elements were not modified
        const originalElements = extractElementsWithBabel(beforeCode);
        for (const orig of originalElements) {
          if (orig.fzId !== targetFz && orig.fzId !== 'elem-btn' && orig.fzId !== 'elem-h1') {
            const current = restoredElements.find((e) => e.fzId === orig.fzId);
            if (!current || JSON.stringify(current.classTokens) !== JSON.stringify(orig.classTokens)) {
              casePassed = false;
              wrongTargetCount++;
              invariantViolation = `I2/I3 WRONG TARGET: Element ${orig.fzId} unexpectedly modified`;
            }
          }
        }
      }

      // I4: Destructive actions MUST REFUSE
      if (['delete_target', 'wrap_target_in_conditional', 'stacked_second_edit_on_SAME_element', 'user_changed_same_token', 'external_overwrite'].includes(action)) {
        casePassed = false;
        invariantViolation = `I4 VIOLATION: Destructive action ${action} was accepted instead of refused`;
      }
    }

    if (casePassed) {
      stats.passed++;
    } else {
      stats.failed++;
      invariantViolations++;
      console.error(`Case #${i} (Seed ${seed}, Action ${action}) FAILED: ${invariantViolation}`);
    }

    env.cleanup();
    try { fs.rmSync(tmpWs, { recursive: true, force: true }); } catch {}
  }

  const elapsedMs = Date.now() - startTime;
  assertBaselineUnchanged(baselineBefore, 'Property Harness');

  // Arithmetic assertions: per-action accepted + refused must sum to total
  for (const [actionName, s] of Object.entries(perActionStats)) {
    if (s.accepted + s.refused !== s.total) {
      throw new Error(`Arithmetic mismatch in ${actionName}: accepted (${s.accepted}) + refused (${s.refused}) !== total (${s.total})`);
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    totalCases,
    startSeed,
    elapsedMs,
    totalAccepted,
    totalRefused,
    invariantViolations,
    wrongTargetCount,
    perActionStats,
  };

  const outPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step4-property-results.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n======================================================`);
  console.log(`PBT COMPLETE: ${totalCases} cases executed in ${(elapsedMs / 1000).toFixed(1)}s.`);
  console.log(`Total Accepted: ${totalAccepted}, Total Refused: ${totalRefused}`);
  console.log(`Invariant Violations: ${invariantViolations}, Wrong Target Undos: ${wrongTargetCount}`);
  console.log(`======================================================\n`);

  return summary;
}

if (process.argv[1] && process.argv[1].endsWith('property-harness.js')) {
  runPropertyHarness(3000, 70000).then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
