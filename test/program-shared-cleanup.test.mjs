import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {ts}=createRequire(import.meta.url)('ts-morph');
const source=fs.readFileSync('tools/gate.mjs','utf8');
const ast=ts.createSourceFile('gate.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let branch;
function visit(node){if(ts.isIfStatement(node)&&node.expression.getText(ast).replace(/\s/g,'')==='prepared.code!==0')branch=node;ts.forEachChild(node,visit);}
visit(ast);assert.ok(branch,'Shared warm-up result branch must exist');
function execute(code){let stopped=0;const message=new Function('prepared','stopServers',`let sharedSetupError; ${branch.getText(ast)}; return sharedSetupError;`)({code,timedOut:code!==0},()=>stopped++);return {stopped,message};}
assert.equal(execute(0).stopped,0,'Successful warm-up retains owned runtimes for its workflows');
assert.equal(execute(1).stopped,1,'Failed warm-up must stop its owned editor and preview servers before other workflows');
assert.match(execute(1).message,/warm-up/i);
console.log('PASS mocked server cleanup: failed warm-up releases owned runtimes; success retains them; no timeouts changed');
