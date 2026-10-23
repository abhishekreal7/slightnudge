import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    agentUpgrade: 'security',
  },
  webpack(config, { dev }) {
    if (dev) {
      config.module.rules.push({
        test: /\.[jt]sx?$/,
        include: [projectRoot],
        enforce: 'pre',
        use: [{ loader: path.join(projectRoot, 'lib/slightnudge/next-source-loader.cjs'), options: { development: true, root: projectRoot } }],
      });
    }
    return config;
  },
};

export default nextConfig;
