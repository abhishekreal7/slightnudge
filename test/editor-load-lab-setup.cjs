const fs=require('fs'),path=require('path'),cp=require('child_process');
const source=process.cwd(),target='C:/dev/vibecheck-load-lab-20261101',evidence=path.join(source,'docs/editor-load-and-toolbar');fs.mkdirSync(evidence,{recursive:true});
if(fs.existsSync(target))throw Error('Clean lab already exists; refuse overwrite');fs.mkdirSync(target);
const files=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).filter(f=>!/^(docs|test|scratch)\//.test(f)&&!/(^|\/)\.env($|\.)/.test(f));
for(const file of files){const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,file),dest);}
fs.symlinkSync(path.join(source,'node_modules'),path.join(target,'node_modules'),'junction');
const repos=JSON.parse(fs.readFileSync('.slightnudge/repositories.json','utf8')).filter(r=>['m0-overfit-lab','m0-control-lab'].includes(r.id));
function copyTree(from,to){fs.mkdirSync(to,{recursive:true});for(const item of fs.readdirSync(from,{withFileTypes:true})){if(['node_modules','.next','.git'].includes(item.name)||item.name.startsWith('.env'))continue;const a=path.join(from,item.name),b=path.join(to,item.name);if(item.isDirectory())copyTree(a,b);else if(item.isFile())fs.copyFileSync(a,b);}}
for(const repo of repos){const dest=path.join(target,'.slightnudge/repositories',repo.id);copyTree(repo.localPath,dest);fs.symlinkSync(path.join(repo.localPath,'node_modules'),path.join(dest,'node_modules'),'junction');cp.execFileSync('git',['init'],{cwd:dest});cp.execFileSync('git',['add','src','package.json','next.config.mjs','tsconfig.json'],{cwd:dest});repo.localPath=dest;}
fs.writeFileSync(path.join(target,'.slightnudge/repositories.json'),JSON.stringify(repos,null,2));
fs.writeFileSync(path.join(evidence,'clean-lab.json'),JSON.stringify({target,trackedSourceFiles:files.length,repos:repos.map(r=>r.id),environmentFilesCopied:false,state:'Fresh registry with two fixture repos, no edits/history/pending/previews'},null,2));console.log(target);
