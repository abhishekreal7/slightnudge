import dns from 'dns';
import { OwnershipMethod } from '../db/types';

export interface OwnershipVerificationResult {
  verified: boolean;
  method?: OwnershipMethod;
  error?: string;
}

export function generateVerificationToken(hostname: string): string {
  const clean = hostname.replace(/[^a-zA-Z0-9]/g, '');
  return `shipcheck_${clean}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Checks if target site has valid ownership token via:
 * 1. Meta tag: <meta name="shipcheck-verification" content="TOKEN">
 * 2. File: /.well-known/shipcheck-verify.txt containing TOKEN
 * 3. DNS TXT record: shipcheck-site-verification=TOKEN
 */
export async function verifySiteOwnership(
  url: string,
  expectedToken: string,
  preferredMethod?: OwnershipMethod
): Promise<OwnershipVerificationResult> {
  const parsed = new URL(url);
  const hostname = parsed.hostname;

  // 1. Check meta tag
  if (!preferredMethod || preferredMethod === 'meta_tag') {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'ShipCheck-Verification-Bot/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        const text = await resp.text();
        const metaRegex = new RegExp(
          `<meta[^>]+name=["']shipcheck-verification["'][^>]+content=["']${expectedToken}["']`,
          'i'
        );
        const metaRegexReversed = new RegExp(
          `<meta[^>]+content=["']${expectedToken}["'][^>]+name=["']shipcheck-verification["']`,
          'i'
        );
        if (metaRegex.test(text) || metaRegexReversed.test(text)) {
          return { verified: true, method: 'meta_tag' };
        }
      }
    } catch (e) {
      // Continue to next check
    }
  }

  // 2. Check well-known file upload
  if (!preferredMethod || preferredMethod === 'file_upload') {
    try {
      const wellKnownUrl = `${parsed.origin}/.well-known/shipcheck-verify.txt`;
      const resp = await fetch(wellKnownUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        const content = (await resp.text()).trim();
        if (content.includes(expectedToken)) {
          return { verified: true, method: 'file_upload' };
        }
      }
    } catch (e) {
      // Continue to next check
    }
  }

  // 3. Check DNS TXT record
  if (!preferredMethod || preferredMethod === 'dns_txt') {
    try {
      const records = await dns.promises.resolveTxt(hostname);
      for (const group of records) {
        const txtValue = group.join('');
        if (
          txtValue === expectedToken ||
          txtValue.includes(`shipcheck-site-verification=${expectedToken}`)
        ) {
          return { verified: true, method: 'dns_txt' };
        }
      }
    } catch (e) {
      // DNS record resolution failed or not set
    }
  }

  return {
    verified: false,
    error: `Ownership could not be verified. Expected token "${expectedToken}" was not found via meta tag, .well-known file, or DNS TXT record.`,
  };
}
