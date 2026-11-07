const mutableTestEnvironment: Record<string, string | undefined> = process.env;
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
const project=path.resolve(import.meta.dirname,'..'),base=path.join(project,'scratch/security-hardening-20261101'),root=path.join(base,'proof-workspace');
if(path.resolve(process.cwd())!==root)throw Error('Proofs must run only in the designated temp-copy cwd');
process.env.SLIGHTNUDGE_TEST='1';mutableTestEnvironment.NODE_ENV='test';process.env.SLIGHTNUDGE_WORKSPACE_ROOT=root;process.env.SLIGHTNUDGE_DATA_DIR=path.join(root,'.slightnudge');
const mode=process.argv.find(arg=>/^--S[123]$/.test(arg))?.slice(2),label=process.env.PROOF_LABEL||'before',rows:any[]=[];
const out=path.join(project,'docs/security-hardening');fs.mkdirSync(out,{recursive:true});
const check=(name:string,pass:boolean,detail?:unknown)=>{const row={name,pass,detail};rows.push(row);console.log(JSON.stringify(row));};
try{
 if(mode==='S1'){
  const {getSessionToken}=await import('../lib/slightnudge/auth');const token=getSessionToken();
  const modules=[['preview',await import('../app/api/slightnudge/preview/route')],['apply',await import('../app/api/slightnudge/apply/route')],['undo',await import('../app/api/slightnudge/undo/route')]] as const;
  for(const [route,module] of modules)for(const c of [{name:'no Origin with valid token',origin:undefined,host:'127.0.0.1:3000',token},{name:'no Origin or token',origin:undefined,host:'127.0.0.1:3000',token:''},{name:'foreign Origin',origin:'https://foreign.example',host:'127.0.0.1:3000',token},{name:'wrong Host',origin:'http://127.0.0.1:3000',host:'foreign.example:3000',token}]){
   const headers:Record<string,string>={'content-type':'application/json',host:c.host,'x-slightnudge-token':c.token};if(c.origin)headers.origin=c.origin;
   const response=await module.POST(new Request(`http://127.0.0.1:3000/api/slightnudge/${route}`,{method:'POST',headers,body:'{}'}));
   check(`${route}: ${c.name}`,response.status===403,{expected:403,actual:response.status,body:await response.json()});
  }
  const scripts=JSON.parse(fs.readFileSync(path.join(project,'package.json'),'utf8')).scripts;
  check('App-controlled dev and start bind loopback',/127\.0\.0\.1/.test(scripts.dev)&&/127\.0\.0\.1/.test(scripts.start),{dev:scripts.dev,start:scripts.start});
  process.argv.push('reorder-safety');
  try{const response=await modules[0][1].POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview',{method:'POST',headers:{host:'127.0.0.1:3000','content-type':'application/json'},body:'{}'}));check('Test runner argument cannot bypass mutation authentication',response.status===403,{expected:403,actual:response.status});}finally{process.argv.pop();}
  process.env.SLIGHTNUDGE_SESSION_TOKEN='synthetic-test-override';
  try{check('Session token stays random and ignores a test environment override',getSessionToken()===token);}finally{delete process.env.SLIGHTNUDGE_SESSION_TOKEN;}
  const accepted=await modules[0][1].POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','x-slightnudge-token':token,'content-type':'application/json'},body:'{}'}));check('Legitimate origin and session token reach body validation',accepted.status===400,{actual:accepted.status});
 }
 if(mode==='S2'){
  const {resolveWorkspaceSourcePath,resolveRepositorySourcePath}=await import('../lib/slightnudge/repository-store');
  const {readPendingSourceEdit,readHistory}=await import('../lib/slightnudge/edit-history');
  const outside=path.join(base,'outside');fs.mkdirSync(outside,{recursive:true});fs.writeFileSync(path.join(outside,'victim.tsx'),'export default () => <p>outside temp project</p>;');
  const repos=path.join(root,'.slightnudge/repositories');for(const name of ['alpha','beta']){fs.mkdirSync(path.join(repos,name),{recursive:true});fs.writeFileSync(path.join(repos,name,'file.tsx'),'export default () => <p>before</p>;');}
  fs.writeFileSync(path.join(root,'.slightnudge/repositories.json'),JSON.stringify(['alpha','beta'].map(id=>({id,localPath:path.join(repos,id)}))));
  fs.writeFileSync(path.join(root,'safe.tsx'),'export default () => <p>safe</p>;');
  check('Regular local file remains usable',resolveWorkspaceSourcePath('safe.tsx')===fs.realpathSync(path.join(root,'safe.tsx')));
  check('Registered project source remains usable',(await resolveRepositorySourcePath('alpha','file.tsx')).filePath===fs.realpathSync(path.join(repos,'alpha','file.tsx')));
  if(!fs.existsSync(path.join(root,'escape-link')))fs.symlinkSync(outside,path.join(root,'escape-link'),'junction');
  if(!fs.existsSync(path.join(repos,'alpha','jump')))fs.symlinkSync(path.join(repos,'beta'),path.join(repos,'alpha','jump'),'junction');
  const rejects=async(name:string,fn:()=>unknown)=>{try{await fn();check(name,false,{error:'Accepted unsafe path/state'});}catch(e){check(name,true,{error:String(e)});}};
  await rejects('workspace resolver rejects escaping parent',()=>resolveWorkspaceSourcePath('../outside/victim.tsx'));
  await rejects('workspace resolver rejects absolute outside path',()=>resolveWorkspaceSourcePath(path.join(outside,'victim.tsx')));
  await rejects('workspace resolver realpaths a directory junction before reading',()=>resolveWorkspaceSourcePath('escape-link/victim.tsx'));
  await rejects('repository ID traversal rejected',()=>resolveRepositorySourcePath('../alpha','file.tsx'));
  await rejects('sourcePath traversal rejected',()=>resolveRepositorySourcePath('alpha','../beta/file.tsx'));
  await rejects('repository junction cannot escape registered project',()=>resolveRepositorySourcePath('alpha','jump/file.tsx'));
  const pendingDir=path.join(root,'.slightnudge/pending');fs.mkdirSync(pendingDir,{recursive:true});
  for(const [name,filePath,extra] of [['parent','../outside/victim.tsx',{}],['absolute',path.join(outside,'victim.tsx'),{}],['junction','escape-link/victim.tsx',{}],['cross-project','.slightnudge/repositories/beta/file.tsx',{repositoryId:'alpha',sourcePath:'file.tsx'}],['unbound-managed-file','.slightnudge/repositories/beta/file.tsx',{}]] as const){const id=randomUUID();fs.writeFileSync(path.join(pendingDir,id+'.json'),JSON.stringify({id,filePath,before:'before',after:'after',summary:'temp proof',oldValue:'before',newValue:'after',...extra}));await rejects(`pending state rejects ${name}`,()=>readPendingSourceEdit(id));}
  await rejects('previewId traversal rejected',()=>readPendingSourceEdit('../bad'));
  fs.mkdirSync(path.join(root,'.slightnudge/history'),{recursive:true});fs.writeFileSync(path.join(root,'.slightnudge/history/edits.json'),JSON.stringify([{id:randomUUID(),filePath:'.slightnudge/repositories/beta/file.tsx',repositoryId:'alpha',sourcePath:'file.tsx',before:'before',after:'after',summary:'temp proof',status:'applied'}]));
  await rejects('history state rejects a target outside its registered project',()=>readHistory());
  fs.writeFileSync(path.join(root,'.slightnudge/history/edits.json'),JSON.stringify([{id:randomUUID(),filePath:'.slightnudge/repositories/beta/file.tsx',before:'before',after:'after',summary:'unbound temp proof',status:'applied'}]));
  await rejects('history cannot omit project scope for a managed file',()=>readHistory());
 }
 if(mode==='S3'){
  const {atomicWrite}=await import('../lib/slightnudge/edit-history');const target=path.join(root,'atomic-copy.tsx'),before='original byte-identical\r\n';fs.writeFileSync(target,before);const rename=fs.renameSync;let attempts=0;let error='';
  fs.renameSync=((from:any,to:any)=>{if(path.resolve(String(to))!==target)throw Error('Fault injection attempted outside designated temp file');attempts++;throw Object.assign(Error('Injected EPERM on temp copy'),{code:'EPERM'});}) as typeof fs.renameSync;
  try{atomicWrite(target,'replacement');}catch(e){error=String(e);}finally{fs.renameSync=rename;}
  check('Permanent rename failure refuses and never falls back to overwriting original',Boolean(error)&&fs.readFileSync(target,'utf8')===before,{attempts,error,originalUnchanged:fs.readFileSync(target,'utf8')===before,nonAtomicFallbackObserved:false});
  check('At most initial rename plus three short retries',attempts===4,{expectedAttempts:4,actualAttempts:attempts});
  check('Failed publication leaves no temp file',fs.readdirSync(root).filter(name=>name.startsWith('atomic-copy.tsx.')&&name.endsWith('.tmp')).length===0);
  const partialTarget=path.join(root,'partial-write-copy.tsx'),payload='replacement with complete UTF-8: \u2713';fs.writeFileSync(partialTarget,'original');
  const write=fs.writeSync;let shortWrites=0;
  fs.writeSync=((fd:any,value:any,...args:any[])=>{shortWrites++;if(typeof value==='string')return write(fd,Buffer.from(value,'utf8').subarray(0,3));const [offset=0,length=value.length-offset,position]=args;return write(fd,value,offset,Math.min(length,3),position);}) as typeof fs.writeSync;syncBuiltinESMExports();
  try{atomicWrite(partialTarget,payload);}finally{fs.writeSync=write;syncBuiltinESMExports();}
  check('Short writes cannot publish a truncated temp file',fs.readFileSync(partialTarget,'utf8')===payload,{shortWrites,actual:fs.readFileSync(partialTarget,'utf8'),expected:payload});
 }
}catch(error){check('Proof workflow completed',false,{error:String(error),stack:(error as Error).stack});}
fs.writeFileSync(path.join(out,`${mode}-${label}.json`),JSON.stringify(rows,null,2));if(rows.some(row=>!row.pass))process.exitCode=1;
