import fs from 'fs';
import path from 'path';

export function wilsonInterval(k, n, confidence = 0.95) {
  const z = 1.959964; // 95%
  const p = k / n;
  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) / n) + (z * z) / (4 * n * n))) / denominator;
  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);
  return {
    k,
    n,
    rate: p,
    lower,
    upper,
    percentage: (p * 100).toFixed(2) + '%',
    intervalStr: `[${(lower * 100).toFixed(2)}%, ${(upper * 100).toFixed(2)}%]`
  };
}

export function analyzePartials(dataPath = path.resolve('tools/coverage-study/data/parsed-study.json')) {
  const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const partials = rows.filter(r => r.verdict === 'PARTIAL');

  const breakdown = {
    'order-only': [],
    'different-tokens': [],
    'multiple-tokens-changed': [],
    'formatting-only': [],
    'other-non-ui': []
  };

  partials.forEach(p => {
    const diffSnippet = p.diff || p.notes || '';
    const category = p.category;

    if (category === 'other' || /console\.log|router\.refresh|revalidate|eslint|@ts-ignore|interface|type |function |desc:|title:|repoName:|aria-|placeholder:|name:|linkName:|styles:|colors:|ORDER BY/i.test(diffSnippet)) {
      if (!/className=/.test(diffSnippet) && !/<title>|>.*?<\//.test(diffSnippet)) {
        breakdown['other-non-ui'].push(p);
        return;
      }
    }

    if (diffSnippet.includes('formatting') || /\{\" \"\}|\.{\" \"\}|&apos;|trailing slash/i.test(diffSnippet)) {
      if (!/className=/.test(diffSnippet)) {
        breakdown['formatting-only'].push(p);
        return;
      }
    }

    if (/className=/.test(diffSnippet)) {
      const remMatch = diffSnippet.match(/-.*?className=["`']([^"`']+)["`']/);
      const addMatch = diffSnippet.match(/\+.*?className=["`']([^"`']+)["`']/);

      if (remMatch && addMatch) {
        const oldTokens = remMatch[1].trim().split(/\s+/).sort();
        const newTokens = addMatch[1].trim().split(/\s+/).sort();

        if (oldTokens.join(' ') === newTokens.join(' ')) {
          breakdown['order-only'].push(p);
        } else {
          const oldSet = new Set(oldTokens);
          const newSet = new Set(newTokens);
          const addedTokens = newTokens.filter(t => !oldSet.has(t));
          const removedTokens = oldTokens.filter(t => !newSet.has(t));

          if (addedTokens.length > 1 || removedTokens.length > 1) {
            breakdown['multiple-tokens-changed'].push(p);
          } else {
            breakdown['different-tokens'].push(p);
          }
        }
      } else {
        breakdown['multiple-tokens-changed'].push(p);
      }
    } else if (category === 'text' || diffSnippet.includes('Text updated')) {
      breakdown['formatting-only'].push(p);
    } else {
      breakdown['other-non-ui'].push(p);
    }
  });

  const rateA = wilsonInterval(30, 325);
  // (B) Token-level exact match with untouched preserved:
  // REPRODUCED (30) + order-only (3) = 33
  const countB = 30 + breakdown['order-only'].length;
  const rateB = wilsonInterval(countB, 325);

  return {
    totalPartials: partials.length,
    counts: {
      'order-only': breakdown['order-only'].length,
      'different-tokens': breakdown['different-tokens'].length,
      'multiple-tokens-changed': breakdown['multiple-tokens-changed'].length,
      'formatting-only': breakdown['formatting-only'].length,
      'other-non-ui': breakdown['other-non-ui'].length
    },
    rateA,
    rateB,
    breakdown
  };
}

if (process.argv[1] && process.argv[1].endsWith('analyze-partials.js')) {
  const res = analyzePartials();
  console.log('PARTIAL Breakdown (Total: 156):');
  for (const [k, v] of Object.entries(res.counts)) {
    console.log(`  ${k}: ${v} (${(v / 156 * 100).toFixed(2)}%)`);
  }
  console.log('\n(A) Byte-identical diff rate:', res.rateA.percentage, res.rateA.intervalStr);
  console.log('(B) Token exact match with untouched preserved rate:', res.rateB.percentage, res.rateB.intervalStr);
}
