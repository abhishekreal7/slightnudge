import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { inspectElement } from '../../lib/slightnudge/ast-nudger';

type Spec={index:number;selector:string;clickPosition?:{x:number;y:number};expectedFile:string;expectedLine:number;expectedTag:string;expectedOutcome:'allowed'|'refused';expectedRefusalPattern?:RegExp;textShouldBeAllowed?:boolean};
const evidence=path.resolve(process.env.SELECTION_EVIDENCE||'docs/selection-gate-step2-evidence');
export async function runIframeSelections(specs:Spec[],suite:'regression'|'overfit'){
 const round=process.env.SELECTION_ROUND||'1', surface=process.env.SELECTION_SURFACE||'old-studio';
 const repo=suite==='regression'?'m0-control-lab':'m0-overfit-lab';
 const preview='http://127.0.0.1:'+(suite==='regression'?3001:3002);
 const base=process.env.STUDIO_BASE_URL||'http://127.0.0.1:3000';
 const url=new URL(surface==='old-studio'?`/studio/${repo}/edit`:surface==='old-window'?`/studio/${repo}/window`:`/editor/${repo}`,base);
 url.searchParams.set('preview',preview);url.searchParams.set('panel','inspector');
 if(surface==='old-studio')url.searchParams.set('legacyStudio','1');
 if(surface==='full'||surface==='fit')url.searchParams.set('view',surface);
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const rows:any[]=[];const geometry:any[]=[];
 const name=`round-${round}-${surface}-${suite}`;
 const save=()=>fs.writeFileSync(path.join(evidence,name+'.json'),JSON.stringify({suite,round,surface,requestedUrl:url.href,actualUrl:page.url(),cases:rows,geometry},null,2));
 console.log('NAVIGATION '+url.href);
 try{
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.locator('[data-source-ready="true"]').waitFor();
  const frame=page.frameLocator('iframe[title="Actual project"]');
  await page.evaluate(()=>{(window as any).__m0GateSignals=[];window.addEventListener('message',event=>{const iframe=document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement;const value=event.data;if(event.source===iframe?.contentWindow&&value?.channel==='slightnudge'&&['source-selection','selection-refused'].includes(value.type))(window as any).__m0GateSignals.push({type:value.type,reason:value.reason,selection:value.selection?{path:value.selection.path,line:value.selection.line,column:value.selection.column,tagName:value.selection.tagName}:undefined});});});
  await frame.locator('html').evaluate(()=>{(window as any).__m0GatePointers=[];window.addEventListener('pointerdown',event=>{const el=event.target as Element;(window as any).__m0GatePointers.push({x:event.clientX,y:event.clientY,tag:el.tagName?.toLowerCase(),id:el.id,classes:String(el.className||''),file:el.getAttribute?.('data-source-file'),line:el.getAttribute?.('data-source-line')});},true);});
  const runCase=async(s:Spec,scale?:number)=>{
   const locator=frame.locator(s.selector);
   const baseRow={index:s.index,selector:s.selector,clickPosition:s.clickPosition||'default centre',expected:{file:s.expectedFile,line:s.expectedLine,tag:s.expectedTag,outcome:s.expectedOutcome},scale};
   if(await locator.count()===0) return {...baseRow,verdict:'MISSING-TARGET',reason:'Locator not found'};
   try{
    await locator.scrollIntoViewIfNeeded();
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source'));
   }catch(error){return {...baseRow,verdict:'MISSING-TARGET',reason:'Could not prepare the original click: '+String(error)};}
   const dom=await locator.evaluate(el=>{const marker=el.closest('[data-source-file]')||el;const a=marker.getBoundingClientRect(),b=el.getBoundingClientRect();return {file:marker.getAttribute('data-source-file')||'',line:Number(marker.getAttribute('data-source-line'))||0,column:Number(marker.getAttribute('data-source-column'))||0,tag:el.tagName.toLowerCase(),classes:String(el.className||''),markerRect:{top:a.top,left:a.left,width:a.width,height:a.height},clickedRect:{top:b.top,left:b.left,width:b.width,height:b.height}}});
   // The original position is in unscaled page CSS pixels. Playwright offsets
   // transformed element boxes in outer-page pixels; convert without changing
   // the original logical point, selector, expected target or centre click.
   const box=await locator.boundingBox();
   const position=s.clickPosition&&box?{x:s.clickPosition.x*box.width/dom.clickedRect.width,y:s.clickPosition.y*box.height/dom.clickedRect.height}:undefined;
   const localPoint={x:dom.clickedRect.left+(s.clickPosition?.x??dom.clickedRect.width/2),y:dom.clickedRect.top+(s.clickPosition?.y??dom.clickedRect.height/2)};
   const insideHit=await locator.evaluate((el,p)=>{const hit=document.elementFromPoint(p.x,p.y);return {point:p,hit:hit?{tag:hit.tagName.toLowerCase(),id:hit.id,classes:String(hit.className||''),file:hit.getAttribute('data-source-file'),line:hit.getAttribute('data-source-line')}:null,scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight}};},localPoint);
   const outerPoint=box?{x:box.x+(position?.x??box.width/2),y:box.y+(position?.y??box.height/2)}:null;
   const parentHit=outerPoint?await page.evaluate(p=>{const hit=document.elementFromPoint(p.x,p.y);return {point:p,hit:hit?{tag:hit.tagName.toLowerCase(),classes:String(hit.className||''),role:hit.getAttribute('role'),label:hit.getAttribute('aria-label'),isIframe:hit instanceof HTMLIFrameElement}:null};},outerPoint):null;
   const signalStart=await page.evaluate(()=> (window as any).__m0GateSignals.length);
   const pointerStart=await frame.locator('html').evaluate(()=> (window as any).__m0GatePointers.length);
   const row:any={...baseRow,dom,renderedRect:box,actualScale:box?{x:box.width/dom.clickedRect.width,y:box.height/dom.clickedRect.height}:null,position,insideHit,parentHit};
   if(parentHit?.hit&&!parentHit.hit.isIframe)await page.screenshot({path:path.join(evidence,`${name}-case-${s.index}-content-blocked${scale?'-'+scale:''}.png`)});
   try{
    await locator.click(position?{position}:{});
    await page.waitForFunction(start=>(window as any).__m0GateSignals.length>start,signalStart);
   }catch(error){return {...row,verdict:'MISSING-TARGET',reason:String(error),selected:await page.locator('[aria-label="Visual editing workspace"]').getAttribute('data-selected-source')};}
   const signals=await page.evaluate(start=>(window as any).__m0GateSignals.slice(start),signalStart);
   row.signals=signals;row.pointer=await frame.locator('html').evaluate((_,start)=>(window as any).__m0GatePointers.slice(start),pointerStart);
   const signal=signals.at(-1);
   if(signal?.type==='source-selection')try{await page.waitForFunction(()=>Boolean(document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source')));}catch(error){return {...row,verdict:'MISSING-TARGET',reason:String(error)};}
   const selected=await page.locator('[aria-label="Visual editing workspace"]').getAttribute('data-selected-source');
   const parts=selected?.match(/^(.*):(\d+):(\d+):([^:]+)$/);
   const actual=parts?{file:path.basename(parts[1]),line:Number(parts[2]),column:Number(parts[3]),tag:parts[4]}:null;
   const overlay=selected?await page.getByLabel('Selected source element',{exact:true}).boundingBox().catch(()=>null):null;
   const clicked=await locator.boundingBox();
   const offset=overlay&&clicked?{x:overlay.x-clicked.x,y:overlay.y-clicked.y,width:overlay.width-clicked.width,height:overlay.height-clicked.height}:null;
   Object.assign(row,{selected,actual,offset});
   if(actual&&(actual.file!==s.expectedFile||actual.line!==s.expectedLine||actual.tag.toLowerCase()!==s.expectedTag.toLowerCase()))return {...row,verdict:'WRONG TARGET',reason:'Real editor selected a different source target from the unchanged expected target'};
   if(!actual&&signal?.type!=='selection-refused')return {...row,verdict:'MISSING-TARGET',reason:'No selected target or explicit refusal'};
   // Same inspection call and inputs as the originals, after validating the UI's selected target.
   const inspection=inspectElement({filePath:path.resolve('.slightnudge/repositories',repo,dom.file),line:dom.line,column:dom.column,tagName:dom.tag,className:dom.classes,rect:dom.markerRect,clickedRect:dom.clickedRect});
   const outcome=inspection.safeToEdit?'allowed':'refused';
   let mismatch='';
   if(path.basename(inspection.filePath||dom.file)!==s.expectedFile||inspection.line!==s.expectedLine)mismatch='WRONG TARGET';
   else if(inspection.tagName?.toLowerCase()!==s.expectedTag.toLowerCase())mismatch='WRONG TAG';
   else if(outcome!==s.expectedOutcome)mismatch='OUTCOME MISMATCH';
   else if(s.expectedRefusalPattern&&inspection.reason&&!s.expectedRefusalPattern.test(inspection.reason))mismatch='WRONG REASON';
   else if(s.textShouldBeAllowed===false&&inspection.textEditable!==false)mismatch='TEXT NOT REFUSED';
   if(mismatch==='WRONG TARGET'||mismatch==='WRONG TAG')return {...row,outcome,inspection,verdict:'WRONG TARGET',reason:mismatch};
   const verdict=signal?.type==='selection-refused'?'refused':outcome;
   return {...row,outcome,inspection,verdict,expectedMatch:!mismatch&&verdict===s.expectedOutcome,expectationFailure:mismatch||undefined,reason:signal?.reason||inspection.reason};
  };
  const accept=async(row:any,geometryCase=false)=>{
   (geometryCase?geometry:rows).push(row);save();console.log(JSON.stringify(row));
   if(row.verdict==='MISSING-TARGET')await page.screenshot({path:path.join(evidence,`${name}-case-${row.index}-missing${row.scale?'-'+row.scale:''}.png`)});
   if(row.verdict==='WRONG TARGET'){
    fs.writeFileSync(path.join(evidence,'STOP-WRONG-TARGET.json'),JSON.stringify({name,...row},null,2));
    await page.screenshot({path:path.join(evidence,name+'-wrong-target.png'),fullPage:false});
    throw Error('STOP WRONG TARGET: '+name+' case '+row.index);
   }
  };
  for(const s of specs)await accept(await runCase(s));
  if(surface==='fit')for(const scale of [.5,1,1.5]){
   await page.getByRole('combobox',{name:'Canvas zoom',exact:true}).selectOption(String(scale));
   for(const s of specs.filter(s=>s.expectedOutcome==='allowed').slice(0,10))await accept(await runCase(s,scale),true);
  }
  console.log('COMPLETED '+name+' '+rows.length+'/30; geometry '+geometry.length);
 }finally{save();await browser.close();}
}
