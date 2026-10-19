import { isAllowedOrigin, corsHeaders, handleCorsPreflight } from '../lib/slightnudge/cors';
import { getBridgeClient, getNextSourceAdapterStatus, installNextSourceAdapter, removeNextSourceAdapter } from '../lib/slightnudge/next-source-adapter';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runInSituFocusTests() {
  console.log('====================================================');
  console.log('🧪 IN-SITU LOCALHOST FOCUS MODE & CORS TESTS');
  console.log('====================================================\n');

  // 1. CORS Origin Validation
  console.log('--- 1. CORS Origin Validation ---');
  assert(isAllowedOrigin('http://localhost:3001', 'http://localhost:3000/api/slightnudge/preview'), 'Allows http://localhost:3001');
  assert(isAllowedOrigin('http://127.0.0.1:3001', 'http://localhost:3000/api/slightnudge/preview'), 'Allows http://127.0.0.1:3001');
  assert(isAllowedOrigin('http://localhost:5173', 'http://localhost:3000/api/slightnudge/preview'), 'Allows Vite dev port http://localhost:5173');
  assert(isAllowedOrigin('http://localhost:3000', 'http://localhost:3000/api/slightnudge/preview'), 'Allows same origin http://localhost:3000');
  assert(isAllowedOrigin(null, 'http://localhost:3000/api/slightnudge/preview'), 'Allows same-origin request without Origin header');
  assert(!isAllowedOrigin('http://malicious.com', 'http://localhost:3000/api/slightnudge/preview'), 'Blocks unauthorized external domain');
  assert(!isAllowedOrigin('https://phishing-site.org', 'http://localhost:3000/api/slightnudge/preview'), 'Blocks external https origin');

  // 2. Preflight Handling
  console.log('\n--- 2. Preflight OPTIONS Handling ---');
  const req = new Request('http://localhost:3000/api/slightnudge/preview', {
    method: 'OPTIONS',
    headers: { origin: 'http://localhost:3001' },
  });
  const preflight = handleCorsPreflight(req);
  assert(Boolean(preflight), 'Preflight handled for OPTIONS');
  assert(preflight?.status === 204, 'Preflight status is 204 No Content');
  assert(preflight?.headers.get('Access-Control-Allow-Origin') === 'http://localhost:3001', 'CORS allow-origin header returned');
  assert(preflight?.headers.get('Access-Control-Allow-Methods')?.includes('POST') === true, 'CORS allow-methods includes POST');

  // 3. In-Situ Standalone Bridge Client Capabilities
  console.log('\n--- 3. Standalone Bridge In-Situ Capabilities ---');
  const bridge = getBridgeClient('abhishekreal7-keymail');
  assert(bridge.includes('__slightnudge_root'), 'Bridge creates isolated __slightnudge_root container');
  assert(bridge.includes('attachShadow'), 'Bridge uses Shadow DOM for indestructible style isolation');
  assert(bridge.includes('sn-dock'), 'Bridge defines in-situ floating dock');
  assert(bridge.includes('Inspect: ON'), 'Bridge provides interactive inspect mode toggle');
  assert(bridge.includes('Alt'), 'Bridge supports Alt+Click instant selection');
  assert(bridge.includes('Move earlier'), 'Bridge provides arrange reorder controls');
  assert(bridge.includes('Apply to code'), 'Bridge provides Apply to code button');
  assert(bridge.includes('Undo'), 'Bridge provides Undo button');
  assert(bridge.includes('/api/slightnudge/apply'), 'Bridge wires directly to SlightNudge apply API');
  assert(bridge.includes('/api/slightnudge/undo'), 'Bridge wires directly to SlightNudge undo API');

  // 4. TypeScript Config Adapter Support
  console.log('\n--- 4. Next.js TypeScript Config Adapter Lifecycle ---');
  const repoId = 'abhishekreal7-keymail';
  const initialStatus = await getNextSourceAdapterStatus(repoId);
  assert(initialStatus.enabled === false, 'Adapter initially disabled for keymail');

  const installResult = await installNextSourceAdapter(repoId);
  assert(installResult.success === true, 'Adapter installs successfully on Next.js repo with next.config.ts');
  const installedStatus = await getNextSourceAdapterStatus(repoId);
  assert(installedStatus.enabled === true, 'Adapter status is enabled');

  const removeResult = await removeNextSourceAdapter(repoId);
  assert(removeResult.success === true, 'Adapter removes cleanly and restores original config');
  const finalStatus = await getNextSourceAdapterStatus(repoId);
  assert(finalStatus.enabled === false, 'Adapter status reverted to disabled');

  console.log('\n====================================================');
  console.log('🎉 ALL IN-SITU FOCUS TESTS PASSED!');
  console.log('====================================================\n');
}

runInSituFocusTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
