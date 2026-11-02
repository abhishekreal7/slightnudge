import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {getSourceCanvasBridge} from '../lib/slightnudge/source-canvas-bridge';

// A deterministic bridge regression. The real imported shared workflow also
// caught old server HTML (Only first) hydrating against the undone client (Same).
const origin='http://127.0.0.1:46129',before=JSON.stringify(['page.tsx',1,'a'.repeat(64)]),saved=JSON.stringify(['page.tsx',1,'b'.repeat(64)]);
const markup=(text:string,instance:string)=>`<button data-source-file="Action.tsx" data-source-line="2" data-source-column="1" data-slightnudge-callsite='${instance}'>${text}</button>`;
let version='fresh',reads=0,id=0;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.route(origin+'/**',route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.has('__slightnudge_document_check')){reads++;return route.fulfill({status:version==='error'?503:200,contentType:'text/html',body:markup(version==='fresh'?'Same':'Only first',version==='fresh'?before:saved)+'<script>window.__fetched_script_executed=true</script>'});}
  return route.fulfill({contentType:'text/html',body:url.pathname==='/frame'?markup('Only first',saved)+`<script>${getSourceCanvasBridge(true)}</script>`:`<iframe src="/frame?__slightnudge_session=fence&__slightnudge_parent=${origin}&__slightnudge_draft=1"></iframe><script>window.messages=[];addEventListener('message',event=>messages.push(event.data))</script>`});
 });
 await page.goto(origin);const frame=page.frames()[1];await page.waitForFunction(()=>(window as any).messages.some((message:any)=>message.type==='bridge-ready'));
 const patches=[{before:{path:'Action.tsx',line:2,column:1,instance:saved},after:{path:'Action.tsx',line:2,column:1,instance:before},text:'Same'}];
 const command=async(operation:string)=>{const requestId=String(++id);await page.evaluate(message=>(document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(message,location.origin),{channel:'slightnudge',session:'fence',type:'source-edit',operation,requestId,patches});await page.waitForFunction(requestId=>(window as any).messages.some((message:any)=>message.requestId===requestId),requestId);return page.evaluate(requestId=>(window as any).messages.find((message:any)=>message.requestId===requestId),requestId);};
 assert.equal((await command('verify-document')).success,true,'Fresh server HTML must be checked without navigating or changing the current DOM');
 assert.equal(await frame.locator('button').textContent(),'Only first');
 assert.equal(await frame.evaluate(()=>(window as any).__fetched_script_executed),undefined,'Fetched HTML is inert');
 await frame.locator('button').evaluate((button,instance)=>{button.textContent='Same';button.setAttribute('data-slightnudge-callsite',instance);},before);
 assert.equal((await command('verify-batch')).success,true,'The live draft can already look correct while the server is stale');
 version='stale';const stale=await command('verify-document');assert.equal(stale.success,false);assert.match(stale.reason,/revision|source|server/i);
 version='error';assert.equal((await command('verify-document')).success,false);
 version='fresh';assert.equal((await command('verify-document')).success,true);
 assert.equal(reads,4);assert.equal(await frame.locator('button').textContent(),'Same');
 console.log('PASS source-document fence: fresh and stale SSR, caller hash, HTTP failure, retry, inert HTML and unchanged live DOM');
}finally{await browser.close();}
