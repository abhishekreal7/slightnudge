import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import { gradientUtility,shadowUtility,parseGradient,parseShadow } from '../lib/slightnudge/appearance-values';
import { updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';
import { POST } from '../app/api/slightnudge/preview/route';
import {getSessionToken} from '../lib/slightnudge/auth';
import {applyPendingSourceEdit,undoReviewedSourceEdit} from '../lib/slightnudge/edit-history';
import {readRenderableDraft} from '../lib/slightnudge/source-draft';
import {verifyTailwindClass} from '../lib/slightnudge/tailwind-verifier';
const previous=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'sn-appearance-'));
const gradient=gradientUtility({angle:135,stops:[{color:'#176b55',position:0},{color:'#5ba5c8',position:100}]}),shadow=shadowUtility({x:0,y:8,blur:24,spread:0,color:'#00000026'});
process.env.SLIGHTNUDGE_TEST='1';process.env.SLIGHTNUDGE_WORKSPACE_ROOT=root;process.env.SLIGHTNUDGE_DATA_DIR=path.join(root,'.slightnudge');process.env.PORT='3000';
try{
 fs.symlinkSync(path.join(previous,'node_modules'),path.join(root,'node_modules'),'junction');fs.writeFileSync(path.join(root,'package.json'),'{"dependencies":{"tailwindcss":"4.3.3"}}');fs.writeFileSync(path.join(root,'styles.css'),'@import "tailwindcss"; @theme {--breakpoint-tablet:58rem;}');
 const original='export default function Page(){return <main><section id="card" className="bg-white bg-gradient-to-r from-[#112233] via-green-400 to-blue-500 shadow-lg shadow-black/10 md:shadow-sm ring-1 ring-black/10 min-w-0 tablet:min-w-full p-8">Card</section></main>}';fs.writeFileSync(path.join(root,'page.tsx'),original);process.chdir(root);
 const target={filePath:path.join(root,'page.tsx'),elementId:'card',dryRun:true};
 const result=updateStaticTailwindClass({...target,property:'backgroundImage',value:gradient});assert.equal(result.success,true,JSON.stringify(result));assert.ok(result.newClassName!.includes(gradient));assert.ok(result.newClassName!.includes('bg-white'));assert.ok(!result.newClassName!.includes('from-'));assert.ok(result.newClassName!.includes('md:shadow-sm'));
 assert.equal(updateStaticTailwindClass({...target,sourceText:original.replace('bg-gradient-to-r','bg-[url(/hero.jpg)]'),property:'backgroundImage',value:gradient}).success,false);
 assert.equal(updateStaticTailwindClass({...target,sourceText:original.replace('shadow-lg','shadow-[0_0_4px_red,0_0_8px_blue]'),property:'boxShadow',value:shadow}).success,false);
 assert.throws(()=>gradientUtility({angle:1,stops:[{color:'url(evil)',position:0},{color:'#ffffff',position:100}]}));assert.equal(parseGradient('bg-[linear-gradient(0deg,#000000_80%,#ffffff_20%)]'),undefined);assert.equal(parseShadow('shadow-[0px_0px_999px_0px_#000000]'),undefined);
 const request=async(body:Record<string,unknown>)=>{const response=await POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json','x-slightnudge-token':getSessionToken()},body:JSON.stringify({kind:'style',draft:true,filePath:'page.tsx',elementId:'card',tagName:'section',...body})}));return await response.json()};
 let draft:any;for(const [property,value,breakpoint]of [['backgroundImage',gradient,''],['boxShadow',shadow,''],['minWidth','min-w-fit','tablet'],['flexGrow','grow','tablet'],['flexShrink','shrink-0','tablet'],['alignSelf','self-center','tablet']] as const){draft=await request({property,value,breakpoint,parentPreviewId:draft?.id});assert.equal(draft.success,true,JSON.stringify(draft));assert.equal(fs.readFileSync('page.tsx','utf8'),original);}
 const replay=await readRenderableDraft(draft.id,path.join(root,'page.tsx'),{root});assert.ok(replay.renderPatches,'Draft replay must contain render patches');assert.equal(replay.renderPatches.length,1);assert.ok(replay.renderPatches[0].className?.includes('tablet:min-w-fit'));assert.ok(replay.renderPatches[0].className?.includes('ring-1'));assert.ok(!replay.renderPatches[0].className?.includes('shadow-black/10'));assert.ok(replay.renderPatches[0].className?.includes('md:shadow-sm'));
 assert.equal((await applyPendingSourceEdit(draft.id)).success,true);assert.ok(fs.readFileSync('page.tsx','utf8').includes(gradient));assert.equal(undoReviewedSourceEdit(draft.id).success,true);assert.equal(fs.readFileSync('page.tsx','utf8'),original);
 for(const utility of [gradient,shadow,'tablet:min-w-fit','tablet:grow','tablet:shrink-0'])assert.equal((await verifyTailwindClass(utility,root)).verified,true,utility);
 console.log('PASS appearance/constraints: atomic gradient and shadow replacement, independent solid fill/ring/breakpoint preservation, typed validation, custom-effect refusal, custom responsive constraints, compiler CSS, draft replay, Save and exact Undo');
}finally{process.chdir(previous);assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.match(path.basename(root),/^sn-appearance-/);fs.rmSync(root,{recursive:true,force:true})}
