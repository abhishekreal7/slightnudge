/* eslint-disable */
const path = require('node:path');
const { parse } = require('next/dist/compiled/babel/parser');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const instanceProp = 'data-slightnudge-callsite';

// Consume the private prop before rest props can reach user components or DOM.
// Only direct function components with safe parameter shapes are instrumented.
function componentFunctions(ast, source) {
  const locals = new Map(), exported = new Map();
  const eligible = (fn) => {
    if (!fn || !['FunctionDeclaration', 'ArrowFunctionExpression'].includes(fn.type) || fn.generator || fn.params.length > 1 || source.includes(instanceProp)) return false;
    let unsafe = false, jsx = false;
    const scan = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(scan); if (node.type === 'Identifier' && ['arguments', 'eval'].includes(node.name)) unsafe = true; if (node.type === 'JSXElement' || node.type === 'JSXFragment') jsx = true; for (const [key,value] of Object.entries(node)) if (!['loc','extra','comments','tokens'].includes(key)) scan(value); };
    scan(fn.body);
    const parameter = fn.params[0]?.type === 'AssignmentPattern' ? fn.params[0].left : fn.params[0];
    return jsx && !unsafe && (!parameter || parameter.type === 'ObjectPattern');
  };
  const declaration = node => {
    if (node?.type === 'FunctionDeclaration' && node.id && /^[A-Z]/.test(node.id.name) && eligible(node)) locals.set(node.id.name,node);
    if (node?.type === 'VariableDeclaration' && node.kind === 'const') for (const item of node.declarations) if (item.id.type === 'Identifier' && /^[A-Z]/.test(item.id.name) && eligible(item.init)) locals.set(item.id.name,item.init);
  };
  for (const node of ast.program.body) declaration(node.declaration || node);
  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration?.type === 'FunctionDeclaration' && locals.has(node.declaration.id?.name)) exported.set(node.declaration.id.name,locals.get(node.declaration.id.name));
      if (node.declaration?.type === 'VariableDeclaration') for (const item of node.declaration.declarations) if (locals.has(item.id.name)) exported.set(item.id.name,locals.get(item.id.name));
      for (const item of node.specifiers || []) if (!node.source && locals.has(item.local?.name)) exported.set(item.exported.name || item.exported.value,locals.get(item.local.name));
    }
    if (node.type === 'ExportDefaultDeclaration' && locals.has(node.declaration.id?.name || node.declaration.name)) exported.set('default',locals.get(node.declaration.id?.name || node.declaration.name));
  }
  return {locals,exported};
}

function instanceImports(ast, root, resource, parse, dependency) {
  const result = new Set(); let aliases = [], base = root;
  try {
    const config = ['tsconfig.json','jsconfig.json'].map(name=>path.join(root,name)).find(name=>fs.existsSync(name));
    if (config) {
      dependency(config);
      const object = parse('('+fs.readFileSync(config,'utf8')+')',{sourceType:'module'}).program.body[0].expression;
      const get = (node,key) => node?.properties?.find(item=>(item.key?.name || item.key?.value)===key)?.value;
      const options = get(object,'compilerOptions'); const baseValue = get(options,'baseUrl');
      if (baseValue?.type === 'StringLiteral') base = path.resolve(root,baseValue.value);
      const paths = get(options,'paths');
      aliases = (paths?.properties || []).flatMap(item=>item.value?.type === 'ArrayExpression' && item.value.elements.length===1 && item.value.elements[0]?.type==='StringLiteral' ? [[item.key.name || item.key.value,item.value.elements[0].value]] : []);
    }
  } catch { /* Unknown alias formats get no instance markers. */ }
  for (const imported of ast.program.body.filter(node=>node.type==='ImportDeclaration')) {
    const specifier = imported.source.value; let candidates=[];
    if (specifier.startsWith('.')) candidates=[path.resolve(path.dirname(resource),specifier)];
    else for (const [pattern,target] of aliases) { const [prefix,suffix='']=pattern.split('*'); if(pattern.includes('*') ? specifier.startsWith(prefix)&&specifier.endsWith(suffix) : specifier===pattern) candidates.push(path.resolve(base,target.replace('*',pattern.includes('*')?specifier.slice(prefix.length,suffix?-suffix.length:undefined):''))); }
    const matches=new Set();
    for (const candidate of candidates) for (const extension of ['', '.tsx','.ts','.jsx','.js','/index.tsx','/index.ts','/index.jsx','/index.js']) { const file=candidate+extension; const relative=path.relative(root,file); if(!relative.startsWith('..')&&!path.isAbsolute(relative)&&/\.[jt]sx?$/.test(file)&&fs.existsSync(file)&&fs.statSync(file).isFile()) matches.add(file); }
    if(matches.size!==1)continue;
    const file=[...matches][0]; const real=fs.realpathSync(file),relative=path.relative(root,real); if(relative.startsWith('..')||path.isAbsolute(relative))continue;
    try {
      dependency(file);const source=fs.readFileSync(file,'utf8');if(source.length>1024*1024)continue;
      const exports=componentFunctions(parse(source,{sourceType:'unambiguous',plugins:['jsx','typescript']}),source).exported;
      for(const binding of imported.specifiers)if(binding.type==='ImportDefaultSpecifier'?exports.has('default'):binding.type==='ImportSpecifier'&&exports.has(binding.imported.name || binding.imported.value))result.add(binding.local.name);
    } catch { /* Unsupported providers remain unmarked/read-only. */ }
  }
  return result;
}

