import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const TOOLING_DIR = 'C:\\dev\\vibecheck-review-tools';

export function generateToolingManifest() {
  const entries = [];

  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'mutants') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.isFile()) {
        const rel = path.relative(TOOLING_DIR, full).replace(/\\/g, '/');
        const content = fs.readFileSync(full);
        const hash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
        entries.push({ file: rel, size: content.length, hash });
      }
    }
  }

  scan(TOOLING_DIR);
  entries.sort((a, b) => a.file.localeCompare(b.file));

  let out = '# Persistent Review Tooling Manifest\n';
  out += `# Tooling Root: ${TOOLING_DIR}\n`;
  out += `# Generated: ${new Date().toISOString()}\n\n`;
  out += '| File | Size (Bytes) | SHA-256 |\n';
  out += '|---|---|---|\n';
  for (const e of entries) {
    out += `| ${e.file} | ${e.size} | ${e.hash} |\n`;
  }

  return { entries, markdown: out };
}

if (process.argv[1] && process.argv[1].endsWith('manifest.js')) {
  const { markdown } = generateToolingManifest();
  console.log(markdown);
}
