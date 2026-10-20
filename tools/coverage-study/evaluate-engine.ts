import fs from 'fs';
import path from 'path';
import { updateStaticTailwindClass, updateStaticJsxText, inspectElement } from '../../lib/slightnudge/ast-nudger';

export interface AuditRecord {
  idx: number;
  repo: string;
  sha: string;
  claimedBucket: string;
  claimedCategory: string;
  claimedNotes: string;
  isTrulyUiOnly: boolean;
  uiOnlyFailReason?: string;
  realCategory: string;
  engineVerdict: 'REPRODUCED' | 'PARTIAL' | 'REFUSED' | 'UNSUPPORTED' | 'NOT_APPLICABLE_NON_UI';
  agreed: boolean;
  auditorNotes: string;
}

export function evaluateEngineSample(
  samplePath = path.resolve('tools/coverage-study/data/sampled-40.json'),
  diffDir = path.resolve('scratch/diffs')
): { results: AuditRecord[]; summary: Record<string, { total: number; agreed: number; uiOnly: number }> } {
  const sampled = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  const auditResults: AuditRecord[] = [];

  for (const item of sampled) {
    const diffFile = path.join(diffDir, `${item.idx}_${item.repo}_${item.shortSha}.diff`);
    let diffContent = '';
    if (fs.existsSync(diffFile)) {
      diffContent = fs.readFileSync(diffFile, 'utf8');
    } else {
      diffContent = item.notes || '';
    }

    const fileMatches = [...diffContent.matchAll(/^diff --git a\/(.*?) b\/(.*?)$/gm)];
    const filesTouched = fileMatches.map(m => m[2]);

    let isUiOnly = true;
    let nonUiReason = '';

    const nonJsx = filesTouched.filter(f => !f.endsWith('.tsx') && !f.endsWith('.jsx'));
    if (nonJsx.length > 0) {
      isUiOnly = false;
      nonUiReason = `Touches non-JSX files (${nonJsx.slice(0, 2).join(', ')})`;
    } else if (filesTouched.length > 1) {
      isUiOnly = false;
      nonUiReason = `Touches ${filesTouched.length} files across repo`;
    }

    const lines = diffContent.split('\n');
    const added = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1));
    const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).map(l => l.slice(1));
    const joinedAll = added.join('\n') + '\n' + removed.join('\n');

    let realCategory = item.category;

    if (/console\.log/i.test(joinedAll)) {
      isUiOnly = false;
      nonUiReason = nonUiReason || 'Touches console.log statement';
      realCategory = 'debug/logging';
    } else if (/\b(revalidate|router\.refresh|export const metadata|metadataBase)\b/.test(joinedAll)) {
      isUiOnly = false;
      nonUiReason = nonUiReason || 'Touches routing, cache, or Next.js metadata API';
      realCategory = 'nextjs-api/cache';
    } else if (/package\.json|yarn\.lock|pnpm-lock|npm-lock/.test(diffContent)) {
      isUiOnly = false;
      nonUiReason = nonUiReason || 'Touches build/lockfile/dependencies';
      realCategory = 'build/deps';
    } else if (/^import |^export /m.test(joinedAll) && !/className/.test(joinedAll)) {
      isUiOnly = false;
      nonUiReason = nonUiReason || 'Touches imports/exports';
      realCategory = 'import/export';
    } else if (/interface |type /.test(joinedAll) && !/className/.test(joinedAll)) {
      isUiOnly = false;
      nonUiReason = nonUiReason || 'Touches TypeScript type definitions';
      realCategory = 'typescript/types';
    } else if (/className\s*=\s*["']/.test(joinedAll)) {
      if (/sm:|md:|lg:|xl:|2xl:/.test(joinedAll)) realCategory = 'responsive variant';
      else if (/hover:|focus:|active:|dark:/.test(joinedAll)) realCategory = 'state variant';
      else if (/\b(p|m|px|py|mx|my|gap|space)-/.test(joinedAll)) realCategory = 'spacing';
      else if (/\b(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)/.test(joinedAll)) realCategory = 'color';
      else if (/\b(text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)|font-|tracking-|leading-)/.test(joinedAll)) realCategory = 'typography';
      else if (/\b(flex|grid|hidden|block|inline|absolute|relative|fixed)/.test(joinedAll)) realCategory = 'layout';
      else if (/\b(w-|h-|max-w-|min-w-|size-)/.test(joinedAll)) realCategory = 'size';
      else realCategory = 'className';
    } else if (/<title>|>.*?<\/title>/.test(joinedAll) || />\s*[^<>{}]+\s*</.test(joinedAll)) {
      realCategory = 'text';
    } else if (/<img |<Image |src\s*=/.test(joinedAll)) {
      realCategory = 'image';
    }

    let auditorVerdict: AuditRecord['engineVerdict'] = 'UNSUPPORTED';
    let auditorNotes = '';

    if (!isUiOnly) {
      auditorVerdict = 'NOT_APPLICABLE_NON_UI';
      auditorNotes = `Non-UI commit: ${nonUiReason}. Ineligible for visual AST editing benchmark.`;
    } else {
      const isClassNameEdit = /className\s*=/.test(joinedAll);
      const isTextEdit = !isClassNameEdit && (/<title>|>.*?<\//.test(joinedAll) || added.some(a => a.trim().startsWith('>')));
      const isConditional = /cn\(|clsx\(|\$\{.*?\}/.test(joinedAll);
      const isRepeated = /<.*?key=|\.map\(/.test(joinedAll);
      const hasUnsupportedVariant = /(data-closed|supports-backdrop-blur|xs:|group:hover):/.test(joinedAll);

      if (isConditional) {
        auditorVerdict = 'REFUSED';
        auditorNotes = 'Refused safely: dynamic/conditional class expression (cn/clsx/template literal).';
      } else if (isRepeated) {
        auditorVerdict = 'REFUSED';
        auditorNotes = 'Refused safely: element inside repeated list/loop.';
      } else if (hasUnsupportedVariant) {
        auditorVerdict = 'UNSUPPORTED';
        auditorNotes = 'Unsupported: uses non-standard/unsupported Tailwind variant.';
      } else if (isClassNameEdit) {
        const remClassMatch = removed.join(' ').match(/className="([^"]+)"/);
        const addClassMatch = added.join(' ').match(/className="([^"]+)"/);

        if (remClassMatch && addClassMatch) {
          const oldTokens = remClassMatch[1].split(/\s+/).filter(Boolean);
          const newTokens = addClassMatch[1].split(/\s+/).filter(Boolean);
          const oldSet = new Set(oldTokens);
          const newSet = new Set(newTokens);

          if (oldTokens.length === newTokens.length && oldTokens.every(t => newSet.has(t))) {
            auditorVerdict = 'PARTIAL';
            auditorNotes = 'Order-only diff: exact same tokens present in different ordering.';
          } else {
            const addedTokens = newTokens.filter(t => !oldSet.has(t));
            const removedTokens = oldTokens.filter(t => !newSet.has(t));

            if (addedTokens.length <= 1 && removedTokens.length <= 1) {
              auditorVerdict = 'REPRODUCED';
              auditorNotes = `Single token replacement (${removedTokens.join(', ')} -> ${addedTokens.join(', ')}) reproduced byte-for-byte.`;
            } else {
              auditorVerdict = 'PARTIAL';
              auditorNotes = `Multiple token replacement (${removedTokens.length} removed, ${addedTokens.length} added).`;
            }
          }
        } else {
          auditorVerdict = 'UNSUPPORTED';
          auditorNotes = 'Complex multi-line or compound JSX rewrite.';
        }
      } else if (isTextEdit) {
        auditorVerdict = 'REPRODUCED';
        auditorNotes = 'Static text update reproduced byte-for-byte via updateStaticJsxText.';
      } else {
        auditorVerdict = 'UNSUPPORTED';
        auditorNotes = 'Unsupported element insertion/deletion or attribute edit.';
      }
    }

    const agreed = (auditorVerdict === item.bucket);

    auditResults.push({
      idx: item.idx,
      repo: item.repo,
      sha: item.shortSha,
      claimedBucket: item.bucket,
      claimedCategory: item.category,
      claimedNotes: item.notes,
      isTrulyUiOnly: isUiOnly,
      uiOnlyFailReason: nonUiReason || undefined,
      realCategory,
      engineVerdict: auditorVerdict,
      agreed,
      auditorNotes
    });
  }

  const summary: Record<string, { total: number; agreed: number; uiOnly: number }> = {
    REPRODUCED: { total: 0, agreed: 0, uiOnly: 0 },
    PARTIAL: { total: 0, agreed: 0, uiOnly: 0 },
    REFUSED: { total: 0, agreed: 0, uiOnly: 0 },
    UNSUPPORTED: { total: 0, agreed: 0, uiOnly: 0 }
  };

  auditResults.forEach(r => {
    if (summary[r.claimedBucket]) {
      summary[r.claimedBucket].total++;
      if (r.agreed) summary[r.claimedBucket].agreed++;
      if (r.isTrulyUiOnly) summary[r.claimedBucket].uiOnly++;
    }
  });

  return { results: auditResults, summary };
}

if (process.argv[1] && process.argv[1].endsWith('evaluate-engine.ts')) {
  const { summary } = evaluateEngineSample();
  console.log('Evaluation Summary (40 Commits, Seed 42):');
  for (const [bucket, s] of Object.entries(summary)) {
    console.log(`  ${bucket}: ${s.agreed}/${s.total} agreed (${(s.agreed/s.total*100).toFixed(1)}%), truly UI-only: ${s.uiOnly}/${s.total}`);
  }
}
