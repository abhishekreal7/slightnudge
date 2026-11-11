const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict');
const main=process.cwd(),root=path.join(main,'scratch/editor-safety-port-20261108'),evidence=path.join(main,'docs/editor/evidence');
const rows=JSON.parse(fs.readFileSync(path.join(evidence,'amendment9-engine-progress.json'),'utf8'));
assert.equal(rows.length,60,'Finish the baseline before applying the prepared typing fixes');
assert.ok(rows.every(row=>['PASS','BASELINE DEFECT','FLAKY'].includes(row.classification)));
const groups=JSON.parse(fs.readFileSync(path.join(evidence,'amendment9-typing-commit-plan.json'),'utf8'));
const titles={focus:'fix: type the drag handle pointer target as an HTML element','readonly-env':'test: use a mutable typed record for mode overrides',optional:'test: narrow optional draft patches and diagnostic messages',browser:'test: preserve browser probe types and check nullable metadata'};
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
assert.equal(git('branch','--show-current'),'codex/editor-safety-port-20261108');
assert.equal(git('diff','--cached','--name-only'),'');
assert.equal(git('diff','--name-only'),'');
const commits=[];
for(const [group,files]of groups){
 for(const file of files){assert.ok(!file.startsWith('scratch/')&&!file.includes('evidence/')&&file!=='next-env.d.ts');const candidate=path.join(evidence,'type-candidates',group,file),target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(candidate,target);}
 git('add','--',...files);
 const staged=git('diff','--cached','--name-only').split(/\r?\n/).filter(Boolean);assert.deepEqual([...staged].sort(),[...files].sort());assert.ok(!staged.includes('next-env.d.ts'));console.log('CONFIRMED cached paths before '+group+': '+staged.join(', ')+'; next-env.d.ts ABSENT');
 console.log(git('diff','--cached','--stat'));console.log(git('commit','-m',titles[group]));commits.push({group,sha:git('rev-parse','HEAD'),files});
}
assert.equal(fs.readFileSync(path.join(root,'test/helpers/real-state.ts'),'utf8'),fs.readFileSync(path.join(main,'test/helpers/real-state.ts'),'utf8'));
git('add','--','test/helpers/real-state.ts');const staged=git('diff','--cached','--name-only').split(/\r?\n/).filter(Boolean);assert.deepEqual(staged,['test/helpers/real-state.ts']);assert.ok(!staged.includes('next-env.d.ts'));console.log('CONFIRMED cached paths before helper commit: '+staged.join(', ')+'; next-env.d.ts ABSENT');console.log(git('commit','-m','test: retain the unchanged protected-state snapshot helper'));commits.push({group:'unchanged-real-state-helper',sha:git('rev-parse','HEAD'),files:staged});
fs.writeFileSync(path.join(evidence,'amendment9-commits.json'),JSON.stringify(commits,null,2));assert.equal(git('status','--porcelain=v1'),'');console.log('Integration checkout clean after five explicit-path commits.');
