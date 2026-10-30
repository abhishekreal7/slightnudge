/** Production accepts Dodo's paid event, not a completed checkout UI session.
 * Schema: https://docs.dodopayments.com/developer-resources/webhooks/intents/payment */
export function paidEvent(event: any, production: boolean, productId: string | undefined, priceUsd: number) {
  const type = event?.type || event?.event_type, data = event?.data || {};
  const legacyDemo = !production && ['checkout.session.completed', 'payment_intent.succeeded'].includes(type);
  if (type !== 'payment.succeeded' && !legacyDemo) return null;
  const paymentId = data.payment_id || (!production ? data.id : undefined), runId = data.metadata?.runId || (!production ? data.run_id : undefined);
  if (typeof paymentId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(paymentId) || typeof runId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(runId)) throw new Error('Payment is missing a valid run reference.');
  if (production) {
    if (!productId) throw new Error('The paid product is not configured.');
    if (!Number.isFinite(priceUsd) || priceUsd <= 0 || data.status !== 'succeeded' || data.currency !== 'USD' || !Number.isSafeInteger(data.total_amount) || data.total_amount < Math.round(priceUsd * 100)) throw new Error('Payment status, currency or amount does not match the configured scan.');
    if (!Array.isArray(data.product_cart) || data.product_cart.length !== 1 || data.product_cart[0].product_id !== productId || data.product_cart[0].quantity !== 1) throw new Error('Payment does not match the configured scan product.');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId)) throw new Error('Payment has an invalid run reference.');
  }
  return { paymentId, runId, amountUsd: production ? data.total_amount / 100 : priceUsd };
}
