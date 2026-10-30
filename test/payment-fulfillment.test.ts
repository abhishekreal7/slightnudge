import assert from 'node:assert/strict';
import { MemoryDatabaseRepository } from '../lib/db/client';
import { paidEvent } from '../lib/payments/paid-event';

const id = '035d6b1a-27f3-4b64-b18d-64aa61eb50d4';
const event = { type: 'payment.succeeded', data: { payment_id: 'pay_verified', status: 'succeeded', currency: 'USD', total_amount: 999, metadata: { runId: id }, product_cart: [{ product_id: 'scan_product', quantity: 1 }] } };
assert.deepEqual(paidEvent(event, true, 'scan_product', 9.99), { paymentId: 'pay_verified', runId: id, amountUsd: 9.99 });
assert.equal(paidEvent({ ...event, type: 'checkout.session.completed' }, true, 'scan_product', 9.99), null);
for (const change of [{ status: 'processing' }, { currency: 'INR' }, { total_amount: 1 }, { product_cart: [{ product_id: 'other', quantity: 1 }] }, { product_cart: [{ product_id: 'scan_product', quantity: 2 }] }, { metadata: { runId: 'invalid' } }]) assert.throws(() => paidEvent({ ...event, data: { ...event.data, ...change } }, true, 'scan_product', 9.99));
assert.throws(() => paidEvent(event, true, undefined, 9.99));
const repo = new MemoryDatabaseRepository(); await repo.createRun({ id, user_id: 'actual_owner', kind: 'preview' });
const results = await Promise.all(Array.from({ length: 50 }, () => repo.fulfillScanPayment('payment_once', id, 9.99)));
assert.equal(results.filter(result => result === 'fulfilled').length, 1); assert.equal(repo.orders.size, 1); assert.equal(repo.jobs.size, 1); assert.equal((await repo.getRun(id))?.kind, 'full'); assert.equal([...repo.orders.values()][0].user_id, 'actual_owner');
await repo.createRun({ id: 'another', kind: 'preview' }); await assert.rejects(repo.fulfillScanPayment('payment_once', 'another', 9.99), /another run/); assert.equal((await repo.getRun('another'))?.kind, 'preview');
assert.equal(await repo.fulfillScanPayment('second_purchase', id, 9.99), 'already_unlocked'); assert.equal(repo.jobs.size, 1); assert.equal(repo.orders.size, 2);
await assert.rejects(repo.fulfillScanPayment('unknown_run', 'missing', 9.99), /not found/); assert.equal(repo.orders.size, 2);
console.log('PASS payment fulfillment: canonical paid-event/product/status/currency/amount validation, 50 concurrent retries produce one unlock/job, correct owner, cross-run payment reuse refused, duplicate purchase recorded without duplicate work, missing-run refusal');
