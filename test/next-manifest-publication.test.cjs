const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = fs.mkdtempSync(path.resolve('scratch/manifest-publication-'));
const target = path.join(root, 'build-manifest.json');
const previous = '{"pages":{"old":[]}}';
const next = '{"pages":{"new":[]}}';
async function main() {
  const Plugin = require('../lib/slightnudge/atomic-build-manifest.cjs');
  fs.writeFileSync(target, previous);
  let publish;
  const io = {...fs.promises, rename: async (from,to) => {
    assert.equal(fs.readFileSync(target,'utf8'), previous, 'Readers must see the previous complete manifest before publication');
    await new Promise(resolve => { publish = resolve; });
    await fs.promises.rename(from,to);
  }};
  const write = Plugin.manifestWriter(io);
  const pending = new Promise((resolve,reject) => write(target,next,error=>error?reject(error):resolve()));
  while (!publish) await new Promise(resolve=>setImmediate(resolve));
  assert.equal(fs.readFileSync(target,'utf8'),previous);
  publish(); await pending;
  assert.equal(fs.readFileSync(target,'utf8'),next);
  let attempts = 0;
  const refusal = Plugin.manifestWriter({...fs.promises,rename:async()=>{attempts++;throw new Error('forced rename failure');}});
  await assert.rejects(new Promise((resolve,reject)=>refusal(target,previous,error=>error?reject(error):resolve())), /publish.*manifest/i);
  assert.equal(attempts,3);
  assert.equal(fs.readFileSync(target,'utf8'),next,'Failed publication preserves the current manifest');
  console.log('PASS: atomic manifest visibility and rename refusal');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
