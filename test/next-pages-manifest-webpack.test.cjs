// Exercise the installed Next route-manifest plugin and the installed Webpack
// emitter. All truncation experiments stay in this disposable scratch copy.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {webpack}=require('next/dist/compiled/webpack/webpack');
const PagesManifestPlugin=require('next/dist/build/webpack/plugins/pages-manifest-plugin').default;
const AtomicManifestPlugin=require('../lib/slightnudge/atomic-build-manifest.cjs');
const root=fs.mkdtempSync(path.resolve('scratch/pages-manifest-'));
const output=path.join(root,'server');fs.mkdirSync(output);
const target=path.join(output,'pages-manifest.json');
const previous=JSON.stringify({'/previous':'pages/previous.js'}),expected={'/editor':'pages/editor.js'};
const cold=process.argv.includes('--cold');
if(!cold)fs.writeFileSync(target,previous);fs.writeFileSync(path.join(root,'entry.js'),'module.exports=1');
const observations=[];
const nativeRename=fs.promises.rename;
fs.promises.rename=async function(from,to){if(path.resolve(String(to))===target){try{observations.push(fs.readFileSync(target,'utf8'));}catch(error){if(!cold||error.code!=='ENOENT')throw error;observations.push('MISSING');}}return nativeRename.call(this,from,to);};
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
const compiler=webpack({mode:'development',entry:{'pages/editor':path.join(root,'entry.js')},output:{path:output,filename:'[name].js'},plugins:[slowNativeWrite,new AtomicManifestPlugin(),new PagesManifestPlugin({dev:true,isEdgeRuntime:false,appDirEnabled:false})]});
compiler.run((error,stats)=>compiler.close(closeError=>{
 try{
  if(error||closeError)throw error||closeError;
  assert.equal(stats.hasErrors(),false,stats.toString());
  assert.ok(observations.length>0,'A reader sampled publication');
  assert.ok(observations.every(body=>{try{return cold&&body==='MISSING'||body===previous||JSON.stringify(JSON.parse(body))===JSON.stringify(expected);}catch{return false;}}),`Reader observed a truncated pages manifest: ${JSON.stringify(observations)}`);
  assert.deepEqual(JSON.parse(fs.readFileSync(target,'utf8')),expected);
  console.log(`PASS installed Next pages-manifest publication (${cold?'cold':'replacement'}): readers see absent/complete previous or complete new manifest`);
 }catch(error){console.error(error);process.exitCode=1;}finally{fs.promises.rename=nativeRename;}
}));
