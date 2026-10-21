// slightnudge-source-adapter: generated for development previews; remove through SlightNudge to restore the original config.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const importedConfig = await import('./next.config.slightnudge-original.mjs');
  const baseConfig = importedConfig.default ?? importedConfig;

export default async function slightNudgeNextConfig(phase, context) {
  const resolved = typeof baseConfig === 'function' ? await baseConfig(phase, context) : baseConfig;
  const config = { ...resolved };
  config.instrumentationClientInject = [...(config.instrumentationClientInject || []), './.slightnudge-source-adapter/bridge-client.mjs'];
  const originalWebpack = config.webpack;
  config.webpack = (webpackConfig, options) => {
    const applyAdapter = (nextConfig) => {
      const result = nextConfig || webpackConfig;
      if (options.dev) {
        result.module.rules.push({
          test: /\.[jt]sx?$/,
          include: [projectRoot],
          enforce: 'pre',
          use: [{ loader: path.join(projectRoot, '.slightnudge-source-adapter', 'next-source-loader.cjs'), options: { development: true, root: projectRoot } }],
        });
      }
      return result;
    };
    const previous = originalWebpack ? originalWebpack(webpackConfig, options) : webpackConfig;
    return previous && typeof previous.then === 'function' ? previous.then(applyAdapter) : applyAdapter(previous);
  };
  return config;
}
