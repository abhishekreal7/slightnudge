const fs=require('fs'),vm=require('vm'),path=require('path');const dir='docs/security-hardening/selection',all=[],cells=[];
for(let round=1;round<=3;round++)for(const surface of ['old-studio','old-window','full','fit'])for(const suite of ['regression','overfit']){
 const source=fs.readFileSync(`test/m0-${suite}.test.ts`,'utf8'),list=suite==='regression'?'SELECTIONS':'OVERFIT_SELECTIONS',type=suite==='regression'?'SelectionSpec':'OverfitSelectionSpec';
 const block=source.slice(source.indexOf('const '+list+':'),source.indexOf('\nasync function ')).replace('const '+list+': '+type+'[]','const '+list),specs=vm.runInNewContext(block+'\n'+list+';');
 const file=`${dir}/round-${round}-${surface}-${suite}.json`,r=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
 const cases=specs.map(s=>({round,surface,suite,index:s.index,selector:s.selector,expected:{file:s.expectedFile,line:s.expectedLine,tag:s.expectedTag},...(r?.cases.find(c=>c.index===s.index)||{verdict:'UNREACHED',assertions:{pointerSource:{status:'NOT-RUN'},expectedSource:{status:'NOT-RUN'}}})}));all.push(...cases);
 cells.push({round,surface,suite,cases:r?.cases.length||0,pageErrors:r?.events.filter(e=>e.kind==='pageerror')||[],counts:cases.reduce((a,c)=>(a[c.verdict]=(a[c.verdict]||0)+1,a),{})});
}
fs.writeFileSync(`${dir}/all-cases.json`,JSON.stringify(all,null,2));fs.writeFileSync(`${dir}/cells.json`,JSON.stringify(cells,null,2));
const counts=all.reduce((a,c)=>(a[c.verdict]=(a[c.verdict]||0)+1,a),{}),notClickable=all.filter(c=>c.verdict==='NOT-CLICKABLE').map(c=>({round:c.round,surface:c.surface,suite:c.suite,index:c.index,expected:c.expected,layers:c.assertions.expectedSource}));
const summary={counts,pageErrors:cells.reduce((n,c)=>n+c.pageErrors.length,0),pointerAssertionFailures:all.filter(c=>c.assertions.pointerSource.status==='FAIL').length,expectedAssertionFailures:all.filter(c=>c.assertions.expectedSource.status==='FAIL').length,notClickable};
fs.writeFileSync(`${dir}/summary.json`,JSON.stringify(summary,null,2));
fs.writeFileSync(`${dir}/all-cases.md`,'# Selection results\n\nN/A pointer results are explicit refusals or Layers fallbacks, not passing pointer equality checks.\n\n| Round | Surface | Suite | Case | Result | Pointer/source | Expected/source |\n|---|---|---|---:|---|---|---|\n'+all.map(c=>`| ${c.round} | ${c.surface} | ${c.suite} | ${c.index} | ${c.verdict} | ${c.assertions.pointerSource.status} | ${c.assertions.expectedSource.status} |`).join('\n'));
console.log(JSON.stringify(summary,null,2));
