import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();const markers=[0,1].map(index=>JSON.stringify(['page.tsx',index,'a'.repeat(64)]));
 const attribute=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;');
 await page.route('http://127.0.0.1:46114/**',route=>route.fulfill({contentType:'text/html',body:route.request().url().includes('/frame')?markers.map((marker,index)=>`<button ${index?'disabled':''} data-source-file="Action.tsx" data-source-line="1" data-source-column="1" data-slightnudge-callsite="${attribute(marker)}">Same</button>`).join('')+`<script>${getSourceCanvasBridge(true)}</script>`:'<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46114"></iframe><script>window.messages=[];addEventListener("message",event=>messages.push(event.data))</script>'}));
 await page.goto('http://127.0.0.1:46114/');const frame=page.frames()[1],buttons=frame.locator('button');
 await buttons.nth(1).click({force:true});await page.waitForFunction(()=>(window as any).messages.some((message:any)=>message.type==='source-selection'));
 const selection=await page.evaluate(()=>(window as any).messages.find((message:any)=>message.type==='source-selection').selection);assert.equal(selection.instance,markers[1]);
 let id=0;const command=async(operation:string,patches:any[]=[])=>{const requestId=String(++id);await page.evaluate(data=>(document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(data,location.origin),{channel:'slightnudge',session:'test',type:'source-edit',requestId,operation,selection,patches});await page.waitForFunction(id=>(window as any).messages.some((message:any)=>message.requestId===id&&message.type==='edit-result'),requestId);return await page.evaluate(id=>(window as any).messages.find((message:any)=>message.requestId===id&&message.type==='edit-result'),requestId)};
 const target={path:'Action.tsx',line:1,column:1,instance:markers[1]};let patch={before:target,after:target,beforeText:'Same',text:'Second only',beforeAttributes:{disabled:''},attributes:{disabled:null}};
 let result=await command('restore',[patch]);assert.equal(result.success,true,result.reason);assert.equal(await buttons.nth(0).textContent(),'Same');assert.equal(await buttons.nth(1).textContent(),'Second only');assert.equal(await buttons.nth(1).isDisabled(),false);
 result=await command('check',[patch]);assert.equal(result.success,true,result.reason);result=await command('discard');assert.equal(result.success,true,result.reason);assert.equal(await buttons.nth(1).textContent(),'Same');assert.equal(await buttons.nth(1).isDisabled(),true);
 result=await command('restore',[{...patch,before:{...target,instance:undefined}}]);assert.equal(result.success,false,'Unqualified duplicate source must be refused');
 result=await command('restore',[{...patch,beforeText:'Wrong source'}]);assert.equal(result.success,false,'Runtime text mismatch must be refused');
 console.log('PASS instance bridge: identical source locations remain distinct, disabled button selection, precise projection/check/discard, duplicate and runtime-mismatch refusals');
}finally{await browser.close()}
