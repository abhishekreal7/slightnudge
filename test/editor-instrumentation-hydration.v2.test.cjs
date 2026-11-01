const fs=require('fs'),path=require('path');const {pathToFileURL}=require('url');
(async()=>{const config=(await import(pathToFileURL(path.resolve('next.config.mjs')).href)).default,rows=[];
for(const isServer of [true,false]){
 const built=config.webpack({module:{rules:[]}},{dev:true,isServer}),rule=built.module.rules.find(r=>r.use?.some(u=>u.loader?.endsWith('next-source-loader.cjs')));
 for(const [file,wanted] of [['components/slightnudge/EditorWorkspace.tsx',false],['components/slightnudge/EditorSessionControls.tsx',false],['components/slightnudge/LocalSourcePreview.tsx',true],['fixtures/1-plain-static.tsx',true]]){
  const resource=path.resolve(file),included=rule.include.some(base=>resource.startsWith(base)),excluded=typeof rule.exclude==='function'?rule.exclude(resource):false,actual=included&&!excluded;rows.push({isServer,file,wanted,actual,pass:actual===wanted});
 }
}
const label=process.env.INSTRUMENTATION_LABEL||'before';fs.writeFileSync(`docs/security-hardening/instrumentation-${label}.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));if(rows.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
