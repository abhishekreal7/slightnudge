import {chromium} from 'playwright';
import fs from 'node:fs';
const label=process.env.LAYERS_LABEL||'before',dir='docs/editor-load-and-toolbar',result:any={checks:[]};
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}});
try{
 await page.goto('http://127.0.0.1:3000/editor/m0-control-lab?preview=http%3A%2F%2F127.0.0.1%3A3001');await page.locator('[data-source-ready="true"]').waitFor();
 await page.evaluate(()=>{(window as any).__inlineSelections=[];window.addEventListener('message',event=>{const frame=document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement;if(event.source===frame?.contentWindow&&event.data?.type==='source-selection')(window as any).__inlineSelections.push(event.data.selection);});});
 await page.getByRole('button',{name:'Toggle layers',exact:true}).click();const buttons=page.getByRole('region',{name:'Layers panel'}).locator('button[title*=" · span · src/components/sections/Footer.tsx:2"]');
 const count=await buttons.count();result.checks.push({name:'Both inline source instances appear',pass:count===2,count});
 if(count===2){for(let index=0;index<2;index++){
  const previous=await page.evaluate(()=>(window as any).__inlineSelections.length);await buttons.nth(index).click();await page.waitForFunction(n=>(window as any).__inlineSelections.length>n,previous);
  const node=await page.evaluate(()=>(window as any).__inlineSelections.at(-1));result.checks.push({name:`Badge ${index+1} selects correct source`,pass:node.path==='src/components/sections/Footer.tsx'&&node.line===2&&node.tagName==='span',selected:{path:node.path,line:node.line,tag:node.tagName,instance:node.instance}});
 }
 const instances=result.checks.slice(1).map((r:any)=>r.selected.instance);result.checks.push({name:'Instance identity remains distinct',pass:Boolean(instances[0]&&instances[1]&&instances[0]!==instances[1])});}
 await page.screenshot({path:`${dir}/inline-layers-${label}.png`});
}catch(error){result.error=String(error);process.exitCode=1;}
finally{await browser.close();fs.writeFileSync(`${dir}/inline-layers-${label}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
if(result.checks.some((r:any)=>!r.pass))process.exitCode=1;
