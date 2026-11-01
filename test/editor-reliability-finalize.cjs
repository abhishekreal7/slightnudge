const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),path=require('path');const dir='docs/editor-load-and-toolbar';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=JSON.parse(fs.readFileSync(dir+'/protected-before.json'));
const allowed=['components/slightnudge/SourceLayers.tsx','components/slightnudge/useWindowDock.ts','components/slightnudge/editor-workspace.module.css'];
const changed=Object.entries(before).filter(([file,value])=>!fs.existsSync(file)||hash(file)!==value).map(([file])=>file);
if(changed.some(file=>!allowed.includes(file)))throw Error('Unexpected protected change: '+changed.join(', '));
const parity=allowed.map(file=>({file,main:hash(file),lab:hash(path.join('C:/dev/vibecheck-load-lab-20261101',file))}));if(parity.some(r=>r.main!==r.lab))throw Error('Lab differs from main tested product source');
const fixtureParity=[];
function compareFixtures(relative){for(const item of fs.readdirSync(relative,{withFileTypes:true})){const file=path.join(relative,item.name);if(item.isDirectory())compareFixtures(file);else if(/\.(tsx?|jsx?|css)$/.test(item.name))fixtureParity.push({file,identical:hash(file)===hash(path.join('C:/dev/vibecheck-load-lab-20261101',file))});}}
for(const repo of ['m0-control-lab','m0-overfit-lab'])compareFixtures('.slightnudge/repositories/'+repo+'/src');
if(fixtureParity.some(r=>!r.identical))throw Error('Fixture source mismatch');fs.writeFileSync(dir+'/fixture-parity.json',JSON.stringify(fixtureParity,null,2));
fs.writeFileSync(dir+'/source-integrity.json',JSON.stringify({protectedFiles:Object.keys(before).length,changed,allOtherProtectedFilesUnchanged:true,existingTestsUnchanged:!changed.some(f=>f.startsWith('test/')),astPatcherAndSelectionLogicUnchanged:!changed.some(f=>f.startsWith('lib/')||f==='components/slightnudge/EditorWorkspace.tsx'||f==='components/slightnudge/SourceProjectCanvas.tsx'),testedProductParity:parity},null,2));
for(const suite of ['regression','overfit']){
 const original=fs.readFileSync(`test/m0-${suite}.test.ts`,'utf8'),copy=fs.readFileSync(`test/m0-${suite}.reliability.test.ts`,'utf8'),prefix=original.slice(0,original.indexOf('\nasync function '));
 const originalFile=`${dir}/selection/${suite}-expected-original.txt`,copyFile=`${dir}/selection/${suite}-expected-copy.txt`;
 fs.writeFileSync(originalFile,prefix);fs.writeFileSync(copyFile,copy.slice(0,prefix.length));
 const diff=cp.spawnSync('git',['diff','--no-index','--',originalFile,copyFile],{encoding:'utf8'});fs.writeFileSync(`${dir}/selection/${suite}-expected.diff`,diff.stdout||'');if(diff.status!==0)throw Error('Expected list/selector diff: '+suite);
}
const loads=JSON.parse(fs.readFileSync(dir+'/reproduction-bound/route-loads.json')),requests=JSON.parse(fs.readFileSync(dir+'/reproduction-bound/parallel-requests.json'));
fs.writeFileSync(dir+'/load-summary.json',JSON.stringify({requests:requests.length,requestFailures:requests.filter(r=>r.error),loads:loads.length,failedLoads:loads.filter(r=>r.error),pageErrors:loads.flatMap(r=>r.events.filter(e=>e.kind==='pageerror')),historicalJsonParseFailureReproduced:false,noStateOrApiFixMade:true},null,2));
// Logs intentionally retain their raw sequencing; redact preview session credentials.
const clean=s=>s.replace(/(__slightnudge_session=)[^&\s"<>]+/g,'$1[session-redacted]');
function visit(root){for(const e of fs.readdirSync(root,{withFileTypes:true})){const f=path.join(root,e.name);if(e.isDirectory())visit(f);else if(/\.(log|html|json|md|txt)$/.test(f)){const a=fs.readFileSync(f,'utf8'),b=clean(a);if(a!==b)fs.writeFileSync(f,b);}}}visit(dir);
const initial=JSON.parse(fs.readFileSync(dir+'/editor-load-processes-initial.json','utf8'));
fs.writeFileSync(dir+'/processes-initial.json',JSON.stringify({nodes:initial.filter(r=>r.Name==='node.exe'),browserProcessCount:initial.filter(r=>r.Name==='chrome.exe').length},null,2));
fs.writeFileSync(dir+'/memory-initial.json',JSON.stringify({source:'Captured initial Win32_OperatingSystem tool output',TotalVisibleMemorySizeKiB:16387272,FreePhysicalMemoryKiB:2557700},null,2));
fs.writeFileSync(dir+'/product-diff-stat.txt',cp.execFileSync('git',['diff','24c6259','--stat','--',...allowed],{encoding:'utf8'}));
fs.writeFileSync(dir+'/product-diff.patch',cp.execFileSync('git',['diff','24c6259','--',...allowed],{encoding:'utf8'}));
fs.writeFileSync(dir+'/final-git-status-before-commit.txt',cp.execFileSync('git',['status','--short'],{encoding:'utf8'}));
console.log(JSON.stringify({protected: Object.keys(before).length,changed,requests:requests.length,loads:loads.length},null,2));
