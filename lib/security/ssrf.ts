import dns from 'dns';
import net from 'net';

export interface UrlValidationResult {
  isValid: boolean;
  resolvedIp?: string;
  error?: string;
}

/**
 * Checks if an IPv4 address is within private, loopback, or link-local ranges.
 */
export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  // IPv6 checks
  if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }

  // IPv4 checks
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true;

  const [b0, b1] = parts;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local, AWS/GCP/Azure instance metadata 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 0.0.0.0/8 (Broadcast/Current network)
  if (b0 === 0) return true;

  return false;
}

/**
 * Validates a target URL against SSRF and DNS rebinding attacks.
 * Resolves the DNS record and verifies the physical target IP.
 */
export async function validateTargetUrl(
  inputUrl: string,
  options: { allowLocalhost?: boolean } = {}
): Promise<UrlValidationResult> {
  let parsed: URL;

  try {
    parsed = new URL(inputUrl);
  } catch (e) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Enforce HTTP / HTTPS scheme
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: `Disallowed protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Handle localhost bypass for local benchmark and test environment
  if (options.allowLocalhost || process.env.ALLOW_LOCAL_TARGETS === 'true') {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { isValid: true, resolvedIp: '127.0.0.1' };
    }
  }

  // Reject explicit localhost or private hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { isValid: false, error: 'Targeting localhost or private network domains is forbidden.' };
  }

  // Direct IP entered as hostname
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { isValid: false, error: 'Targeting private or link-local IP addresses is strictly blocked.' };
    }
    return { isValid: true, resolvedIp: hostname };
  }

  // Resolve DNS to verify the resolved address
  try {
    const lookup = await dns.promises.lookup(hostname, { all: false });
    const ip = lookup.address;

    if (isPrivateIp(ip)) {
      return {
        isValid: false,
        resolvedIp: ip,
        error: `Hostname ${hostname} resolves to private/restricted IP (${ip}), blocked for SSRF safety.`,
      };
    }

    return { isValid: true, resolvedIp: ip };
  } catch (err: any) {
    return { isValid: false, error: `DNS resolution failed for hostname ${hostname}: ${err.message}` };
  }
}
