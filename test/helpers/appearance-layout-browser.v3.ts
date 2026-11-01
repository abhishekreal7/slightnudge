import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import type {Page} from 'playwright';
export async function checkAppearanceLayout(page:Page,base:string,workspace:string,root:string,repository?:{id:string;root:string;url:string}){
 page=iframePageV3(page);

 page.setDefaultTimeout(60000);
 const file=path.join(repository?.root||workspace,repository?'app/page.tsx':'fixtures/1-plain-static.tsx'),css=path.join(repository?.root||workspace,'app/globals.css');
 const original=fs.readFileSync(file,'utf8'),originalCss=fs.readFileSync(css,'utf8');
 const fixture=`'use client';export default function Page(){return <main className="p-8 min-h-screen bg-white"><h1>Appearance & constraints</h1><div className="flex gap-8 p-4"><section id="card" className="p-8 bg-white bg-gradient-to-r from-green-100 to-blue-100 shadow-lg shadow-black/10 ring-1 ring-black/10 min-w-full"><h2>Editable card</h2><p>Source stays yours.</p></section><aside id="other" className="p-8 bg-white shadow-sm">Unchanged</aside></div></main>}`;
 const frame=page.frameLocator('iframe[title="Actual project"]'),card=frame.locator('#card'),other=frame.locator('#other');
 const idle=()=>page.waitForFunction(()=>document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy')==='false',undefined,{timeout:90000});
 const mutate=async(action:()=>Promise<unknown>)=>{const [response]=await Promise.all([page.waitForResponse(response=>{if(new URL(response.url()).pathname!=='/api/slightnudge/preview'||response.request().method()!=='POST')return false;const body=response.request().postDataJSON();return body.kind==='style'}),action()]);const body=await response.json();assert.equal(body.success,true,JSON.stringify(body));await idle();const notices=await page.getByLabel('Editor notice',{exact:true}).allTextContents();assert.ok(!notices.some(text=>/overrides|unavailable|not changed|could not/i.test(text)),notices.join('\n'));};
 const open=(text:string)=>page.locator('summary').filter({hasText:new RegExp('^'+text+'(?: |$)')}).first().click();
 const design=async()=>{if(await page.getByRole('button',{name:'Toggle design panel',exact:true}).count()){const toggle=page.getByRole('button',{name:'Toggle design panel',exact:true});if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();}};
 try{
  fs.appendFileSync(css,'\n@theme { --breakpoint-tablet:58rem; }\n');
  for(const windowMode of [false,true]){
   fs.writeFileSync(file,fixture);await page.goto('about:blank');const route=repository?`/studio/${repository.id}/${windowMode?'window':'edit'}?preview=${encodeURIComponent(repository.url)}`:'/studio'+(windowMode?'/window':'');
   await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000});await page.locator('[data-source-ready="true"]').waitFor({timeout:120000});await design();
   await card.click({position:{x:8,y:8}});await open('Fill & effects');await open('Gradient');
   await page.getByLabel('Gradient angle',{exact:true}).fill('120');await page.getByLabel('Gradient stop 1 color',{exact:true}).fill('#123456');await page.getByLabel('Gradient stop 2 color',{exact:true}).fill('#abcdef');
   await mutate(()=>page.getByRole('button',{name:'Set gradient',exact:true}).click());assert.match(await card.evaluate(element=>getComputedStyle(element).backgroundImage),/120deg/);assert.match((await card.getAttribute('class'))!,/bg-white/);
   await page.getByRole('button',{name:'Add stop',exact:true}).click();await page.getByLabel('Gradient stop 2 color',{exact:true}).fill('#ffffff80');await mutate(()=>page.getByRole('button',{name:'Set gradient',exact:true}).click());assert.match((await card.getAttribute('class'))!,/#ffffff80_50%/);
   await open('Shadow');await mutate(()=>page.getByLabel('Shadow preset',{exact:true}).selectOption('medium'));const baselineShadow=await card.evaluate(element=>getComputedStyle(element).boxShadow);assert.ok(baselineShadow.includes('24px'),baselineShadow);assert.match((await card.getAttribute('class'))!,/ring-1/);await mutate(()=>page.getByLabel('Shadow preset',{exact:true}).selectOption('none'));assert.match((await card.getAttribute('class'))!,/ring-1/);assert.match((await card.getAttribute('class'))!,/shadow-none/);await mutate(()=>page.getByLabel('Shadow preset',{exact:true}).selectOption('medium'));assert.equal(await other.evaluate(element=>getComputedStyle(element).backgroundImage),'none');
   await open('Constraints');await mutate(()=>page.getByLabel('Constraint minimum width',{exact:true}).selectOption('min-w-fit'));await mutate(()=>page.getByLabel('Constraint grow',{exact:true}).selectOption('grow'));await mutate(()=>page.getByLabel('Constraint shrink',{exact:true}).selectOption('shrink-0'));
   const width=page.getByRole('spinbutton',{name:'Preview width',exact:true}),scope=page.getByRole('combobox',{name:'Responsive edit scope',exact:true});await width.fill('1000');await width.press('Enter');await scope.locator('option[value="tablet"]').waitFor({state:'attached'});await scope.selectOption('tablet');await idle();
   await mutate(()=>page.getByLabel('Constraint minimum width',{exact:true}).selectOption('min-w-0'));await mutate(()=>page.getByLabel('Shadow preset',{exact:true}).selectOption('soft'));assert.equal(await card.evaluate(element=>getComputedStyle(element).minWidth),'0px');assert.ok((await card.evaluate(element=>getComputedStyle(element).boxShadow)).includes('8px'));
   await width.fill('800');await width.press('Enter');await idle();await page.waitForFunction(()=>document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy')==='false');assert.equal(await card.evaluate(element=>getComputedStyle(element).minWidth),'fit-content');assert.equal(await card.evaluate(element=>getComputedStyle(element).boxShadow),baselineShadow);
   assert.equal(fs.readFileSync(file,'utf8'),fixture);
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-source-ready="true"]').waitFor({timeout:120000});await idle();assert.match(await card.evaluate(element=>getComputedStyle(element).backgroundImage),/120deg/);assert.equal(await card.evaluate(element=>getComputedStyle(element).minWidth),'fit-content');
   const [saved]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/apply'&&response.request().method()==='POST'),page.getByRole('button',{name:'Save changes',exact:true}).click()]);const savedBody=await saved.json();assert.equal(savedBody.success,true,JSON.stringify(savedBody));await idle();assert.ok(fs.readFileSync(file,'utf8').includes('tablet:min-w-0'));assert.ok(fs.readFileSync(file,'utf8').includes('linear-gradient(120deg'));
   await design();await card.click({position:{x:8,y:8}});await page.screenshot({path:path.join(root,`docs/appearance-${repository?'imported':'local'}-${windowMode?'window':'studio'}.png`)});
   const [undone]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/undo'&&response.request().method()==='POST'),page.getByRole('button',{name:'Undo',exact:true}).click()]);assert.equal((await undone.json()).success,true);await idle();assert.equal(fs.readFileSync(file,'utf8'),fixture);
   await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});console.log(`PASS appearance/constraints ${repository?'imported':'local'} ${windowMode?'window':'Studio'}: gradient, ring-preserving shadow, flex constraints, custom breakpoint cascade, unchanged neighbour, refresh, Save and exact Undo`);
  }
 }catch(error){console.log(await page.getByLabel('Editor notice',{exact:true}).allTextContents());await page.screenshot({path:path.join(root,'docs/appearance-failure.png')});throw error}
 finally{fs.writeFileSync(file,original);fs.writeFileSync(css,originalCss)}
 return 2;
}
