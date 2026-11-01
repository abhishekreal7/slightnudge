import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
export async function checkComponentProps(page: Page, base: string, workspace: string, root: string, repository?: {id:string;root:string;url:string}, crossFile=false) {
 page=iframePageV3(page);

  page.setDefaultTimeout(60000);
  const file = path.join(repository?.root || workspace, repository ? 'app/page.tsx' : 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const baseFixture = `'use client';
const Callout = ({label:copy}:{label:string}) => <button id="message" className="text-xl p-4" onClick={()=>{document.body.dataset.clicks='1'}}>{copy}</button>;
function Shared({label}:{label:string}){return <p className="text-lg">{label}</p>}
function Computed({label}:{label:string}){return <p id="computed" className="text-lg">{label}</p>}
export default function Page(){const computed='Computed';return <main className="p-8 min-h-screen bg-white"><h1>Component editing</h1><Callout label="Start &amp; go"/><Computed label={computed}/><Shared label="Shared one"/><Shared label="Shared two"/></main>}`;
  const definitionFile=path.join(path.dirname(file),'OwnershipCallout.tsx');
  const originalDefinition=fs.existsSync(definitionFile)?fs.readFileSync(definitionFile,'utf8'):undefined;
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  const panel = page.getByRole('region', {name:'Component properties',exact:true});
  const input = panel.getByRole('textbox', {name:'Component prop label',exact:true});
  const preview = async (action:()=>Promise<unknown>) => {
    const [response] = await Promise.all([page.waitForResponse(response => { if(new URL(response.url()).pathname !== '/api/slightnudge/preview' || response.request().method() !== 'POST') return false; const body=response.request().postDataJSON(); return body.kind === 'component' && body.operation !== 'inspect'; }), action()]);
    const body=await response.json(); assert.equal(body.success,true,JSON.stringify(body)); await idle();
  };
  const select = async () => { await frame.locator('#message').click(); await input.waitFor(); await page.waitForFunction(()=> !(document.querySelector('[aria-label="Component prop label"]') as HTMLTextAreaElement)?.disabled); };
  const edit = async (value:string) => { await input.fill(value); await preview(()=>input.press('Control+Enter')); await frame.locator('#message').filter({hasText:value}).waitFor(); };
  try {
    for (const windowMode of [false,true]) {
      const line=baseFixture.split('\n')[1];
      const definition=`'use client';\n${windowMode?line.replace('const Callout = ({label:copy}:{label:string}) =>','export default function Callout({label:copy}:{label:string}) {return').replace('</button>;', '</button>;}'):'export '+line}`;
      const fixture=crossFile?baseFixture.replace(line,windowMode?'import Callout from "./OwnershipCallout";':'import {Callout} from "./OwnershipCallout";').replace('function Shared','function LocalNote({text}:{text:string}){return <p id="local-note">{text}</p>}\nfunction Shared').replace('</main>','<LocalNote text="Local note"/></main>'):baseFixture;
      if(crossFile)fs.writeFileSync(definitionFile,definition);
      console.log(`Component props: ${repository?'imported':'local'} ${windowMode?'window':'Studio'}`);
      fs.writeFileSync(file,fixture); await page.goto('about:blank');
      const route=repository?`/studio/${repository.id}/${windowMode?'window':'edit'}?preview=${encodeURIComponent(repository.url)}`:'/studio'+(windowMode?'/window':'');
      await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000}); await page.locator('[data-source-ready="true"]').waitFor({timeout:120000});
      if(windowMode) await page.getByRole('button',{name:'Toggle design panel',exact:true}).click();
      else await page.getByRole('combobox',{name:'Canvas zoom',exact:true}).selectOption('1');
      await select(); assert.equal(await input.inputValue(),'Start & go');
      if(crossFile)await panel.getByText('Changes only this component call.',{exact:true}).waitFor();
      await input.fill('Cancelled'); await input.press('Escape'); assert.equal(await input.inputValue(),'Start & go');
      await edit('Continue <now> ✓'); assert.equal(fs.readFileSync(file,'utf8'),fixture);
      console.log('Component props: draft preview verified');
      await frame.locator('#message').evaluate(element=>{element.textContent='Runtime caption'});
      await frame.locator('#message').dblclick(); await page.getByLabel('Editor notice',{exact:true}).filter({hasText:'Rendered text differs from its prop.'}).waitFor(); assert.equal(await frame.getByRole('textbox',{name:'Edit selected text',exact:true}).count(),0);
      await frame.locator('#message').evaluate(element=>{element.textContent='Continue <now> ✓'});
      const appearance = await frame.locator('#message').evaluate(element=>({size:getComputedStyle(element).fontSize,height:element.getBoundingClientRect().height}));
      await frame.locator('#message').dblclick(); const editor=frame.getByRole('textbox',{name:'Edit selected text',exact:true}); await editor.waitFor();
      assert.deepEqual(await editor.evaluate(element=>({size:getComputedStyle(element).fontSize,height:(element.closest('button') || element).getBoundingClientRect().height})),appearance);
      await editor.press('Control+a'); await editor.pressSequentially('Cancelled inline'); await editor.press('Escape'); await frame.getByRole('button',{name:'Continue <now> ✓',exact:true}).waitFor();
      await frame.locator('#message').dblclick(); await editor.waitFor(); await editor.press('Control+a'); await editor.pressSequentially('Inline <now>'); await preview(()=>editor.press('Enter')); await frame.getByRole('button',{name:'Inline <now>',exact:true}).waitFor();
      assert.equal(fs.readFileSync(file,'utf8'),fixture);
      console.log('Component props: arrow component, true-size inline editing and Escape verified');
      const [undoReplay]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/draft-view'),page.getByRole('button',{name:'Undo',exact:true}).click()]);
      const undoBody=await undoReplay.json(); assert.equal(undoReplay.ok(),true,JSON.stringify(undoBody)); assert.ok(undoBody.renderPatches?.some((patch:any)=>patch.text==='Continue <now> ✓'),JSON.stringify(undoBody));
      await idle(); await frame.getByRole('button',{name:'Continue <now> ✓',exact:true}).waitFor();
      await page.getByRole('button',{name:'Redo',exact:true}).click(); await idle(); await frame.getByRole('button',{name:'Inline <now>',exact:true}).waitFor();
      if(crossFile){await frame.locator('#local-note').click();const local=panel.getByRole('textbox',{name:'Component prop text',exact:true});await local.fill('Local updated');await preview(()=>local.press('Control+Enter'));await frame.getByText('Local updated',{exact:true}).waitFor();assert.equal(fs.readFileSync(file,'utf8'),fixture);}
      await frame.locator('#computed').click(); await panel.getByText(/props? .*computed data/).waitFor(); assert.equal(await input.count(),0);
      console.log('Component props: Undo/Redo and provider selection verified');
      await page.reload({waitUntil:'domcontentloaded'}); await page.locator('[data-source-ready="true"]').waitFor({timeout:120000}); await idle(); await frame.getByRole('button',{name:'Inline <now>',exact:true}).waitFor();
      if(crossFile)await frame.getByText('Local updated',{exact:true}).waitFor();
      await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/apply'&&response.request().method()==='POST'),page.getByRole('button',{name:'Save changes',exact:true}).click()]); await idle();
      const saved=fs.readFileSync(file,'utf8'); assert.ok(saved.includes('label={"Inline <now>"}')); if(crossFile)assert.equal(fs.readFileSync(definitionFile,'utf8'),definition);else assert.ok(saved.includes('{copy}</button>')); assert.ok(saved.includes('<Shared label="Shared one"/>'));
      if(crossFile)assert.ok(saved.includes('text={"Local updated"}'));
      console.log('Component props: refresh recovery and Save verified');
      if(windowMode){await page.getByRole('button',{name:'Browse',exact:true}).click(); const actual=page.frames().find(frame=>frame.url().includes('__slightnudge_session='))!; await actual.waitForFunction(()=>(window as any).__slightnudge_inspect===false); await frame.locator('#message').click(); assert.equal(await frame.locator('body').getAttribute('data-clicks'),'1'); await page.getByRole('button',{name:'Edit',exact:true}).click(); await actual.waitForFunction(()=>(window as any).__slightnudge_inspect===true); const toggle=page.getByRole('button',{name:'Toggle design panel',exact:true}); if(await toggle.getAttribute('aria-expanded')!=='true') await toggle.click(); }
      await select(); await page.screenshot({path:path.join(root,`docs/${crossFile?'component-ownership':'component-props'}-${repository?'imported-':''}${windowMode?'window':'studio'}.png`)});
      await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/undo'&&response.request().method()==='POST'),page.getByRole('button',{name:'Undo',exact:true}).click()]); await idle();
      assert.equal(fs.readFileSync(file,'utf8'),fixture); await frame.getByRole('button',{name:'Start & go',exact:true}).waitFor();
      if(crossFile)assert.equal(fs.readFileSync(definitionFile,'utf8'),definition);
      await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
      console.log(`PASS ${crossFile?'cross-file component':'component text'} ${repository?'imported':'local'} ${windowMode?'window':'Studio'}: ${crossFile?'caller ownership, untouched definition, named/default imports, ':''}arrow props, true-size inline editing, spaces, Escape, runtime/provider refusal, draft Undo/Redo, refresh recovery, source-call Save, exact Undo${windowMode?', retained click handler':''}`);
    }
  }catch(error){console.log(await page.getByLabel('Editor notice',{exact:true}).allTextContents());await page.screenshot({path:path.join(root,'docs/component-props-failure.png')});throw error;}
  finally{fs.writeFileSync(file,original);if(crossFile){if(originalDefinition===undefined)fs.unlinkSync(definitionFile);else fs.writeFileSync(definitionFile,originalDefinition);}}
  return 2;
}