/** Development-only JSX source markers. This loader only changes compiled output. */
module.exports = function slightNudgeNextSourceLoader(input) {
  const options = this.getOptions();
  if (!options.development || /[\\/]node_modules[\\/]/.test(this.resourcePath)) return input;

  const source = input.toString();
  const root = options.root || process.cwd();
  const relativeFile = path.relative(root, this.resourcePath).split(path.sep).join('/');
  if (!relativeFile || relativeFile.startsWith('../') || path.isAbsolute(relativeFile)) return input;

  let ast;
  try {
    ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'classPrivateProperties', 'classPrivateMethods'],
    });
  } catch {
    // Unsupported syntax is left untouched; a missing mapping is safer than a broken preview.
    return input;
  }

  const nextImages = new Set(ast.program.body.filter(node => node.type === 'ImportDeclaration' && node.source.value === 'next/image').flatMap(node => node.specifiers.filter(specifier => specifier.type === 'ImportDefaultSpecifier').map(specifier => specifier.local.name)));
  const nextLinks = new Set(ast.program.body.filter(node => node.type === 'ImportDeclaration' && node.source.value === 'next/link').flatMap(node => node.specifiers.filter(specifier => specifier.type === 'ImportDefaultSpecifier').map(specifier => specifier.local.name)));
  const lucideIcons = new Set(ast.program.body.filter(node => node.type === 'ImportDeclaration' && node.source.value === 'lucide-react').flatMap(node => node.specifiers.filter(specifier => specifier.type === 'ImportSpecifier' && /^[A-Z]/.test(specifier.imported.name)).map(specifier => specifier.local.name)));
  const edits = [];
  const componentInfo = componentFunctions(ast,source), instanceFunctions = new Map();
  let instanceIndex=0;
  for (const fn of componentInfo.locals.values()) {
    let alias; do { alias='__slightnudgeCaller'+instanceIndex++; } while(source.includes(alias));
    const parameter=fn.params[0]?.type==='AssignmentPattern'?fn.params[0].left:fn.params[0];
    if(parameter)edits.push({start:parameter.start+1,value:`${JSON.stringify(instanceProp)}:${alias}${parameter.properties.length?',':''}`});
    else { const start=source.indexOf('(',fn.typeParameters?.end || fn.id?.end || fn.start); if(start<0||start>=fn.body.start)continue; edits.push({start:start+1,value:`{${JSON.stringify(instanceProp)}:${alias}}={}`}); }
    instanceFunctions.set(fn,alias);
  }
  const importedInstances = instanceImports(ast,root,this.resourcePath,parse,file=>this.addDependency?.(file));
  const sourceHash=createHash('sha256').update(source).digest('hex'); let jsxIndex=0;
  let hydrationSignal = false;
  const skippedKeys = new Set(['loc', 'start', 'end', 'tokens', 'comments', 'leadingComments', 'trailingComments', 'extra', 'errors', 'interpreter']);
  function bindingNames(node) {
    if (!node) return [];
    if (node.type === 'Identifier') return [node.name];
    if (node.type === 'AssignmentPattern') return bindingNames(node.left);
    if (node.type === 'RestElement') return bindingNames(node.argument);
    if (node.type === 'ObjectPattern') return node.properties.flatMap(item => bindingNames(item.value || item.argument));
    if (node.type === 'ArrayPattern') return node.elements.flatMap(bindingNames);
    return [];
  }
  function visit(node, ancestors = []) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child, ancestors);
      return;
    }
    if (node.type === 'JSXOpeningElement') {
      const ordinal=jsxIndex++;
      const tag = node.name?.type === 'JSXIdentifier' ? node.name.name : '';
      const shadowed = name => ancestors.some(scope => (scope.params || []).flatMap(bindingNames).includes(name) || (scope.type === 'BlockStatement' ? scope.body : []).some(statement => statement.type === 'VariableDeclaration' ? statement.declarations.some(item => bindingNames(item.id).includes(name)) : ['FunctionDeclaration', 'ClassDeclaration'].includes(statement.type) && statement.id?.name === name));
      const knownNextImage = nextImages.has(tag) && !shadowed(tag);
      const knownNextLink = nextLinks.has(tag) && !shadowed(tag);
      const knownIcon = lucideIcons.has(tag) && !shadowed(tag);
      const instance=ancestors.slice().reverse().map(parent=>instanceFunctions.get(parent)).find(Boolean);
      if((componentInfo.locals.has(tag)||importedInstances.has(tag))&&!shadowed(tag)&&!node.attributes.some(item=>item.type==='JSXAttribute'&&item.name?.name===instanceProp)){
        const record=JSON.stringify([relativeFile,ordinal,sourceHash]);
        edits.push({start:node.name.end,value:` ${instanceProp}={${instance?`${instance}?${JSON.stringify(record+'\n')}+${instance}:`:''}${JSON.stringify(record)}}`});
      }
      let imageSource = '';
      if (knownNextImage) {
        const attribute = node.attributes.find(item => item.type === 'JSXAttribute' && item.name?.name === 'src');
        const expression = attribute?.value?.type === 'JSXExpressionContainer' ? attribute.value.expression : null;
        if (attribute?.value?.type === 'StringLiteral') imageSource = ' data-source-image-src=' + source.slice(attribute.value.start, attribute.value.end);
        else if (expression?.type === 'StringLiteral') imageSource = ' data-source-image-src={' + source.slice(expression.start, expression.end) + '}';
        else if (expression?.type === 'Identifier' && !shadowed(expression.name) && ast.program.body.some(item => item.type === 'ImportDeclaration' && /\.(png|jpe?g|webp|gif|avif)$/i.test(item.source.value) && item.specifiers.some(specifier => specifier.type === 'ImportDefaultSpecifier' && specifier.local.name === expression.name))) imageSource = ' data-source-image-src={' + expression.name + '.src}';
      }
      const hasSource = node.attributes?.some((attribute) => attribute.type === 'JSXAttribute' && attribute.name?.name === 'data-source-file');
      if ((/^[a-z][a-z0-9-]*$/.test(tag) || knownNextImage || knownNextLink || knownIcon) && !hasSource && node.loc?.start) {
        const escapedPath = relativeFile.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        edits.push({
          start: node.name.end,
          value: ` data-source-file="${escapedPath}" data-source-line="${node.loc.start.line}" data-source-column="${node.loc.start.column + 1}"${instance?` ${instanceProp}={${instance}}`:''}${knownNextImage ? ' data-source-image="next"' + imageSource : ''}`,
        });
      }
    }
    if (options.hydrationSignal && node.type === 'JSXClosingElement' && node.name?.type === 'JSXIdentifier' && node.name.name === 'body') {
      hydrationSignal = true;
      edits.push({ start: node.start, value: '<__SlightNudgeHydrationSignal />' });
    }
    for (const [key, value] of Object.entries(node)) {
      if (!skippedKeys.has(key)) visit(value, [...ancestors, node]);
    }
  }
  visit(ast);
  if (hydrationSignal) {
    const directiveEnd = ast.program.directives?.at(-1)?.end || 0;
    const signalPath = path.relative(path.dirname(this.resourcePath), path.join(root, '.slightnudge-source-adapter/hydration-client.jsx')).split(path.sep).join('/');
    edits.push({ start: directiveEnd, value: `\nimport __SlightNudgeHydrationSignal from ${JSON.stringify(signalPath.startsWith('.') ? signalPath : './' + signalPath)};\n` });
  }

  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.value + output.slice(edit.start);
  }
  return output;
};
