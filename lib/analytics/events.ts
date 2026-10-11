export type FunnelEventName =
  | 'visit'
  | 'url_submitted'
  | 'preview_viewed'
  | 'checkout_started'
  | 'paid';

export interface FunnelEventData {
  event: FunnelEventName;
  timestamp: string;
  properties?: Record<string, any>;
}

// In-memory telemetry log for funnel events
const funnelEventLog: FunnelEventData[] = [];

/**
 * Tracks a funnel event both client-side and server-side.
 */
export function trackFunnelEvent(event: FunnelEventName, properties?: Record<string, any>): void {
  const payload: FunnelEventData = {
    event,
    timestamp: new Date().toISOString(),
    properties: properties || {},
  };

  funnelEventLog.push(payload);

  if (typeof window !== 'undefined') {
    // Client-side telemetry
    console.log(`[Funnel Analytics] 📊 Event: ${event}`, properties || '');

    // Dispatch DOM event for custom analytics integrations (PostHog, Plausible, GA)
    window.dispatchEvent(
      new CustomEvent('shipcheck_funnel_event', { detail: payload })
    );

    // Call window.plausible or window.posthog if configured
    if ((window as any).plausible) {
      (window as any).plausible(event, { props: properties });
    }
    if ((window as any).posthog) {
      (window as any).posthog.capture(event, properties);
    }
  } else {
    // Server-side telemetry
    console.log(`[Funnel Analytics Server] 📊 Event: ${event}`, properties || '');
  }
}

export function getFunnelEventsHistory(): FunnelEventData[] {
  return [...funnelEventLog];
}

export function clearFunnelEventsForTesting(): void {
  funnelEventLog.length = 0;
}
