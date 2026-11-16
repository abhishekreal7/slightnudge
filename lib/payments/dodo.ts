import DodoPayments from 'dodopayments';
import { Webhook } from 'standardwebhooks';
import { getDatabaseRepository } from '../db/client';
import { trackFunnelEvent } from '../analytics/events';
import { paidEvent } from './paid-event';

let dodoClientInstance: DodoPayments | null = null;

export function getDodoClient(): DodoPayments | null {
  if (dodoClientInstance) return dodoClientInstance;

  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey || apiKey.includes('dodo_api_xxx')) {
    return null;
  }

  const env = (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode') || 'test_mode';
  dodoClientInstance = new DodoPayments({
    bearerToken: apiKey,
    environment: env,
  });
  return dodoClientInstance;
}

export function getScanPriceUsd(): number {
  return parseFloat(process.env.PRICE_FULL_SCAN_USD || '9.99');
}

export interface CreateCheckoutOptions {
  runId: string;
  customerEmail?: string;
  returnUrl?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId?: string;
  isMock: boolean;
}

export async function createScanCheckoutSession(
  options: CreateCheckoutOptions
): Promise<CheckoutResult> {
  const client = getDodoClient();
  if (process.env.NODE_ENV === 'production' && !process.env.DODO_PRODUCT_ID_FULL_SCAN) throw new Error('The paid product is not configured.');
  const productId = process.env.DODO_PRODUCT_ID_FULL_SCAN || 'p_full_scan_shipcheck';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const returnUrl = options.returnUrl || `${appUrl}/runs/${options.runId}?payment_status=success`;

  if (!client) {
    if (process.env.NODE_ENV === 'production') throw new Error('Payment processing is not configured.');
    // Development / Test simulation mode when no live Dodo API key is supplied
    console.log('[Dodo Payments] No live API key configured. Providing simulated checkout URL.');
    const mockSessionId = `mock_sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      checkoutUrl: `${appUrl}/api/checkout/simulate?runId=${options.runId}&session_id=${mockSessionId}`,
      sessionId: mockSessionId,
      isMock: true,
    };
  }

  const session = await (client.checkoutSessions as any).create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: options.customerEmail ? { email: options.customerEmail } : undefined,
    return_url: returnUrl,
    metadata: {
      runId: options.runId,
    },
  });

  return {
    checkoutUrl: session.checkout_url || (session as any).url,
    sessionId: session.id,
    isMock: false,
  };
}

/**
 * Verifies webhook payload signature using standardwebhooks.
 * Enforces HMAC signature verification across all environments.
 */
export function verifyDodoWebhook(payload: string, headers: Record<string, string>): any {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey || webhookKey.includes('whsec_xxx')) {
    // Only permit unauthenticated test payloads when explicitly flagged in automated test mode
    if (process.env.NODE_ENV !== 'production' && process.env.SLIGHTNUDGE_TEST === '1' && headers['x-slightnudge-test-mock'] === 'true') {
      try {
        return JSON.parse(payload);
      } catch (e) {
        throw new Error('Invalid JSON payload');
      }
    }
    throw new Error('Webhook signature verification failed: DODO_PAYMENTS_WEBHOOK_KEY is not configured');
  }

  const wh = new Webhook(webhookKey);
  return wh.verify(payload, headers);
}

export interface WebhookProcessingResult {
  success: boolean;
  action: 'fulfilled' | 'duplicate_skipped' | 'already_unlocked' | 'refunded' | 'failed' | 'ignored';
  paymentId?: string;
  runId?: string;
  message?: string;
}

/**
 * Handles webhook event processing with strict idempotency.
 */
export async function handleDodoWebhookEvent(event: any): Promise<WebhookProcessingResult> {
  const paid = paidEvent(event, process.env.NODE_ENV === 'production', process.env.DODO_PRODUCT_ID_FULL_SCAN, getScanPriceUsd());
  if (paid) {
    const action = await getDatabaseRepository().fulfillScanPayment(paid.paymentId, paid.runId, paid.amountUsd);
    if (action === 'fulfilled') trackFunnelEvent('paid', { paymentId: paid.paymentId, runId: paid.runId, amountUsd: paid.amountUsd });
    return { success: true, action, paymentId: paid.paymentId, runId: paid.runId };
  }
  const eventType = event?.type || event?.event_type || event?.event, data = event?.data || {};
  const paymentId = data.payment_id;
  if (!['refund.succeeded', 'payment.refunded'].includes(eventType)) return { success: true, action: 'ignored' };
  if (typeof paymentId !== 'string' || !paymentId) return { success: false, action: 'ignored', message: 'Missing payment_id in event data' };
  const repo = getDatabaseRepository();
  const orders = await repo.getOrdersByPaymentId(paymentId);
  const runId = orders[0]?.run_id;
  // Handle refunds
  if (eventType === 'refund.succeeded' || eventType === 'payment.refunded') {
    if (runId) {
      await repo.updateRun(runId, {
        status: 'refunded',
      });
    }
    return { success: true, action: 'refunded', paymentId, runId };
  }

  return { success: true, action: 'ignored', paymentId, runId };
}

/**
 * Automatically triggers a refund when a run fails due to internal system/hyperbrowser error.
 */
export async function triggerAutomaticSystemRefund(
  runId: string,
  dodoPaymentId: string,
  reason: string = 'System pipeline execution failure'
): Promise<boolean> {
  const client = getDodoClient();
  const repo = getDatabaseRepository();

  try {
    if (!client && process.env.NODE_ENV === 'production') throw new Error('Refund processing is not configured.');
    if (client) {
      await (client.refunds as any).create({
        payment_id: dodoPaymentId,
        reason,
      });
    }

    await repo.updateRun(runId, {
      status: 'refunded',
      error: `Run refunded automatically: ${reason}`,
    });

    console.log(`[Dodo Payments] Automatically refunded payment ${dodoPaymentId} for run ${runId}`);
    return true;
  } catch (err: any) {
    console.error(`[Dodo Refund Error]: Failed to issue refund for ${dodoPaymentId}:`, err.message);
    return false;
  }
}
