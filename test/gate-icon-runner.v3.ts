import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {checkIconProperties} from './helpers/icon-properties-browser.v3';

// Reuse the gate's owned, warmed preview processes. All four original icon
// workflows and their assertions still run, sequentially, under the 300s cap.
const root=process.cwd(),workspace=path.join(root,'scratch/shared-gate-runtime');
const base=process.env.GATE_SHARED_EDITOR_URL,preview=process.env.GATE_SHARED_PREVIEW_URL;
if(!base||!preview||!workspace.startsWith(path.join(root,'scratch')+path.sep))throw Error('Owned gate runtime required');
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors:string[]=[];
page.on('pageerror',error=>errors.push(error.stack||error.message));
try{
 let passed=await checkIconProperties(page,base,workspace,workspace,undefined,true);
 passed+=await checkIconProperties(page,base,workspace,workspace,{id:'source-proof',root:path.join(workspace,'.slightnudge/repositories/source-proof'),url:preview},true);
 if(errors.length)throw Error(errors.join('\n'));
 console.log(`PASS: ${passed} review-consent browser cases (REAL API; original icon assertions)`);
}finally{
 await browser.close();
 fs.cpSync(path.join(workspace,'docs'),path.join(root,'docs/icon-gate-artifacts'),{recursive:true});
}
