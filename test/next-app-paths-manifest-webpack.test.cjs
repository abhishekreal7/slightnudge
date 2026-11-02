// Exercise the installed Next route-manifest plugin and the installed Webpack
// emitter. All truncation experiments stay in this disposable scratch copy.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {webpack}=require('next/dist/compiled/webpack/webpack');
const PagesManifestPlugin=require('next/dist/build/webpack/plugins/pages-manifest-plugin').default;
const AtomicManifestPlugin=require('../lib/slightnudge/atomic-build-manifest.cjs');
const root=fs.mkdtempSync(path.resolve('scratch/app-paths-manifest-'));
const output=path.join(root,'server');fs.mkdirSync(output);
const target=path.join(output,'app-paths-manifest.json');
const previous=JSON.stringify({'/previous/page':'app/previous/page.js'}),expected={'/editor/page':'app/editor/page.js'};
fs.writeFileSync(target,previous);fs.writeFileSync(path.join(root,'entry.js'),'module.exports=1');
const observations=[];
const nativeRename=fs.promises.rename;
fs.promises.rename=async function(from,to){if(path.resolve(String(to))===target)observations.push(fs.readFileSync(target,'utf8'));return nativeRename.call(this,from,to);};
const slowNativeWrite={apply(compiler){compiler.hooks.afterEnvironment.tap('SlowNativeRouteManifest',()=>{
 const original=compiler.outputFileSystem.writeFile.bind(compiler.outputFileSystem);
 compiler.outputFileSystem.writeFile=(file,data,...args)=>{
  if(path.resolve(String(file))!==target)return original(file,data,...args);
  const callback=args.at(-1);fs.open(file,'w',(error,fd)=>{
   if(error)return callback(error);observations.push(fs.readFileSync(target,'utf8'));
   setTimeout(()=>fs.close(fd,error=>error?callback(error):original(file,data,...args)),20);
  });
 };
});}};
const compiler=webpack({mode:'development',entry:{'app/editor/page':path.join(root,'entry.js')},output:{path:output,filename:'[name].js'},plugins:[slowNativeWrite,new AtomicManifestPlugin(),new PagesManifestPlugin({dev:true,isEdgeRuntime:false,appDirEnabled:true})]});
compiler.run((error,stats)=>compiler.close(closeError=>{
 try{
  if(error||closeError)throw error||closeError;
  assert.equal(stats.hasErrors(),false,stats.toString());
  assert.ok(observations.length>0,'A reader sampled publication');
  assert.ok(observations.every(body=>{try{return body===previous||JSON.stringify(JSON.parse(body))===JSON.stringify(expected);}catch{return false;}}),`Reader observed a truncated app paths manifest: ${JSON.stringify(observations)}`);
  assert.deepEqual(JSON.parse(fs.readFileSync(target,'utf8')),expected);
  console.log('PASS installed Next route-manifest publication: readers see a complete previous or new manifest');
 }catch(error){console.error(error);process.exitCode=1;}finally{fs.promises.rename=nativeRename;}
}));
