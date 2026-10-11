import { getDatabaseRepository } from '../db/client';
import { getScanPriceUsd } from '../payments/dodo';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory bucket store for IP/User rate limits
const ipLimitStore = new Map<string, RateLimitRecord>();
const userActiveRuns = new Map<string, number>(); // userId -> count of active runs
let dailySpendCreditsToday = 0;
let dailySpendResetDate = new Date().toDateString();

export function getDailySpendCapUsd(): number {
  return parseFloat(process.env.GLOBAL_DAILY_SPEND_CAP_USD || '50.00');
}

export function getMinMarginUsd(): number {
  return parseFloat(process.env.MIN_MARGIN_USD || '3.00');
}

/**
 * Startup margin verification check.
 * Warns or throws if unit economics margin is below threshold.
 */
export function verifyUnitEconomicsMargin(): {
  isHealthy: boolean;
  price: number;
  dodoFee: number;
  worstCaseRunCost: number;
  netMargin: number;
  warning?: string;
} {
  const price = getScanPriceUsd();
  const feePercent = parseFloat(process.env.ESTIMATED_DODO_FEE_PERCENT || '0.04');
  const feeFixed = parseFloat(process.env.ESTIMATED_DODO_FEE_FIXED_USD || '0.40');
  const dodoFee = parseFloat((price * feePercent + feeFixed).toFixed(4));

  const maxCredits = parseFloat(process.env.MAX_COST_CREDITS_PER_RUN || '15.0');
  const costPerCredit = 0.02; // $0.02 per credit standard
  const worstCaseRunCost = parseFloat((maxCredits * costPerCredit).toFixed(4));

  const netMargin = parseFloat((price - dodoFee - worstCaseRunCost).toFixed(2));
  const minMargin = getMinMarginUsd();

  if (netMargin < minMargin) {
    const warning = `[ShipCheck Margin Warning]: Net margin ($${netMargin}) is below minimum target of $${minMargin}. Adjust PRICE_FULL_SCAN_USD or limit caps.`;
    console.warn(warning);
    return { isHealthy: false, price, dodoFee, worstCaseRunCost, netMargin, warning };
  }

  return { isHealthy: true, price, dodoFee, worstCaseRunCost, netMargin };
}

/**
 * Checks if the global daily spend cap has been exceeded.
 */
export function checkGlobalDailySpendCap(newCostUsdEstimate: number = 0.30): {
  allowed: boolean;
  currentSpendUsd: number;
  capUsd: number;
  message?: string;
} {
  const today = new Date().toDateString();
  if (today !== dailySpendResetDate) {
    dailySpendResetDate = today;
    dailySpendCreditsToday = 0;
  }

  const currentSpendUsd = parseFloat((dailySpendCreditsToday * 0.02).toFixed(2));
  const capUsd = getDailySpendCapUsd();

  if (currentSpendUsd + newCostUsdEstimate > capUsd) {
    return {
      allowed: false,
      currentSpendUsd,
      capUsd,
      message: 'High demand today. Global daily testing capacity reached, please try again tomorrow.',
    };
  }

  return { allowed: true, currentSpendUsd, capUsd };
}

export function recordRunCreditsSpent(credits: number) {
  dailySpendCreditsToday += credits;
}

/**
 * Resets daily spend credits (used for unit testing)
 */
export function resetDailySpendForTesting() {
  dailySpendCreditsToday = 0;
}

/**
 * Rate limits requests per IP (sliding window).
 */
export function checkIpRateLimit(
  ip: string,
  limit: number = 20,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    ipLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Enforces: One active run per user at a time on MVP.
 */
export function checkUserActiveRunLimit(userId: string): { allowed: boolean; message?: string } {
  const activeCount = userActiveRuns.get(userId) || 0;
  if (activeCount >= 1) {
    return {
      allowed: false,
      message: 'You already have an active test scan running. Please wait for it to complete.',
    };
  }
  return { allowed: true };
}

export function setUserActiveRun(userId: string, active: boolean) {
  if (active) {
    const cur = userActiveRuns.get(userId) || 0;
    userActiveRuns.set(userId, cur + 1);
  } else {
    const cur = userActiveRuns.get(userId) || 0;
    userActiveRuns.set(userId, Math.max(0, cur - 1));
  }
}
