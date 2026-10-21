import { chromium, Browser, Page } from 'playwright';

async function runStep1Tests() {
  console.log('====================================================');
  console.log('🧪 SLIGHTNUDGE - STEP 1: ELEMENT SELECTION SUITE');
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

  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();
  const BASE_URL = process.env.STUDIO_BASE_URL || (process.env.SLIGHTNUDGE_TEST === '1' ? 'http://127.0.0.1:3999' : 'http://localhost:3000');

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Fixture 1 Selection & Source Display
    // -----------------------------------------------------------------------
    console.log('--- Test 1: Click selection on Fixture 1 ---');
    await page.goto(`${BASE_URL}/fixtures/1`);
    await page.waitForSelector('#target');

    // Click target element to select it
    await page.click('#target');

    // Verify selection box appears
    const boxVisible = await page.isVisible('#slightnudge-selected-box');
    assert(boxVisible, 'Bounding box drawn around selected element');

    // Verify file and line display
    await page.waitForSelector('#slightnudge-file-display');
    const f1FileText = await page.textContent('#slightnudge-file-display');
    assert(
      Boolean(f1FileText?.includes('fixtures/1-plain-static.tsx:7')),
      'Displays exact file and line: fixtures/1-plain-static.tsx:7',
      f1FileText || undefined
    );

    // Verify class display
    const f1ClassText = await page.textContent('#slightnudge-class-display');
    assert(
      Boolean(f1ClassText?.includes('ml-2')),
      'Displays exact class: ml-2',
      f1ClassText || undefined
    );

    // Verify safety status
    await page.waitForSelector('#slightnudge-safety-ok', { timeout: 3000 });
    const f1SafeOk = await page.isVisible('#slightnudge-safety-ok');
    assert(f1SafeOk, 'Shows safe to nudge indicator');

    // -----------------------------------------------------------------------
    // TEST 2: Fixture 2 Selection & Multi-utility Display
    // -----------------------------------------------------------------------
    console.log('\n--- Test 2: Click selection on Fixture 2 (Multiple utilities) ---');
    await page.goto(`${BASE_URL}/fixtures/2`);
    await page.waitForSelector('#target');
    await page.click('#target');

    const f2Box = await page.isVisible('#slightnudge-selected-box');
    assert(f2Box, 'Bounding box drawn on Fixture 2');

    const f2FileText = await page.textContent('#slightnudge-file-display');
    assert(
      Boolean(f2FileText?.includes('fixtures/2-several-utilities.tsx:7')),
      'Displays file and line: fixtures/2-several-utilities.tsx:7',
      f2FileText || undefined
    );

    const f2ClassText = await page.textContent('#slightnudge-class-display');
    assert(
      Boolean(f2ClassText?.includes('flex items-center ml-2 bg-blue-500')),
      'Displays multi-utility className',
      f2ClassText || undefined
    );

    // -----------------------------------------------------------------------
    // TEST 3: Fixture 3 Conditional cn() - Unsafe Warning
    // -----------------------------------------------------------------------
    console.log('\n--- Test 3: Click selection on Fixture 3 (Conditional cn) ---');
    await page.goto(`${BASE_URL}/fixtures/3`);
    await page.waitForSelector('#target');
    await page.click('#target');

    const f3Box = await page.isVisible('#slightnudge-selected-box');
    assert(f3Box, 'Bounding box drawn on conditional element');

    const f3FileText = await page.textContent('#slightnudge-file-display');
    assert(
      Boolean(f3FileText?.includes('fixtures/3-conditional-cn.tsx:13')),
      'Displays file and line: fixtures/3-conditional-cn.tsx:13',
      f3FileText || undefined
    );

    await page.waitForSelector('#slightnudge-safety-warning', { timeout: 3000 });
    const f3WarningText = await page.textContent('#slightnudge-safety-warning');
    assert(
      Boolean(f3WarningText?.includes("can't edit this safely")),
      'Shows "can\'t edit this safely" warning pill',
      f3WarningText || undefined
    );

    // -----------------------------------------------------------------------
    // TEST 4: Fixture 4 Shared Component - Unsafe Warning
    // -----------------------------------------------------------------------
    console.log('\n--- Test 4: Click selection on Fixture 4 (Shared Component) ---');
    await page.goto(`${BASE_URL}/fixtures/4`);
    await page.waitForSelector('#card-1');
    await page.click('#card-1');

    const f4Box = await page.isVisible('#slightnudge-selected-box');
    assert(f4Box, 'Bounding box drawn on shared component');

    const f4FileText = await page.textContent('#slightnudge-file-display');
    assert(
      Boolean(f4FileText?.includes('fixtures/4-shared-component.tsx:11')),
      'Displays file and line: fixtures/4-shared-component.tsx:11',
      f4FileText || undefined
    );

    await page.waitForSelector('#slightnudge-safety-warning', { timeout: 3000 });
    const f4WarningText = await page.textContent('#slightnudge-safety-warning');
    assert(
      Boolean(f4WarningText?.includes("component used in several places")),
      'Shows warning: component used in several places',
      f4WarningText || undefined
    );

    // -----------------------------------------------------------------------
    // TEST 5: Fixture 5 Responsive Classes Selection
    // -----------------------------------------------------------------------
    console.log('\n--- Test 5: Click selection on Fixture 5 (Responsive classes) ---');
    await page.goto(`${BASE_URL}/fixtures/5`);
    await page.waitForSelector('#target');
    await page.click('#target');

    const f5Box = await page.isVisible('#slightnudge-selected-box');
    assert(f5Box, 'Bounding box drawn on responsive element');

    const f5FileText = await page.textContent('#slightnudge-file-display');
    assert(
      Boolean(f5FileText?.includes('fixtures/5-responsive-classes.tsx:7')),
      'Displays file and line: fixtures/5-responsive-classes.tsx:7',
      f5FileText || undefined
    );

    const f5ClassText = await page.textContent('#slightnudge-class-display');
    assert(
      Boolean(f5ClassText?.includes('ml-2 md:ml-4 lg:ml-8')),
      'Displays responsive classes ml-2 md:ml-4 lg:ml-8',
      f5ClassText || undefined
    );

    // -----------------------------------------------------------------------
    // TEST 6: Deselection on Escape key
    // -----------------------------------------------------------------------
    console.log('\n--- Test 6: Deselection via Escape key ---');
    await page.keyboard.press('Escape');
    const boxAfterEscape = await page.isVisible('#slightnudge-selected-box');
    assert(!boxAfterEscape, 'Selection box disappears cleanly on Escape key');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} STEP 1 SELECTION TESTS PASSED!`);
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

runStep1Tests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
