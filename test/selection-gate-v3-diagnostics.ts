import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { logicalToScreen,probeElement,hitSource } from './helpers/selection-gate-v3-coordinates';
const dir=path.resolve('docs/selection-gate-step3-evidence');
const clean=(s:string)=>s.replace(/(__slightnudge_session=)[^&\s"<>]+/g,'$1[session-redacted]');
const browser=await chromium.launch({headless:true});
const cells=[['old-studio','m0-overfit-lab',3002],['old-window','m0-control-lab',3001],['old-window','m0-overfit-lab',3002],['full','m0-overfit-lab',3002],['fit','m0-overfit-lab',3002]] as const;
try{for(const [surface,repo,port] of cells){
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 const name=`diagnostic-${surface}-${repo}`,events:any[]=[];const started=Date.now();
 const record=(kind:string,data:any)=>events.push({ms:Date.now()-started,kind,...data});
 page.on('console',message=>record('console',{level:message.type(),text:clean(message.text())}));
 page.on('pageerror',error=>record('pageerror',{message:clean(error.message),stack:clean(error.stack||'')}));
 page.on('requestfailed',request=>record('requestfailed',{url:clean(request.url()),error:request.failure()?.errorText}));
 page.on('response',response=>record('response',{url:clean(response.url()),status:response.status()}));
 const url=new URL(surface==='old-studio'?`/studio/${repo}/edit`:surface==='old-window'?`/studio/${repo}/window`:`/editor/${repo}`,'http://127.0.0.1:3000');
 url.searchParams.set('preview',`http://127.0.0.1:${port}`);url.searchParams.set('panel','inspector');if(surface==='old-studio')url.searchParams.set('legacyStudio','1');if(surface==='full'||surface==='fit')url.searchParams.set('view',surface);
 const result:any={surface,repo,requestedUrl:url.href,started:new Date().toISOString()};
 try{
  const response=await page.goto(url.href,{waitUntil:'domcontentloaded'});result.status=response?.status();result.actualUrl=page.url();
  try{await page.locator('[data-source-ready="true"]').waitFor();result.ready=true;result.readyMs=Date.now()-started;}catch(error){result.ready=false;result.waitError=String(error);}
  result.readyAttributes=await page.locator('[data-source-ready]').evaluateAll(nodes=>nodes.map(el=>({ready:el.getAttribute('data-source-ready'),rect:el.getBoundingClientRect().toJSON()})));
  result.bodyText=clean(await page.locator('body').innerText());
  const iframe=page.locator('iframe[title="Actual project"]');result.iframeCount=await iframe.count();
  if(result.iframeCount){const frame=await (await iframe.elementHandle())!.contentFrame();if(frame){result.iframeUrl=clean(frame.url());result.frameBody=clean(await frame.locator('body').innerText().catch(()=>''));
   if(repo==='m0-overfit-lab'&&await frame.locator('#app-shell').count()){
    const locator=frame.locator('#app-shell');await locator.scrollIntoViewIfNeeded();const probe=await probeElement(locator,{x:5,y:5});
    result.case1={probe,originalPoint:await logicalToScreen(page,probe.initial),originalHit:await hitSource(frame,probe.initial),directPhysicalPoint:null};
    for(const candidate of probe.candidates){const point=await logicalToScreen(page,candidate);if(point.parentHit?.isIframe){result.case1.directPhysicalPoint={...point,hit:await hitSource(frame,candidate)};break;}}
   }
   const snapshot=()=>{const clone=document.documentElement.cloneNode(true) as HTMLElement;clone.querySelectorAll('script,input[type="hidden"]').forEach(el=>el.remove());clone.querySelectorAll('*').forEach(el=>{for(const a of Array.from(el.attributes))if(/token|nonce|secret/i.test(a.name))el.removeAttribute(a.name);});return clone.outerHTML;};
   fs.writeFileSync(path.join(dir,name+'-iframe.html'),clean(await frame.evaluate(snapshot)));
  }}
  await page.screenshot({path:path.join(dir,name+'.png')});
 }catch(error){result.error=String(error);await page.screenshot({path:path.join(dir,name+'.png')}).catch(()=>{});}
 finally{
  fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify({...result,events},null,2));console.log(JSON.stringify({name,ready:result.ready,readyMs:result.readyMs,actualUrl:result.actualUrl,error:result.error,waitError:result.waitError,errors:events.filter(e=>e.kind==='pageerror'||e.kind==='requestfailed'||e.status>=400),case1:result.case1?{initialHit:result.case1.originalHit,directPhysicalPoint:result.case1.directPhysicalPoint,fullChildRectangleCoverage:result.case1.probe.fullChildRectangleCoverage}:undefined}));await context.close();
 }
}}
finally{await browser.close();for(const [name,source] of [['studio','server-studio'],['control','server-retry-m0-control-lab'],['overfit','server-retry-m0-overfit-lab']])for(const stream of ['out','err']){const sourceFile=path.resolve(`docs/selection-gate-step2-evidence/${source}.${stream}.log`);if(fs.existsSync(sourceFile))fs.writeFileSync(path.join(dir,`server-${name}.${stream}.log`),clean(fs.readFileSync(sourceFile,'utf8')));}}
