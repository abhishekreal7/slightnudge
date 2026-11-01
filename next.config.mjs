import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  experimental: {
    agentUpgrade: 'security',
  },
  webpack(config, { dev, isServer }) {
    if (dev) {
      if (!isServer) config.module.rules.push({
        test: /[\\/]next[\\/]dist[\\/]client[\\/]dev[\\/]hot-reloader[\\/]app[\\/]web-socket\.js$/,
        enforce: 'pre',
        use: [{ loader: path.join(projectRoot, 'lib/slightnudge/next-hmr-sync-loader.cjs') }],
      });
      config.module.rules.push({
        test: /\.[jt]sx?$/,
        include: [projectRoot],
        // Editor controls are not editable source. Their transient HMR hashes
        // must not become hydration attributes on the editor's own DOM.
        // Preserve the real local-preview component and customer fixtures.
        exclude: resource => {
          const relative = path.relative(projectRoot, resource).replaceAll('\\', '/');
          return relative.startsWith('components/slightnudge/') && relative !== 'components/slightnudge/LocalSourcePreview.tsx';
        },
        enforce: 'pre',
        use: [{ loader: path.join(projectRoot, 'lib/slightnudge/next-source-loader.cjs'), options: { development: true, root: projectRoot } }],
      });
    }
    return config;
  },
};

export default nextConfig;
