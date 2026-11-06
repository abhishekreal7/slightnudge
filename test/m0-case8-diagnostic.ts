import { chromium } from 'playwright';
import fs from 'node:fs';
import vm from 'node:vm';
const adjusted=process.argv.includes('--scaled-click');
const dir='docs/selection-gate-step2-evidence'+(adjusted?'/corrected-click':'');
fs.mkdirSync(dir,{recursive:true});
const original=fs.readFileSync('test/m0-regression.test.ts','utf8');
const block=original.slice(original.indexOf('const SELECTIONS:'),original.indexOf('\nasync function runM0RegressionSuite'));
const specs=vm.runInNewContext(block.replace('const SELECTIONS: SelectionSpec[]','const SELECTIONS')+'\nSELECTIONS;');
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
const snapshots:any[]=[];const messages:any[]=[];
try{
 await page.goto('http://127.0.0.1:3000/studio/m0-control-lab/edit?legacyStudio=1&panel=inspector&preview=http%3A%2F%2F127.0.0.1%3A3001',{waitUntil:'domcontentloaded'});
 await page.locator('[data-source-ready="true"]').waitFor();
 const iframe=page.locator('iframe[title="Actual project"]');const frame=await (await iframe.elementHandle())!.contentFrame();if(!frame)throw Error('No frame');
 await frame.evaluate(()=>{(window as any).__gatePointerEvents=[];for(const type of ['pointerdown','click'])window.addEventListener(type,event=>{const e=event as MouseEvent,el=e.target as Element;(window as any).__gatePointerEvents.push({type,x:e.clientX,y:e.clientY,tag:el.tagName?.toLowerCase(),id:el.id,classes:String(el.className||''),file:el.getAttribute?.('data-source-file'),line:el.getAttribute?.('data-source-line')});},true);});
 await page.exposeFunction('recordSelectionMessage',(value:any)=>messages.push(value));
 await page.evaluate(()=>{window.addEventListener('message',event=>{if(event.data&&/source-selection|selection-refused|shortcut/.test(JSON.stringify(event.data.type||'')))(window as any).recordSelectionMessage(event.data);});});
 const selected=()=>page.locator('[aria-label="Visual editing workspace"]').getAttribute('data-selected-source');
 const snapshot=async(label:string,s:any)=>{
  const element=frame.locator(s.selector);const rect=await element.boundingBox();
  const inside=await element.evaluate((el,pos)=>{const r=el.getBoundingClientRect();const point={x:r.left+(pos?.x??r.width/2),y:r.top+(pos?.y??r.height/2)};const hit=document.elementFromPoint(point.x,point.y);return {point,hit:hit?{tag:hit.tagName.toLowerCase(),id:hit.id,classes:String(hit.className||''),file:hit.getAttribute('data-source-file'),line:hit.getAttribute('data-source-line')}:null,rect:{x:r.x,y:r.y,width:r.width,height:r.height},scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight},inView:point.x>=0&&point.y>=0&&point.x<innerWidth&&point.y<innerHeight};},s.clickPosition);
  const iframeRect=await iframe.boundingBox();const dimensions=await iframe.evaluate(el=>({w:(el as HTMLIFrameElement).clientWidth,h:(el as HTMLIFrameElement).clientHeight}));
  const point={x:iframeRect!.x+inside.point.x*iframeRect!.width/dimensions.w,y:iframeRect!.y+inside.point.y*iframeRect!.height/dimensions.h};
  const parentHit=await page.evaluate(p=>{const hit=document.elementFromPoint(p.x,p.y);return {point:p,inView:p.x>=0&&p.y>=0&&p.x<innerWidth&&p.y<innerHeight,hit:hit?{tag:hit.tagName.toLowerCase(),id:hit.id,classes:String(hit.className||''),role:hit.getAttribute('role'),ariaLabel:hit.getAttribute('aria-label'),title:hit.getAttribute('title'),isIframe:hit instanceof HTMLIFrameElement}:null};},point);
  const item={label,index:s.index,selected:await selected(),globalRect:rect,iframeRect,inside,parentHit};snapshots.push(item);console.log(JSON.stringify(item));return item;
 };
 for(const s of specs.slice(0,8)){
  if(s.index===8)await snapshot('case7-state-before-escape',s);
  await page.keyboard.press('Escape');
  if(s.index===8)await snapshot('after-escape-before-scroll',s);
  const el=frame.locator(s.selector);await el.scrollIntoViewIfNeeded();
  if(s.index===8){await snapshot('after-scroll-before-click',s);await page.screenshot({path:dir+'/case8-before-click.png'});}
  const box=await el.boundingBox(),local=await el.evaluate(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height}});
  const position=s.clickPosition&&adjusted?{x:s.clickPosition.x*box!.width/local.w,y:s.clickPosition.y*box!.height/local.h}:s.clickPosition;
  await el.click(position?{position}:{});
  try{await page.waitForFunction(()=>Boolean(document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source')));}catch(error){console.log('SELECTION WAIT FAILED case '+s.index+': '+String(error));}
  if(s.index===8){await snapshot('after-click-and-wait',s);await page.screenshot({path:dir+'/case8-after-click.png'});
   const domSnapshot=()=>{const clone=document.documentElement.cloneNode(true) as HTMLElement;clone.querySelectorAll('script, input[type="hidden"]').forEach(el=>el.remove());clone.querySelectorAll('*').forEach(el=>{for(const a of Array.from(el.attributes))if(/token|nonce|secret/i.test(a.name))el.removeAttribute(a.name);});return clone.outerHTML;};
   fs.writeFileSync(dir+'/case8-parent.html',await page.evaluate(domSnapshot));fs.writeFileSync(dir+'/case8-iframe.html',await frame.evaluate(domSnapshot));
  }
 }
 const pointerEvents=await page.frameLocator('iframe[title="Actual project"]').locator('html').evaluate(()=> (window as any).__gatePointerEvents);
 fs.writeFileSync(dir+'/case8-pointer-events.json',JSON.stringify(pointerEvents,null,2));
}finally{fs.writeFileSync(dir+'/case8-diagnostic.json',JSON.stringify({snapshots,messages},null,2));await browser.close();}
