import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { getSessionToken } from '../../lib/slightnudge/auth';
import { readHistory, applyPendingSourceEdit } from '../../lib/slightnudge/edit-history';

// Setup temporary canary fixtures
const tmpBase = path.join(os.tmpdir(), `sn-step2-audit-${crypto.randomBytes(6).toString('hex')}`);
const canaryHistoryFile = path.join(tmpBase, 'canary-edits.json');
const canaryDataDir = path.join(tmpBase, 'canary-data');
const canaryDataHistory = path.join(canaryDataDir, 'history', 'edits.json');
const canaryPendingDir = path.join(tmpBase, 'canary-pending');
const canaryPendingId = '00000000-0000-0000-0000-000000000042';
const canaryPendingFile = path.join(canaryPendingDir, `${canaryPendingId}.json`);
const canaryWsDir = path.join(tmpBase, 'canary-workspace');

fs.mkdirSync(tmpBase, { recursive: true });
fs.mkdirSync(path.join(canaryDataDir, 'history'), { recursive: true });
fs.mkdirSync(canaryPendingDir, { recursive: true });
fs.mkdirSync(canaryWsDir, { recursive: true });

// Also put a canary file inside canaryWsDir so we can test workspace containment
const testFileInCanaryWs = path.join(canaryWsDir, 'ws-test-file.tsx');
fs.writeFileSync(testFileInCanaryWs, 'export default function WsTest() { return <div>WS</div>; }\n', 'utf8');

const canaryHistoryRecord = {
  id: 'canary-history-123',
  filePath: 'app/page.tsx',
  createdAt: new Date().toISOString(),
  summary: 'canary history',
  before: 'const a = 1;',
  after: 'const a = 2;',
  status: 'applied',
};

const canaryDataRecord = {
  id: 'canary-data-456',
  filePath: 'app/page.tsx',
  createdAt: new Date().toISOString(),
  summary: 'canary data dir',
  before: 'const b = 1;',
  after: 'const b = 2;',
  status: 'applied',
};

const canaryWsRecord = {
  id: 'canary-ws-789',
  filePath: 'ws-test-file.tsx',
  createdAt: new Date().toISOString(),
  summary: 'canary ws record',
  before: 'export default function WsTest() { return <div>WS</div>; }\n',
  after: 'export default function WsTest() { return <div>WS2</div>; }\n',
  status: 'applied',
};

// Create a valid canary pending edit
const canaryDummyFile = path.join(canaryWsDir, 'test-target.tsx');
fs.writeFileSync(canaryDummyFile, 'export default function Test() { return <div className="p-4">Hello</div>; }\n', 'utf8');

const canaryPendingRecord = {
  id: canaryPendingId,
  filePath: 'test-target.tsx',
  createdAt: new Date().toISOString(),
  summary: 'canary pending',
  oldValue: 'p-4',
  newValue: 'p-6',
  previewType: 'className',
  line: 1,
  before: 'export default function Test() { return <div className="p-4">Hello</div>; }\n',
  after: 'export default function Test() { return <div className="p-6">Hello</div>; }\n',
};

fs.writeFileSync(canaryHistoryFile, JSON.stringify([canaryHistoryRecord], null, 2), 'utf8');
fs.writeFileSync(canaryDataHistory, JSON.stringify([canaryDataRecord, canaryWsRecord], null, 2), 'utf8');
fs.writeFileSync(canaryPendingFile, JSON.stringify(canaryPendingRecord, null, 2), 'utf8');

const testCases = [
  { name: 'SLIGHTNUDGE_TEST unset', testVal: undefined, nodeEnv: 'development' },
  { name: 'SLIGHTNUDGE_TEST="true"', testVal: 'true', nodeEnv: 'development' },
  { name: 'SLIGHTNUDGE_TEST="0"', testVal: '0', nodeEnv: 'development' },
  { name: 'SLIGHTNUDGE_TEST=""', testVal: '', nodeEnv: 'development' },
  { name: 'SLIGHTNUDGE_TEST="2"', testVal: '2', nodeEnv: 'development' },
  { name: 'SLIGHTNUDGE_TEST="1" (Control)', testVal: '1', nodeEnv: 'development' },
  { name: 'SLIGHTNUDGE_TEST="1" with NODE_ENV="production" (Step 2f)', testVal: '1', nodeEnv: 'production' },
];

console.log('========================================================================');
console.log('STEP 2: TEST-OVERRIDE AUDIT RESULTS');
console.log('========================================================================\n');

