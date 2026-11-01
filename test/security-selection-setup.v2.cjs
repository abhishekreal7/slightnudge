const fs=require('fs');const dir='docs/security-hardening/selection';fs.mkdirSync(dir,{recursive:true});
let helper=fs.readFileSync('test/helpers/editor-reliability-selection.ts','utf8').replaceAll('docs/editor-load-and-toolbar/selection',dir).replace("path.resolve('.slightnudge/repositories',repo,probe.source.path)","path.resolve('scratch/security-hardening-20261101/runtime/.slightnudge/repositories',repo,probe.source.path)");
fs.writeFileSync('test/helpers/security-selection.v2.ts',helper);
for(const suite of ['regression','overfit']){
 const original=fs.readFileSync(`test/m0-${suite}.test.ts`,'utf8'),copy=fs.readFileSync(`test/m0-${suite}.reliability.test.ts`,'utf8').replace('./helpers/editor-reliability-selection','./helpers/security-selection.v2');
 const prefix=original.slice(0,original.indexOf('\nasync function '));if(!copy.startsWith(prefix))throw Error('Expected values changed');fs.writeFileSync(`test/m0-${suite}.security-v2.test.ts`,copy);fs.writeFileSync(`${dir}/${suite}-expected-original.txt`,prefix);fs.writeFileSync(`${dir}/${suite}-expected-copy.txt`,copy.slice(0,prefix.length));fs.writeFileSync(`${dir}/${suite}-expected.diff`,'');
}
fs.writeFileSync('test/security-selection-runner.v2.cjs',fs.readFileSync('test/editor-reliability-matrix.cjs','utf8').replaceAll('docs/editor-load-and-toolbar/selection',dir).replace('test/m0-${suite}.reliability.test.ts','test/m0-${suite}.security-v2.test.ts'));
fs.writeFileSync('test/security-selection-report.v2.cjs',fs.readFileSync('test/editor-reliability-report.cjs','utf8').replaceAll('docs/editor-load-and-toolbar/selection',dir));console.log('New copies only; expected prefixes unchanged');
