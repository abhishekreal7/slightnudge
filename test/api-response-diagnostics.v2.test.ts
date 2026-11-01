import fs from 'node:fs';
import {inspectElementAPI,previewEditAPI,applyEditAPI,undoEditAPI,changeSetAPI} from '../lib/slightnudge/client';
import {randomUUID} from 'node:crypto';
const rows:any[]=[],original=globalThis.fetch,label=process.env.DIAGNOSTIC_LABEL||'before';
const response=(body:string,url:string,status=502)=>{const value=new Response(body,{status,headers:{'content-type':'application/json'}});Object.defineProperty(value,'url',{value:url});return value;};
try{for(const body of ['','{"broken":','<html>upstream failure</html>'])for(const operation of ['inspect','preview','apply','undo','change-set']){
 const url=`http://127.0.0.1:3000/api/slightnudge/${operation}`,id=randomUUID();let writes=0;
 globalThis.fetch=(async(input:any,init:any)=>{const address=new URL(String(input),'http://127.0.0.1:3000').href;if(address.endsWith('/token'))return response('{"token":"synthetic-unit-token"}',address,200);if(address.endsWith('/apply')||address.endsWith('/undo')||address.endsWith('/change-set')&&JSON.parse(init?.body||'{}').operation==='save')writes++;return response(body,address);}) as typeof fetch;
 const result=operation==='inspect'?await inspectElementAPI({filePath:'safe.tsx'}):operation==='preview'?await previewEditAPI({kind:'text',filePath:'safe.tsx',value:'example'}):operation==='apply'?await applyEditAPI(id):operation==='undo'?await undoEditAPI('safe.tsx',{previewId:id}):await changeSetAPI('save',id,[]);
 const error=String((result as any).reason||(result as any).error||'');const row={operation,body,pass:error.includes(url)&&error.includes('502')&&(body?error.includes(body):/empty/i.test(error))&&writes<=1,writes,error};rows.push(row);console.log(JSON.stringify(row));
}}finally{globalThis.fetch=original;}
fs.writeFileSync(`docs/security-hardening/response-diagnostics-${label}.json`,JSON.stringify(rows,null,2));if(rows.some(row=>!row.pass))process.exitCode=1;
