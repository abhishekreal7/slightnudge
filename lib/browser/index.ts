import { BrowserProvider } from './browser-provider';
import { HyperbrowserProvider } from './hyperbrowser-provider';
import { LocalBrowserProvider } from './local-provider';

export * from './browser-provider';
export * from './hyperbrowser-provider';
export * from './local-provider';

export function getBrowserProvider(forceType?: 'hyperbrowser' | 'local'): BrowserProvider {
  const providerType =
    forceType || process.env.BROWSER_PROVIDER || (process.env.HYPERBROWSER_API_KEY ? 'hyperbrowser' : 'local');

  if (providerType === 'hyperbrowser') {
    if (!process.env.HYPERBROWSER_API_KEY) {
      console.warn(
        '[BrowserProvider] HYPERBROWSER_API_KEY not configured. Falling back to LocalBrowserProvider.'
      );
      return new LocalBrowserProvider();
    }
    return new HyperbrowserProvider();
  }

  return new LocalBrowserProvider();
}
