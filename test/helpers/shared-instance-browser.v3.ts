import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
export async function checkSharedInstances(page:Page,base:string,workspace:string,root:string,repository?:{id:string;root:string;url:string}){
 page=iframePageV3(page);

 page.setDefaultTimeout(60000);
 const file=path.join(repository?.root||workspace,repository?'app/page.tsx':'fixtures/1-plain-static.tsx'),definitionFile=path.join(path.dirname(file),'InstanceAction.tsx');
 const original=fs.readFileSync(file,'utf8'),oldDefinition=fs.existsSync(definitionFile)?fs.readFileSync(definitionFile,'utf8'):undefined;
 const definition=`'use client';
export function Action({label,disabled=false,variant='primary'}:{label:string;disabled?:boolean;variant?:'primary'|'quiet'}){return <button disabled={disabled} className={variant==='primary'?'bg-green-600 p-4 text-white':'bg-white p-4 text-black'} onClick={()=>document.body.dataset.clicks='yes'}>{label}</button>}
export function Destination({label,to}:{label:string;to:string}){return <a href={to}>{label}</a>}`;
 const fixture=`'use client';import {Action,Destination} from './InstanceAction';export default function Page(){return <main className="p-8 min-h-screen bg-white"><h1>Instance editing</h1><Action label="Same"/><Action label="Same"/><Destination label="Read more" to="/about"/><Destination label="Read more" to="/about"/></main>}`;
 const frame=page.frameLocator('iframe[title="Actual project"]'),panel=page.getByRole('region',{name:'Component properties',exact:true});
 const idle=()=>page.waitForFunction(()=>document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy')==='false');
 const mutate=async(action:()=>Promise<unknown>)=>{const [response]=await Promise.all([page.waitForResponse(response=>{if(new URL(response.url()).pathname!=='/api/slightnudge/preview'||response.request().method()!=='POST')return false;const body=response.request().postDataJSON();return body.kind==='component'&&body.operation!=='inspect'}),action()]);const body=await response.json();assert.equal(body.success,true,JSON.stringify(body));await idle();};
 const edit=async(name:string,value:string)=>{const control=panel.getByLabel(`Component prop ${name}`,{exact:true});await control.fill(value);await mutate(()=>control.press('Control+Enter'));};
 try{
  for(const windowMode of [false,true].filter(value=>!process.env.GATE_SHARED_VIEW||String(value)===process.env.GATE_SHARED_VIEW)){
   fs.writeFileSync(definitionFile,definition);fs.writeFileSync(file,fixture);await page.goto('about:blank');
   const route=repository?`/studio/${repository.id}/${windowMode?'window':'edit'}?preview=${encodeURIComponent(repository.url)}`:'/studio'+(windowMode?'/window':'');
   await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000});await page.locator('[data-source-ready="true"]').waitFor({timeout:120000});
   if(windowMode)await page.getByRole('button',{name:'Toggle design panel',exact:true}).click();
   else await page.getByRole('combobox',{name:'Canvas zoom',exact:true}).selectOption('1');
   const buttons=frame.locator('button[data-source-file$="InstanceAction.tsx"]');
   await buttons.nth(1).click();await panel.getByText('This instance',{exact:true}).waitFor();
   await panel.getByLabel('Component prop label',{exact:true}).waitFor();
   await edit('label','Only second');assert.equal(await buttons.nth(0).textContent(),'Same');assert.equal(await buttons.nth(1).textContent(),'Only second');
   await mutate(()=>panel.getByLabel('Component prop variant',{exact:true}).selectOption('quiet'));assert.match((await buttons.nth(1).getAttribute('class'))! ,/bg-white/);assert.match((await buttons.nth(0).getAttribute('class'))!,/bg-green-600/);
   await mutate(()=>panel.getByLabel('Component prop disabled',{exact:true}).selectOption('true'));assert.equal(await buttons.nth(1).isDisabled(),true);assert.equal(await buttons.nth(0).isDisabled(),false);
   await mutate(()=>panel.getByLabel('Component prop disabled',{exact:true}).selectOption('false'));
   await buttons.nth(1).dblclick();const editor=frame.getByRole('textbox',{name:'Edit selected text',exact:true});await editor.waitFor();await editor.press('Control+a');await editor.pressSequentially('Inline second');await mutate(()=>editor.press('Enter'));
   await buttons.nth(0).click();await page.waitForFunction(()=>{const input=document.querySelector<HTMLTextAreaElement>('[aria-label="Component prop label"]');return input?.value==='Same'&&!input.disabled});assert.equal(await panel.getByLabel('Component prop label',{exact:true}).inputValue(),'Same');await edit('label','Only first');
   const links=frame.locator('a[data-source-file$="InstanceAction.tsx"]');await links.nth(1).click();await panel.getByLabel('Component prop to',{exact:true}).waitFor();await edit('to','/contact');assert.equal(await links.nth(0).getAttribute('href'),'/about');assert.equal(await links.nth(1).getAttribute('href'),'/contact');
   assert.equal(fs.readFileSync(file,'utf8'),fixture);assert.equal(fs.readFileSync(definitionFile,'utf8'),definition);
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-source-ready="true"]').waitFor({timeout:120000});await idle();await frame.getByRole('button',{name:'Inline second',exact:true}).waitFor();await frame.getByRole('button',{name:'Only first',exact:true}).waitFor();assert.equal(await links.nth(1).getAttribute('href'),'/contact');
   await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/apply'&&response.request().method()==='POST'),page.getByRole('button',{name:'Save changes',exact:true}).click()]);await idle();assert.ok(fs.readFileSync(file,'utf8').includes('label={"Inline second"}'));assert.equal(fs.readFileSync(definitionFile,'utf8'),definition);
   if(windowMode){const toggle=page.getByRole('button',{name:'Toggle design panel',exact:true});if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();}
   await buttons.nth(1).click();await panel.getByLabel('Component prop label',{exact:true}).waitFor();
   await page.screenshot({path:path.join(root,`docs/shared-instance-${repository?'imported':'local'}-${windowMode?'window':'studio'}.png`)});
   await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/undo'&&response.request().method()==='POST'),page.getByRole('button',{name:'Undo',exact:true}).click()]);await idle();assert.equal(fs.readFileSync(file,'utf8'),fixture);await frame.getByRole('button',{name:'Same',exact:true}).nth(1).waitFor();assert.equal(fs.readFileSync(definitionFile,'utf8'),definition);
   await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});console.log(`PASS shared instances ${repository?'imported':'local'} ${windowMode?'window':'Studio'}: identical callers, text/inline, destination, enabled state, variant, refresh, Save, exact Undo`);
  }
 }catch(error){console.log(await page.getByLabel('Editor notice',{exact:true}).allTextContents());await page.screenshot({path:path.join(root,'docs/shared-instance-failure.png')});throw error}
 finally{fs.writeFileSync(file,original);if(oldDefinition===undefined)fs.unlinkSync(definitionFile);else fs.writeFileSync(definitionFile,oldDefinition)}
 return 2;
}

