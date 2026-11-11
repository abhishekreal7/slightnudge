const mutableTestEnvironment: Record<string, string | undefined> = process.env;
import assert from 'node:assert/strict';
import { GET } from '../app/api/checkout/simulate/route';
import { createScanCheckoutSession } from '../lib/payments/dodo';
import { getDatabaseRepository } from '../lib/db/client';
import { validateTargetUrl } from '../lib/security/ssrf';
import { GET as adminMetrics } from '../app/api/admin/metrics/route';
import { generateTestPlan, analyzeTestResults } from '../lib/llm/generator';

const previousMode = process.env.NODE_ENV;
const previousAdmin = process.env.ADMIN_SECRET_KEY;
try {
  mutableTestEnvironment.NODE_ENV = 'production';
  delete process.env.ADMIN_SECRET_KEY;
  assert.equal((await adminMetrics(new Request('https://example.test/api/admin/metrics?admin_key=shipcheck_admin_secret_dev'))).status, 503);
  process.env.ADMIN_SECRET_KEY = 'test-admin-key';
  assert.equal((await adminMetrics(new Request('https://example.test/api/admin/metrics?admin_key=test-admin-key'))).status, 401);
  assert.equal((await validateTargetUrl('http://localhost:3100', { allowLocalhost: true })).isValid, false);
  assert.equal((await GET(new Request('https://example.test/api/checkout/simulate?runId=run_test&action=confirm'))).status, 404);
  // This suite must not use real payment or database credentials.
  if (!process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_PAYMENTS_API_KEY.includes('dodo_api_xxx')) await assert.rejects(createScanCheckoutSession({ runId: 'run_test' }), /not configured/);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) assert.throws(() => getDatabaseRepository(), /production database/);
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('sk-ant-xxx')) {
    await assert.rejects(generateTestPlan({ routes: [] }), /not configured/);
    await assert.rejects(analyzeTestResults([], []), /not configured/);
  }
  mutableTestEnvironment.NODE_ENV = 'development';
  assert.equal((await GET(new Request('http://localhost:3000/api/checkout/simulate?runId=%3Cscript%3Ebad%3C%2Fscript%3E'))).status, 400);
  assert.equal((await GET(new Request('http://localhost:3000/api/checkout/simulate?runId=run_test&session_id=%22%3E%3Cscript%3E'))).status, 400);
  console.log('PASS production boundaries: simulated payment disabled, no missing-configuration payment/database/analysis fallback, simulated checkout rejects markup injection');
} finally { if (previousMode === undefined) delete mutableTestEnvironment.NODE_ENV; else mutableTestEnvironment.NODE_ENV = previousMode; if (previousAdmin === undefined) delete process.env.ADMIN_SECRET_KEY; else process.env.ADMIN_SECRET_KEY = previousAdmin; }
