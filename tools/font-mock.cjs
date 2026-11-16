/**
 * Synthetic Google Fonts response provider for offline, restricted-network,
 * and CI container builds. Provides deterministic font-face definitions without
 * requiring outbound network access to fonts.googleapis.com during `next build`.
 */
module.exports = new Proxy({}, {
  get(_, url) {
    try {
      const parsed = new URL(url);
      const rawFamily = parsed.searchParams.get('family') || 'SystemFallback';
      const family = rawFamily.split(':')[0];
      return `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: 100 900;\n  font-display: swap;\n  src: url(data:font/woff2;base64,d09GMgABAAAAAADwAAoAAAAAAAgAAACsAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoGYAchCcUqBAAEIAWCSAcREAcgA4kIBCAFgkgHABEHBw==) format('woff2');\n}`;
    } catch {
      return "@font-face { font-family: 'Fallback'; font-style: normal; font-weight: 400; src: local('system-ui'); }";
    }
  }
});
