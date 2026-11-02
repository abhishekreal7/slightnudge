// Coordinator only: existing test files, selectors, expected results and limits
// are never patched. --workflow/--ref support controlled historical comparison.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire,syncBuiltinESMExports} from 'node:module';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);

// Observation, not new test assertions. Report errors from the actual browsers
// launched by existing commands so the coordinator can enforce the stop rule.
if (process.env.GATE_CHILD_OBSERVE === '1') {
  const childProcess=createRequire(import.meta.url)('node:child_process');
  const originalSpawn=childProcess.spawn;
  const originalExec=childProcess.execFileSync;
  childProcess.execFileSync=function(file,args=[],options={}){
    const started=Date.now();process.stdout.write(`SETUP ${started} START ${file} ${JSON.stringify(args)}\n`);
    try{return originalExec.call(this,file,args,{...options,stdio:options.stdio==='ignore'?'pipe':options.stdio});}
    catch(error){process.stdout.write(`SETUP ERROR ${error.stderr?.toString()||error.message}\n`);throw error;}
    finally{process.stdout.write(`SETUP END elapsed ${Date.now()-started}ms\n`);}
  };
  let serverIndex=0;
  childProcess.spawn=function(executable,args=[],options={}){
    const next=args.some(value=>/next[\\/]dist[\\/]/.test(String(value)));
    const start=Date.now();
    const child=originalSpawn.call(this,executable,next?['--import',pathToFileURL(path.join(project,'tools/observe-next-manifests.mjs')).href,...args]:args,options);
    if(next&&process.env.GATE_LOG_DIR){const file=path.join(process.env.GATE_LOG_DIR,`child-server-${++serverIndex}-${child.pid}.log`);fs.appendFileSync(file,JSON.stringify({start,cwd:options.cwd,args})+'\n');for(const stream of [child.stdout,child.stderr])stream?.on('data',chunk=>fs.appendFileSync(file,chunk));child.on('exit',(code)=>fs.appendFileSync(file,`\nEXIT ${code} elapsed ${Date.now()-start}ms\n`));}
    return child;
  };syncBuiltinESMExports();
  const {chromium} = await import('playwright');
  const launch = chromium.launch.bind(chromium), observed = new WeakSet();
  function observe(page) {
    if (observed.has(page)) return;
    observed.add(page);
    page.on('request',request=>{if(request.isNavigationRequest()||/preview|repositories|responsive/.test(request.url()))process.stdout.write(`TIMING ${Date.now()} REQUEST ${request.url()}\n`);});
    page.on('response',response=>{if(response.request().isNavigationRequest()||/preview|repositories|responsive/.test(response.url()))process.stdout.write(`TIMING ${Date.now()} RESPONSE ${response.status()} ${response.url()}\n`);});
    page.on('pageerror', error => process.stderr.write(`GATE_BROWSER_PAGE_ERROR ${page.url()}\n${error.stack || error.message}\n`));
  }
  chromium.launch = async (...args) => {
    const browser = await launch(...args);
    const newContext = browser.newContext.bind(browser), newPage = browser.newPage.bind(browser);
    browser.newContext = async (...values) => { const context = await newContext(...values); context.on('page', observe); context.pages().forEach(observe); return context; };
    browser.newPage = async (...values) => { const page = await newPage(...values); observe(page); return page; };
    return browser;
  };
} else {
  await main();
}

