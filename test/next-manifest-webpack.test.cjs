// Actual installed Webpack emission, with the native truncate/write window
// deliberately widened. Baseline omits the candidate plugin, not assertions.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const installed = require('next/dist/compiled/webpack/webpack');
const {webpack} = installed;
const Plugin = require('../lib/slightnudge/atomic-build-manifest.cjs');
const root = fs.mkdtempSync(path.resolve('scratch/manifest-webpack-'));
const output = path.join(root,'output'); fs.mkdirSync(output);
const target = path.join(output,'build-manifest.json');
const previous = '{"pages":{"old":[]}}', next = '{"pages":{"new":[]}}';
fs.writeFileSync(target,previous); fs.writeFileSync(path.join(root,'entry.js'),'module.exports=1');
const observed=[];
const slowNativeWrite = {apply(compiler) {
  compiler.hooks.afterEnvironment.tap('ObserveNativeWrite',()=>{
    const original=compiler.outputFileSystem.writeFile.bind(compiler.outputFileSystem);
    compiler.outputFileSystem.writeFile=(file,data,...args)=>{
      if(path.resolve(String(file))!==target)return original(file,data,...args);
      const callback=args.at(-1);
      fs.open(file,'w',(error,fd)=>{
        if(error)return callback(error);
        observed.push(fs.readFileSync(target,'utf8'));
        setTimeout(()=>fs.close(fd,error=>error?callback(error):original(file,data,...args)),20);
      });
    };
  });
}};
const emit = {apply(compiler){compiler.hooks.thisCompilation.tap('Manifest',compilation=>{
  compilation.hooks.processAssets.tap({name:'Manifest',stage:0},()=>compilation.emitAsset('build-manifest.json',new compiler.webpack.sources.RawSource(next)));
});}};
const compiler=webpack({mode:'development',entry:path.join(root,'entry.js'),output:{path:output,filename:'bundle.js'},plugins:[slowNativeWrite,...(process.argv.includes('--baseline')?[]:[new Plugin()]),emit]});
compiler.run((error,stats)=>compiler.close(closeError=>{
  try {
    if(error||closeError)throw error||closeError;
    assert.equal(stats.hasErrors(),false,stats.toString());
    assert.ok(observed.every(body=>body===previous||body===next),`Reader saw incomplete manifest: ${JSON.stringify(observed)}`);
    assert.equal(fs.readFileSync(target,'utf8'),next);
    console.log('PASS: installed Webpack publishes a complete manifest');
  }catch(error){console.error(error);process.exitCode=1;}
}));
