import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Project, SyntaxKind } from 'ts-morph';
import { componentSourceHash, instanceOpenings } from '../lib/slightnudge/component-ownership';
import { POST } from '../app/api/slightnudge/preview/route';
import { getSessionToken } from '../lib/slightnudge/auth';
import { applyPendingSourceEdit, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';
import { readRenderableDraft } from '../lib/slightnudge/source-draft';
const require=createRequire(import.meta.url),loader=require('../lib/slightnudge/next-source-loader.cjs');
const previous=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'sn-instance-proof-'));
process.env.SLIGHTNUDGE_TEST='1';process.env.SLIGHTNUDGE_WORKSPACE_ROOT=root;process.env.SLIGHTNUDGE_DATA_DIR=path.join(root,'.slightnudge');process.env.PORT='3000';
const definition=`export function Action({label,disabled=false,variant='primary'}:{label:string;disabled?:boolean;variant?:'primary'|'quiet'}){return <button disabled={disabled} className={variant==='primary'?'bg-green-600':'bg-white'}>{label}</button>}`;
const caller=`import {Action} from './Action'; export default function Page(){return <main><Action label="Same"/><Action label="Same"/></main>}`;
function parsed(source:string){return new Project({useInMemoryFileSystem:true}).createSourceFile('/source.tsx',source)}
try{
 process.chdir(root);fs.writeFileSync('package.json','{"private":true}');
 for(const sameFile of [false,true]){
  const content=sameFile?definition+'\n'+caller.replace("import {Action} from './Action'; ",''):caller;
  fs.writeFileSync('Action.tsx',definition);fs.writeFileSync('page.tsx',content);
  const defFile=sameFile?'page.tsx':'Action.tsx',defSource=sameFile?content:definition,df=parsed(defSource),native=df.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).find(node=>node.getTagNameNode().getText()==='button')!,pos=df.getLineAndColumnAtPos(native.getStart());
  const calls=instanceOpenings(parsed(content));const indices=calls.map((node,index)=>node.getTagNameNode().getText()==='Action'?index:-1).filter(index=>index>=0);
  const marker=(index:number)=>JSON.stringify(['page.tsx',index,componentSourceHash(content)]);
  const selected={filePath:defFile,...pos,tagName:'button',instance:marker(indices[1])};
  const request=async(data:Record<string,unknown>)=>{const response=await POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json','x-slightnudge-token':getSessionToken()},body:JSON.stringify({...selected,kind:'component',draft:true,...data})}));return {status:response.status,...await response.json()}};
  const info=await request({operation:'inspect'});assert.equal(info.component.ownership,'instance-call',JSON.stringify(info));assert.deepEqual(info.component.fields.map((field:any)=>field.name),['label','disabled','variant']);
  const write={...info.component.owner,definition:{filePath:defFile,...pos,instance:selected.instance}};
  let edit=await request({...write,property:'label',value:'Only second'});assert.equal(edit.success,true,JSON.stringify(edit));assert.equal(edit.renderPatches.length,1);assert.equal(edit.renderPatches[0].before.instance,selected.instance);
  edit=await request({...write,property:'disabled',value:'true',parentPreviewId:edit.id});assert.equal(edit.success,true,JSON.stringify(edit));assert.equal(edit.renderPatches[0].attributes.disabled,'');
  edit=await request({...write,property:'variant',value:'quiet',parentPreviewId:edit.id});assert.equal(edit.success,true,JSON.stringify(edit));assert.equal(edit.renderPatches[0].className,'bg-white');
  const first=await request({operation:'inspect',instance:marker(indices[0]),drafts:{'page.tsx':edit.id}});assert.equal(first.component.fields[0].value,'Same');
  const second=await request({operation:'inspect',drafts:{'page.tsx':edit.id}});assert.equal(second.component.fields[0].value,'Only second');
  const replay=await readRenderableDraft(edit.id,path.join(root,'page.tsx'),{root});assert.equal(replay.renderPatches.length,1);assert.equal(replay.renderPatches[0].text,'Only second');
  assert.equal(fs.readFileSync('page.tsx','utf8'),content);
  assert.equal((await applyPendingSourceEdit(edit.id)).success,true);assert.match(fs.readFileSync('page.tsx','utf8'),/<Action label="Same"\/>/);assert.equal(undoReviewedSourceEdit(edit.id).success,true);assert.equal(fs.readFileSync('page.tsx','utf8'),content);
  const toggle=await request({...write,property:'disabled',value:'true'});assert.equal(toggle.success,true,JSON.stringify(toggle));const untoggle=await request({...write,property:'disabled',value:'false',parentPreviewId:toggle.id});assert.equal(untoggle.draftClean,true,JSON.stringify(untoggle));
  const clean=await request({...write,property:'label',value:'Temporary'});assert.equal(clean.success,true,JSON.stringify(clean));const reverted=await request({...write,property:'label',value:'Same',parentPreviewId:clean.id});assert.equal(reverted.draftClean,true,JSON.stringify(reverted));
  const conflict=await request({...write,property:'label',value:'Conflict'});assert.equal(conflict.success,true,JSON.stringify(conflict));const definitionPath=sameFile?'page.tsx':'Action.tsx';const definitionOriginal=fs.readFileSync(definitionPath,'utf8');fs.writeFileSync(definitionPath,definitionOriginal.replace('{label}</button>','{label}! </button>'));assert.equal((await applyPendingSourceEdit(conflict.id)).success,false);fs.writeFileSync(definitionPath,definitionOriginal);
  const invalid=await request({...write,property:'variant',value:'invented'});assert.ok(invalid.status>=400,JSON.stringify(invalid));
  const stale=await request({operation:'inspect',instance:JSON.stringify(['page.tsx',indices[1],'0'.repeat(64)])});assert.equal(stale.component.ownership,'unsupported');
  const loopContent=content.replace('<Action label="Same"/><Action label="Same"/>','{[1,2].map(i=><Action label="Same"/>)}');fs.writeFileSync('page.tsx',loopContent);
  const loopIndex=instanceOpenings(parsed(loopContent)).findIndex(node=>node.getTagNameNode().getText()==='Action');const loop=await request({operation:'inspect',instance:JSON.stringify(['page.tsx',loopIndex,componentSourceHash(loopContent)])});assert.equal(loop.component.ownership,'unsupported');
 }
 fs.writeFileSync('Action.tsx',definition);fs.writeFileSync('page.tsx',caller);
 for(const [name,source]of [['Action.tsx',definition],['page.tsx',caller]]){
  const context={resourcePath:path.join(root,name),getOptions:()=>({development:true,root})};const output=loader.call(context,source);assert.ok(output.includes('data-slightnudge-callsite'));parsed(output);assert.equal(loader.call({...context,getOptions:()=>({development:false,root})},source),source);
 }
 console.log('PASS shared instances: exact repeated caller identity, same/cross-file typed props, draft recovery, Save, exact Undo, invalid enums, stale callers, repeated-data refusal, development-only loader');
}finally{process.chdir(previous);assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.match(path.basename(root),/^sn-instance-proof-/);fs.rmSync(root,{recursive:true,force:true})}
