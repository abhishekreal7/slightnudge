const cp=require('child_process'),fs=require('fs');const dir='docs/security-hardening/selection';
(async()=>{for(let round=1;round<=3;round++){
 try{for(const surface of ['old-studio','old-window','full','fit'])for(const suite of ['regression','overfit']){
  const name=`round-${round}-${surface}-${suite}`;if(fs.existsSync(`${dir}/${name}.log`))throw Error('Refuse to overwrite existing evidence '+name);
  const fd=fs.openSync(`${dir}/${name}.log`,'wx'),child=cp.spawn(process.execPath,['--import','tsx',`test/m0-${suite}.security-v2.test.ts`],{windowsHide:true,env:{...process.env,SELECTION_ROUND:String(round),SELECTION_SURFACE:surface},stdio:['ignore',fd,fd]});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});fs.closeSync(fd);console.log(name,code);
  fs.writeFileSync(`${dir}/${name}.exit.json`,JSON.stringify({code},null,2));const file=`${dir}/${name}.json`,r=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
  if(code!==0||!r||r.events.some(e=>e.kind==='pageerror')||r.cases.length!==30||r.cases.some(c=>['WRONG TARGET','MISSING-TARGET'].includes(c.verdict)||c.assertions.pointerSource.status==='FAIL'||c.assertions.expectedSource.status==='FAIL'||c.expectedResultMatch===false)){
   fs.writeFileSync(`${dir}/STOP.json`,JSON.stringify({name,code,reason:'Non-green cell: stop immediately; do not run more suites'},null,2));console.log('STOP',name);process.exitCode=1;return;
  }
 }}finally{
  const names=fs.readdirSync(dir).filter(f=>f.startsWith(`round-${round}-`)&&f.endsWith('.log')&&!f.endsWith('-raw.log'));
  fs.writeFileSync(`${dir}/round-${round}-raw.log`,names.map(f=>'FILE '+f+'\n'+fs.readFileSync(`${dir}/${f}`,'utf8')).join('\n'));
  fs.writeFileSync(`${dir}/round-${round}-git-status.txt`,cp.execFileSync('git',['status','--short'],{encoding:'utf8'}));console.log('RAW / STATUS',round);
 }
}})().catch(e=>{console.error(e);process.exitCode=1;});
