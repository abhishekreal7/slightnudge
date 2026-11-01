import fs from 'node:fs';
import path from 'node:path';
const current=process.argv[2],baseline=process.argv[3];
const load=dir=>JSON.parse(fs.readFileSync(path.join(dir,'results.json'),'utf8'));
const now=load(current),old=baseline?load(baseline):null;
function failure(dir,name){const file=path.join(dir,name+'.log');if(!fs.existsSync(file))return 'Setup did not reach workflow';const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);let found=lines.findIndex(line=>/^AssertionError|^locator\.|^page\.|^Error:|^TIMEOUT /.test(line));if(found<0)return 'See raw log';return lines.slice(found,found+7).join(' ').replaceAll('|','/').slice(0,500);}
let md='# Gate repair results\n\n';
md+='| Workflow | Harness | API | Current | Seconds | 7f1b9cd | First failure |\n|---|---|---|---|---:|---|---|\n';
for(const row of now.rows){const previous=old?.rows.find(value=>value.workflow===row.workflow);md+=`| ${row.workflow} | ${row.harness||'existing'} | ${row.api} | ${row.result} | ${row.seconds} | ${previous?.result||'not run'} | ${row.result==='PASS'?'—':row.error||failure(current,row.workflow)} |\n`;}
md+='\nThe baseline status alone does not establish the same failure; compare first-error evidence below.\n';
if(old)for(const row of now.rows.filter(row=>row.result!=='PASS'))md+=`\n## ${row.workflow}\n\nCurrent: ${row.error||failure(current,row.workflow)}\n\n7f1b9cd: ${old.rows.find(r=>r.workflow===row.workflow)?.error||failure(baseline,row.workflow)}\n`;
fs.writeFileSync('docs/gate-repair/results.md',md);
const inventory=JSON.parse(fs.readFileSync('docs/gate-repair/inventory.json','utf8'));
fs.writeFileSync('docs/gate-repair/inventory.md','# Helper inventory\n\nThis is the complete import closure of both workflow drivers, including branches not selected by this gate. Entries identify host-page assumptions requiring review; not every listed selector belongs in the iframe.\n\n'+inventory.map(row=>`- ${row.file}:${row.line} — ${row.assumption}\n  \`${row.code.replaceAll('`','\\`')}\``).join('\n'));
