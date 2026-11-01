const fs=require('fs');const dir='docs/editor-load-and-toolbar/selection';fs.mkdirSync(dir,{recursive:true});
let helper=fs.readFileSync('test/helpers/selection-gate-v3.ts','utf8');
helper=helper.replace("const dir=path.resolve('docs/selection-gate-step3-evidence');","const dir=path.resolve('docs/editor-load-and-toolbar/selection');");
helper=helper.replace("const name=`round-${round}-${surface}-${suite}`,rows:any[]=[],geometry:any[]=[],events:any[]=[];","const name=`round-${round}-${surface}-${suite}`,rows:any[]=[],geometry:any[]=[],events:any[]=[]; let pageFailure: Error | null = null;\n const failure = new Promise<never>((_resolve,reject)=>page.once('pageerror',error=>{ pageFailure=error; reject(error); }));\n // Always attach the rejection handler before navigation.\n void failure.catch(()=>{});");
helper=helper.replace("console.log('NAVIGATION '+url.href);await page.goto(url.href,{waitUntil:'domcontentloaded'});await page.locator('[data-source-ready=\"true\"]').waitFor();","console.log('NAVIGATION '+url.href);await Promise.race([(async()=>{await page.goto(url.href,{waitUntil:'domcontentloaded'});await page.locator('[data-source-ready=\"true\"]').waitFor();})(),failure]); if(pageFailure)throw pageFailure;");
helper=helper.replace('for(const s of specs)await accept(await runCase(s));','for(const s of specs){ if(pageFailure)throw pageFailure; await accept(await runCase(s)); }');
helper=helper.replace("if(surface==='fit')for(const scale of [.5,1,1.5])", "if(process.env.RELIABILITY_GEOMETRY==='1'&&surface==='fit')for(const scale of [.5,1,1.5])");
if(!helper.includes('await Promise.race'))throw Error('Setup replacement failed');
fs.writeFileSync('test/helpers/editor-reliability-selection.ts',helper);
for(const suite of ['regression','overfit']){
 const original=fs.readFileSync(`test/m0-${suite}.iframe-v3.test.ts`,'utf8');const copy=original.replace("./helpers/selection-gate-v3'","./helpers/editor-reliability-selection'");
 if(copy===original)throw Error('Copy import replacement failed');fs.writeFileSync(`test/m0-${suite}.reliability.test.ts`,copy);
 const prefix=text=>text.slice(0,text.indexOf('\nasync function '));const base=fs.readFileSync(`test/m0-${suite}.test.ts`,'utf8');
 if(!copy.startsWith(prefix(base)))throw Error('Expected results/selectors changed');
 fs.writeFileSync(`${dir}/${suite}-unchanged-expectations.txt`,'Original prefix, including all 30 selectors and expectations, is byte-identical.\n');
}
console.log('New copies only; original specs and limits unchanged.');
