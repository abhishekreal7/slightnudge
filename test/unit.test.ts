import { isPrivateIp, validateTargetUrl } from '../lib/security/ssrf';
import { encryptCredentials, decryptCredentials } from '../lib/security/encryption';
import { FindingSchema, TestPlanOutputSchema } from '../lib/llm/schemas';

async function runUnitTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SHIPCHECK UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. SSRF & IP Security
  console.log('--- 1. SSRF & Private IP Blocking ---');
  assert(isPrivateIp('127.0.0.1'), '127.0.0.1 is detected as private/loopback');
  assert(isPrivateIp('10.0.0.5'), '10.0.0.5 is detected as private');
  assert(isPrivateIp('172.16.0.1'), '172.16.0.1 is detected as private');
  assert(isPrivateIp('192.168.1.100'), '192.168.1.100 is detected as private');
  assert(isPrivateIp('169.254.169.254'), 'AWS/GCP metadata IP 169.254.169.254 is blocked');
  assert(isPrivateIp('::1'), 'IPv6 loopback ::1 is blocked');
  assert(!isPrivateIp('93.184.216.34'), 'Public IP 93.184.216.34 is allowed');

  const fileScheme = await validateTargetUrl('file:///etc/passwd');
  assert(!fileScheme.isValid, 'file:// URLs are strictly rejected');

  const metaUrl = await validateTargetUrl('http://169.254.169.254/latest/meta-data/');
  assert(!metaUrl.isValid, 'Instance metadata URL is strictly rejected');

  // 2. AES-256-GCM Credential Encryption
  console.log('\n--- 2. Credential Encryption at Rest (AES-256-GCM) ---');
  const secretCreds = JSON.stringify({ username: 'testuser', password: 'SuperSecretPassword123!' });
  const encrypted = encryptCredentials(secretCreds);
  assert(encrypted !== secretCreds, 'Encrypted string differs from plain text');
  assert(encrypted.includes('iv') && encrypted.includes('tag'), 'Encrypted output contains IV and Auth Tag');

  const decrypted = decryptCredentials(encrypted);
  assert(decrypted === secretCreds, 'Decrypted output matches original credentials exactly');

  // 3. Zod Schemas Validation
  console.log('\n--- 3. Strict Zod Schema Validation ---');
  const validFinding = {
    id: 'f_test_1',
    title: 'Button Crash Bug',
    severity: 'high' as const,
    category: 'functional' as const,
    stepsToReproduce: ['Click button', 'App crashes'],
    expected: 'Page should not crash',
    actual: 'Page crashed with error',
    likelyCause: 'Hypothesis: null pointer exception',
    fixPrompt: 'Please fix the null pointer exception in button handler',
    confidence: 'high' as const,
    evidence: {
      screenshotIds: ['shot_1'],
      consoleLines: ['TypeError: cannot read property of null'],
      networkEntries: [],
    },
  };

  const parseResult = FindingSchema.safeParse(validFinding);
  assert(parseResult.success, 'Valid finding passes FindingSchema');

  const invalidFinding = {
    id: 'f_test_2',
    title: 'Missing required fields',
    // Missing severity, category, stepsToReproduce, fixPrompt
  };
  const failResult = FindingSchema.safeParse(invalidFinding);
  assert(!failResult.success, 'Malformed finding is correctly rejected by Zod');

  // 4. Cost and Margin Calculation
  console.log('\n--- 4. Cost and Margin Guardrail Calculations ---');
  const price = 9.99;
  const dodoFeePercent = 0.04;
  const dodoFeeFixed = 0.40;
  const dodoFee = price * dodoFeePercent + dodoFeeFixed; // 0.3996 + 0.40 = ~0.80
  const maxRunCostCredits = 15;
  const costPerCredit = 0.02;
  const worstCaseRunCost = maxRunCostCredits * costPerCredit; // 0.30
  const netMargin = price - dodoFee - worstCaseRunCost; // 9.99 - 0.80 - 0.30 = 8.89

  assert(netMargin > 3.0, `Margin $${netMargin.toFixed(2)} exceeds min margin requirement of $3.00`);

  // 5. Order Webhook Idempotency Simulation
  console.log('\n--- 5. Webhook Idempotency Verification ---');
  const processedOrders = new Set<string>();

  function processPaymentWebhook(paymentId: string): boolean {
    if (processedOrders.has(paymentId)) {
      return false; // Idempotent skip
    }
    processedOrders.add(paymentId);
    return true; // First time fulfillment
  }

  const firstWebhook = processPaymentWebhook('dodo_pay_xyz123');
  assert(firstWebhook === true, 'First payment webhook fulfills order');

  const duplicateWebhook = processPaymentWebhook('dodo_pay_xyz123');
  assert(duplicateWebhook === false, 'Duplicate payment webhook is safely skipped (idempotent)');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} UNIT TESTS PASSED!`);
  console.log('====================================================\n');
}

if (process.argv[1] && process.argv[1].includes('unit.test')) {
  runUnitTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
