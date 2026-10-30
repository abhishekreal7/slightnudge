import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { builtinModules } from 'node:module';
import { Node, Project, SyntaxKind, ts, type SourceFile, type JsxOpeningElement, type JsxSelfClosingElement } from 'ts-morph';
import { componentTextProvider } from './component-props';
import { isComponentUsedMultipleTimes, isElementInsideLoop } from './ast-nudger';
import { renderJsxAttribute } from './jsx-text';
import type { CanvasRenderPatch } from './source-canvas-contract';
import { instancePatches, validateInstanceDependency } from './instance-ownership';

type Element = JsxOpeningElement | JsxSelfClosingElement;
export interface ComponentOwner { filePath: string; line: number; column: number; tagName: string }
export interface ComponentDependency { root: string; definition: string; line: number; column: number; hash: string; caller: string; property: string; instance?: string; nativeIndex?: number; callerIndex?: number; callerBeforeHash?: string; callerAfterHash?: string }
export const componentSourceHash = (source: string) => createHash('sha256').update(source).digest('hex');
const openings = (file: SourceFile) => [...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].sort((a,b)=>a.getStart()-b.getStart());
const key = (file: string) => path.resolve(file).replaceAll('\\','/').toLowerCase();
let graphCache:{signature:string;project:Project;files:Map<string,SourceFile>}|undefined;
const symbolCache=new Map<string,{hash:string;file:SourceFile}>();
function symbols(file:SourceFile){
  const name=key(file.getFilePath()),hash=componentSourceHash(file.getFullText()),cached=symbolCache.get(name);
  if(cached?.hash===hash)return cached.file;
  const local=new Project({useInMemoryFileSystem:true,compilerOptions:{noLib:true,noResolve:true,types:[]}}).createSourceFile(file.getFilePath(),file.getFullText());
  symbolCache.set(name,{hash,file:local});if(symbolCache.size>32)symbolCache.delete(symbolCache.keys().next().value!);return local;
}
function inside(root: string, file: string) { const relative = path.relative(root, file); return !!relative && !relative.startsWith('..'+path.sep) && relative!=='..' && !path.isAbsolute(relative); }
function textAttribute(node: Element, property: string) {
  if (node.getAttributes().some(Node.isJsxSpreadAttribute) || node.getAttributes().filter(attr=>Node.isJsxAttribute(attr)&&attr.getNameNode().getText()===property).length!==1) throw new Error('The caller uses missing, duplicate or spread props. Edit its provider in source.');
  const attr=node.getAttribute(property); if(!attr || !Node.isJsxAttribute(attr)) throw new Error('The caller does not provide this prop.');
  const initial=attr.getInitializer(), value=initial&&Node.isJsxExpression(initial)?initial.getExpression():initial;
  if(!value || !Node.isStringLiteral(value)) throw new Error('The caller supplies computed data. Edit its provider in source.');
  return {attribute:attr,value:initial&&Node.isStringLiteral(initial)?renderJsxAttribute(initial.getText()):value.getLiteralValue()};
}

