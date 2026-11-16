import {
  createScanCheckoutSession,
  handleDodoWebhookEvent,
  triggerAutomaticSystemRefund,
  verifyDodoWebhook,
} from '../lib/payments/dodo';
import { getDatabaseRepository } from '../lib/db/client';

async function runPaymentsTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 4 PAYMENTS & WEBHOOK TESTS');
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

  const repo = getDatabaseRepository();

  // 1. Create a Preview Run in DB
  const previewRun = await repo.createRun({
    id: `run_pay_test_${Date.now()}`,
    kind: 'preview',
    status: 'completed',
    stage: 'report',
    progress: 100,
    limits_json: { maxScenarios: 2 },
  });

  // Seed two findings
  await repo.saveFindings([
    {
      id: 'f_preview_1',
      run_id: previewRun.id,
      severity: 'high',
      category: 'validation',
      title: 'Free Sample Bug Title',
      body_json: {
        stepsToReproduce: ['Step 1'],
        expected: 'Expected 1',
        actual: 'Actual 1',
        evidence: {},
      },
      fix_prompt: 'Fix prompt 1',
      confidence: 'high',
    },
    {
      id: 'f_preview_2',
      run_id: previewRun.id,
      severity: 'critical',
      category: 'functional',
      title: 'Secret Locked Bug 2',
      body_json: {
        stepsToReproduce: ['Secret Step 2'],
        expected: 'Secret Expected 2',
        actual: 'Secret Actual 2',
        evidence: {},
      },
      fix_prompt: 'Secret Fix prompt 2',
      confidence: 'high',
    },
  ]);

  // 2. Checkout Session Creation
  console.log('--- 1. Checkout Session Creation ---');
  const sessionResult = await createScanCheckoutSession({
    runId: previewRun.id,
    customerEmail: 'founder@vibecoded.io',
  });
  assert(Boolean(sessionResult.checkoutUrl), 'Checkout session URL successfully generated');
  assert(sessionResult.checkoutUrl.includes(previewRun.id), 'Checkout URL contains run reference');

  // 3. Webhook Fulfillment & Run Upgrade
  console.log('\n--- 2. Webhook Event Processing & Full Scan Unlock ---');
  const paymentId = `dodo_pay_${Date.now()}`;
  const webhookResult = await handleDodoWebhookEvent({
    type: 'checkout.session.completed',
    data: {
      payment_id: paymentId,
      metadata: { runId: previewRun.id },
      amount_usd: 9.99,
    },
  });

  assert(webhookResult.success === true, 'Webhook processed successfully');
  assert(webhookResult.action === 'fulfilled', 'Webhook action was "fulfilled"');

  // Verify run upgraded to 'full'
  const upgradedRun = await repo.getRun(previewRun.id);
  assert(upgradedRun?.kind === 'full', 'Run kind was upgraded from preview to full');
  assert(upgradedRun?.status === 'queued', 'Run status was re-enqueued for full scan');
  assert(upgradedRun?.limits_json?.maxScenarios === 12, 'Scenario limits expanded to full 12');

  // 4. Webhook Idempotency Check
  console.log('\n--- 3. Webhook Idempotency Check ---');
  const duplicateWebhookResult = await handleDodoWebhookEvent({
    type: 'checkout.session.completed',
    data: {
      payment_id: paymentId,
      metadata: { runId: previewRun.id },
      amount_usd: 9.99,
    },
  });
  assert(duplicateWebhookResult.success === true, 'Duplicate webhook returns success');
  assert(duplicateWebhookResult.action === 'duplicate_skipped', 'Duplicate webhook was safely skipped (idempotent)');

  // 5. Automatic Refund Workflow
  console.log('\n--- 4. Automatic Failure Refund Trigger ---');
  const refundSuccess = await triggerAutomaticSystemRefund(
    previewRun.id,
    paymentId,
    'Cloud container crash during execution'
  );
  assert(refundSuccess === true, 'Automatic refund triggered cleanly');

  const refundedRun = await repo.getRun(previewRun.id);
  assert(refundedRun?.status === 'refunded', 'Run record marked as status="refunded"');
  assert(Boolean(refundedRun?.error?.includes('refunded')), 'Run error field explains automatic refund reason');

  // 6. Webhook Signature Security Verification
  console.log('\n--- 5. Webhook Signature Security Verification ---');
  let rejectedUnauthenticated = false;
  try {
    verifyDodoWebhook('{"test":"payload"}', {});
  } catch (err: any) {
    rejectedUnauthenticated = true;
  }
  assert(rejectedUnauthenticated, 'Unauthenticated raw webhook payload without test header is rejected');

  // Test mode mock bypass requires both SLIGHTNUDGE_TEST === '1' and x-slightnudge-test-mock header
  process.env.SLIGHTNUDGE_TEST = '1';
  const testPayload = verifyDodoWebhook('{"type":"test.event"}', { 'x-slightnudge-test-mock': 'true' });
  assert(testPayload?.type === 'test.event', 'Test-mode mock webhook payload accepted with explicit test header');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} PAYMENTS TESTS PASSED!`);
  console.log('====================================================\n');
}

if (process.argv[1] && process.argv[1].includes('payments.test')) {
  runPaymentsTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
