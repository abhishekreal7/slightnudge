import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {checkImportedCanvas} from './helpers/imported-canvas-browser.v4';
const root=process.cwd(),workspace=path.join(root,'scratch/shared-gate-runtime'),base=process.env.GATE_SHARED_EDITOR_URL;
if(!base||!workspace.startsWith(path.join(root,'scratch')+path.sep))throw Error('Owned gate runtime required');
const history=path.join(workspace,'.slightnudge/history');
if(fs.existsSync(history))fs.renameSync(history,path.join(workspace,`history-archive-${Date.now()}`));
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors:string[]=[];
page.on('pageerror',error=>errors.push(error.stack||error.message));
try{
 const passed=await checkImportedCanvas(page,base,workspace);
 if(errors.length)throw Error(errors.join('\n'));
 console.log(`PASS: ${passed} review-consent browser cases (REAL API; original history assertions)`);
}finally{await browser.close();fs.cpSync(path.join(workspace,'docs'),path.join(root,'docs/history-gate-artifacts'),{recursive:true});}
