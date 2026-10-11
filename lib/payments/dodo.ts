import DodoPayments from 'dodopayments';
import { Webhook } from 'standardwebhooks';
import { getDatabaseRepository } from '../db/client';
import { trackFunnelEvent } from '../analytics/events';

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
  const productId = process.env.DODO_PRODUCT_ID_FULL_SCAN || 'p_full_scan_shipcheck';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const returnUrl = options.returnUrl || `${appUrl}/runs/${options.runId}?payment_status=success`;

  if (!client) {
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
 */
export function verifyDodoWebhook(payload: string, headers: Record<string, string>): any {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey || webhookKey.includes('whsec_xxx')) {
    // If running in development without webhook secret, attempt raw JSON parse
    if (process.env.NODE_ENV !== 'production') {
      try {
        return JSON.parse(payload);
      } catch (e) {
        throw new Error('Invalid JSON payload');
      }
    }
    throw new Error('DODO_PAYMENTS_WEBHOOK_KEY is not configured');
  }

  const wh = new Webhook(webhookKey);
  return wh.verify(payload, headers);
}

export interface WebhookProcessingResult {
  success: boolean;
  action: 'fulfilled' | 'duplicate_skipped' | 'refunded' | 'failed' | 'ignored';
  paymentId?: string;
  runId?: string;
  message?: string;
}

/**
 * Handles webhook event processing with strict idempotency.
 */
export async function handleDodoWebhookEvent(event: any): Promise<WebhookProcessingResult> {
  const repo = getDatabaseRepository();
  const eventType = event.type || event.event;
  const data = event.data || event;

  const paymentId = data.payment_id || data.id || data.session_id;
  const runId = data.metadata?.runId || data.run_id;

  if (!paymentId) {
    return { success: false, action: 'ignored', message: 'Missing payment_id in event data' };
  }

  // Handle successful checkout / payment
  if (
    eventType === 'checkout.session.completed' ||
    eventType === 'payment.succeeded' ||
    eventType === 'payment_intent.succeeded'
  ) {
    if (!runId) {
      return { success: false, action: 'ignored', message: 'No runId associated with payment' };
    }

    // Check existing order for idempotency
    const existingOrders = await (repo as any).getOrdersByPaymentId?.(paymentId);
    if (existingOrders && existingOrders.length > 0) {
      console.log(`[Dodo Webhook] Duplicate payment webhook detected for ${paymentId}. Skipping.`);
      return { success: true, action: 'duplicate_skipped', paymentId, runId };
    }

    // Save order record
    try {
      await (repo as any).createOrder?.({
        id: `ord_${Date.now()}`,
        user_id: data.customer?.id || 'default_user',
        run_id: runId,
        dodo_payment_id: paymentId,
        amount_usd: getScanPriceUsd(),
        status: 'succeeded',
      });
    } catch (e: any) {
      // If unique constraint triggers on duplicate concurrent request
      if (e.message?.includes('duplicate') || e.message?.includes('unique')) {
        return { success: true, action: 'duplicate_skipped', paymentId, runId };
      }
    }

    // Upgrade run to full kind and enqueue new job
    const run = await repo.getRun(runId);
    if (run) {
      await repo.updateRun(runId, {
        kind: 'full',
        status: 'queued',
        stage: 'preflight',
        progress: 0,
        limits_json: {
          maxScenarios: 12,
          maxMinutes: 10,
          maxSteps: 50,
        },
      });

      // Enqueue job for background worker to execute full scan
      await repo.createJob({
        run_id: runId,
        type: 'test_run',
        status: 'queued',
      });

      trackFunnelEvent('paid', { paymentId, runId, amountUsd: getScanPriceUsd() });
      console.log(`[Dodo Webhook] Run ${runId} successfully unlocked to Full Scan and enqueued.`);
    }

    return { success: true, action: 'fulfilled', paymentId, runId };
  }

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