/** Bounded, filesystem-only project graph. No dependency code or config is executed. */
function graph(rootInput: string, overlays: Record<string,string>={}) {
  const root=fs.realpathSync(rootInput), sources=new Map<string,{file:string;source:string}>();
  let bytes=0;
  const ignored=new Set(['node_modules','.git','.next','.slightnudge','.slightnudge-source-adapter','dist','build','coverage']);
  const visit=(directory:string)=>{
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      if(ignored.has(entry.name) || directory===root&&['test','tests','docs','scratch'].includes(entry.name)) continue;
      const file=path.join(directory,entry.name);
      if(entry.isSymbolicLink()) throw new Error('Project source contains a symbolic link. Cross-file ownership cannot be proved.');
      if(entry.isDirectory()){visit(file);continue;}
      if(/\.(mdx|vue|svelte|astro)$/.test(entry.name))throw new Error('This project contains template-module callers outside the supported JS/TS ownership scan.');
      if(!/\.[cm]?[jt]sx?$/.test(entry.name) || /\.d\.[cm]?ts$/.test(entry.name)) continue;
      const stat=fs.statSync(file); bytes+=stat.size;
      if(stat.size>1024*1024 || bytes>20*1024*1024 || sources.size>=1000) throw new Error('This project exceeds the current ownership scan limit. Keep this edit in source.');
      sources.set(key(file),{file,source:fs.readFileSync(file,'utf8')});
    }
  }; visit(root);
  const digest=createHash('sha256').update(root);
  for(const [file,value]of [...sources].sort(([a],[b])=>a.localeCompare(b)))digest.update(file).update('\0').update(value.source).update('\0');
  const signature=digest.digest('hex');
  if(graphCache?.signature!==signature){const project=new Project({useInMemoryFileSystem:true}),files=new Map<string,SourceFile>();for(const [file,value]of sources)files.set(file,project.createSourceFile(value.file.replaceAll('\\','/'),value.source));graphCache={signature,project,files};}
  const {project,files}=graphCache;
  // All consumers finish synchronously; no AST escapes an ownership operation.
  // Reuse one bounded graph, but hash actual bytes every time rather than trust mtimes.
  for(const [file,value]of sources){const parsed=files.get(file)!,desired=overlays[file]??value.source;if(parsed.getFullText()!==desired)parsed.replaceWithText(desired);if((parsed.compilerNode as unknown as {parseDiagnostics:unknown[]}).parseDiagnostics.length)throw new Error('A project source file has a syntax error. Fix it before tracing component callers.');}
  let aliases:Record<string,string[]>={},base=root,baseImports=false;
  const config=['tsconfig.json','jsconfig.json'].map(name=>path.join(root,name)).find(file=>fs.existsSync(file));
  if(config){const parsed=ts.parseConfigFileTextToJson(config,fs.readFileSync(config,'utf8')); if(parsed.error) throw new Error('The project alias configuration cannot be read.'); if(parsed.config.extends)throw new Error('Inherited import aliases are not supported by this ownership scan.'); const options=parsed.config.compilerOptions||{}; aliases=options.paths||{}; baseImports=typeof options.baseUrl==='string'; base=path.resolve(root,options.baseUrl||'.'); if(!inside(root,base)&&base!==root) throw new Error('Project aliases resolve outside this project.');}
  const external=(specifier:string)=>{
    const packageName=specifier.startsWith('@')?specifier.split('/').slice(0,2).join('/'):specifier.split('/')[0];
    if(builtinModules.includes(specifier)||/^[a-z][a-z-]+:/.test(specifier))return undefined;
    const packageDirectory=path.join(root,'node_modules',packageName);
    if(!fs.existsSync(path.join(packageDirectory,'package.json')))throw new Error('An import cannot be resolved as a local source or installed package. Cross-file ownership cannot be proved.');
    const realPackage=fs.realpathSync(packageDirectory),modules=fs.realpathSync(path.join(root,'node_modules'));
    if((realPackage===root||inside(root,realPackage))&&realPackage!==modules&&!inside(modules,realPackage))throw new Error('A workspace package aliases project source. Its callers are not yet supported.');
    return undefined;
  };
  const resolve=(specifier:string,from:string)=>{
    let candidates:string[]=[],aliased=false;
    if(specifier.startsWith('.')) candidates=[path.resolve(path.dirname(from),specifier)];
    else for(const [pattern,targets]of Object.entries(aliases)){
      const [prefix,suffix='']=pattern.split('*');
      if(pattern.includes('*')?specifier.startsWith(prefix)&&specifier.endsWith(suffix):specifier===pattern){
        if(!Array.isArray(targets)||targets.length!==1||typeof targets[0]!=='string') throw new Error('This project has ambiguous import aliases.');
        const middle=pattern.includes('*')?specifier.slice(prefix.length,suffix? -suffix.length:undefined):'';
        candidates.push(path.resolve(base,targets[0].replace('*',middle)));
        aliased=true;
      }
    }
    if(!candidates.length&&baseImports)candidates=[path.resolve(base,specifier)];
    if(!candidates.length)return external(specifier);
    const matches=new Set<string>();
    for(const candidate of candidates){if(!inside(root,candidate)) throw new Error('A source import resolves outside this project.'); for(const extension of ['', '.tsx','.ts','.jsx','.js','/index.tsx','/index.ts','/index.jsx','/index.js']){const found=key(candidate+extension); if(files.has(found)) matches.add(found);} if(/\.[cm]?jsx?$/.test(candidate))for(const extension of ['.ts','.tsx']){const found=key(candidate.replace(/\.[cm]?jsx?$/,extension));if(files.has(found))matches.add(found);}}
    if(matches.size>1) throw new Error('A source import has multiple possible targets.');
    if(!matches.size&&specifier.startsWith('.'))for(const candidate of candidates)for(const extension of ['', '.tsx','.ts','.jsx','.js','/index.tsx','/index.ts','/index.jsx','/index.js']){const target=candidate+extension;if(/\.[cm]?[jt]sx?$/.test(target)&&!/\.d\.[cm]?ts$/.test(target)&&fs.existsSync(target)&&fs.statSync(target).isFile())throw new Error('A source import targets an excluded module. Its component callers cannot be proved.');}
    if(!matches.size&&!specifier.startsWith('.')){if(aliased)throw new Error('An internal alias has no source target.');return external(specifier);}
    return [...matches][0];
  };
  return {root,project,files,resolve};
}

