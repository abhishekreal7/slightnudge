import fs from 'fs';
import path from 'path';

export function parseCoverageStudy(filePath = path.resolve('docs/coverage-study.md')) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const startIdx = lines.findIndex(l => l.includes('## 7. Appendix: Full Per-Commit Replay Records'));
  
  if (startIdx === -1) {
    throw new Error('Could not find Section 7 (Full Per-Commit Replay Records) in coverage-study.md');
  }

  const rows = [];

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) continue;
    const parts = line.split('|').map(s => s.trim());
    if (parts.length < 9) continue;
    const idx = parseInt(parts[1], 10);
    if (isNaN(idx)) continue;
    const repo = parts[2].replace(/`/g, '');
    const shaMatch = parts[3].match(/\[`([0-9a-f]+)`\]\(([0-9a-f]+)\)/i) || parts[3].match(/([0-9a-f]{7,})/i);
    const shortSha = shaMatch ? shaMatch[1] : parts[3];
    const fullSha = shaMatch && shaMatch[2] ? shaMatch[2] : shortSha;
    const author = parts[4];
    const category = parts[5].replace(/`/g, '');
    const verdictRaw = parts[6];
    let verdict = 'UNKNOWN';
    if (verdictRaw.includes('REPRODUCED')) verdict = 'REPRODUCED';
    else if (verdictRaw.includes('PARTIAL')) verdict = 'PARTIAL';
    else if (verdictRaw.includes('REFUSED')) verdict = 'REFUSED';
    else if (verdictRaw.includes('UNSUPPORTED')) verdict = 'UNSUPPORTED';
    const notes = parts[7];
    const diff = parts.slice(8, parts.length - 1).join('|');
    rows.push({ idx, repo, shortSha, fullSha, author, category, verdict, notes, diff });
  }

  return rows;
}

if (process.argv[1] && process.argv[1].endsWith('parse-study.js')) {
  const rows = parseCoverageStudy();
  console.log(`Parsed ${rows.length} rows from docs/coverage-study.md`);
  const buckets = {};
  rows.forEach(r => {
    buckets[r.verdict] = (buckets[r.verdict] || 0) + 1;
  });
  console.log('Bucket counts:', buckets);
}
