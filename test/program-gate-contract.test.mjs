import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { ts } = createRequire(import.meta.url)('ts-morph');

// Exercise expressions from the actual coordinator without starting a server
// or changing an existing workflow, selector, assertion or deadline.
const source = fs.readFileSync('tools/gate.mjs', 'utf8');
const ast = ts.createSourceFile('gate.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function find(predicate) {
  let result;
  function visit(node) { if (!result && predicate(node)) result=node; if (!result) ts.forEachChild(node, visit); }
  visit(ast); assert.ok(result, 'Coordinator construct must exist'); return result;
}
const declaration = name => find(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name);
const cap=declaration('cap').initializer.getText(ast);
const budgetFor=new Function('budget','name',`return (${cap});`);
assert.equal(budgetFor(undefined,'movement'),300000);
assert.equal(budgetFor(undefined,'shared-local-studio'),120000);
assert.equal(budgetFor(180000,'shared-compiler-warmup'),180000);
const stop=find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='stop').getText(ast);
const calls=[];
new Function('process','execFileSync',`${stop}; stop({pid:1234});`)({platform:'win32'},(...args)=>calls.push(args));
assert.equal(calls.length,1);
assert.deepEqual(calls[0].slice(0,2),['taskkill',['/pid','1234','/T','/F']]);
console.log('PASS existing 5-minute, 2-minute and warm-up caps; targeted whole-tree Windows timeout cleanup');

const expression=declaration('evidence').initializer.getText(ast);
const output=new Function('path','project','option','runId',`return (${expression});`);
const project=path.resolve(process.cwd());
assert.equal(output(path,project,()=>undefined,'sample'),path.join(project,'docs','reliability-gate','sample'));
assert.equal(output(path,project,key=>key==='--evidence-root'?'docs/program/evidence/S1':undefined,'sample'),path.join(project,'docs','program','evidence','S1','sample'),'Program evidence must be placed under its stage directory');
assert.throws(()=>output(path,project,()=>path.resolve(project,'..','outside'),'sample'),/inside|outside|project/i,'An evidence override must not escape this project');
console.log('PASS default output, stage-specific evidence and outside-project refusal');
