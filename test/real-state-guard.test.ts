import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

describe('Real State Integrity Guard', () => {
  const EXPECTED_HASHES: Record<string, string> = {
    '.slightnudge/history/edits.json': '29e3ff2cf25549fb7ed6165749ad5175934865ba6266ccf266dfe00cc8197b52',
    'fixtures/1-plain-static.tsx': '12227233f9c8f7824cff7d32529aca76a88eef9e319f5f16a0114c6103ffad65',
    'fixtures/2-several-utilities.tsx': 'd83df5b78fcb3108afb6ee8ee725b10a049c8f8d0077151c69e05083a092cde3',
    'fixtures/3-conditional-cn.tsx': '3108c5c61e89baaba90ea10cd7d8325ea7c196ffb077e0f637acc27e64f5ffa6',
    'fixtures/4-shared-component.tsx': '3344af67715bfa37e5aef42f6f8b34d9ad4dcde14cfe702ed69b8c772784edd8',
    'fixtures/5-responsive-classes.tsx': '126ecff807cf098a66bc6cd9e2503f58f1dfeb3223efa5b2629558a24cfcdce0',
  };

  const projectRoot = process.cwd();

  it('verifies SHA256 of real edits.json and fixtures/* match recorded baseline exactly', () => {
    for (const [relPath, expectedSha] of Object.entries(EXPECTED_HASHES)) {
      const fullPath = path.join(projectRoot, relPath);
      assert.strictEqual(
        fs.existsSync(fullPath),
        true,
        `Required file must exist: ${relPath}`
      );
      const content = fs.readFileSync(fullPath);
      const actualSha = crypto.createHash('sha256').update(content).digest('hex').toLowerCase();
      assert.strictEqual(
        actualSha,
        expectedSha.toLowerCase(),
        `Integrity violation: SHA256 mismatch for ${relPath} (expected ${expectedSha}, got ${actualSha})`
      );
    }
  });

  it('verifies git status porcelain shows zero changes on real edits.json and fixtures/*', () => {
    const gitStatus = execSync(
      'git status --porcelain -- .slightnudge/history/edits.json fixtures/',
      { cwd: projectRoot, encoding: 'utf8' }
    ).trim();
    assert.strictEqual(
      gitStatus,
      '',
      `Git status must report zero changes on real state files, but found:\n${gitStatus}`
    );
  });
});