async function run() {
  for (const tc of testCases) {
    console.log(`--- Test Case: ${tc.name} ---`);
    
    // Set overrides
    const CANARY_TOKEN = 'canary-secret-token-override-12345';
    process.env.SLIGHTNUDGE_SESSION_TOKEN = CANARY_TOKEN;
    process.env.SLIGHTNUDGE_WORKSPACE_ROOT = canaryWsDir;
    process.env.SLIGHTNUDGE_DATA_DIR = canaryDataDir;
    process.env.SLIGHTNUDGE_HISTORY_PATH = canaryHistoryFile;
    process.env.SLIGHTNUDGE_PENDING_DIR = canaryPendingDir;
    process.env.NODE_ENV = tc.nodeEnv;

    if (tc.testVal === undefined) {
      delete process.env.SLIGHTNUDGE_TEST;
    } else {
      process.env.SLIGHTNUDGE_TEST = tc.testVal;
    }

    // Clear global token cache
    const g = globalThis as any;
    delete g[Symbol.for('slightnudge.sessionToken')];

    // 1. Session token
    const token = getSessionToken();
    const tokenOverridden = token === CANARY_TOKEN;
    console.log(`  Session Token:  ${tokenOverridden ? 'OVERRIDDEN (' + token + ')' : 'IGNORED (random 64-char hex: ' + token.slice(0, 16) + '...)'}`);

    // 2. Pending dir: try reading canaryPendingId via applyPendingSourceEdit
    let pendingOverridden = false;
    let pendingMsg = '';
    try {
      await applyPendingSourceEdit(canaryPendingId);
      pendingOverridden = true;
      pendingMsg = 'read canary pending file from canary pending dir';
    } catch (err: any) {
      if (err.message && err.message.includes('canary-pending')) {
        pendingOverridden = true;
        pendingMsg = `found canary pending in ${canaryPendingDir}`;
      } else if (err.code === 'ENOENT' || (err.message && err.message.includes('.slightnudge'))) {
        pendingOverridden = false;
        pendingMsg = `ENOENT in real .slightnudge/pending`;
      } else {
        pendingOverridden = true;
        pendingMsg = `read canary pending edit, failed downstream: ${err.message}`;
      }
    }
    console.log(`  Pending Dir:    ${pendingOverridden ? 'OVERRIDDEN (' + pendingMsg + ')' : 'IGNORED (' + pendingMsg + ')'}`);

    // 3. History path
    process.env.SLIGHTNUDGE_HISTORY_PATH = canaryHistoryFile;
    let historyOverridden = false;
    try {
      const h = readHistory();
      if (h.some(r => r.id === 'canary-history-123')) historyOverridden = true;
    } catch (err: any) {}
    console.log(`  History Path:   ${historyOverridden ? 'OVERRIDDEN (read canary history file)' : 'IGNORED (read default edits.json)'}`);

    // 4. Data dir (when HISTORY_PATH is deleted, DATA_DIR takes effect if test mode active)
    delete process.env.SLIGHTNUDGE_HISTORY_PATH;
    let dataDirOverridden = false;
    try {
      const h = readHistory();
      if (h.some(r => r.id === 'canary-data-456')) dataDirOverridden = true;
    } catch (err: any) {}
    console.log(`  Data Dir:       ${dataDirOverridden ? 'OVERRIDDEN (read canary data history)' : 'IGNORED (read default data dir history)'}`);

    // 5. Workspace Root
    // If test mode is active, getWorkspacePath() returns canaryWsDir.
    // In that case, ws-test-file.tsx (which only exists in canaryWsDir) is found on disk, so rec.missing is undefined.
    // If test mode is inactive, getWorkspacePath() returns process.cwd(), where ws-test-file.tsx does not exist, so rec.missing is true.
    let wsRootOverridden = false;
    try {
      const h = readHistory();
      const rec = h.find(r => r.id === 'canary-ws-789');
      if (rec && !rec.missing) {
        wsRootOverridden = true;
      }
    } catch (err: any) {}
    console.log(`  Workspace Root: ${wsRootOverridden ? 'OVERRIDDEN (resolved files inside canary workspace)' : 'IGNORED (anchored to process.cwd())'}`);

    // Summary verdict for this case
    const overridesActive = tokenOverridden || pendingOverridden || historyOverridden || dataDirOverridden || wsRootOverridden;
    console.log(`  VERDICT:        ${overridesActive ? 'OVERRIDES ACTIVE' : 'ALL OVERRIDES INERT/IGNORED'}\n`);
  }

  // Cleanup canary fixtures
  try {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  } catch {}
}

run().catch(console.error);
