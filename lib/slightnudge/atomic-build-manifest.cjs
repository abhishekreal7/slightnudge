const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Next's dev request workers read this Webpack asset during recompilation.
// Publish it in one rename, rather than exposing writeFile's truncated file.
function manifestWriter(io = fs.promises) {
  return function writeManifest(target, bytes, callback) {
    const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
    (async () => {
      let handle;
      try {
        handle = await io.open(temporary, 'wx');
        await handle.writeFile(bytes);
        await handle.sync();
        await handle.close(); handle = undefined;
        for (let attempt = 0; ; attempt++) {
          try { await io.rename(temporary, target); break; }
          catch (error) {
            if (attempt === 2) throw new Error(`Cannot publish build manifest: ${error.message}`, {cause:error});
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
      } finally {
        if (handle) await handle.close();
        await io.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
      }
    })().then(() => callback(), callback);
  };
}

class AtomicBuildManifestPlugin {
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('AtomicBuildManifestPlugin', () => {
      const original = compiler.outputFileSystem;
      const wrapped = Object.create(original);
      const publish = manifestWriter();
      const targets = new Set(['build-manifest.json', 'react-loadable-manifest.json', 'server/next-font-manifest.json', 'app-paths-manifest.json', 'server/app-paths-manifest.json', 'pages-manifest.json', 'server/pages-manifest.json'].map(name => path.resolve(compiler.options.output.path, name)));
      wrapped.writeFile = (file, bytes, ...args) => {
        if (targets.has(path.resolve(String(file)))) return publish(file, bytes, args.at(-1));
        return original.writeFile(file, bytes, ...args);
      };
      compiler.outputFileSystem = wrapped;
    });
  }
}
module.exports = AtomicBuildManifestPlugin;
module.exports.manifestWriter = manifestWriter;
