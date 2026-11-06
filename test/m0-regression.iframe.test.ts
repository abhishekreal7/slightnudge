import { chromium, Browser, Page } from 'playwright';
import { inspectElement } from '../lib/slightnudge/ast-nudger';
import path from 'path';

interface SelectionSpec {
  index: number;
  section: string;
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

const SELECTIONS: SelectionSpec[] = [
  // 1: Hero section boundary/background
  {
    index: 1, section: 'Hero', elementDesc: 'hero section boundary/background',
    selector: 'section#top', clickPosition: { x: 15, y: 15 },
    expectedFile: 'Hero.tsx', expectedLine: 10, expectedTag: 'section',
    expectedOutcome: 'allowed',
  },
  // 2: Hero eyebrow text
  {
    index: 2, section: 'Hero', elementDesc: 'eyebrow text',
    selector: 'section#top p.mb-6',
    expectedFile: 'Hero.tsx', expectedLine: 12, expectedTag: 'p',
    expectedOutcome: 'allowed',
  },
  // 3: Hero main headline
  {
    index: 3, section: 'Hero', elementDesc: 'main headline (prop title)',
    selector: 'section#top h1',
    expectedFile: 'Hero.tsx', expectedLine: 13, expectedTag: 'h1',
    expectedOutcome: 'allowed', textShouldBeAllowed: false,
  },
  // 4: Hero supporting paragraph
  {
    index: 4, section: 'Hero', elementDesc: 'supporting paragraph (prop description)',
    selector: 'section#top p.leading-8',
    expectedFile: 'Hero.tsx', expectedLine: 14, expectedTag: 'p',
    expectedOutcome: 'allowed', textShouldBeAllowed: false,
  },
  // 5: Hero primary CTA
  {
    index: 5, section: 'Hero', elementDesc: 'primary CTA',
    selector: 'section#top a[href="#pricing"]',
    expectedFile: 'Hero.tsx', expectedLine: 16, expectedTag: 'a',
    expectedOutcome: 'allowed',
  },
  // 6: Features section boundary/background
  {
    index: 6, section: 'Features', elementDesc: 'features section boundary/background',
    selector: 'section#features', clickPosition: { x: 15, y: 15 },
    expectedFile: 'Features.tsx', expectedLine: 11, expectedTag: 'section',
    expectedOutcome: 'allowed',
  },
  // 7: Features section heading
  {
    index: 7, section: 'Features', elementDesc: 'section heading',
    selector: 'section#features h2',
    expectedFile: 'Features.tsx', expectedLine: 13, expectedTag: 'h2',
    expectedOutcome: 'allowed',
  },
  // 8: Features feature grid background
  {
    index: 8, section: 'Features', elementDesc: 'feature grid background',
    selector: 'section#features div.mt-12.grid', clickPosition: { x: 2, y: 2 },
    expectedFile: 'Features.tsx', expectedLine: 14, expectedTag: 'div',
    expectedOutcome: 'allowed',
  },
  // 9: Features first feature card surface
  {
    index: 9, section: 'Features', elementDesc: 'first feature card surface (conditional cn)',
    selector: 'section#features article >> nth=0',
    expectedFile: 'Features.tsx', expectedLine: 16, expectedTag: 'article',
    expectedOutcome: 'refused', expectedRefusalPattern: /condition/i,
  },
  // 10: Features first feature title
  {
    index: 10, section: 'Features', elementDesc: 'first feature title (in map)',
    selector: 'section#features article >> nth=0 >> h3',
    expectedFile: 'Features.tsx', expectedLine: 18, expectedTag: 'h3',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 11: Features first feature description
  {
    index: 11, section: 'Features', elementDesc: 'first feature description (in map)',
    selector: 'section#features article >> nth=0 >> p',
    expectedFile: 'Features.tsx', expectedLine: 19, expectedTag: 'p',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 12: Pricing section boundary/background
  {
    index: 12, section: 'Pricing', elementDesc: 'pricing section boundary/background',
    selector: 'section#pricing', clickPosition: { x: 15, y: 15 },
    expectedFile: 'Pricing.tsx', expectedLine: 5, expectedTag: 'section',
    expectedOutcome: 'allowed',
  },
  // 13: Pricing heading
  {
    index: 13, section: 'Pricing', elementDesc: 'pricing heading',
    selector: 'section#pricing h2',
    expectedFile: 'Pricing.tsx', expectedLine: 6, expectedTag: 'h2',
    expectedOutcome: 'allowed',
  },
  // 14: Pricing first plan card surface
  {
    index: 14, section: 'Pricing', elementDesc: 'first plan card surface (static card)',
    selector: 'section#pricing article >> nth=0',
    expectedFile: 'Pricing.tsx', expectedLine: 8, expectedTag: 'article',
    expectedOutcome: 'allowed',
  },
  // 15: Pricing plan name
  {
    index: 15, section: 'Pricing', elementDesc: 'plan name',
    selector: 'section#pricing article >> nth=0 >> h3',
    expectedFile: 'Pricing.tsx', expectedLine: 9, expectedTag: 'h3',
    expectedOutcome: 'allowed',
  },
  // 16: Pricing monthly price
  {
    index: 16, section: 'Pricing', elementDesc: 'monthly price',
    selector: 'section#pricing article >> nth=0 >> span.tabular-nums',
    expectedFile: 'Pricing.tsx', expectedLine: 11, expectedTag: 'span',
    expectedOutcome: 'allowed',
  },
  // 17: Pricing first plan feature row
  {
    index: 17, section: 'Pricing', elementDesc: 'first plan feature row (in essentials.map)',
    selector: 'section#pricing article >> nth=0 >> li >> nth=0',
    expectedFile: 'Pricing.tsx', expectedLine: 12, expectedTag: 'li',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 18: Pricing secondary CTA button
  {
    index: 18, section: 'Pricing', elementDesc: 'secondary CTA button (no className)',
    selector: 'section#pricing article >> nth=0 >> button',
    expectedFile: 'Pricing.tsx', expectedLine: 13, expectedTag: 'button',
    expectedOutcome: 'refused', expectedRefusalPattern: /no className/i,
  },
  // 19: Testimonials section boundary/background
  {
    index: 19, section: 'Testimonials', elementDesc: 'testimonials section boundary/background',
    selector: 'section.bg-\\[\\#eef3ef\\]', clickPosition: { x: 15, y: 15 },
    expectedFile: 'Testimonials.tsx', expectedLine: 9, expectedTag: 'section',
    expectedOutcome: 'allowed',
  },
  // 20: Testimonials section heading
  {
    index: 20, section: 'Testimonials', elementDesc: 'section heading',
    selector: 'section.bg-\\[\\#eef3ef\\] h2',
    expectedFile: 'Testimonials.tsx', expectedLine: 11, expectedTag: 'h2',
    expectedOutcome: 'allowed',
  },
  // 21: Testimonials first quote card surface
  {
    index: 21, section: 'Testimonials', elementDesc: 'first quote card surface (in map)',
    selector: 'section.bg-\\[\\#eef3ef\\] article >> nth=0',
    expectedFile: 'Testimonials.tsx', expectedLine: 14, expectedTag: 'article',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 22: Testimonials first quote text
  {
    index: 22, section: 'Testimonials', elementDesc: 'first quote text (in map)',
    selector: 'section.bg-\\[\\#eef3ef\\] article >> nth=0 >> p.text-lg',
    expectedFile: 'Testimonials.tsx', expectedLine: 15, expectedTag: 'p',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 23: Testimonials first author name
  {
    index: 23, section: 'Testimonials', elementDesc: 'first author name (in map)',
    selector: 'section.bg-\\[\\#eef3ef\\] article >> nth=0 >> p.font-semibold',
    expectedFile: 'Testimonials.tsx', expectedLine: 16, expectedTag: 'p',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 24: FAQ section boundary/background
  {
    index: 24, section: 'FAQ', elementDesc: 'FAQ section boundary/background',
    selector: 'section#faq', clickPosition: { x: 15, y: 15 },
    expectedFile: 'FAQ.tsx', expectedLine: 11, expectedTag: 'section',
    expectedOutcome: 'allowed',
  },
  // 25: FAQ heading
  {
    index: 25, section: 'FAQ', elementDesc: 'FAQ heading',
    selector: 'section#faq h2',
    expectedFile: 'FAQ.tsx', expectedLine: 13, expectedTag: 'h2',
    expectedOutcome: 'allowed',
  },
  // 26: FAQ first answer card surface
  {
    index: 26, section: 'FAQ', elementDesc: 'first answer card surface (conditional cn)',
    selector: 'section#faq article >> nth=0',
    expectedFile: 'FAQ.tsx', expectedLine: 16, expectedTag: 'article',
    expectedOutcome: 'refused', expectedRefusalPattern: /condition/i,
  },
  // 27: FAQ first question
  {
    index: 27, section: 'FAQ', elementDesc: 'first question (in map)',
    selector: 'section#faq article >> nth=0 >> h3',
    expectedFile: 'FAQ.tsx', expectedLine: 17, expectedTag: 'h3',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 28: FAQ first answer
  {
    index: 28, section: 'FAQ', elementDesc: 'first answer (in map)',
    selector: 'section#faq article >> nth=0 >> p',
    expectedFile: 'FAQ.tsx', expectedLine: 18, expectedTag: 'p',
    expectedOutcome: 'refused', expectedRefusalPattern: /repeats from a list/i,
  },
  // 29: Footer brand link
  {
    index: 29, section: 'Footer', elementDesc: 'brand link',
    selector: 'footer a[href="#top"]',
    expectedFile: 'Footer.tsx', expectedLine: 9, expectedTag: 'a',
    expectedOutcome: 'allowed',
  },
  // 30: Footer trust badge rendered twice
  {
    index: 30, section: 'Footer', elementDesc: 'trust badge rendered twice',
    selector: 'footer span:has-text("Thoughtful by design") >> nth=0',
    expectedFile: 'Footer.tsx', expectedLine: 2, expectedTag: 'span',
    expectedOutcome: 'refused', expectedRefusalPattern: /used in several places/i,
  },
];

import { runIframeSelections } from './helpers/m0-iframe-selection-gate';
runIframeSelections(SELECTIONS, 'regression').catch(error => { console.error(error); process.exitCode=1; });
