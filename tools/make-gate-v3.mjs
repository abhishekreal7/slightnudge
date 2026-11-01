import fs from 'node:fs';
import path from 'node:path';

const roots=['test/review-consent.browser.ts','test/shared-instance-security.v2.browser.ts'];
const files=new Set();
function visit(file){if(files.has(file))return;files.add(file);const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)){const dep=path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]+'.ts'));if(dep.startsWith('test/helpers/')&&fs.existsSync(dep))visit(dep);}}
roots.forEach(visit);
const inventory=[],proof=[];
for(const file of files){const original=fs.readFileSync(file,'utf8');let source=original.replace(/from\s+(['"])(\.[^'"]+)\1/g,(all,quote,module)=>{const dep=path.posix.normalize(path.posix.join(path.posix.dirname(file),module+'.ts'));return files.has(dep)?`from ${quote}${module}.v3${quote}`:all;});
 const lines=original.split(/\r?\n/);lines.forEach((line,index)=>{if(/page\.(goto|locator|getByRole|getByText|getByLabel|evaluate|waitForFunction)/.test(line))inventory.push({file,line:index+1,code:line.trim(),assumption:/goto/.test(line)?'legacy navigation or direct fixture URL':'top document contains queried UI/content; evaluate requires manual review'});});
 // Wrap only explicitly named Page arguments. All assertions and wait values remain verbatim.
 if(file.startsWith('test/helpers/')){let wrapped=false;source=source.replace(/(export\s+async\s+function\s+\w+\s*\(page\s*:[\s\S]*?\)\s*\{)/g,match=>{wrapped=true;return match+'\n page=iframePageV3(page);\n';});if(wrapped)source="import { iframePageV3 } from './gate-page-v3';\n"+source;}
 const dest=file.replace(/\.ts$/,'.v3.ts');fs.writeFileSync(dest,source);
 const collect=text=>text.split(/\r?\n/).filter(line=>/assert\./.test(line));
 const before=collect(original),after=collect(source);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Assertion drift '+file);proof.push({original:file,copy:dest,assertions:before.length,identical:true});
}
fs.mkdirSync('docs/gate-repair',{recursive:true});fs.writeFileSync('docs/gate-repair/inventory.json',JSON.stringify(inventory,null,2));fs.writeFileSync('docs/gate-repair/assertion-proof.json',JSON.stringify(proof,null,2));

