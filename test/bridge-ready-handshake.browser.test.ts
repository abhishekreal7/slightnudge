import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {getSourceCanvasBridge} from '../lib/slightnudge/source-canvas-bridge';
const origin='http://127.0.0.1:46139',browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.route(origin+'/**',route=>route.fulfill({contentType:'text/html',body:new URL(route.request().url()).pathname==='/frame'?`<h1 data-source-file="page.tsx" data-source-line="1" data-source-column="1">Ready</h1><script>${getSourceCanvasBridge(true)}</script>`:`<script>window.messages=[];addEventListener('message',function initialize(event){if(event.data?.type!=='bridge-ready')return;removeEventListener('message',initialize);addEventListener('message',event=>{if(event.data?.type==='bridge-ready')messages.push(event.data)})})</script><iframe src="/frame?__slightnudge_session=handshake&__slightnudge_parent=${origin}"></iframe>`}));
 await page.goto(origin);
 await page.waitForFunction(()=>(window as any).messages.length>0,undefined,{timeout:2000});
 await page.evaluate(()=>{const frame=document.querySelector('iframe')!;frame.contentWindow!.postMessage({channel:'slightnudge',session:'handshake',type:'bridge-ack'},location.origin);});
 const count=await page.evaluate(()=>(window as any).messages.length);
 await page.waitForTimeout(700);
 assert.equal(await page.evaluate(()=>(window as any).messages.length),count,'Acknowledgment stops ready retries');
 assert.equal(await page.frameLocator('iframe').locator('h1').textContent(),'Ready');
 console.log('PASS bridge handshake: late host listener receives readiness; authenticated acknowledgment stops retries');
}finally{await browser.close();}
