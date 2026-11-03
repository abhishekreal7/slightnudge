import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {checkSharedInstances} from './helpers/shared-instance-browser.v3';
import {prepareSourceProject} from './helpers/prepare-source-project.v3';
import {observeReadiness} from './helpers/readiness-evidence';

// Preserve compilation cache, never test state. Every command starts fresh
// processes, a fresh browser context, and an empty editor state directory.
const root=process.cwd(),workspace=path.join(root,'scratch','shared-gate-runtime');
const external=process.env.GATE_SHARED_EDITOR_URL;
const relative=path.relative(root,workspace);
if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Runtime must stay inside the disposable gate checkout');
fs.mkdirSync(workspace,{recursive:true});
const state=path.join(workspace,'.slightnudge');
if(!external&&fs.existsSync(state))fs.renameSync(state,path.join(workspace,`state-archive-${Date.now()}`));
const tracked=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
for(const file of external?[]:tracked){
 if(!/^(app\/|components\/|lib\/|fixtures\/|public\/|types\/|proxy\.ts$|package\.json$|tsconfig\.json$|next-env\.d\.ts$|next\.config\.|postcss\.config\.)/.test(file)||/(^|\/)\.env(?:\.|$)|secret|credential|\.(pem|key)$/i.test(file))continue;
 const from=path.join(root,file),to=path.join(workspace,file),bytes=fs.readFileSync(from);
 if(fs.existsSync(to)&&fs.readFileSync(to).equals(bytes))continue;
 fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes);
}
if(!fs.existsSync(path.join(workspace,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(workspace,'node_modules'),'junction');
fs.mkdirSync(path.join(workspace,'docs'),{recursive:true});
const env:NodeJS.ProcessEnv={NODE_ENV:'development',CI:'1',NEXT_TELEMETRY_DISABLED:'1'};
for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[key])env[key]=process.env[key];
const children:ReturnType<typeof spawn>[]=[];
const availablePort=()=>new Promise<number>((resolve,reject)=>{const socket=net.createServer();socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{const port=(socket.address() as net.AddressInfo).port;socket.close(()=>resolve(port));});});
async function server(cwd:string){
 const port=await availablePort(),url=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','-H','127.0.0.1','-p',String(port)],{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});children.push(child);
 for(const stream of [child.stdout,child.stderr])stream?.on('data',data=>process.stdout.write(data));
 return {child,url};
}
async function ready(url:string,child:ReturnType<typeof spawn>|null){
 while(true){if(child&&child.exitCode!==null)throw Error(`Server exited ${child.exitCode}: ${url}`);try{const response=await fetch(url,{signal:AbortSignal.timeout(5000)});if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
}
const repo=path.join(state,'repositories','source-proof');
if(process.argv.includes('--setup-only')){
 fs.mkdirSync(state,{recursive:true});fs.mkdirSync(repo,{recursive:true});
 prepareSourceProject(root,workspace,repo,env);
 console.log('GATE_RUNTIMES '+JSON.stringify({workspace,repo}));
 process.exit(0);
}
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,page:Awaited<ReturnType<NonNullable<typeof browser>['newPage']>>|undefined;
try {
 const started=Date.now(),editor=external?{url:external,child:null}:await server(workspace);await ready(editor.url+'/editor',editor.child);
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});
 await observeReadiness(page,root);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.stack||error.message));
 if(process.argv.includes('--prepare')){
  await page.goto(editor.url+'/editor?panel=inspector',{waitUntil:'domcontentloaded',timeout:180000});
  await page.locator('[data-source-ready="true"]').waitFor({timeout:120000});
  // GET cannot execute these POST-only mutations; it only primes route compilation.
  for(const endpoint of ['responsive','preview','apply','undo','history']){
   const response=await fetch(`${editor.url}/api/slightnudge/${endpoint}`,{signal:AbortSignal.timeout(30000)});
   if(response.status!==405)throw Error(`Expected nonmutating 405 during compiler warm-up: ${endpoint} ${response.status}`);
  }
  console.log(`WARMUP local editor, preview and API compilers ${Date.now()-started}ms`);
 }
 if(process.argv.includes('--prepare')||process.env.GATE_SHARED_KIND==='imported'){
  fs.mkdirSync(state,{recursive:true});fs.mkdirSync(repo,{recursive:true});
  if(!external&&!fs.existsSync(path.join(repo,'node_modules')))prepareSourceProject(root,workspace,repo,env);
  else if(!external)fs.writeFileSync(path.join(workspace,'.slightnudge/repositories.json'),JSON.stringify([{id:'source-proof',localPath:repo,name:'Disposable source project',owner:'test'}]));
  const imported=process.env.GATE_SHARED_PREVIEW_URL?{url:process.env.GATE_SHARED_PREVIEW_URL,child:null}:await server(repo);await ready(imported.url,imported.child);
  if(process.argv.includes('--prepare')){
   await page.goto(`${editor.url}/editor/source-proof?preview=${encodeURIComponent(imported.url)}`,{waitUntil:'domcontentloaded',timeout:180000});
   await page.locator('[data-source-ready="true"]').waitFor({timeout:120000});
   console.log(`WARMUP imported adapter, preview and editor ${Date.now()-started}ms`);
  }else await checkSharedInstances(page,editor.url,workspace,workspace,{id:'source-proof',root:repo,url:imported.url});
 }else await checkSharedInstances(page,editor.url,workspace,workspace);
 if(errors.length)throw Error(errors.join('\n'));
 console.log(`PASS: ${process.argv.includes('--prepare')?0:2} review-consent browser cases (REAL API; ${process.argv.includes('--prepare')?'compiler warm-up only':'shared-instance assertions unchanged'})`);
}catch(error){
 if(page){await page.screenshot({path:path.join(root,'docs/shared-gate-failure.png')}).catch(()=>{});fs.writeFileSync(path.join(root,'docs/shared-gate-failure.html'),await page.content().catch(()=>''));}
 throw error;
}finally{
 await browser?.close();
 for(const child of children.reverse())if(child.pid)try{execFileSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch{}
 if(fs.existsSync(path.join(workspace,'docs')))fs.cpSync(path.join(workspace,'docs'),path.join(root,'docs/shared-gate-artifacts'),{recursive:true});
}
