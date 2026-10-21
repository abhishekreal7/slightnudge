import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium, Browser, Page } from 'playwright';
import { createTempWorkspace } from './helpers/test-server';

async function runStep3Tests() {
  console.log('====================================================');
  console.log('🧪 SLIGHTNUDGE - STEP 3: AST FILE EDIT & GIT COMMIT SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  const ws = createTempWorkspace('sn-step3', { useFixture1Baseline: true });
  const fixturesDir = path.join(ws.wsDir, 'fixtures');
  const f1Path = path.join(fixturesDir, '1-plain-static.tsx');
  const f3Path = path.join(fixturesDir, '3-conditional-cn.tsx');
  const f4Path = path.join(fixturesDir, '4-shared-component.tsx');

  // Baseline commit hash
  const initialGitHash = execSync('git rev-parse HEAD').toString().trim();

  // -------------------------------------------------------------------------
  // PART A: Direct API AST Mutation & Git Commit
  // -------------------------------------------------------------------------
  console.log('--- Part A: Direct AST File Write & Git Commit ---');
  const f1Before = fs.readFileSync(f1Path, 'utf-8');
  assert(f1Before.includes('className="ml-2"'), 'Fixture 1 begins with className="ml-2"');

  const nudgeRes = await fetch('http://localhost:3000/api/slightnudge/nudge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath: 'fixtures/1-plain-static.tsx',
      line: 7,
      direction: 'right',
      stepSize: 'normal',
    }),
  });
  const nudgeData = await nudgeRes.json();

  assert(nudgeData.success === true, 'Nudge API succeeded');
  assert(nudgeData.newClass === 'ml-2.5', 'Nudge returned newClass ml-2.5');
  assert(Boolean(nudgeData.commitHash), 'Nudge returned git commit hash', nudgeData.commitHash);

  // Verify file on disk
  const f1After = fs.readFileSync(f1Path, 'utf-8');
  assert(f1After.includes('className="ml-2.5"'), 'File on disk updated with className="ml-2.5"');
  assert(!f1After.includes('className="ml-2"'), 'Old className="ml-2" replaced cleanly');

  // Verify exact diff: only className was modified
  const expectedDiff = f1Before.replace('className="ml-2"', 'className="ml-2.5"');
  assert(f1After === expectedDiff, 'Exact AST diff verified: rest of file is byte-for-byte identical');

  // Verify git commit was created
  const latestCommitMsg = execSync('git log -1 --pretty=%B').toString().trim();
  assert(
    latestCommitMsg.includes('slightnudge: ml-2 -> ml-2.5 in 1-plain-static.tsx'),
    'Git commit created with exact message: slightnudge: ml-2 -> ml-2.5 in 1-plain-static.tsx',
    latestCommitMsg
  );

  const newGitHash = execSync('git rev-parse HEAD').toString().trim();
  assert(newGitHash !== initialGitHash, 'Git HEAD advanced by exactly one commit');

  // -------------------------------------------------------------------------
  // PART B: Undo via /api/slightnudge/undo (Ctrl+Z backend)
  // -------------------------------------------------------------------------
  console.log('\n--- Part B: Undo via /api/slightnudge/undo ---');
  const undoRes = await fetch('http://localhost:3000/api/slightnudge/undo', {
    method: 'POST',
  });
  const undoData = await undoRes.json();

  assert(undoData.success === true, 'Undo API succeeded');

  // Verify file on disk reverted
  const f1Reverted = fs.readFileSync(f1Path, 'utf-8');
  assert(f1Reverted.includes('className="ml-2"'), 'File on disk reverted back to className="ml-2"');
  assert(
    f1Reverted.replace(/\r\n/g, '\n') === f1Before.replace(/\r\n/g, '\n'),
    'File on disk exactly matches original pre-edit state'
  );

  // Verify git commit was rolled back
  const hashAfterUndo = execSync('git rev-parse HEAD').toString().trim();
  assert(hashAfterUndo === initialGitHash, 'Git HEAD rolled back to initial commit');

  // -------------------------------------------------------------------------
  // PART C: Safety Constraints - Unsafe Files Left Untouched & No Commits
  // -------------------------------------------------------------------------
  console.log('\n--- Part C: Safety Check - No edits or commits on unsafe fixtures ---');

  // Fixture 3 (conditional cn)
  const f3Before = fs.readFileSync(f3Path, 'utf-8');
  const f3Res = await fetch('http://localhost:3000/api/slightnudge/nudge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath: 'fixtures/3-conditional-cn.tsx',
      line: 13,
      direction: 'right',
    }),
  });
  const f3Data = await f3Res.json();
  assert(f3Data.success === false, 'Fixture 3 nudge rejected');
  assert(f3Data.refusedSafely === true, 'Fixture 3 refused safely');
  assert(fs.readFileSync(f3Path, 'utf-8') === f3Before, 'Fixture 3 source file left untouched (0 bytes modified)');
  assert(execSync('git rev-parse HEAD').toString().trim() === initialGitHash, 'No git commit created for Fixture 3');

  // Fixture 4 (shared component)
  const f4Before = fs.readFileSync(f4Path, 'utf-8');
  const f4Res = await fetch('http://localhost:3000/api/slightnudge/nudge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath: 'fixtures/4-shared-component.tsx',
      line: 11,
      direction: 'right',
    }),
  });
  const f4Data = await f4Res.json();
  assert(f4Data.success === false, 'Fixture 4 nudge rejected');
  assert(f4Data.refusedSafely === true, 'Fixture 4 refused safely');
  assert(fs.readFileSync(f4Path, 'utf-8') === f4Before, 'Fixture 4 source file left untouched (0 bytes modified)');
  assert(execSync('git rev-parse HEAD').toString().trim() === initialGitHash, 'No git commit created for Fixture 4');

  // -------------------------------------------------------------------------
  // PART D: Live Browser Arrow Key Nudge & Ctrl+Z Undo (Playwright)
  // -------------------------------------------------------------------------
  console.log('\n--- Part D: Live Browser Arrow Nudge & Ctrl+Z Undo ---');
  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000/fixtures/1');
    await page.waitForSelector('#target');
    await page.click('#target');

    // Nudge right with keyboard ArrowRight
    await page.keyboard.press('ArrowRight');

    // Wait for commit notice in HUD
    await page.waitForSelector('#slightnudge-nudge-notice', { timeout: 4000 });
    const noticeText = await page.textContent('#slightnudge-nudge-notice');
    assert(Boolean(noticeText?.includes('committed')), 'HUD shows committed notice', noticeText || undefined);

    // Verify file on disk updated
    const liveDiskContent = fs.readFileSync(f1Path, 'utf-8');
    assert(liveDiskContent.includes('className="ml-2.5"'), 'Live ArrowRight wrote className="ml-2.5" to disk');

    // Verify git commit created
    const liveCommitMsg = execSync('git log -1 --pretty=%B').toString().trim();
    assert(liveCommitMsg.includes('slightnudge: ml-2 -> ml-2.5 in 1-plain-static.tsx'), 'Live ArrowRight produced git commit');

    // Press Control+z to undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);

    // Verify file reverted on disk
    const diskAfterUndo = fs.readFileSync(f1Path, 'utf-8');
    assert(diskAfterUndo.includes('className="ml-2"'), 'Ctrl+Z reverted file on disk back to className="ml-2"');
    assert(
      diskAfterUndo.replace(/\r\n/g, '\n') === f1Before.replace(/\r\n/g, '\n'),
      'File matches original pre-test state'
    );

    // Verify commit was rolled back
    const hashAfterLiveUndo = execSync('git rev-parse HEAD').toString().trim();
    assert(hashAfterLiveUndo === initialGitHash, 'Ctrl+Z rolled back git commit cleanly');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} STEP 3 FILE & GIT TESTS PASSED!`);
    console.log('====================================================\n');
  } finally {
    await browser.close();
    await ws.cleanup();
  }
}

runStep3Tests().catch((err) => {
  console.error('Step 3 tests failed:', err);
  process.exit(1);
});
