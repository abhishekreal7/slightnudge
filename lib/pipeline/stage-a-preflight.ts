import { validateTargetUrl } from '../security/ssrf';
import { verifySiteOwnership } from '../security/ownership';
import { PipelineContext } from './types';

export interface PreflightResult {
  success: boolean;
  error?: string;
  frameworkHints: string[];
  hasCaptchaOrCloudflare: boolean;
  hasLoginWall: boolean;
  resolvedIp?: string;
}

export async function executeStageAPreflight(
  ctx: PipelineContext,
  verificationToken?: string
): Promise<PreflightResult> {
  const { targetUrl, config } = ctx;

  // 1. SSRF and DNS Rebinding check
  const ssrfCheck = await validateTargetUrl(targetUrl, {
    allowLocalhost: config.allowLocalhost,
  });

  if (!ssrfCheck.isValid) {
    return {
      success: false,
      error: `Security preflight failed: ${ssrfCheck.error}`,
      frameworkHints: [],
      hasCaptchaOrCloudflare: false,
      hasLoginWall: false,
    };
  }

  // 2. Ownership verification check
  if (!config.skipOwnershipCheck) {
    if (!verificationToken) {
      return {
        success: false,
        error: 'Ownership verification token missing. Cannot scan unverified sites.',
        frameworkHints: [],
        hasCaptchaOrCloudflare: false,
        hasLoginWall: false,
      };
    }

    const ownership = await verifySiteOwnership(targetUrl, verificationToken);
    if (!ownership.verified) {
      return {
        success: false,
        error: ownership.error || 'Ownership verification failed.',
        frameworkHints: [],
        hasCaptchaOrCloudflare: false,
        hasLoginWall: false,
      };
    }
  }

  // 3. Reachability and Framework hints
  const frameworkHints: string[] = [];
  let hasCaptchaOrCloudflare = false;
  let hasLoginWall = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ShipCheck/1.0',
      },
    });
    clearTimeout(timeout);

    if (!resp.ok && resp.status >= 500) {
      return {
        success: false,
        error: `Target homepage returned HTTP ${resp.status}`,
        frameworkHints,
        hasCaptchaOrCloudflare,
        hasLoginWall,
        resolvedIp: ssrfCheck.resolvedIp,
      };
    }

    const html = await resp.text();
    const lowerHtml = html.toLowerCase();

    // Detect framework hints
    if (lowerHtml.includes('__next') || lowerHtml.includes('/_next/')) frameworkHints.push('Next.js');
    if (lowerHtml.includes('react')) frameworkHints.push('React');
    if (lowerHtml.includes('vue') || lowerHtml.includes('__vue')) frameworkHints.push('Vue');
    if (lowerHtml.includes('svelte')) frameworkHints.push('Svelte');
    if (lowerHtml.includes('tailwind') || lowerHtml.includes('tw-')) frameworkHints.push('Tailwind CSS');
    if (lowerHtml.includes('lovable') || lowerHtml.includes('v0.dev')) frameworkHints.push('AI-Vibecoded');

    // Detect Captchas or Cloudflare Turnstile
    if (
      lowerHtml.includes('cf-turnstile') ||
      lowerHtml.includes('recaptcha') ||
      lowerHtml.includes('hcaptcha') ||
      lowerHtml.includes('challenge-platform')
    ) {
      hasCaptchaOrCloudflare = true;
    }

    // Detect immediate login wall
    if (
      (lowerHtml.includes('sign in') || lowerHtml.includes('log in')) &&
      !lowerHtml.includes('pricing') &&
      !lowerHtml.includes('features')
    ) {
      hasLoginWall = true;
    }

    return {
      success: true,
      frameworkHints,
      hasCaptchaOrCloudflare,
      hasLoginWall,
      resolvedIp: ssrfCheck.resolvedIp,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Could not reach target website: ${err.message}`,
      frameworkHints: [],
      hasCaptchaOrCloudflare: false,
      hasLoginWall: false,
    };
  }
}
