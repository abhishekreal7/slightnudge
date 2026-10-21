import fs from 'fs';
import path from 'path';
import { nudgeElement } from '../lib/slightnudge/ast-nudger';
import { createTempWorkspace } from './helpers/test-server';

async function runFixtureTests() {
  console.log('====================================================');
  console.log('🧪 SLIGHTNUDGE - STEP 0: FIXTURE VERIFICATION SUITE');
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
      if (details) console.error(`     Reason: ${details}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  const ws = createTempWorkspace('sn-fixtures', { useFixture1Baseline: true });
  const fixturesDir = path.join(ws.wsDir, 'fixtures');

  try {

  // Helper to preserve file content
  function withFixtureBackup(filePath: string, fn: () => void) {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    try {
      fn();
    } finally {
      fs.writeFileSync(filePath, originalContent, 'utf-8');
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Plain static className
  // -------------------------------------------------------------------------
  console.log('--- Fixture 1: Plain static className ---');
  const f1Path = path.join(fixturesDir, '1-plain-static.tsx');
  withFixtureBackup(f1Path, () => {
    const original = fs.readFileSync(f1Path, 'utf-8');
    assert(original.includes('className="ml-2"'), 'Fixture 1 starts with ml-2');

    const result = nudgeElement({
      filePath: f1Path,
      elementId: 'target',
      direction: 'right',
      stepSize: 'normal',
    });

    assert(result.success === true, 'Nudge succeeded');
    assert(result.refusedSafely === false, 'Not refused');
    assert(result.oldClass === 'ml-2', 'Identified old class as ml-2');
    assert(result.newClass === 'ml-2.5', 'Nudged ml-2 -> ml-2.5');

    const updated = fs.readFileSync(f1Path, 'utf-8');
    assert(updated.includes('className="ml-2.5"'), 'File written with className="ml-2.5"');
    assert(!updated.includes('className="ml-2"'), 'Old className="ml-2" replaced cleanly');

    // Verify exact expected diff
    const expectedDiff = original.replace('className="ml-2"', 'className="ml-2.5"');
    assert(updated === expectedDiff, 'Exact expected file change verified: only className modified');
  });

  // -------------------------------------------------------------------------
  // TEST 2: Several utilities in one className
  // -------------------------------------------------------------------------
  console.log('\n--- Fixture 2: Several utilities in one className ---');
  const f2Path = path.join(fixturesDir, '2-several-utilities.tsx');
  withFixtureBackup(f2Path, () => {
    const original = fs.readFileSync(f2Path, 'utf-8');
    const originalClass = 'flex items-center ml-2 bg-blue-500 text-white p-4 rounded-lg shadow-md';
    const expectedClass = 'flex items-center ml-2.5 bg-blue-500 text-white p-4 rounded-lg shadow-md';
    assert(original.includes(originalClass), 'Fixture 2 starts with original multi-utility className');

    const result = nudgeElement({
      filePath: f2Path,
      elementId: 'target',
      direction: 'right',
      stepSize: 'normal',
    });

    assert(result.success === true, 'Nudge succeeded');
    assert(result.oldClass === 'ml-2', 'Identified old class as ml-2');
    assert(result.newClass === 'ml-2.5', 'Nudged ml-2 -> ml-2.5');

    const updated = fs.readFileSync(f2Path, 'utf-8');
    assert(updated.includes(expectedClass), 'Updated className preserves all other utilities');
    assert(!updated.includes(originalClass), 'Old multi-utility className replaced');

    const expectedDiff = original.replace(originalClass, expectedClass);
    assert(updated === expectedDiff, 'Exact expected file change verified: only ml-2 changed, rest untouched');
  });

  // -------------------------------------------------------------------------
  // TEST 3: className built with cn()/clsx and a condition -> REFUSED SAFELY
  // -------------------------------------------------------------------------
  console.log('\n--- Fixture 3: className built with cn()/clsx and a condition ---');
  const f3Path = path.join(fixturesDir, '3-conditional-cn.tsx');
  withFixtureBackup(f3Path, () => {
    const original = fs.readFileSync(f3Path, 'utf-8');

    const result = nudgeElement({
      filePath: f3Path,
      elementId: 'target',
      direction: 'right',
      stepSize: 'normal',
    });

    assert(result.success === false, 'Edit not executed');
    assert(result.refusedSafely === true, 'Refused safely without guessing');
    assert(
      Boolean(result.reason?.includes("can't edit this safely")),
      'Reported "can\'t edit this safely" to user',
      result.reason
    );

    const untouched = fs.readFileSync(f3Path, 'utf-8');
    assert(untouched === original, 'Source file left completely untouched (0 bytes modified)');
  });

  // -------------------------------------------------------------------------
  // TEST 4: One component rendered twice with different props -> REFUSED SAFELY
  // -------------------------------------------------------------------------
  console.log('\n--- Fixture 4: Component rendered twice with different props ---');
  const f4Path = path.join(fixturesDir, '4-shared-component.tsx');
  withFixtureBackup(f4Path, () => {
    const original = fs.readFileSync(f4Path, 'utf-8');

    // Attempting to nudge element card-1 inside Card (which is rendered twice)
    const result1 = nudgeElement({
      filePath: f4Path,
      elementId: 'card-1',
      direction: 'right',
      stepSize: 'normal',
    });

    assert(result1.success === false, 'Edit card-1 instance not executed');
    assert(result1.refusedSafely === true, 'card-1 instance refused safely');
    assert(
      Boolean(result1.reason?.includes("can't edit this safely: component used in several places")),
      'Reported component used in several places on instance',
      result1.reason
    );

    // Attempting to nudge internal <div className="ml-2..."> on line 11 inside Card
    const result2 = nudgeElement({
      filePath: f4Path,
      line: 11,
      direction: 'right',
      stepSize: 'normal',
    });

    assert(result2.success === false, 'Edit inner element not executed');
    assert(result2.refusedSafely === true, 'Inner element refused safely');
    assert(
      Boolean(result2.reason?.includes("can't edit this safely: component used in several places")),
      'Reported component used in several places on inner element',
      result2.reason
    );

    const untouched = fs.readFileSync(f4Path, 'utf-8');
    assert(untouched === original, 'Source file left completely untouched (0 bytes modified)');
  });

  // -------------------------------------------------------------------------
  // TEST 5: Responsive classes (md:, lg:)
  // -------------------------------------------------------------------------
  console.log('\n--- Fixture 5: Responsive classes (md:, lg:) ---');
  const f5Path = path.join(fixturesDir, '5-responsive-classes.tsx');
  withFixtureBackup(f5Path, () => {
    const original = fs.readFileSync(f5Path, 'utf-8');
    const originalClass = 'ml-2 md:ml-4 lg:ml-8 p-4 bg-purple-600 text-white rounded';
    const expectedClass = 'ml-2.5 md:ml-4 lg:ml-8 p-4 bg-purple-600 text-white rounded';
    assert(original.includes(originalClass), 'Fixture 5 starts with base + responsive classes');

    const result = nudgeElement({
      filePath: f5Path,
      elementId: 'target',
      direction: 'right',
      stepSize: 'normal',
      breakpoint: '', // base breakpoint
    });

    assert(result.success === true, 'Nudge succeeded');
    assert(result.oldClass === 'ml-2', 'Targeted base class ml-2');
    assert(result.newClass === 'ml-2.5', 'Nudged base class to ml-2.5');

    const updated = fs.readFileSync(f5Path, 'utf-8');
    assert(updated.includes(expectedClass), 'Updated className preserves md:ml-4 and lg:ml-8');
    assert(!updated.includes(originalClass), 'Old base class replaced');

    const expectedDiff = original.replace(originalClass, expectedClass);
    assert(updated === expectedDiff, 'Exact expected file change verified: responsive classes preserved');
  });

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} STEP 0 FIXTURE TESTS PASSED!`);
  console.log('====================================================\n');
  } finally {
    await ws.cleanup();
  }
}

runFixtureTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
