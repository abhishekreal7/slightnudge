const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {parser:makeParser}=require('next/dist/compiled/babel/bundle');
const parser=makeParser();
const files=JSON.parse(fs.readFileSync('docs/gate-repair/assertion-proof.json','utf8'));
const proof=[],inventory=[];let diff='';
function extract(text,file){const ast=parser.parse(text,{sourceType:'module',plugins:['typescript','jsx']});const assertions=[],limits=[],expected=[];
 function walk(node){if(!node||typeof node!=='object')return;
 if(!file.endsWith('.v3.ts')&&node.type==='CallExpression'&&node.callee?.type==='MemberExpression'&&node.callee.object?.name==='page'){
  const method=node.callee.property?.name||node.callee.property?.value||'';
  if(/^(goto|locator|getBy|evaluate|waitForFunction|waitForSelector|click|dblclick|fill|press|hover|\$)/.test(method))inventory.push({file,line:node.loc.start.line,code:text.slice(node.start,node.end),assumption:method==='goto'?'Navigation; inspect legacy route and view assumptions':'Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope'});
 }
 if(node.type==='CallExpression'&&node.callee?.type==='MemberExpression'&&node.callee.object?.name==='assert')assertions.push(text.slice(node.start,node.end));
 if(node.type==='ObjectProperty'&&['timeout'].includes(node.key?.name))limits.push(text.slice(node.start,node.end));
 if(node.type==='VariableDeclarator'&&/expected|selections|scenarios|cases/i.test(node.id?.name||'')&&node.init?.type==='ArrayExpression')expected.push(text.slice(node.init.start,node.init.end));
 for(const [key,value]of Object.entries(node))if(!['loc','start','end','extra','comments','tokens'].includes(key)){if(Array.isArray(value))value.forEach(walk);else walk(value);}
 }walk(ast);return {assertions,limits,expected};}
for(const {original,copy}of files){const a=fs.readFileSync(original,'utf8'),b=fs.readFileSync(copy,'utf8'),before=extract(a,original),after=extract(b,copy);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Expected value/limit/assertion drift: '+copy);proof.push({original,copy,assertions:before.assertions.length,timeoutProperties:before.limits.length,expectedLists:before.expected.length,identical:true});try{diff+=execFileSync('git',['diff','--no-index','--',original,copy],{encoding:'utf8'});}catch(e){if(e.status!==1)throw e;diff+=e.stdout;}}
fs.writeFileSync('docs/gate-repair/inventory.json',JSON.stringify(inventory,null,2));fs.writeFileSync('docs/gate-repair/v3.diff',diff);fs.writeFileSync('docs/gate-repair/ast-proof.json',JSON.stringify(proof,null,2));console.log('PASS: parsed all '+files.length+' copies; assertion expressions, timeout properties, and expected arrays identical');

