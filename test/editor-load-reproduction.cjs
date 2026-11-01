const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const dir='docs/editor-load-and-toolbar/'+(process.env.LOAD_LABEL||'reproduction-bound'),events=[],requests=[],loads=[];fs.mkdirSync(dir,{recursive:true});
const clean=s=>String(s).replace(/(__slightnudge_session=)[^&\s"<>]+/g,'$1[redacted]');
(async()=>{
 for(const port of [3000,3001,3002]){const response=await fetch(`http://127.0.0.1:${port}`);console.log('WARM',port,response.status);}
 for(const endpoint of ['/api/slightnudge/pages','/api/slightnudge/repositories','/api/slightnudge/repositories/m0-overfit-lab']){
  await Promise.all(Array.from({length:50},async(_,index)=>{try{const response=await fetch('http://127.0.0.1:3000'+endpoint),payload=await response.text();let error=null;try{JSON.parse(payload);}catch(e){error=String(e);}const row={endpoint,index,status:response.status,bytes:payload.length,error,payload:error?payload:undefined};requests.push(row);}catch(e){requests.push({endpoint,index,error:String(e)});}}));console.log('REQUESTS',endpoint,requests.filter(r=>r.endpoint===endpoint).length);
 }
 fs.writeFileSync(path.join(dir,'parallel-requests.json'),JSON.stringify(requests,null,2));
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 await context.addInitScript(()=>{const parse=JSON.parse;JSON.parse=function(text,...rest){try{return parse.call(this,text,...rest);}catch(error){console.error('LOAD_PARSE_FAILURE',JSON.stringify({payload:String(text).slice(0,4096),stack:error.stack,caller:new Error().stack}));throw error;}};});
 page.on('pageerror',e=>events.push({kind:'pageerror',message:clean(e.message),stack:clean(e.stack)}));
 page.on('console',m=>{if(m.type()==='error'||m.text().includes('LOAD_PARSE_FAILURE'))events.push({kind:'console',text:clean(m.text())});});
 page.on('requestfailed',r=>events.push({kind:'requestfailed',url:clean(r.url()),error:r.failure()?.errorText}));
 try{for(let index=0;index<50;index++){
  const start=Date.now(),eventStart=events.length,url='http://127.0.0.1:3000/studio/m0-overfit-lab/window?preview=http%3A%2F%2F127.0.0.1%3A3002';
  const row={index,url};try{const response=await page.goto(url,{waitUntil:'domcontentloaded'});row.status=response.status();row.actualUrl=page.url();await page.locator('[data-source-ready="true"]').waitFor();row.ready=true;}catch(e){row.error=String(e);await page.screenshot({path:path.join(dir,`load-${index}-failure.png`)});fs.writeFileSync(path.join(dir,`load-${index}-failure.html`),clean(await page.content()));}
  row.ms=Date.now()-start;row.events=events.slice(eventStart);loads.push(row);console.log(JSON.stringify(row));fs.writeFileSync(path.join(dir,'route-loads.json'),JSON.stringify(loads,null,2));
 }
 }finally{await browser.close();fs.writeFileSync(path.join(dir,'load-events.json'),JSON.stringify(events,null,2));}
 if(requests.some(r=>r.error)||loads.some(r=>r.error||r.events.some(e=>e.kind==='pageerror')))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
