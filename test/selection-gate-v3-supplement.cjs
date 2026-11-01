// Repeat only the initial Step 1 cell that failed before fixture clicks because
// the new test used default titles instead of the Pages panel's route labels.
// The original attempt remains untouched; all expected values remain unchanged.
const fs=require('fs'),cp=require('child_process');const dir='docs/selection-gate-step3-evidence',name='round-1-old-studio-step1-replacement-supplement';
const fd=fs.openSync(dir+'/'+name+'.log','w');
const child=cp.spawn(process.execPath,['--import','tsx','test/step1-selection.iframe-v3.test.ts'],{windowsHide:true,env:{...process.env,SELECTION_ROUND:'1',SELECTION_SURFACE:'old-studio',SELECTION_SUFFIX:'-supplement'},stdio:['ignore',fd,fd]});
child.on('exit',code=>{fs.closeSync(fd);fs.writeFileSync(dir+'/'+name+'.exit.json',JSON.stringify({code,reason:'Initial new-test title-selector failure; separate replay, no overwritten evidence'},null,2));fs.writeFileSync(dir+'/'+name+'-git-status.txt',cp.execFileSync('git',['status','--short'],{encoding:'utf8'}));console.log(name+': '+code);process.exitCode=code||0;});