function locate(file:SourceFile,line:number,column:number){return openings(file).find(node=>{const pos=file.getLineAndColumnAtPos(node.getStart());return pos.line===line&&pos.column===column;});}
function trace(g:ReturnType<typeof graph>,definition:string,line:number,column:number) {
  const source=g.files.get(key(path.resolve(g.root,definition))); if(!source) throw new Error('The component definition is not a project source file.');
  const file=symbols(source);
  const node=locate(file,line,column), provider=node&&componentTextProvider(node); if(!node||!provider) throw new Error('This component has no directly owned text prop.');
  const names=[...file.getExportedDeclarations()].filter(([,declarations])=>declarations.includes(provider.declaration)).map(([name])=>name);
  if(names.length!==1) throw new Error('The component export is missing or ambiguous.');
  const callers:{file:SourceFile;node:Element}[]=[];
  // Same-file calls also count; an exported component cannot hide a local usage.
  const ownName=Node.isFunctionDeclaration(provider.declaration)?provider.declaration.getNameNode():provider.declaration.getNameNode();
  if(!ownName||!Node.isIdentifier(ownName)) throw new Error('The component binding is unsupported.');
  for(const reference of ownName.findReferencesAsNodes()){
    if(reference.getSourceFile()!==file) continue;
    const parent=reference.getParent();
    if(Node.isJsxOpeningElement(parent)||Node.isJsxSelfClosingElement(parent)) callers.push({file,node:parent});
    else if(!Node.isJsxClosingElement(parent)&&!Node.isExportAssignment(parent)&&!Node.isExportSpecifier(parent)) throw new Error('The component is passed to another provider. Edit its source.');
  }
  for(const source of g.files.values()){
    let other=source;
    for(const declaration of other.getExportDeclarations()) if(declaration.getModuleSpecifierValue()&&g.resolve(declaration.getModuleSpecifierValue()!,other.getFilePath())===key(file.getFilePath())) throw new Error('This component module is re-exported. Its callers are not yet supported.');
    for(const call of other.getDescendantsOfKind(SyntaxKind.CallExpression)){
      const value=call.getArguments()[0]; if(['import','require'].includes(call.getExpression().getText())){if(!value||!Node.isStringLiteral(value))throw new Error('This project has dynamic module paths. Cross-file callers cannot be proved.');if(g.resolve(value.getLiteralValue(),other.getFilePath())===key(file.getFilePath()))throw new Error('This component module is loaded dynamically. Edit its provider in source.');}
    }
    for(const originalImport of source.getImportDeclarations()){
      const importedModule=g.resolve(originalImport.getModuleSpecifierValue(),source.getFilePath());
      if(importedModule!==key(file.getFilePath()))continue;
      other=symbols(source);
      const imported=other.getImportDeclarations().find(declaration=>declaration.getStart()===originalImport.getStart())!;
      if(g.resolve(imported.getModuleSpecifierValue(),other.getFilePath())!==key(file.getFilePath())) continue;
      if(imported.getNamespaceImport()) throw new Error('A namespace import can have indirect callers. Edit this component in source.');
      const bindings=names[0]==='default'?[imported.getDefaultImport()].filter((value):value is NonNullable<typeof value>=>!!value):imported.getNamedImports().filter(value=>value.getName()===names[0]&&!value.isTypeOnly()).map(value=>value.getAliasNode()||value.getNameNode());
      for(const binding of bindings){
        if(!Node.isIdentifier(binding)) throw new Error('This import binding is unsupported.');
        for(const reference of binding.findReferencesAsNodes()){
          if(reference.getSourceFile()!==other)continue;
          if(reference===binding)continue;
          const parent=reference.getParent(); if(Node.isJsxOpeningElement(parent)||Node.isJsxSelfClosingElement(parent)) callers.push({file:other,node:parent});
          else if(!Node.isJsxClosingElement(parent)) throw new Error('This component is passed to another provider. Edit its source.');
        }
      }
    }
  }
  const unique=[...new Map(callers.map(call=>[call.file.getFilePath()+':'+call.node.getStart(),call])).values()];
  if(unique.length!==1||unique[0].file===file) throw new Error('This component has multiple callers or no unique cross-file caller. Edit its provider in source.');
  const caller=unique[0]; if(isElementInsideLoop(caller.node)||isComponentUsedMultipleTimes(caller.node,g.project)) throw new Error('The caller is shared or repeated. Edit its data provider in source.');
  const value=textAttribute(caller.node,provider.property);
  return {definition:file,node,provider,caller,...value};
}

