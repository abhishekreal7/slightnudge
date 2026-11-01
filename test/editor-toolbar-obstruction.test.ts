import {chromium} from 'playwright';
import fs from 'node:fs';
import {logicalToScreen,probeElement} from './helpers/selection-gate-v3-coordinates';
const label=process.env.OBSTRUCTION_LABEL||'before',dir='docs/editor-load-and-toolbar',checks:any[]=[],events:any[]=[];
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}});
const check=(name:string,pass:boolean,detail?:any)=>{const row={name,pass,detail};checks.push(row);console.log(JSON.stringify(row));};
try{
 page.on('pageerror',error=>events.push({message:error.message,stack:error.stack}));
 await page.goto('http://127.0.0.1:3000/editor/m0-control-lab?view=full&preview=http%3A%2F%2F127.0.0.1%3A3001');await page.locator('[data-source-ready="true"]').waitFor();
 const iframe=page.locator('iframe[title="Actual project"]'),frame=await (await iframe.elementHandle())!.contentFrame();if(!frame)throw Error('Missing frame');
 const badge=frame.locator('footer span:has-text("Thoughtful by design")').first();await badge.scrollIntoViewIfNeeded();
 const probe=await probeElement(badge),oldPoint=await logicalToScreen(page,probe.initial);
 const dock=page.getByRole('banner',{name:'Editor toolbar'});
 const css=await dock.evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),pointerEvents:getComputedStyle(el).pointerEvents,zIndex:getComputedStyle(el).zIndex,position:getComputedStyle(el).position}));
 console.log(JSON.stringify({oldPoint,css}));
 check('Dock container ignores pointer events',css.pointerEvents==='none',css);
 const controlBounds=await dock.evaluate(el=>{const box=el.getBoundingClientRect();return [...el.querySelectorAll('button,a,input,select,textarea,[role="button"]')].map(control=>({tag:control.tagName,rect:control.getBoundingClientRect(),visible:Boolean(control.getClientRects().length)&&getComputedStyle(control).visibility!=='hidden'})).filter(control=>control.visible&&control.rect.width&&control.rect.height).map(control=>({tag:control.tag,rect:control.rect.toJSON(),contained:control.rect.left>=box.left&&control.rect.right<=box.right&&control.rect.top>=box.top&&control.rect.bottom<=box.bottom}));});
 check('Dock box contains every interactive control',controlBounds.every(control=>control.contained),controlBounds);
 const gapHit=await dock.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+2,r.top+2);return {isDock:hit===el,tag:hit?.tagName};});
 check('Dock padding lets content receive pointer events',!gapHit.isDock,gapHit);
 await page.getByRole('button',{name:'Toggle layers',exact:true}).click();
 const panel=page.getByRole('region',{name:'Layers panel'});
 const badgeButtons=panel.locator('button[title*=" · span · src/components/sections/Footer.tsx:2"]');
 check('Both source-backed inline badge instances appear in Layers',await badgeButtons.count()===2,{count:await badgeButtons.count()});
 // Source title pins the exact existing footer, independent of display label.
 await panel.locator('button[title*=" · footer · "]').click();
 await page.getByLabel('Selected source element',{exact:true}).waitFor();await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-window-panel'));
 try{await page.waitForFunction(()=>{const a=document.querySelector('[aria-label="Editor toolbar"]'),b=document.querySelector('[aria-label="Selected source element"]');if(!a||!b)return false;const y=b.getBoundingClientRect();if(getComputedStyle(a).visibility==='hidden')return true;return [a,...a.querySelectorAll('button,a,input,select,textarea,[role="button"]')].every(el=>{const x=el.getBoundingClientRect();return !x.width||!x.height||x.right<=y.left||x.left>=y.right||x.bottom<=y.top||x.top>=y.bottom;});});check('Dock and its controls avoid selected footer rectangle',true);}catch{check('Dock and its controls avoid selected footer rectangle',false);}
 await page.keyboard.press('Escape');
 await page.mouse.click(oldPoint.screen.x,oldPoint.screen.y);
 try{await page.waitForFunction(()=>/Footer\.tsx:2:\d+:span$/.test(document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source')||''));check('Click at old dock position selects the actual footer badge',true);}catch{check('Click at old dock position selects the actual footer badge',false,{selected:await page.locator('[aria-label="Visual editing workspace"]').getAttribute('data-selected-source')});}
 await page.screenshot({path:`${dir}/obstruction-${label}.png`});check('No page errors',events.length===0,events);
}catch(error){check('Browser workflow completed',false,{error:String(error)});await page.screenshot({path:`${dir}/obstruction-${label}-error.png`});}
finally{await browser.close();fs.writeFileSync(`${dir}/obstruction-${label}.json`,JSON.stringify({checks,events},null,2));}
if(checks.some(r=>!r.pass))process.exitCode=1;
