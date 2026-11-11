const mutableTestEnvironment: Record<string, string | undefined> = process.env;
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const project=process.cwd(),root=path.join(project,'scratch/security-hardening-20261101/formatter-report-workspace');
if(fs.existsSync(root))throw Error('Refuse to overwrite a prior experiment');fs.mkdirSync(path.join(root,'app'),{recursive:true});
fs.symlinkSync(path.join(project,'node_modules'),path.join(root,'node_modules'),'junction');
fs.copyFileSync(path.join(project,'.slightnudge/repositories/m0-control-lab/package.json'),path.join(root,'package.json'));
fs.copyFileSync(path.join(project,'.slightnudge/repositories/m0-control-lab/src/app/globals.css'),path.join(root,'app/globals.css'));
fs.writeFileSync(path.join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{jsx:'preserve',target:'ES2020',module:'esnext'}}));
process.chdir(root);process.env.SLIGHTNUDGE_TEST='1';mutableTestEnvironment.NODE_ENV='test';process.env.SLIGHTNUDGE_WORKSPACE_ROOT=root;process.env.SLIGHTNUDGE_DATA_DIR=path.join(root,'.slightnudge');
const {createPendingSourceEdit,applyPendingSourceEdit,undoReviewedSourceEdit}=await import('../lib/slightnudge/edit-history');
const file=path.join(root,'app/page.tsx'),before='export default function Page(){return <div id="target" className="p-2">Hello</div>}\n';fs.writeFileSync(file,before);
const after=before.replace('p-2','p-4');
const proposal=await createPendingSourceEdit({filePath:file,before,after,summary:'temp padding edit',oldValue:'p-2',newValue:'p-4',previewType:'className',draft:true,elementId:'target',tagName:'div',oldClassName:'p-2',newClassName:'p-4',removedTokens:['p-2'],addedTokens:['p-4']});
const applied=await applyPendingSourceEdit(proposal.id!);const appliedSource=fs.readFileSync(file,'utf8');
const prettier=path.join(project,'scratch/security-hardening-20261101/tools/node_modules/prettier/bin/prettier.cjs');
const formatterOutput=execFileSync(process.execPath,[prettier,'--write',file],{encoding:'utf8'});const formatted=fs.readFileSync(file,'utf8');
const undo=undoReviewedSourceEdit(proposal.id!,{filePath:file,editId:applied.editId});const afterUndo=fs.readFileSync(file,'utf8');
const report:any={S4:{before,applied,appliedSource,formatter:'Prettier 3.6.2',formatterOutput,formatted,undo,afterUndo,byteIdenticalToBefore:afterUndo===before,formattedPaddingRestored:afterUndo.includes('className="p-2"')},S5:[]};
for(const metadata of ['declared-added-token','omitted-added-token']){
 const current=fs.readFileSync(file,'utf8'),next=current.replace('className="p-2"','className="p-2 definitely-not-a-tailwind-utility"');
 const pending=await createPendingSourceEdit({filePath:file,before:current,after:next,summary:'temp invalid compiler class',oldValue:'p-2',newValue:'p-2 definitely-not-a-tailwind-utility',previewType:'className',draft:true,elementId:'target',tagName:'div',addedTokens:metadata==='declared-added-token'?['definitely-not-a-tailwind-utility']:[],removedTokens:[]});
 const result=await applyPendingSourceEdit(pending.id!);report.S5.push({metadata,result,sourceUnchanged:fs.readFileSync(file,'utf8')===current,resultSource:fs.readFileSync(file,'utf8')});
}
fs.writeFileSync(path.join(project,'docs/security-hardening/S4-S5-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
