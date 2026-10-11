import {
  trackFunnelEvent,
  getFunnelEventsHistory,
  clearFunnelEventsForTesting,
} from '../lib/analytics/events.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
    throw new Error(msg);
  } else {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  }
}

async function runFunnelTests() {
  console.log('--- SHIPCHECK FUNNEL ANALYTICS SUITE ---\n');

  clearFunnelEventsForTesting();
  assert(getFunnelEventsHistory().length === 0, 'Event log clears correctly');

  // 1. Visit
  trackFunnelEvent('visit', { referrer: 'direct', page: '/' });
  let events = getFunnelEventsHistory();
  assert(events.length === 1, 'Visit event logged');
  assert(events[0].event === 'visit', 'Visit event name matches');
  assert(events[0].properties?.page === '/', 'Visit properties match');

  // 2. URL Submitted
  trackFunnelEvent('url_submitted', {
    url: 'https://vibeapp.example.com',
    authProvided: true,
  });
  events = getFunnelEventsHistory();
  assert(events.length === 2, 'url_submitted event logged');
  assert(events[1].event === 'url_submitted', 'url_submitted event name matches');
  assert(events[1].properties?.authProvided === true, 'url_submitted auth flag matches');

  // 3. Preview Viewed
  trackFunnelEvent('preview_viewed', {
    runId: 'run-test-123',
    kind: 'preview',
    healthScore: 72,
    totalFindings: 4,
  });
  events = getFunnelEventsHistory();
  assert(events.length === 3, 'preview_viewed event logged');
  assert(events[2].event === 'preview_viewed', 'preview_viewed event name matches');
  assert(events[2].properties?.healthScore === 72, 'health score logged in funnel');

  // 4. Checkout Started
  trackFunnelEvent('checkout_started', {
    runId: 'run-test-123',
  });
  events = getFunnelEventsHistory();
  assert(events.length === 4, 'checkout_started event logged');
  assert(events[3].event === 'checkout_started', 'checkout_started name matches');

  // 5. Paid
  trackFunnelEvent('paid', {
    orderId: 'ord-test-456',
    dodoPaymentId: 'pay_dodo_789',
    runId: 'run-test-123',
    amountCents: 999,
  });
  events = getFunnelEventsHistory();
  assert(events.length === 5, 'paid event logged');
  assert(events[4].event === 'paid', 'paid event name matches');
  assert(events[4].properties?.amountCents === 999, 'paid amount matches $9.99');

  // 6. Complete Funnel Sequence Validation
  const funnelSteps = events.map((e) => e.event);
  assert(
    JSON.stringify(funnelSteps) ===
      JSON.stringify(['visit', 'url_submitted', 'preview_viewed', 'checkout_started', 'paid']),
    'Strict 5-step conversion funnel preserved in order'
  );

  console.log(`\n========================================`);
  console.log(`Funnel Analytics Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runFunnelTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
