import { execSync } from 'child_process';
import { chromium, Browser, Page } from 'playwright';
import { computeNudgedClass, getNextSpacingValue, TAILWIND_SPACING_SCALE } from '../lib/slightnudge/nudge-calculator';

async function runStep2Tests() {
  console.log('====================================================');
  console.log('🧪 SLIGHTNUDGE - STEP 2: KEYBOARD ARROW NUDGING SUITE');
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

  // -------------------------------------------------------------------------
  // PART A: Unit scale calculations
  // -------------------------------------------------------------------------
  console.log('--- Part A: Spacing Scale Step Calculations ---');
  assert(getNextSpacingValue('2', 'increase', 'normal') === '2.5', '1 step increase: 2 -> 2.5');
  assert(getNextSpacingValue('2.5', 'decrease', 'normal') === '2', '1 step decrease: 2.5 -> 2');
  assert(getNextSpacingValue('2', 'increase', 'big') === '4', 'Shift big step (+4 steps): 2 -> 4');
  assert(getNextSpacingValue('4', 'decrease', 'big') === '2', 'Shift big step (-4 steps): 4 -> 2');

  const unitNudge1 = computeNudgedClass({
    currentClassName: 'flex items-center ml-2 bg-blue-500',
    direction: 'right',
    stepSize: 'normal',
  });
  assert(
    unitNudge1.newClassName === 'flex items-center ml-2.5 bg-blue-500',
    'Normal right nudge preserves sibling utilities'
  );

  const unitNudgeBig = computeNudgedClass({
    currentClassName: 'flex items-center ml-2 bg-blue-500',
    direction: 'right',
    stepSize: 'big',
  });
  assert(
    unitNudgeBig.newClassName === 'flex items-center ml-4 bg-blue-500',
    'Shift big right nudge jumps to ml-4'
  );

  const unitNudgeResponsive = computeNudgedClass({
    currentClassName: 'ml-2 md:ml-4 lg:ml-8',
    direction: 'right',
    stepSize: 'normal',
  });
  assert(
    unitNudgeResponsive.newClassName === 'ml-2.5 md:ml-4 lg:ml-8',
    'Base nudge preserves md:ml-4 and lg:ml-8 responsive variants'
  );

  // -------------------------------------------------------------------------
  // PART B: Live Browser End-to-End Arrow Key Interactions
  // -------------------------------------------------------------------------
  console.log('\n--- Part B: Live Browser Arrow Key Interactions ---');
  const initialGitHash = execSync('git rev-parse HEAD').toString().trim();
  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  try {
    // 1. Fixture 1: Plain static arrow nudging
    console.log('\n- B1: Fixture 1 live ArrowRight & Shift+ArrowRight -');
    await page.goto('http://localhost:3000/fixtures/1');
    await page.waitForSelector('#target');
    await page.click('#target');

    // Nudge 1 step right
    await page.keyboard.press('ArrowRight');
    const f1ClassAfterStep1 = await page.$eval('#target', el => el.className);
    assert(f1ClassAfterStep1 === 'ml-2.5', 'ArrowRight nudges ml-2 -> ml-2.5');

    const f1HudText = await page.textContent('#slightnudge-class-display');
    assert(Boolean(f1HudText?.includes('ml-2.5')), 'HUD class display reflects ml-2.5');

    // Shift + ArrowRight: bigger step (+4 from ml-2.5 -> ml-5)
    await page.keyboard.press('Shift+ArrowRight');
    const f1ClassAfterBig = await page.$eval('#target', el => el.className);
    assert(f1ClassAfterBig === 'ml-5', 'Shift+ArrowRight jumps from ml-2.5 to ml-5 (+4 steps)');

    // ArrowLeft: decrease 1 step (from ml-5 -> ml-4)
    await page.keyboard.press('ArrowLeft');
    const f1ClassAfterLeft = await page.$eval('#target', el => el.className);
    assert(f1ClassAfterLeft === 'ml-4', 'ArrowLeft steps back from ml-5 to ml-4 (-1 step)');

    // 2. Fixture 2: Multi-utility live nudging
    console.log('\n- B2: Fixture 2 preserves utilities during arrow nudging -');
    await page.goto('http://localhost:3000/fixtures/2');
    await page.waitForSelector('#target');
    await page.click('#target');

    await page.keyboard.press('ArrowRight');
    const f2ClassAfterRight = await page.$eval('#target', el => el.className);
    assert(
      f2ClassAfterRight.includes('ml-2.5') && f2ClassAfterRight.includes('bg-blue-500 text-white p-4'),
      'Live ArrowRight replaces only ml-2 with ml-2.5 and preserves all other utilities'
    );

    // Shift+ArrowRight on multi-utility (+4 steps from ml-2.5 -> ml-5)
    await page.keyboard.press('Shift+ArrowRight');
    const f2ClassAfterBig = await page.$eval('#target', el => el.className);
    assert(
      f2ClassAfterBig.includes('ml-5') && f2ClassAfterBig.includes('bg-blue-500 text-white p-4'),
      'Live Shift+ArrowRight jumps to ml-5 while preserving all other utilities'
    );

    // 3. Fixture 3: Unsafe conditional cn - Arrow keys BLOCKED
    console.log('\n- B3: Fixture 3 conditional cn refuses arrow nudging safely -');
    await page.goto('http://localhost:3000/fixtures/3');
    await page.waitForSelector('#target');
    await page.click('#target');

    // Wait for safety warning
    await page.waitForSelector('#slightnudge-safety-warning');
    const f3OriginalClass = await page.$eval('#target', el => el.className);

    // Press ArrowRight on unsafe element
    await page.keyboard.press('ArrowRight');
    const f3ClassAfterArrow = await page.$eval('#target', el => el.className);
    assert(f3ClassAfterArrow === f3OriginalClass, 'ArrowRight blocked: unsafe element left completely untouched');

    // 4. Fixture 4: Unsafe shared component - Arrow keys BLOCKED
    console.log('\n- B4: Fixture 4 shared component refuses arrow nudging safely -');
    await page.goto('http://localhost:3000/fixtures/4');
    await page.waitForSelector('#card-1');
    await page.click('#card-1');

    await page.waitForSelector('#slightnudge-safety-warning');
    const f4OriginalClass = await page.$eval('#card-1', el => el.className);

    await page.keyboard.press('ArrowRight');
    const f4ClassAfterArrow = await page.$eval('#card-1', el => el.className);
    assert(f4ClassAfterArrow === f4OriginalClass, 'ArrowRight blocked: shared component left completely untouched');

    // 5. Fixture 5: Responsive classes live nudging
    console.log('\n- B5: Fixture 5 live nudging preserves responsive breakpoints -');
    await page.goto('http://localhost:3000/fixtures/5');
    await page.waitForSelector('#target');
    await page.click('#target');

    await page.keyboard.press('ArrowRight');
    const f5ClassAfterRight = await page.$eval('#target', el => el.className);
    assert(
      f5ClassAfterRight.includes('ml-2.5') && f5ClassAfterRight.includes('md:ml-4 lg:ml-8'),
      'Live ArrowRight nudges base ml-2 -> ml-2.5 while md:ml-4 lg:ml-8 remain untouched'
    );

    await page.keyboard.press('Shift+ArrowRight');
    const f5ClassAfterBig = await page.$eval('#target', el => el.className);
    assert(
      f5ClassAfterBig.includes('ml-5') && f5ClassAfterBig.includes('md:ml-4 lg:ml-8'),
      'Live Shift+ArrowRight jumps base to ml-5 while md:ml-4 lg:ml-8 remain untouched'
    );

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} STEP 2 NUDGING TESTS PASSED!`);
    console.log('====================================================\n');
  } finally {
    await browser.close();
    execSync(`git reset --hard ${initialGitHash}`, { stdio: 'pipe' });
  }
}

runStep2Tests().catch((err) => {
  console.error('Step 2 tests failed:', err);
  process.exit(1);
});
