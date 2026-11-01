import { chromium,type Page,type Frame } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { inspectElement } from '../../lib/slightnudge/ast-nudger';
import { logicalToScreen,probeElement,hitSource } from './selection-gate-v3-coordinates';

type Spec={index:number;selector:string;clickPosition?:{x:number;y:number};expectedFile:string;expectedLine:number;expectedTag:string;expectedOutcome:'allowed'|'refused';expectedRefusalPattern?:RegExp;textShouldBeAllowed?:boolean};
const dir=path.resolve('docs/selection-gate-step3-evidence');
const identity=(node:any)=>node&&({path:node.path?.replaceAll('\\','/'),line:node.line,column:node.column,tag:node.tag||node.tagName,instance:node.instance});
const same=(a:any,b:any)=>Boolean(a&&b&&a.path?.replaceAll('\\','/')===b.path?.replaceAll('\\','/')&&a.line===b.line&&a.column===b.column&&(a.tag||a.tagName)===(b.tag||b.tagName)&&(!a.instance&&!b.instance||a.instance===b.instance));
const expectedMatch=(node:any,s:Spec)=>Boolean(node&&path.basename(node.path)===s.expectedFile&&node.line===s.expectedLine&&(node.tag||node.tagName)===s.expectedTag);
export async function clearEditorSelection(page:Page){
 const root=page.locator('[aria-label="Visual editing workspace"]');
 if(await root.getAttribute('data-window-panel')){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-window-panel'));}
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source'));
}
async function selectedNode(page:Page){
 const value=await page.locator('[aria-label="Visual editing workspace"]').getAttribute('data-selected-source');const parts=value?.match(/^(.*):(\d+):(\d+):([^:]+)$/);
 return parts?{path:parts[1],line:Number(parts[2]),column:Number(parts[3]),tag:parts[4]}:null;
}
export async function runSelectionGate(specs:Spec[],suite:'regression'|'overfit'){
 const round=Number(process.env.SELECTION_ROUND||1),surface=process.env.SELECTION_SURFACE||'old-studio';
 const repo=suite==='regression'?'m0-control-lab':'m0-overfit-lab',port=suite==='regression'?3001:3002;
 const url=new URL(surface==='old-studio'?`/studio/${repo}/edit`:surface==='old-window'?`/studio/${repo}/window`:`/editor/${repo}`,'http://127.0.0.1:3000');
 url.searchParams.set('preview',`http://127.0.0.1:${port}`);if(surface==='old-studio')url.searchParams.set('legacyStudio','1');if(surface==='full'||surface==='fit')url.searchParams.set('view',surface);
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}});
 const name=`round-${round}-${surface}-${suite}`,rows:any[]=[],geometry:any[]=[],events:any[]=[];
 page.on('pageerror',error=>events.push({kind:'pageerror',message:error.message}));page.on('requestfailed',request=>events.push({kind:'requestfailed',url:request.url().split('?')[0],error:request.failure()?.errorText}));
 const save=()=>fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify({round,surface,suite,requestedUrl:url.href,actualUrl:page.url(),cases:rows,geometry,events},null,2));
 try{
  console.log('NAVIGATION '+url.href);await page.goto(url.href,{waitUntil:'domcontentloaded'});await page.locator('[data-source-ready="true"]').waitFor();
  const frame=await (await page.locator('iframe[title="Actual project"]').elementHandle())!.contentFrame();if(!frame)throw Error('No actual-project frame');
  await page.evaluate(()=>{(window as any).__gateV3=[];window.addEventListener('message',event=>{const iframe=document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement;const data=event.data;if(event.source===iframe?.contentWindow&&data?.channel==='slightnudge'&&['source-selection','selection-refused'].includes(data.type))(window as any).__gateV3.push({type:data.type,reason:data.reason,selection:data.selection?{path:data.selection.path,line:data.selection.line,column:data.selection.column,tag:data.selection.tagName,instance:data.selection.instance}:null});});});
  await frame.evaluate(()=>{(window as any).__gatePointers=[];window.addEventListener('pointerdown',event=>{const target=event.target as Element,node=target.closest<HTMLElement>('[data-source-file]');(window as any).__gatePointers.push({point:{x:event.clientX,y:event.clientY},element:{tag:target.tagName.toLowerCase(),id:target.id,classes:String(target.className||'')},source:node?{path:node.dataset.sourceFile,line:Number(node.dataset.sourceLine),column:Number(node.dataset.sourceColumn)||(node.id?1:0),tag:node.tagName.toLowerCase(),instance:node.dataset.slightnudgeCallsite}:null});},true);});
  const runCase=async(s:Spec,scale?:number)=>{
   const row:any={index:s.index,selector:s.selector,originalPosition:s.clickPosition||'default centre',expected:{file:s.expectedFile,line:s.expectedLine,tag:s.expectedTag,outcome:s.expectedOutcome},scale,assertions:{pointerSource:{status:'NOT-RUN'},expectedSource:{status:'NOT-RUN'}}};
   const locator=frame.locator(s.selector);
   if(!await locator.count())return {...row,verdict:'MISSING-TARGET',reason:'Original locator missing'};
   try{await clearEditorSelection(page);await locator.scrollIntoViewIfNeeded();}catch(error){return {...row,verdict:'MISSING-TARGET',reason:String(error)};}
   const probe=await probeElement(locator,s.clickPosition);row.probe={...probe,candidates:undefined,candidateCount:probe.candidates.length};
   const candidates=await logicalToScreen(page,probe.candidates);
   const blocked=candidates.filter(c=>c.parentHit&&!c.parentHit.isIframe);row.blocked=blocked.slice(0,1);
   if(blocked.length)await page.screenshot({path:path.join(dir,`${name}-case-${s.index}-blocked${scale?'-'+scale:''}.png`)});
   const chosen=candidates.find(c=>c.parentHit?.isIframe);
   let method='pointer',signal:any=null,pointer:any=null,actual:any=null;
   if(chosen){
    row.click=chosen;row.preflight=await hitSource(frame,chosen.logical);
    const start=await page.evaluate(()=>(window as any).__gateV3.length),pointerStart=await frame.evaluate(()=>(window as any).__gatePointers.length);
    try{await page.mouse.click(chosen.screen.x,chosen.screen.y);await page.waitForFunction(start=>(window as any).__gateV3.length>start,start);}catch(error){return {...row,verdict:'MISSING-TARGET',reason:String(error)};}
    const signals=await page.evaluate(start=>(window as any).__gateV3.slice(start),start);signal=signals.at(-1);row.signals=signals;
    pointer=await frame.evaluate(start=>(window as any).__gatePointers.slice(start).at(-1),pointerStart);row.pointer=pointer;
    if(signal?.type==='source-selection'){try{await page.waitForFunction(()=>Boolean(document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source')));}catch(error){return {...row,verdict:'MISSING-TARGET',reason:String(error)};}actual={...await selectedNode(page),instance:signal.selection?.instance};}
    row.actual=actual;
    row.assertions.pointerSource=actual?{status:same(actual,pointer?.source)?'PASS':'FAIL',selected:identity(actual),underPointer:identity(pointer?.source)}:{status:'N/A',reason:signal?.type==='selection-refused'?'Explicit refusal; no selected source node':'No selected source node'};
    const hitExpected=same(pointer?.source,probe.source);row.hitExpected=hitExpected;
    row.assertions.expectedSource=actual&&hitExpected?{status:expectedMatch(actual,s)?'PASS':'FAIL',selected:identity(actual)}:{status:'N/A',reason:signal?.type==='selection-refused'?'Explicit refusal':!hitExpected?'Pointer did not hit the intended element':'No selected source'};
    if(actual&&!same(actual,pointer?.source))return {...row,verdict:'WRONG TARGET',reason:'Selected source differs from the source node physically under the pointer'};
    if(actual&&!hitExpected)return {...row,verdict:'MISSING-TARGET',reason:'Pointer rounding/layout movement missed the intended element; selected source matched actual hit'};
   }else{
    method='Layers';row.assertions.pointerSource={status:'N/A',reason:'No exposed page-content point; Layers fallback'};
    const toggle=page.getByRole('button',{name:'Toggle layers',exact:true});if(await toggle.count()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
    const buttons=page.locator('[aria-label="Layers panel"] button[title]');
    const title=await buttons.evaluateAll((nodes,target)=>nodes.map(n=>n.getAttribute('title')||'').find(t=>t.includes(` · ${target.tag} · ${target.path}:${target.line}`)&&(t.endsWith(`:${target.line}`)||t.includes(`:${target.line} ·`))),probe.source);
    if(title){const button=page.getByTitle(title,{exact:true}).first();if(await button.isEnabled())try{await button.click();await page.waitForFunction(()=>Boolean(document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source')));actual=await selectedNode(page);}catch(error){row.layerError=String(error);}else row.layerError='Layer is disabled for repeated source instances';}else row.layerError='Expected source node is not exposed in Layers';
    row.actual=actual;row.assertions.expectedSource=actual?{status:expectedMatch(actual,s)?'PASS':'FAIL',method:'Layers',selected:identity(actual)}:{status:'FAIL',method:'Layers',reason:row.layerError||'No selection'};
   }
   row.method=method;
   const r=probe.rect,inspection=inspectElement({filePath:path.resolve('.slightnudge/repositories',repo,probe.source.path),line:probe.source.line,column:probe.source.column,tagName:probe.source.tag,className:String(probe.classes||''),rect:{top:r.y,left:r.x,width:r.width,height:r.height},clickedRect:{top:r.y,left:r.x,width:r.width,height:r.height}});
   const safety=inspection.safeToEdit?'allowed':'refused';row.inspection=inspection;
   row.expectedResultMatch=path.basename(inspection.filePath||probe.source.path)===s.expectedFile&&inspection.line===s.expectedLine&&inspection.tagName?.toLowerCase()===s.expectedTag.toLowerCase()&&safety===s.expectedOutcome&&(!s.expectedRefusalPattern||!inspection.reason||s.expectedRefusalPattern.test(inspection.reason))&&(s.textShouldBeAllowed!==false||inspection.textEditable===false);
   row.verdict=method==='Layers'?'NOT-CLICKABLE':signal?.type==='selection-refused'?'refused':actual?safety:'MISSING-TARGET';
   row.safetyOutcome=safety;row.uiRefusal=signal?.reason;
   const overlay=actual?await page.getByLabel('Selected source element',{exact:true}).boundingBox().catch(()=>null):null,box=await locator.boundingBox();row.offset=overlay&&box?{x:overlay.x-box.x,y:overlay.y-box.y,width:overlay.width-box.width,height:overlay.height-box.height}:null;
   row.actualScale=(await logicalToScreen(page,probe.initial)).scale;
   return row;
  };
  const accept=async(row:any,isGeometry=false)=>{
   (isGeometry?geometry:rows).push(row);save();console.log(JSON.stringify(row));
   if(row.verdict==='WRONG TARGET'){fs.writeFileSync(path.join(dir,'STOP-WRONG-TARGET.json'),JSON.stringify({name,...row},null,2));await page.screenshot({path:path.join(dir,name+'-wrong-target.png')});throw Error('STOP WRONG TARGET '+name+' case '+row.index);}
  };
  for(const s of specs)await accept(await runCase(s));
  if(surface==='fit')for(const scale of [.5,1,1.5]){await page.getByRole('combobox',{name:'Canvas zoom',exact:true}).selectOption(String(scale));for(const s of specs.filter(s=>s.expectedOutcome==='allowed').slice(0,10))await accept(await runCase(s,scale),true);}
  console.log('COMPLETED '+name+' '+rows.length+'/30; geometry '+geometry.length);
 }catch(error){events.push({kind:'harness-or-setup-error',message:String(error)});await page.screenshot({path:path.join(dir,name+'-error.png')}).catch(()=>{});throw error;}
 finally{save();await browser.close();}
}