export function inspectCrossFileComponent(options:{root:string;filePath:string;line:number;column:number;overlays?:Record<string,string>}) {
  const g=graph(options.root,options.overlays), resolved=trace(g,options.filePath,options.line,options.column);
  const caller=path.relative(g.root,resolved.caller.file.getFilePath()).replaceAll('\\','/');
  return {component:resolved.provider.component,fields:[{name:resolved.provider.property,value:resolved.value,type:'text' as const}],reason:'',ownership:'cross-file-call' as const,
    owner:{filePath:caller,...resolved.caller.file.getLineAndColumnAtPos(resolved.caller.node.getStart()),tagName:resolved.caller.node.getTagNameNode().getText()},
    dependency:{root:g.root,definition:options.filePath,line:options.line,column:options.column,hash:componentSourceHash(resolved.definition.getFullText()),caller,property:resolved.provider.property} satisfies ComponentDependency};
}

export function updateCrossFileComponent(source:string,owner:ComponentOwner,property:string,value:string){
  if(typeof value!=='string'||value.length>10000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new Error('Use text without control characters, up to 10,000 characters.');
  const file=new Project({useInMemoryFileSystem:true}).createSourceFile('/caller.tsx',source),node=locate(file,owner.line,owner.column);
  if(!node||node.getTagNameNode().getText()!==owner.tagName) throw new Error('The component caller changed. Select it again.');
  const field=textAttribute(node,property); if(field.value!==value) field.attribute.setInitializer(`{${JSON.stringify(value)}}`);
  return {before:source,after:file.getFullText(),oldValue:field.value,newValue:value};
}
export function crossFilePropValue(source:string,owner:ComponentOwner,property:string){const file=new Project({useInMemoryFileSystem:true}).createSourceFile('/caller.tsx',source),node=locate(file,owner.line,owner.column);if(!node||node.getTagNameNode().getText()!==owner.tagName)throw new Error('The caller changed.');return textAttribute(node,property).value;}

/** Recompute cross-file projection from actual caller source, also used on replay. */
export function crossFileTextPatches(root:string,callerFile:string,before:string,after:string,records:ComponentDependency[]=[]) {
  // Resolve instance projections against the baseline first. The graph cache is
  // mutable; restore the after overlay before tracing any legacy callers below.
  const explicit=instancePatches(root,callerFile,before,after,records);
  const g=graph(root,{[key(callerFile)]:after}), source=g.files.get(key(callerFile)); if(!source) throw new Error('The caller is outside its project.');
  const caller=symbols(source);
  const original=new Project({useInMemoryFileSystem:true}).createSourceFile('/__slightnudge_caller_before.tsx',before),oldNodes=openings(original),newNodes=openings(caller);
  const patches:CanvasRenderPatch[]=[],dependencies:ComponentDependency[]=[];
  patches.push(...explicit.patches);dependencies.push(...explicit.dependencies);
  for(let index=0;index<newNodes.length;index++){
    const node=newNodes[index],old=oldNodes[index]; if(!old||node.getTagNameNode().getText()!==old.getTagNameNode().getText()||! /^[A-Z]/.test(node.getTagNameNode().getText()))continue;
    if(records.some(record=>record.instance&&record.callerIndex===index))continue;
    const changed=node.getAttributes().filter(Node.isJsxAttribute).map(attr=>attr.getNameNode().getText()).filter(name=>{try{return textAttribute(node,name).value!==textAttribute(old,name).value}catch{return false}});
    if(!changed.length)continue;
    for(const imported of caller.getImportDeclarations()){
      const specifier=imported.getNamedImports().find(item=>(item.getAliasNode()||item.getNameNode()).getText()===node.getTagNameNode().getText());
      const binding=specifier?(specifier.getAliasNode()||specifier.getNameNode()):imported.getDefaultImport()?.getText()===node.getTagNameNode().getText()?imported.getDefaultImport():undefined;
      if(!binding||binding.getSymbol()!==node.getTagNameNode().getSymbol())continue;
      const module=g.resolve(imported.getModuleSpecifierValue(),callerFile),definitionSource=module&&g.files.get(module); if(!definitionSource)continue;
      const definition=symbols(definitionSource);
      const exported=definition.getExportedDeclarations().get(specifier?specifier.getName():'default');
      for(const native of openings(definition)){
        const provider=componentTextProvider(native); if(!provider||!exported?.includes(provider.declaration)||!changed.includes(provider.property))continue;
        const pos=definition.getLineAndColumnAtPos(native.getStart()),definitionPath=path.relative(g.root,definition.getFilePath()).replaceAll('\\','/');
        const resolved=trace(g,definitionPath,pos.line,pos.column);
        if(resolved.caller.node!==node)throw new Error('The caller cannot be matched to this component.');
        const location={path:definitionPath,...pos}; const id=native.getAttribute('id'),init=id&&Node.isJsxAttribute(id)?id.getInitializer():undefined;
        const target={...location,...(init&&Node.isStringLiteral(init)?{elementId:init.getLiteralValue()}:{})};
        patches.push({before:target,after:target,beforeText:textAttribute(old,provider.property).value,text:resolved.value,css:''});
        dependencies.push({root:g.root,definition:definitionPath,...pos,hash:componentSourceHash(definition.getFullText()),caller:path.relative(g.root,callerFile).replaceAll('\\','/'),property:provider.property});
      }
    }
  }
  return {patches,dependencies};
}

export function validateComponentDependencies(dependencies:ComponentDependency[]|undefined,overlays:Record<string,string>={},expected?:{root:string;caller:string}){
  if(dependencies&&(!Array.isArray(dependencies)||dependencies.length>32))throw new Error('The component ownership record is invalid.');
  for(const dependency of dependencies||[]){
    if(expected&&(key(fs.realpathSync(dependency.root))!==key(fs.realpathSync(expected.root))||key(path.resolve(dependency.root,dependency.caller))!==key(fs.realpathSync(expected.caller))))throw new Error('The component ownership record belongs to another project or caller.');
    const g=graph(dependency.root,overlays),file=path.resolve(g.root,dependency.definition);
    if(dependency.instance){validateInstanceDependency(g,dependency);continue;}
    if(!inside(g.root,file)||componentSourceHash(g.files.get(key(file))?.getFullText()||'')!==dependency.hash) throw new Error('The component definition changed after this draft. Refresh its ownership before saving.');
    const resolved=trace(g,dependency.definition,dependency.line,dependency.column);
    if(path.relative(g.root,resolved.caller.file.getFilePath()).replaceAll('\\','/')!==dependency.caller||resolved.provider.property!==dependency.property)throw new Error('Component ownership changed after this draft. Nothing was overwritten.');
  }
}
export function componentOverlayKey(file:string){return key(file)}
export const instanceGraph=graph, instanceSymbols=symbols, instanceOpenings=openings;
