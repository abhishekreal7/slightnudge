import fs from 'fs';
import path from 'path';

export function analyzeUnsupported(dataPath = path.resolve('tools/coverage-study/data/parsed-study.json')) {
  const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const unsupported = rows.filter(r => r.verdict === 'UNSUPPORTED');

  const classification = {};

  unsupported.forEach(u => {
    const diff = u.diff || u.notes || '';
    const notes = u.notes || '';
    let reason = 'Other / Unknown';

    if (/Insert new element/i.test(notes) || u.category === 'insert') {
      reason = 'JSX Element Insertion (new tags/elements)';
    } else if (/Component extraction/i.test(notes) || u.category === 'component extraction') {
      reason = 'Component Extraction (multi-file refactoring)';
    } else if (/Variant '(.*?)' is not in/i.test(notes)) {
      const m = notes.match(/Variant '(.*?)' is not in/);
      reason = `Unsupported Tailwind Variant: ${m ? m[1] : 'custom'}`;
    } else if (/Multi-element compound class rewrite/i.test(notes) || notes.includes('Unsupported')) {
      if (/console\.log|router\.refresh|revalidate|eslint|@ts-ignore/i.test(diff)) {
        reason = 'Non-UI: Runtime logic / linter / routing / cache directives';
      } else if (/<meta |title: |twitter: |og: |metadataBase/i.test(diff)) {
        reason = 'Non-UI: Head / SEO / Page Metadata objects';
      } else if (/interface |type |z\.string\(\)/i.test(diff)) {
        reason = 'Non-UI: TypeScript types / schemas';
      } else if (/repoName:|link:|desc:|companyList|\.replace\(/i.test(diff)) {
        reason = 'Non-UI: Data structures / JSON arrays / string formatting';
      } else if (/^diff --git.*?package\.json|yarn\.lock|pnpm-lock|\.css/i.test(diff)) {
        reason = 'Non-UI: Config / package.json / CSS stylesheet files';
      } else if (/className=/i.test(diff)) {
        reason = 'Compound multi-element / multi-node JSX class updates';
      } else {
        reason = 'Non-UI: Miscellaneous code logic & comments';
      }
    }

    classification[reason] = (classification[reason] || 0) + 1;
  });

  return {
    total: unsupported.length,
    classification
  };
}

if (process.argv[1] && process.argv[1].endsWith('analyze-unsupported.js')) {
  const res = analyzeUnsupported();
  console.log(`UNSUPPORTED Classification (Total: ${res.total}):`);
  for (const [k, v] of Object.entries(res.classification).sort((a,b) => b[1] - a[1])) {
    console.log(`  • ${k}: ${v} (${(v / res.total * 100).toFixed(1)}%)`);
  }
}