async function main() {
  const totalStarted=performance.now();
  if (path.resolve(process.cwd()) !== project) throw Error('Run gate from the project folder.');
  const option = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
  const git = (args, cwd = project) => execFileSync('git', args, {cwd, encoding:'utf8', maxBuffer:32 * 1024 * 1024}).trim();
  const head = git(['rev-parse','HEAD']), ref = git(['rev-parse',option('--ref') || 'HEAD']);
  const comparisonFile=option('--failed-from');
  const failedNames=comparisonFile?JSON.parse(fs.readFileSync(path.resolve(project,comparisonFile),'utf8')).rows.filter(row=>row.result!=='PASS').map(row=>row.workflow):null;
  const requested = comparisonFile?'failed-comparison':option('--workflow');
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const runId = `${stamp}-${ref.slice(0,7)}${requested ? '-' + requested : ''}`;
  // Keep nested disposable repositories below Windows Git's path limit.
  const scratch = path.join(project,'scratch','g',crypto.randomBytes(4).toString('hex'));
  const evidence = path.join(project,'docs','reliability-gate',runId);
  const workspace = path.join(scratch,'worktree');
  fs.mkdirSync(scratch,{recursive:true}); fs.mkdirSync(evidence,{recursive:true});
  const raw = fs.createWriteStream(path.join(evidence,'raw.log'),{flags:'wx'});
  const print = text => { process.stdout.write(text); raw.write(text); };
  const json = (file,value) => fs.writeFileSync(path.join(evidence,file),JSON.stringify(value,null,2));
  const rows = [], servers = new Set(), observedPorts=new Set(); let fatal = false,selectionSetupError;
  const selectionPorts=[];
  for(let index=0;index<3;index++)selectionPorts.push(await new Promise((resolve,reject)=>{
    const socket=net.createServer();socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});
  }));
  const [editorPort,controlPort,overfitPort]=selectionPorts;
  const safe = target => { const relative = path.relative(project,path.resolve(target)); if (!relative || relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) throw Error('Gate output must stay inside project: '+target); return target; };
  const envBase = {};
  for (const name of ['PATH','Path','SystemRoot','WINDIR','COMSPEC','PATHEXT','USERPROFILE','APPDATA','LOCALAPPDATA']) if (process.env[name]) envBase[name] = process.env[name];
  const temp = path.join(workspace,'scratch','security-hardening-20261101','os-temp');
  const env = {...envBase,TEMP:temp,TMP:temp,CI:'1',NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',SLIGHTNUDGE_LEGACY_STUDIO:'1'};
  Object.assign(env,{GATE_EDITOR_URL:`http://127.0.0.1:${editorPort}`,GATE_CONTROL_PORT:String(controlPort),GATE_OVERFIT_PORT:String(overfitPort)});
  const selectionFile = (surface,suite) => path.join(workspace,'docs','editor-load-and-toolbar','selection',`round-1-${surface}-${suite}.json`);
  const browser = (name,flag,historical,mode='REAL') => ({name,args:['--import','tsx','test/review-consent.browser.v3.ts',flag],historical,mode,harness:'HARNESS-V3'});
  const plan = [
    ...['full','fit'].flatMap(surface => ['regression','overfit'].map(suite => ({name:`selection-${surface}-${suite}`,surface,suite,mode:'REAL',harness:'HARNESS-V3',args:['--import','tsx',`test/m0-${suite}.reliability.v3.test.ts`],historical:'docs/editor-load-and-toolbar/selection/round-1-raw.log'}))),
    ...['local','imported'].flatMap(kind=>[false,true].map(window=>({name:`shared-${kind}-${window?'window':'studio'}`,mode:'REAL',harness:'HARNESS-V3',extra:{GATE_SHARED_KIND:kind,GATE_SHARED_VIEW:String(window)},args:['--import','tsx','test/shared-instance-security.v2.browser.v3.ts','--shared-instances'],historical:'docs/security-hardening/shared-workflows.log'}))),
    browser('movement','--drag-move','docs/center-move-release.log'),
    browser('state-and-transitions','--m1','docs/m1-final-gates.log'),
    browser('responsive','--responsive','docs/responsive-editing-qualification.log'),
    browser('responsive-imported','--responsive-project','docs/responsive-imported-final.log'),
    browser('appearance-layout','--appearance-layout','docs/appearance-layout.md'),
    browser('images-local','--image-advanced','docs/advanced-image-local-final.log'),
    browser('images-imported','--image-advanced-project','docs/advanced-image-imported-final.log'),
    browser('component-actions-local','--component-actions','docs/component-actions-local-final.log','REAL + MOCKED failure injection'),
    browser('component-actions-imported','--component-actions-project','docs/component-actions-imported-final.log','REAL + MOCKED failure injection'),
    browser('icon-replacement','--icon-replacement-all','docs/icon-replacement-qualification.log'),
    browser('icon-properties','--icon-properties-all','docs/icon-properties-imported-final.log'),
    browser('section-order','--section-order','docs/section-order-final.log'),
    browser('container-move','--container-move','docs/container-move-qualification.log'),
    browser('text-editing','--inline-text','docs/component-text-final.log'),
    browser('history','--imported-canvas','docs/change-history-release.log'),
    browser('recovery','--reload-recovery','docs/recovery-release-gates.log','REAL + MOCKED failure injection'),
  ];
  for (const item of plan) item.historicalEvidenceExists = fs.existsSync(path.join(project,item.historical));
  const selected = failedNames?plan.filter(item=>failedNames.includes(item.name)):requested ? plan.filter(item=>item.name===requested||requested==='selection'&&item.surface||requested==='shared'&&item.name.startsWith('shared-')) : plan;
  if (!selected.length) throw Error('Unknown workflow '+requested);
  json('plan.json',{head,productRef:ref,testRef:head,workspace,requested:selected.map(item=>item.name),plan});
  fs.writeFileSync(path.join(evidence,'git-status-before.txt'),git(['status','--short'])+'\n');
  print(`GATE evidence ${evidence}\nPRODUCT ${ref} TESTS ${head}\nNo test assertions or limits changed; same HEAD tests at every historical product ref.\n`);

  function stop(child) {
    if (!child?.pid) return;
    try { if (process.platform==='win32') execFileSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'}); else process.kill(-child.pid,'SIGTERM'); } catch { /* Already exited. */ }
  }
  function stopServers() { for (const child of servers) stop(child); servers.clear(); }
  function checkServerManifests() {
    const invalid=[...observedPorts].filter(port=>{
      const log=path.join(evidence,`server-${port}.log`);
      return fs.existsSync(log)&&fs.readFileSync(log,'utf8').includes('INVALID_NEXT_MANIFEST ');
    });
    return invalid;
  }
  async function command(name,args,extra={},budget) {
    const started = performance.now(), chunks=[];
    print(`\nCOMMAND ${name}: node ${args.join(' ')}\n`);
    const fd = fs.openSync(path.join(evidence,name+'.log'),'wx');
    const workflowLogs=path.join(evidence,name+'-servers');fs.mkdirSync(workflowLogs,{recursive:true});
    const child = spawn(process.execPath,['--import',pathToFileURL(self).href,...args],{cwd:workspace,env:{...env,GATE_CHILD_OBSERVE:'1',GATE_LOG_DIR:workflowLogs,...extra},windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
    let tail='',timedOut=false;
    const cap=budget??(name.startsWith('shared-')?120000:300000);
    const watchdog=setTimeout(()=>{timedOut=true;print(`TIMEOUT ${name} after ${cap/1000}s\n`);stop(child);},cap);
    const output = chunk => {
      const text=String(chunk);chunks.push(text);fs.writeSync(fd,text);print(text);
      tail=(tail+text).slice(-16000);
      if (/STOP WRONG TARGET|STOP-WRONG-TARGET|"verdict"\s*:\s*"WRONG TARGET"/.test(tail)||(name.startsWith('selection-')&&/GATE_BROWSER_PAGE_ERROR/.test(tail)&&!chunks.join('').includes('"index":'))) {fatal=true;stop(child);}
    };
    child.stdout.on('data',output); child.stderr.on('data',output);
    let code,harnessError;
    try { code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);}); }
    catch(error){code=1;harnessError=String(error);print(`HARNESS-ERROR ${name}: ${harnessError}\n`);}
    finally { clearTimeout(watchdog);stop(child);fs.closeSync(fd); }
    return {code,timedOut,harnessError,seconds:Math.round((performance.now()-started)/10)/100,output:chunks.join('')};
  }
  function startServer(port,cwd) {
    observedPorts.add(port);
    const fd=fs.openSync(path.join(evidence,`server-${port}.log`),'wx');
    const child=spawn(process.execPath,['--import',pathToFileURL(path.join(project,'tools/observe-next-manifests.mjs')).href,path.join(project,'node_modules','next','dist','bin','next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd,env:{...env,PORT:String(port)},windowsHide:true,detached:process.platform!=='win32',stdio:['ignore',fd,fd]});
    fs.closeSync(fd);servers.add(child);print(`SERVER ${port} PID ${child.pid} ${cwd}\n`);
    return child;
  }
  async function warmup() {
    for (const port of selectionPorts) await new Promise((resolve,reject)=>{const socket=net.createServer();socket.once('error',reject);socket.listen(port,'127.0.0.1',()=>socket.close(resolve));});
    for (const [port,cwd] of [[editorPort,workspace],[controlPort,path.join(workspace,'.slightnudge/repositories/m0-control-lab')],[overfitPort,path.join(workspace,'.slightnudge/repositories/m0-overfit-lab')]]) startServer(port,cwd);
    const {chromium}=await import('playwright');const browser=await chromium.launch({headless:true,env:{...env}});
    try {
      for (const [repo,port] of [['m0-control-lab',controlPort],['m0-overfit-lab',overfitPort]]) for (const view of ['full','fit']) {
        const started=performance.now(), deadline=started+180000;
        // Only server warm-up has a 180-second budget. Existing test waits are untouched.
        while (performance.now()<deadline) {try{const r=await fetch(`http://127.0.0.1:${editorPort}/api/slightnudge/repositories/`+repo,{signal:AbortSignal.timeout(Math.min(10000,Math.max(1,deadline-performance.now())))});if(r.ok)break;}catch{} await new Promise(resolve=>setTimeout(resolve,250));}
        // Compile the same iframe document before the editor's shorter preview
        // connection timeout is involved. This is still inside warm-up's budget.
        const preview=await fetch('http://127.0.0.1:'+port,{signal:AbortSignal.timeout(Math.max(1,Math.floor(deadline-performance.now())))});
        if(!preview.ok)throw Error(`Warm-up preview HTTP ${preview.status}: ${repo}`);
        const page=await browser.newPage({viewport:{width:1440,height:900}});let pageError;
        const traceFile=path.join(evidence,`warmup-${repo}-${view}-network.jsonl`);
        const trace=value=>fs.appendFileSync(traceFile,JSON.stringify({time:Date.now(),elapsed:performance.now()-started,...value})+'\n');
        page.on('console',message=>trace({kind:'console',level:message.type(),text:message.text()}));
        page.on('request',request=>trace({kind:'request',url:request.url()}));
        page.on('response',response=>trace({kind:'response',url:response.url(),status:response.status()}));
        page.on('requestfailed',request=>trace({kind:'requestfailed',url:request.url(),error:request.failure()}));
        trace({kind:'warmup-page-created',remaining:deadline-performance.now()});
        const errorSignal=new Promise((_,reject)=>page.once('pageerror',error=>{pageError=error;fatal=true;reject(error);}));void errorSignal.catch(()=>{});
        const url=`http://127.0.0.1:${editorPort}/editor/${repo}?view=${view}&preview=${encodeURIComponent('http://127.0.0.1:'+port)}`;
        try {
          await Promise.race([(async()=>{await page.goto(url,{waitUntil:'domcontentloaded',timeout:Math.max(1,deadline-performance.now())});await page.locator('[data-source-ready="true"]').waitFor({timeout:Math.max(1,deadline-performance.now())});})(),errorSignal]);
          if(pageError)throw pageError;
          const seconds=Math.round((performance.now()-started)/10)/100;rows.push({workflow:`warmup-${repo}-${view}`,api:'REAL',result:'PASS',seconds});print(`WARMUP ${repo} ${view}: ${seconds}s\n`);
        } catch(error) { rows.push({workflow:`warmup-${repo}-${view}`,api:'REAL',result:'FAIL',seconds:Math.round((performance.now()-started)/10)/100,error:String(error)});trace({kind:'failure',error:String(error)});await page.content().then(content=>fs.writeFileSync(path.join(evidence,`warmup-${repo}-${view}-failure.html`),content)).catch(()=>{});await page.screenshot({path:path.join(evidence,`warmup-${repo}-${view}-failure.png`),timeout:5000}).catch(()=>{});throw error; }
        finally { await page.close(); }
      }
    } finally {await browser.close();}
  }

  try {
    git(['worktree','add','--detach','--no-checkout',safe(workspace),ref]);
    const allowed=file=>!/((^|\/)\.env($|\.)|secret|credential|\.(pem|key)$)/i.test(file);
    const files=git(['ls-tree','-r','--name-only',ref]).split('\n').filter(file=>allowed(file)&&/^(app\/|components\/|lib\/|fixtures\/|public\/|types\/|worker\/|package(?:-lock)?\.json$|tsconfig\.json$|next-env\.d\.ts$|next\.config\.|postcss\.config\.|proxy\.ts$|\.gitignore$|AGENTS\.md$|README\.md$)/.test(file));
    for(let index=0;index<files.length;index+=40)git(['checkout',ref,'--',...files.slice(index,index+40)],workspace);
    // Fixed existing tests: do not compare different test definitions between refs.
    const testPaths=git(['ls-tree','-r','--name-only',head,'--','test']).split('\n').filter(file=>allowed(file));
    for(let index=0;index<testPaths.length;index+=40)git(['checkout',head,'--',...testPaths.slice(index,index+40)],workspace);
    fs.mkdirSync(temp,{recursive:true});fs.mkdirSync(path.join(workspace,'docs/editor-load-and-toolbar/selection'),{recursive:true});
    process.env.TEMP=temp;process.env.TMP=temp;
    fs.symlinkSync(path.join(project,'node_modules'),path.join(workspace,'node_modules'),'junction');
    const testFiles=git(['ls-files','test'],workspace).split('\n').filter(Boolean),hashes={};
    for(const file of testFiles)if(allowed(file)&&fs.statSync(path.join(workspace,file)).isFile())hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(workspace,file))).digest('hex');
    json('unchanged-test-hashes.json',hashes);
    if(!requested||selected.some(item=>item.surface)) {
      // Existing generated lab adapter files are disposable setup artifacts.
      const source=path.join(project,'scratch/security-hardening-20261101/runtime/.slightnudge/repositories');
      const records=[];
      const copy=(from,to)=>{fs.mkdirSync(to,{recursive:true});for(const entry of fs.readdirSync(from,{withFileTypes:true})){if(['.git','.next','node_modules'].includes(entry.name)||!allowed(entry.name))continue;const a=path.join(from,entry.name),b=path.join(to,entry.name);if(entry.isDirectory())copy(a,b);else if(entry.isFile())fs.copyFileSync(a,b);}};
      for(const id of ['m0-control-lab','m0-overfit-lab']) {
        const dest=path.join(workspace,'.slightnudge/repositories',id);copy(path.join(source,id),dest);fs.symlinkSync(path.join(source,id,'node_modules'),path.join(dest,'node_modules'),'junction');
        execFileSync('git',['init','--quiet'],{cwd:dest,stdio:'ignore'});records.push({id,localPath:dest,owner:'local',name:id,defaultBranch:'main'});
      }
      fs.writeFileSync(path.join(workspace,'.slightnudge/repositories.json'),JSON.stringify(records,null,2));
      const install=await command('prepare-lab-adapters',['--import','tsx','--input-type=module','-e',"const {installNextSourceAdapter}=await import('./lib/slightnudge/next-source-adapter.ts');for(const id of ['m0-control-lab','m0-overfit-lab'])await installNextSourceAdapter(id);console.log('Temp adapters prepared');"]);
      if(install.code!==0)throw Error('Temporary adapter setup failed');
      try { await warmup(); } catch(error) { selectionSetupError=String(error);print(`${fatal?'STOP pre-case page error':'Selection setup HARNESS-ERROR'}: ${error}\n`); }
      print(`Warm-up invalid manifest servers: ${checkServerManifests().join(', ')||'none'}\n`);
    }
    let sharedDeadline,sharedEnv={},sharedSetupError;
    for(const item of selected) {
      if(fatal)break;
      if(item.surface&&selectionSetupError){rows.push({workflow:item.name,api:'REAL',result:'HARNESS-ERROR',seconds:0,error:selectionSetupError});continue;}
      if(!item.surface&&!item.name.startsWith('shared-'))stopServers();
      if(item.name.startsWith('shared-')&&!sharedDeadline){
        stopServers();
        sharedDeadline=performance.now()+480000;
        const setup=await command('shared-runtime-setup',['--import','tsx','test/gate-shared-runner.v3.ts','--setup-only'],{},180000);
        const match=setup.output.match(/^GATE_RUNTIMES (.+)$/m);
        if(setup.code!==0||!match)sharedSetupError='Shared runtime setup failed; see shared-runtime-setup.log';
        else {
          const runtime=JSON.parse(match[1]),ports=[];
          for(let index=0;index<2;index++)ports.push(await new Promise((resolve,reject)=>{const socket=net.createServer();socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});}));
          startServer(ports[0],safe(runtime.workspace));startServer(ports[1],safe(runtime.repo));
          sharedEnv={GATE_SHARED_EDITOR_URL:`http://127.0.0.1:${ports[0]}`,GATE_SHARED_PREVIEW_URL:`http://127.0.0.1:${ports[1]}`};
        }
        const prepared=sharedSetupError?{timedOut:false,harnessError:sharedSetupError,code:1,seconds:setup.seconds}:await command('shared-compiler-warmup',['--import','tsx','test/gate-shared-runner.v3.ts','--prepare'],sharedEnv,180000);
        rows.push({workflow:'shared-compiler-warmup',harness:'HARNESS-V3',api:'REAL',result:prepared.timedOut?'TIMEOUT':prepared.harnessError?'HARNESS-ERROR':prepared.code===0?'PASS':'FAIL',seconds:prepared.seconds});
        if(prepared.code!==0)sharedSetupError=sharedSetupError||'Shared compiler warm-up failed; see shared-compiler-warmup.log';
      }
      if(item.name.startsWith('shared-')&&sharedSetupError){rows.push({workflow:item.name,harness:'HARNESS-V3',api:'REAL',result:'HARNESS-ERROR',seconds:0,error:sharedSetupError});continue;}
      const budget=item.name.startsWith('shared-')?Math.max(1,Math.min(120000,sharedDeadline-performance.now())):300000;
      const args=item.name.startsWith('shared-')?['--import','tsx','test/gate-shared-runner.v3.ts']:item.args;
      const result=await command(item.name,args,item.surface?{SELECTION_ROUND:'1',SELECTION_SURFACE:item.surface,RELIABILITY_GEOMETRY:item.surface==='fit'?'1':'0'}:item.name.startsWith('shared-')?{...sharedEnv,...item.extra}:item.extra||{},budget);
      if(item.name.startsWith('shared-')&&result.timedOut){stopServers();sharedSetupError='Previous shared workflow timed out; refusing to reuse state while an Apply may be unconfirmed';}
      let passed=result.code===0&&!/GATE_BROWSER_PAGE_ERROR/.test(result.output);
      if(item.surface) {
        const file=selectionFile(item.surface,item.suite);let data=null;
        try{data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;}catch(error){result.harnessError='Invalid selection artifact: '+String(error);}
        if(data&&(!Array.isArray(data.cases)||!Array.isArray(data.events))){result.harnessError='Invalid selection artifact schema';data=null;}
        passed=passed&&data?.cases.length===30&&!data.events.some(event=>event.kind==='pageerror')&&!data.cases.some(row=>['WRONG TARGET','MISSING-TARGET'].includes(row.verdict)||row.assertions.pointerSource.status==='FAIL'||row.assertions.expectedSource.status==='FAIL'||row.expectedResultMatch===false);
        if((data?.cases.length===0&&data?.events.some(event=>event.kind==='pageerror'))||data?.cases.some(row=>row.verdict==='WRONG TARGET'))fatal=true;
      }
      if(!item.surface&&!/PASS: \d+ review-consent browser cases/.test(result.output))passed=false;
      const api=/mocked API|MOCKED/.test(result.output)||item.mode.includes('MOCKED')?'MOCKED':'REAL';
      const invalid=checkServerManifests();
      rows.push({workflow:item.name,harness:item.harness||'existing',api,result:result.timedOut?'TIMEOUT':result.harnessError||/ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError:.*test\/|Filename too long|EADDRINUSE/.test(result.output)?'HARNESS-ERROR':passed&&!invalid.length?'PASS':'FAIL',seconds:result.seconds,exitCode:result.code,historical:item.historical,invalidManifestServers:invalid,error:result.harnessError});
      json('results.json',{head,productRef:ref,testRef:head,fatal,rows});
      fs.cpSync(path.join(workspace,'docs'),path.join(evidence,item.name+'-artifacts'),{recursive:true,filter:source=>!source.split(path.sep).some(part=>/^\.env(?:\.|$)/.test(part))});
    }
  } catch(error) {print(`GATE ERROR ${error.stack || error}\n`);if(!rows.some(row=>row.result==='FAIL'))rows.push({workflow:'setup',api:'REAL',result:'FAIL',seconds:0,error:String(error)});}
  finally {
    stopServers();
    for(const item of selected)if(!rows.some(row=>row.workflow===item.name))rows.push({workflow:item.name,api:item.mode,result:'NOT RUN',seconds:0});
    print('\nworkflow | harness | REAL or MOCKED | result | seconds\n');for(const row of rows)print(`${row.workflow} | ${row.harness||'existing'} | ${row.api} | ${row.result} | ${row.seconds}\n`);
    json('results.json',{head,productRef:ref,testRef:head,fatal,rows});
    fs.writeFileSync(path.join(evidence,'git-status-after.txt'),git(['status','--short'])+'\n');
    fs.writeFileSync(path.join(evidence,'worktree-status-after.txt'),git(['status','--short'],workspace)+'\n');
    const failed=rows.some(row=>row.result!=='PASS');print(`TOTAL ELAPSED ${Math.round((performance.now()-totalStarted)/10)/100}s\nGATE ${failed?'FAIL':'PASS'}; evidence ${evidence}\n`);raw.end();process.exitCode=failed?1:0;
  }
}
