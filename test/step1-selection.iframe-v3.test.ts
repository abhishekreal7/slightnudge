import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { logicalToScreen,probeElement } from './helpers/selection-gate-v3-coordinates';
import { clearEditorSelection } from './helpers/selection-gate-v3';

// Original file/line/class/warning values are retained. Old DOM IDs are replaced
// by the real editor's iframe, source-selection signal and selected overlay.
const expectations=[
 {fixture:1,title:'Product Overview',selector:'#target',file:'fixtures/1-plain-static.tsx',line:7,classes:'ml-2',safe:true},
 {fixture:2,title:'Feature Section',selector:'#target',file:'fixtures/2-several-utilities.tsx',line:7,classes:'flex items-center ml-2 bg-blue-500'},
 {fixture:3,title:'Pricing Panel',selector:'#target',file:'fixtures/3-conditional-cn.tsx',line:13,warning:"can't edit this safely"},
 {fixture:4,title:'Customer Cards',selector:'#card-1',file:'fixtures/4-shared-component.tsx',line:11,warning:'component used in several places'},
 {fixture:5,title:'Responsive Layout',selector:'#target',file:'fixtures/5-responsive-classes.tsx',line:7,classes:'ml-2 md:ml-4 lg:ml-8'},
];
const dir='docs/selection-gate-step3-evidence',round=process.env.SELECTION_ROUND||'1',surface=process.env.SELECTION_SURFACE||'full';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),rows:any[]=[];
const name=`round-${round}-${surface}-step1-replacement`+(process.env.SELECTION_SUFFIX||'');
try{
 const url=surface==='old-studio'?'/studio?legacyStudio=1':surface==='old-window'?'/studio/window':'/editor?view='+surface;
 await page.goto('http://127.0.0.1:3000'+url,{waitUntil:'domcontentloaded'});await page.locator('[data-source-ready="true"]').waitFor();
 await page.evaluate(()=>{(window as any).__step1Signals=[];window.addEventListener('message',event=>{const iframe=document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement;if(event.source===iframe?.contentWindow&&event.data?.channel==='slightnudge'&&event.data.type==='source-selection')(window as any).__step1Signals.push({path:event.data.selection.path,line:event.data.selection.line,column:event.data.selection.column,tag:event.data.selection.tagName});});});
 for(const expected of expectations){
  const row:any={expected};try{
   await clearEditorSelection(page);
   const current=await page.locator('iframe[title="Actual project"]').getAttribute('src');
   if(!current?.includes('/fixture-'+expected.fixture+'?')){
    const toggle=page.getByRole('button',{name:'Toggle layers',exact:true});if(await toggle.count()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
    await page.getByRole('button',{name:'Pages',exact:true}).click();await page.locator('[data-editor-panel="layers"]').getByText('/fixtures/'+expected.fixture,{exact:true}).click();
   }
   await page.locator('[data-source-ready="true"]').waitFor();await clearEditorSelection(page);
   const frame=await (await page.locator('iframe[title="Actual project"]').elementHandle())!.contentFrame();if(!frame)throw Error('No source iframe');
   const locator=frame.locator(expected.selector);await locator.waitFor();await locator.scrollIntoViewIfNeeded();const probe=await probeElement(locator);
   const candidates=await logicalToScreen(page,probe.candidates),point=candidates.find(c=>c.parentHit?.isIframe);if(!point){row.result='NOT-CLICKABLE';row.reason='No exposed point found';rows.push(row);console.log(JSON.stringify(row));continue;}
   const before=await page.evaluate(()=>(window as any).__step1Signals.length);await page.mouse.click(point.screen.x,point.screen.y);await page.waitForFunction(n=>(window as any).__step1Signals.length>n,before);
   const selected=await page.evaluate(()=>(window as any).__step1Signals.at(-1));row.selected=selected;row.pointerSource=probe.source;
   row.pointerAssertion=selected.path===probe.source.path&&selected.line===probe.source.line&&selected.column===probe.source.column&&selected.tag===probe.source.tag;
   if(!row.pointerAssertion){row.result='WRONG TARGET';fs.writeFileSync(path.join(dir,'STOP-WRONG-TARGET.json'),JSON.stringify({name,...row},null,2));await page.screenshot({path:path.join(dir,name+'-wrong-target.png')});rows.push(row);throw Error('STOP WRONG TARGET in Step 1 replacement');}
   row.overlayVisible=await page.getByLabel('Selected source element',{exact:true}).isVisible();
   row.originalFileLineAssertion=selected.path===expected.file&&selected.line===expected.line;
   row.actualClasses=await locator.getAttribute('class');row.originalClassAssertion=expected.classes?Boolean(row.actualClasses?.includes(expected.classes)):null;
   if(expected.warning||expected.safe){const text=expected.warning||'safe to nudge';try{await page.waitForFunction(text=>document.body.innerText.toLowerCase().includes(text),text,{timeout:3000});row.originalSafetyTextAssertion=true;}catch{row.originalSafetyTextAssertion=false;}}
   row.result=row.overlayVisible&&row.originalFileLineAssertion&&row.originalClassAssertion!==false&&row.originalSafetyTextAssertion!==false?'PASS':'EXPECTED-CONTRACT-FAIL';
  }catch(error){row.error=String(error);row.result||='MISSING-TARGET';}
  rows.push(row);console.log(JSON.stringify(row));if(row.result==='WRONG TARGET')break;
 }
 await clearEditorSelection(page);rows.push({assertion:'Selection box disappears cleanly on Escape key',pass:!(await page.getByLabel('Selected source element',{exact:true}).isVisible())});
 if(rows.some(row=>['EXPECTED-CONTRACT-FAIL','MISSING-TARGET','WRONG TARGET'].includes(row.result)))process.exitCode=1;
}finally{fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify({round,surface,expectations,results:rows},null,2));await browser.close();}
