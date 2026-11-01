const cp=require('child_process'),fs=require('fs');const dir='docs/selection-gate-step3-evidence';
(async()=>{
 for(let round=1;round<=3;round++){
  try{
   for(const surface of ['old-studio','old-window','full','fit'])for(const suite of ['regression','overfit','step1-replacement']){
    const name=`round-${round}-${surface}-${suite}`,file=suite==='step1-replacement'?'test/step1-selection.iframe-v3.test.ts':`test/m0-${suite}.iframe-v3.test.ts`,fd=fs.openSync(dir+'/'+name+'.log','w');
    const child=cp.spawn(process.execPath,['--import','tsx',file],{windowsHide:true,env:{...process.env,SELECTION_ROUND:String(round),SELECTION_SURFACE:surface},stdio:['ignore',fd,fd]});
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});fs.closeSync(fd);fs.writeFileSync(dir+'/'+name+'.exit.json',JSON.stringify({round,surface,suite,code},null,2));console.log(name+': '+code);
    if(fs.existsSync(dir+'/STOP-WRONG-TARGET.json')){console.log(fs.readFileSync(dir+'/STOP-WRONG-TARGET.json','utf8'));return;}
    const resultFile=dir+'/'+name+'.json';
    const result=fs.existsSync(resultFile)?JSON.parse(fs.readFileSync(resultFile,'utf8')):null;
    if(result?.cases?.length===0&&result?.events?.some(event=>event.kind==='pageerror')){
     fs.writeFileSync(dir+'/STOP-PRODUCT-LOAD.json',JSON.stringify({name,reason:'Editor runtime error before any selection case; stop for diagnosis',events:result.events},null,2));
     console.log('STOP: product runtime error during readiness; no further cells will run');return;
    }
    if(code!==0)console.log('NON-GREEN '+name+'; raw failure retained; no wrong target, continuing');
   }
  }finally{
   fs.writeFileSync(dir+'/round-'+round+'-git-status.txt',cp.execFileSync('git',['status','--short'],{encoding:'utf8'}));
   const logs=fs.readdirSync(dir).filter(f=>f.startsWith('round-'+round+'-')&&f.endsWith('.log')&&!f.endsWith('-raw.log'));fs.writeFileSync(dir+'/round-'+round+'-raw.log',logs.map(f=>'FILE '+f+'\n'+fs.readFileSync(dir+'/'+f,'utf8')).join('\n'));
   console.log('RAW OUTPUT '+dir+'/round-'+round+'-raw.log');console.log('RAW GIT STATUS '+dir+'/round-'+round+'-git-status.txt');
  }
 }
})().catch(error=>{console.error(error);process.exitCode=1});
