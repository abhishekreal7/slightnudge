import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readApiJson} from '../lib/slightnudge/api-response';
const rows:any[]=[];
const response=(body:string)=>{const r=new Response(body,{status:503});Object.defineProperty(r,'url',{value:'http://127.0.0.1:3000/api/example'});return r;};
for(const body of ['','{"bad":','<html>bad</html>','x'.repeat(200)+'MUST-NOT-APPEAR']){
 try{await readApiJson(response(body));throw Error('Accepted invalid body');}catch(error){const text=(error as Error).message;assert.match(text,/api\/example.*HTTP 503/);assert.ok(!text.includes('MUST-NOT-APPEAR'));rows.push({bodyLength:body.length,message:text,pass:true});}
}
assert.deepEqual(await readApiJson(response('{"valid":true}')),{valid:true});rows.push({name:'valid JSON preserved',pass:true});
const revived=Function(`return (${readApiJson.toString()});`)() as typeof readApiJson;assert.deepEqual(await revived(response('{"valid":true}')),{valid:true});rows.push({name:'legacy bridge helper is self-contained',pass:true});
fs.writeFileSync('docs/security-hardening/response-helper-results.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
