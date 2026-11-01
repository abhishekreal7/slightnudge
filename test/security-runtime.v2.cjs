const fs=require('fs'),cp=require('child_process'),path=require('path');const project=process.cwd(),root=path.join(project,'scratch/security-hardening-20261101/runtime'),evidence=path.join(project,'docs/security-hardening');
if(process.argv.includes('--setup')){
 if(fs.existsSync(root))throw Error('Refuse to overwrite temp runtime');fs.mkdirSync(root,{recursive:true});
 const files=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).filter(f=>! /^(docs|test|scratch)\//.test(f)&&! /(^|\/)\.env($|\.)/.test(f));if(!files.includes('lib/slightnudge/api-response.ts'))files.push('lib/slightnudge/api-response.ts');
 for(const f of files){const dest=path.join(root,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(project,f),dest);}fs.symlinkSync(path.join(project,'node_modules'),path.join(root,'node_modules'),'junction');
 const copy=(a,b)=>{fs.mkdirSync(b,{recursive:true});for(const e of fs.readdirSync(a,{withFileTypes:true})){if(['node_modules','.next','.git'].includes(e.name)||e.name.startsWith('.env'))continue;const from=path.join(a,e.name),to=path.join(b,e.name);if(e.isDirectory())copy(from,to);else if(e.isFile())fs.copyFileSync(from,to);}};
 const repos=JSON.parse(fs.readFileSync('.slightnudge/repositories.json','utf8')).filter(r=>['m0-control-lab','m0-overfit-lab'].includes(r.id));for(const repo of repos){const dest=path.join(root,'.slightnudge/repositories',repo.id);copy(repo.localPath,dest);fs.symlinkSync(path.join(repo.localPath,'node_modules'),path.join(dest,'node_modules'),'junction');cp.execFileSync('git',['init'],{cwd:dest,stdio:'ignore'});cp.execFileSync('git',['add','src','package.json','next.config.mjs','tsconfig.json'],{cwd:dest,stdio:'ignore'});repo.localPath=dest;}
 fs.writeFileSync(path.join(root,'.slightnudge/repositories.json'),JSON.stringify(repos,null,2));fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.writeFileSync(path.join(evidence,'runtime.json'),JSON.stringify({root,files:files.length,repositories:repos.map(r=>r.id),environmentFilesCopied:false},null,2));console.log(root);
}else{
 const label=process.env.SECURITY_SERVER_LABEL||'baseline',children=[];
 for(const [port,cwd]of[[3000,root],[3001,path.join(root,'.slightnudge/repositories/m0-control-lab')],[3002,path.join(root,'.slightnudge/repositories/m0-overfit-lab')]]){
  if(process.argv.includes('--root-only')&&port!==3000)continue;
  const fd=fs.openSync(path.join(evidence,`server-${label}-${port}.log`),'a'),child=cp.spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd,windowsHide:true,env:{...process.env,PORT:String(port),SLIGHTNUDGE_TEST:'0',SLIGHTNUDGE_LEGACY_STUDIO:'1'},stdio:['ignore',fd,fd]});children.push(child);console.log('SERVER',port,child.pid);child.on('exit',code=>console.log('EXIT',port,code));
 }
 fs.writeFileSync(path.join(evidence,`server-${label}-pids.json`),JSON.stringify(children.map(p=>p.pid)));
 Promise.all(children.map(p=>new Promise(resolve=>p.once('exit',resolve)))).then(()=>console.log('SERVERS CLOSED'));
}
