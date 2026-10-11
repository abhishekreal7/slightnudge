import { chromium, Browser, Page } from 'playwright';
import { inspectElement } from '../lib/slightnudge/ast-nudger';
import path from 'path';

interface OverfitSelectionSpec {
  index: number;
  category: string;
  elementDesc: string;
  selector: string;
  clickPosition?: { x: number; y: number };
  expectedFile: string;
  expectedLine: number;
  expectedTag: string;
  expectedOutcome: 'allowed' | 'refused';
  expectedRefusalPattern?: RegExp;
  textShouldBeAllowed?: boolean;
}

const OVERFIT_SELECTIONS: OverfitSelectionSpec[] = [
  // 1: Shell layout wrapper container
  {
    index: 1, category: 'Layout Wrapper', elementDesc: 'shell layout container',
    selector: 'div#app-shell', clickPosition: { x: 5, y: 5 },
    expectedFile: 'ShellLayout.tsx', expectedLine: 9, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 2: Shell header container
  {
    index: 2, category: 'Layout Wrapper', elementDesc: 'header boundary',
    selector: 'header', clickPosition: { x: 5, y: 5 },
    expectedFile: 'ShellLayout.tsx', expectedLine: 10, expectedTag: 'header',
    expectedOutcome: 'allowed',
  },
  // 3: Shell brand title
  {
    index: 3, category: 'Layout Wrapper', elementDesc: 'brand title span',
    selector: 'header span.text-xl',
    expectedFile: 'ShellLayout.tsx', expectedLine: 12, expectedTag: 'span',
    expectedOutcome: 'allowed',
  },
  // 4: Shell navigation link
  {
    index: 4, category: 'Layout Wrapper', elementDesc: 'header navigation link',
    selector: 'header a[href="#grid"]',
    expectedFile: 'ShellLayout.tsx', expectedLine: 14, expectedTag: 'a',
    expectedOutcome: 'allowed',
  },
  // 5: Shell main content wrapper
  {
    index: 5, category: 'Layout Wrapper', elementDesc: 'main content wrapper',
    selector: 'main', clickPosition: { x: 5, y: 5 },
    expectedFile: 'ShellLayout.tsx', expectedLine: 19, expectedTag: 'main',
    expectedOutcome: 'allowed',
  },
  // 6: Conditional Banner container
  {
    index: 6, category: 'Conditional Component', elementDesc: 'conditionally rendered banner boundary',
    selector: 'aside#promo-banner', clickPosition: { x: 5, y: 5 },
    expectedFile: 'Banner.tsx', expectedLine: 7, expectedTag: 'aside',
    expectedOutcome: 'allowed',
  },
  // 7: Conditional Banner message (prop-fed text)
  {
    index: 7, category: 'Conditional Component', elementDesc: 'banner message (prop-fed text)',
    selector: 'aside#promo-banner p',
    expectedFile: 'Banner.tsx', expectedLine: 9, expectedTag: 'p',
    expectedOutcome: 'allowed', textShouldBeAllowed: false,
  },
  // 8: Conditional Banner badge
  {
    index: 8, category: 'Conditional Component', elementDesc: 'banner notice badge',
    selector: 'aside#promo-banner span',
    expectedFile: 'Banner.tsx', expectedLine: 10, expectedTag: 'span',
    expectedOutcome: 'allowed',
  },
  // 9: NestedGrid section boundary
  {
    index: 9, category: 'Nested Grid', elementDesc: 'nested grid section boundary',
    selector: 'section#nested-grid-section', clickPosition: { x: 10, y: 10 },
    expectedFile: 'NestedGridSection.tsx', expectedLine: 10, expectedTag: 'section',
    expectedOutcome: 'allowed',
  },
  // 10: NestedGrid badge label (prop-fed text)
  {
    index: 10, category: 'Prop-fed Text', elementDesc: 'badge label (prop badgeLabel)',
    selector: 'section#nested-grid-section span.rounded-full',
    expectedFile: 'NestedGridSection.tsx', expectedLine: 12, expectedTag: 'span',
    expectedOutcome: 'allowed', textShouldBeAllowed: false,
  },
  // 11: NestedGrid section title (prop-fed text)
  {
    index: 11, category: 'Prop-fed Text', elementDesc: 'section title (prop sectionTitle)',
    selector: 'section#nested-grid-section h2',
    expectedFile: 'NestedGridSection.tsx', expectedLine: 13, expectedTag: 'h2',
    expectedOutcome: 'allowed', textShouldBeAllowed: false,
  },
  // 12: NestedGrid outer grid container
  {
    index: 12, category: 'Nested Grid', elementDesc: 'outer grid container',
    selector: 'div#outer-grid', clickPosition: { x: 2, y: 2 },
    expectedFile: 'NestedGridSection.tsx', expectedLine: 17, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 13: NestedGrid sidebar overview container
  {
    index: 13, category: 'Nested Grid', elementDesc: 'sidebar overview card',
    selector: 'div.lg\\:col-span-4', clickPosition: { x: 5, y: 5 },
    expectedFile: 'NestedGridSection.tsx', expectedLine: 18, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 14: NestedGrid sidebar title
  {
    index: 14, category: 'Nested Grid', elementDesc: 'sidebar overview heading',
    selector: 'div.lg\\:col-span-4 h3',
    expectedFile: 'NestedGridSection.tsx', expectedLine: 19, expectedTag: 'h3',
    expectedOutcome: 'allowed',
  },
  // 15: NestedGrid inner grid container
  {
    index: 15, category: 'Nested Grid', elementDesc: 'inner nested grid container',
    selector: 'div#inner-grid', clickPosition: { x: 2, y: 2 },
    expectedFile: 'NestedGridSection.tsx', expectedLine: 24, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 16: NestedGrid Cell Alpha card (in fragment)
  {
    index: 16, category: 'Fragment', elementDesc: 'Cell Alpha card inside fragment',
    selector: 'div#inner-grid > div:nth-child(1)', clickPosition: { x: 5, y: 5 },
    expectedFile: 'NestedGridSection.tsx', expectedLine: 27, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 17: NestedGrid Cell Alpha title (in fragment)
  {
    index: 17, category: 'Fragment', elementDesc: 'Cell Alpha heading inside fragment',
    selector: 'div#inner-grid > div:nth-child(1) h4',
    expectedFile: 'NestedGridSection.tsx', expectedLine: 28, expectedTag: 'h4',
    expectedOutcome: 'allowed',
  },
  // 18: NestedGrid Cell Beta card (in fragment)
  {
    index: 18, category: 'Fragment', elementDesc: 'Cell Beta card inside fragment',
    selector: 'div#inner-grid > div:nth-child(2)', clickPosition: { x: 5, y: 5 },
    expectedFile: 'NestedGridSection.tsx', expectedLine: 31, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 19: NestedGrid Cell Beta title (in fragment)
  {
    index: 19, category: 'Fragment', elementDesc: 'Cell Beta heading inside fragment',
    selector: 'div#inner-grid > div:nth-child(2) h4',
    expectedFile: 'NestedGridSection.tsx', expectedLine: 32, expectedTag: 'h4',
    expectedOutcome: 'allowed',
  },
  // 20: CardList section boundary
  {
    index: 20, category: 'Card List', elementDesc: 'card list section boundary',
    selector: 'section#card-list-section', clickPosition: { x: 5, y: 5 },
    expectedFile: 'CardListSection.tsx', expectedLine: 11, expectedTag: 'section',
    expectedOutcome: 'allowed',
  },
  // 21: CardList section heading
  {
    index: 21, category: 'Card List', elementDesc: 'card list section heading',
    selector: 'section#card-list-section h2',
    expectedFile: 'CardListSection.tsx', expectedLine: 13, expectedTag: 'h2',
    expectedOutcome: 'allowed',
  },
  // 22: CardList static card surface
  {
    index: 22, category: 'Static Card', elementDesc: 'static standalone card surface',
    selector: 'section#card-list-section div.shadow-sm', clickPosition: { x: 5, y: 5 },
    expectedFile: 'CardListSection.tsx', expectedLine: 18, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 23: CardList static card title
  {
    index: 23, category: 'Static Card', elementDesc: 'static card heading',
    selector: 'section#card-list-section div.shadow-sm h3',
    expectedFile: 'CardListSection.tsx', expectedLine: 19, expectedTag: 'h3',
    expectedOutcome: 'allowed',
  },
  // 24: CardList static card tier badge
  {
    index: 24, category: 'Static Card', elementDesc: 'static card tier badge',
    selector: 'section#card-list-section div.shadow-sm span',
    expectedFile: 'CardListSection.tsx', expectedLine: 21, expectedTag: 'span',
    expectedOutcome: 'allowed',
  },
  // 25: CardList first mapped card surface (conditional cn)
  {
    index: 25, category: 'Conditional Class', elementDesc: 'first mapped card (conditional cn)',
    selector: 'section#card-list-section article >> nth=0',
    expectedFile: 'CardListSection.tsx', expectedLine: 27, expectedTag: 'article',
    expectedOutcome: 'refused', expectedRefusalPattern: /condition/i,
  },
  // 26: CardList first mapped card title (in map)
  {
    index: 26, category: 'Repeated Element', elementDesc: 'first mapped card title (in map)',
    selector: 'section#card-list-section article >> nth=0 >> h4',
    expectedFile: 'CardListSection.tsx', expectedLine: 31, expectedTag: 'h4',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 27: DynamicWidget container
  {
    index: 27, category: 'Dynamic Component', elementDesc: 'dynamic widget container',
    selector: 'div#dynamic-widget', clickPosition: { x: 5, y: 5 },
    expectedFile: 'DynamicWidget.tsx', expectedLine: 3, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 28: DynamicWidget heading
  {
    index: 28, category: 'Dynamic Component', elementDesc: 'dynamic widget heading',
    selector: 'div#dynamic-widget h3',
    expectedFile: 'DynamicWidget.tsx', expectedLine: 4, expectedTag: 'h3',
    expectedOutcome: 'allowed',
  },
  // 29: Footer shared badge (used twice)
  {
    index: 29, category: 'Shared Component', elementDesc: 'shared badge (used twice)',
    selector: 'footer span:has-text("Enterprise Ready") >> nth=0',
    expectedFile: 'FooterSection.tsx', expectedLine: 2, expectedTag: 'span',
    expectedOutcome: 'refused', expectedRefusalPattern: /used in several places/i,
  },
  // 30: Footer unstyled raw button (no className)
  {
    index: 30, category: 'Unstyled Control', elementDesc: 'button without className',
    selector: 'footer button',
    expectedFile: 'FooterSection.tsx', expectedLine: 15, expectedTag: 'button',
    expectedOutcome: 'refused', expectedRefusalPattern: /no className/i,
  },
];

async function runOverfitSuite() {
  console.log('====================================================');
  console.log('🧪 OVERFITTING CHECK: SECOND TEST APP 30 SELECTIONS');
  console.log('====================================================\n');

  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:3002', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app-shell');

  const repoBase = path.resolve('.slightnudge/repositories/m0-overfit-lab');

  let allowed = 0;
  let refused = 0;
  let wrongTarget = 0;

  console.log('| # | Category | Clicked Element | Expected | Actual | Target File:Line:Tag | Verdict |');
  console.log('|---|---|---|---|---|---|---|');

  for (const s of OVERFIT_SELECTIONS) {
    const locator = page.locator(s.selector);
    const count = await locator.count();
    if (count === 0) {
      console.error(`Locator not found: ${s.selector}`);
      wrongTarget++;
      continue;
    }

    await locator.scrollIntoViewIfNeeded();

    if (s.clickPosition) {
      await locator.click({ position: s.clickPosition });
    } else {
      await locator.click();
    }

    const domInfo = await locator.evaluate((el) => {
      const marker = el.closest('[data-source-file]') || el;
      const markerRect = marker.getBoundingClientRect();
      const clickedRect = el.getBoundingClientRect();
      return {
        clickedTag: el.tagName.toLowerCase(),
        clickedClasses: el.className || '',
        markerFile: marker.getAttribute('data-source-file') || '',
        markerLine: Number(marker.getAttribute('data-source-line')) || 0,
        markerColumn: Number(marker.getAttribute('data-source-column')) || 0,
        markerTag: marker.tagName.toLowerCase(),
        markerClasses: marker.className || '',
        markerRect: { top: markerRect.top, left: markerRect.left, width: markerRect.width, height: markerRect.height },
        clickedRect: { top: clickedRect.top, left: clickedRect.left, width: clickedRect.width, height: clickedRect.height },
      };
    });

    const fullFilePath = path.resolve(repoBase, domInfo.markerFile);

    const inspection = inspectElement({
      filePath: fullFilePath,
      line: domInfo.markerLine,
      column: domInfo.markerColumn,
      tagName: domInfo.clickedTag,
      className: domInfo.clickedClasses,
      rect: domInfo.markerRect,
      clickedRect: domInfo.clickedRect,
    });

    const actualOutcome = inspection.safeToEdit ? 'allowed' : 'refused';
    const targetFileBasename = path.basename(inspection.filePath || domInfo.markerFile);

    let isWrongTarget = false;
    let verdict = 'OK';

    if (targetFileBasename !== s.expectedFile || inspection.line !== s.expectedLine) {
      isWrongTarget = true;
      verdict = `WRONG TARGET (expected ${s.expectedFile}:${s.expectedLine}, got ${targetFileBasename}:${inspection.line})`;
    } else if (inspection.tagName?.toLowerCase() !== s.expectedTag.toLowerCase()) {
      isWrongTarget = true;
      verdict = `WRONG TAG (expected ${s.expectedTag}, got ${inspection.tagName})`;
    } else if (actualOutcome !== s.expectedOutcome) {
      isWrongTarget = true;
      verdict = `OUTCOME MISMATCH (expected ${s.expectedOutcome}, got ${actualOutcome})`;
    } else if (s.expectedRefusalPattern && inspection.reason && !s.expectedRefusalPattern.test(inspection.reason)) {
      isWrongTarget = true;
      verdict = `WRONG REASON (${inspection.reason})`;
    } else if (s.textShouldBeAllowed === false && inspection.textEditable !== false) {
      isWrongTarget = true;
      verdict = `TEXT NOT REFUSED`;
    }

    if (isWrongTarget) {
      wrongTarget++;
    } else {
      if (actualOutcome === 'allowed') allowed++;
      else refused++;
    }

    console.log(`| ${s.index} | ${s.category} | ${s.elementDesc} | ${s.expectedOutcome} | ${actualOutcome} | ${targetFileBasename}:${inspection.line}:${inspection.tagName} | ${verdict} |`);
  }

  await browser.close();

  console.log('\n====================================================');
  console.log('SECOND TEST APP (OVERFITTING CHECK) RESULTS:');
  console.log(`  Allowed: ${allowed}`);
  console.log(`  Refused: ${refused}`);
  console.log(`  Wrong Targets: ${wrongTarget}`);
  console.log('====================================================\n');

  if (wrongTarget > 0) {
    throw new Error(`OVERFITTING CHECK FAILED: ${wrongTarget} wrong targets found.`);
  }
}

runOverfitSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
