const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const dir='docs/selection-gate-step3-evidence';
const write=(name,value)=>fs.writeFileSync(path.join(dir,name),typeof value==='string'?value:JSON.stringify(value,null,2));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=JSON.parse(fs.readFileSync(path.join(dir,'protected-before.json')));
const integrity=Object.entries(before).map(([file,sha256])=>({file,before:sha256,after:fs.existsSync(file)?hash(file):null,unchanged:fs.existsSync(file)&&hash(file)===sha256}));
write('protected-integrity.json',{count:integrity.length,unchanged:integrity.every(r=>r.unchanged),files:integrity});
if(integrity.some(r=>!r.unchanged))throw Error('Protected file changed; stop before staging');
for(const suite of ['regression','overfit']){
 const original=fs.readFileSync(`test/m0-${suite}.test.ts`,'utf8'),copy=fs.readFileSync(`test/m0-${suite}.iframe-v3.test.ts`,'utf8');
 const prefix=text=>text.slice(0,text.indexOf('\nasync function '));
 if(!copy.startsWith(prefix(original)))throw Error('Original specs/selectors prefix changed: '+suite);
}
const clean=text=>text.replace(/(__slightnudge_session=)[^&\s"<>]+/g,'$1[session-redacted]');
for(const [name,source] of [['studio','server-studio'],['control','server-retry-m0-control-lab'],['overfit','server-retry-m0-overfit-lab']])for(const stream of ['out','err']){
 const file=`docs/selection-gate-step2-evidence/${source}.${stream}.log`;
 if(fs.existsSync(file))write(`server-${name}-at-stop.${stream}.log`,clean(fs.readFileSync(file,'utf8')));
}
const failure=JSON.parse(fs.readFileSync(path.join(dir,'round-2-old-window-overfit.json')));
write('STOP-PRODUCT-LOAD.json',{cell:'round-2-old-window-overfit',reason:'Product-facing runtime SyntaxError shown by Next error overlay before source ready',message:'Unexpected end of JSON input',requestedUrl:failure.requestedUrl,actualUrl:failure.actualUrl,events:failure.events,screenshot:'round-2-old-window-overfit-error.png',rootCause:'Unresolved; screenshot proves runtime failure, not its originating parse site',runnerDisclosure:'The initial runner had already continued after this setup failure before the evidence was reviewed. Later results are retained but do not qualify as a successful gate. No additional browser execution was started on continuation. The new runner now stops on pre-case pageerror.'});
const rows=JSON.parse(fs.readFileSync(path.join(dir,'all-case-results.json'))),geometry=JSON.parse(fs.readFileSync(path.join(dir,'geometry-results.json')));
const beforeStop=r=>r.round===1||(r.round===2&&(r.surface==='old-studio'||(r.surface==='old-window'&&r.suite==='regression')));
const summarize=list=>list.reduce((a,r)=>(a[r.verdict]=(a[r.verdict]||0)+1,a),{});
const offsets=list=>Object.fromEntries(['x','y','width','height'].map(k=>[k,Math.max(0,...list.filter(r=>r.offset).map(r=>Math.abs(r.offset[k])))]));
write('qualification-summary.json',{gate:'NOT PASSED',stoppedFor:'Product route runtime error',beforeMandatoryStop:summarize(rows.filter(beforeStop)),allRetainedAttempts:summarize(rows),afterStopDisclosure:'Results after round-2-old-window-overfit are unqualified because the runner should have stopped there.',geometryBeforeStop:{measured:geometry.filter(r=>r.offset&&beforeStop(r)).length,maxAbsoluteOffsetPx:offsets(geometry.filter(beforeStop))},geometryAllRetained:{measured:geometry.filter(r=>r.offset).length,maxAbsoluteOffsetPx:offsets(geometry)},pointerFailures:rows.filter(r=>r.assertions.pointerSource.status==='FAIL').length,expectedNodeFailures:rows.filter(r=>r.assertions.expectedSource.status==='FAIL').length});
for(const name of ['all-case-results.md','round-summary.md','geometry-offsets.md']){
 const file=path.join(dir,name),text=fs.readFileSync(file,'utf8'),banner='> Gate NOT PASSED. Product runtime failure occurred at round-2-old-window-overfit. The initial runner incorrectly continued; subsequent rows are retained evidence, not qualifying passes. See README.md.\n\n';
 if(!text.startsWith(banner))fs.writeFileSync(file,banner+text);
}
write('git-status-at-stop.txt',cp.execFileSync('git',['status','--short'],{encoding:'utf8'}));
write('diff-stat-at-stop.txt',cp.execFileSync('git',['diff','--stat'],{encoding:'utf8'}));
console.log(JSON.stringify({protectedFiles:integrity.length,unchanged:true,summary:JSON.parse(fs.readFileSync(path.join(dir,'qualification-summary.json')))},null,2));
