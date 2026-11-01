import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const dir='docs/security-hardening',label=process.env.SECURITY_BROWSER_LABEL||'baseline',events:any[]=[],rows:any[]=[];
const clean=(s:string)=>s.replace(/(__slightnudge_session=)[^&\s"<>]+/g,'$1[redacted]').replace(/[a-f0-9]{64}/g,'[hex-redacted]');
const browser=await chromium.launch({headless:true});
try{
 if(process.argv.includes('--font-blocked')){
  const page=await browser.newPage(),errors:any[]=[],blocked:string[]=[];page.on('pageerror',e=>errors.push({message:clean(e.message),stack:clean(e.stack||'')}));
  await page.route('https://fonts.googleapis.com/**',route=>{blocked.push(route.request().url());return new Promise(()=>{});});
  await page.goto('http://127.0.0.1:3000/editor/m0-overfit-lab?preview=http%3A%2F%2F127.0.0.1%3A3002',{waitUntil:'domcontentloaded'});
  let ready=true,error='';try{await page.locator('[data-source-ready="true"]').waitFor();}catch(e){ready=false;error=String(e);}
  rows.push({name:'Editor starts while external font CSS is unavailable',ready,blocked,errors,error,pass:ready&&errors.length===0});await page.screenshot({path:`${dir}/font-blocked-${label}.png`});await page.close();
 }
 if(process.argv.includes('--fonts')){
  const page=await browser.newPage(),errors:any[]=[];page.on('pageerror',e=>errors.push({message:clean(e.message),stack:clean(e.stack||'')}));
  await page.goto('http://127.0.0.1:3000/editor/m0-overfit-lab?preview=http%3A%2F%2F127.0.0.1%3A3002');await page.locator('[data-source-ready="true"]').waitFor();
  const resources=await page.evaluate(()=>({head:document.head.querySelectorAll('link[href*="fonts.googleapis.com"][rel="stylesheet"][data-precedence="editor-fonts"]').length,body:document.body.querySelectorAll('link[href*="fonts.googleapis.com"][rel="stylesheet"]').length,selfHosted:Boolean(getComputedStyle(document.documentElement).getPropertyValue('--font-manrope').trim()&&getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim())}));rows.push({name:'Fonts use managed head resources or self-hosting, not body hydration nodes',resources,errors,pass:(resources.head===1||resources.selfHosted)&&resources.body===0&&errors.length===0});await page.screenshot({path:`${dir}/font-policy-${label}.png`});await page.close();
 }
 if(process.argv.includes('--responses'))for(const body of ['','{"broken":','<html>upstream failure</html>']){
  const context=await browser.newContext(),page=await context.newPage(),errors:any[]=[];page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));
  await page.route('**/api/slightnudge/repositories/m0-overfit-lab',route=>route.fulfill({status:502,body,contentType:'text/plain'}));
  await page.goto('http://127.0.0.1:3000/editor/m0-overfit-lab?view=full');const alert=page.getByRole('alert').filter({hasText:'Invalid JSON response from'});await alert.waitFor();const text=await alert.innerText();const pass=text.includes('/api/slightnudge/repositories/m0-overfit-lab')&&text.includes('HTTP 502')&&(body?text.includes(body):/empty/i.test(text))&&errors.length===0;rows.push({body,text,pass,errors});await page.screenshot({path:`${dir}/response-ui-${label}-${rows.length}.png`});await context.close();
 }
 if(process.argv.includes('--hydration')){
  const file=path.resolve('scratch/security-hardening-20261101/runtime/components/slightnudge/EditorWorkspace.tsx'),original=fs.readFileSync(file,'utf8');
  try{for(let iteration=0;iteration<16;iteration++){
   const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors:any[]=[];
   await page.route('https://fonts.googleapis.com/**',async route=>{await new Promise(resolve=>setTimeout(resolve,1000));await route.continue();});
   page.on('pageerror',e=>{errors.push({message:clean(e.message),stack:clean(e.stack||'')});});page.on('console',m=>{if(m.type()==='error')events.push({iteration,kind:'console',message:clean(m.text())});});
   await page.goto('http://127.0.0.1:3000/editor/m0-overfit-lab?view=full&preview=http%3A%2F%2F127.0.0.1%3A3002');await page.locator('[data-source-ready="true"]').waitFor();
   fs.writeFileSync(file,original+`\n// temp hydration recompile probe ${iteration}\n`);await page.reload({waitUntil:'domcontentloaded'});try{await page.locator('[data-source-ready="true"]').waitFor();}catch(error){errors.push({message:String(error)});}
   const row={iteration,pass:errors.length===0,errors};rows.push(row);console.log(JSON.stringify(row));if(errors.length){await page.screenshot({path:`${dir}/hydration-${label}-${iteration}.png`});fs.writeFileSync(`${dir}/hydration-${label}-${iteration}.html`,clean(await page.content()));await context.close();break;}await context.close();
  }}finally{fs.writeFileSync(file,original);}
 }
}catch(error){rows.push({pass:false,error:String(error),stack:(error as Error).stack});}
finally{await browser.close();fs.writeFileSync(`${dir}/browser-${label}.json`,JSON.stringify({rows,events},null,2));console.log(JSON.stringify({rows,events}));}
if(rows.some(r=>!r.pass))process.exitCode=1;
