import { perfSync } from './perf-stages';
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

import {
  type ComponentOwner,
  type ComponentDependency,
  componentSourceHash,
  componentOverlayKey,
  openings,
  symbols,
  inside,
  graph,
  instanceGraph,
  instanceSymbols,
  instanceOpenings,
  key,
} from './ownership-graph';

export type { ComponentOwner, ComponentDependency };
export { componentSourceHash, componentOverlayKey, instanceGraph, instanceSymbols, instanceOpenings };

type Element = JsxOpeningElement | JsxSelfClosingElement;
function textAttribute(node: Element, property: string) {
  if (node.getAttributes().some(Node.isJsxSpreadAttribute) || node.getAttributes().filter(attr=>Node.isJsxAttribute(attr)&&attr.getNameNode().getText()===property).length!==1) throw new Error('The caller uses missing, duplicate or spread props. Edit its provider in source.');
  const attr=node.getAttribute(property); if(!attr || !Node.isJsxAttribute(attr)) throw new Error('The caller does not provide this prop.');
  const initial=attr.getInitializer(), value=initial&&Node.isJsxExpression(initial)?initial.getExpression():initial;
  if(!value || !Node.isStringLiteral(value)) throw new Error('The caller supplies computed data. Edit its provider in source.');
  return {attribute:attr,value:initial&&Node.isStringLiteral(initial)?renderJsxAttribute(initial.getText()):value.getLiteralValue()};
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
  const file=perfSync('ast-parse', () => perfSync('ast-project', () => new Project({useInMemoryFileSystem:true})).createSourceFile('/caller.tsx',source)),node=locate(file,owner.line,owner.column);
  if(!node||node.getTagNameNode().getText()!==owner.tagName) throw new Error('The component caller changed. Select it again.');
  const field=textAttribute(node,property); if(field.value!==value) field.attribute.setInitializer(`{${JSON.stringify(value)}}`);
  return {before:source,after:file.getFullText(),oldValue:field.value,newValue:value};
}
export function crossFilePropValue(source:string,owner:ComponentOwner,property:string){const file=perfSync('ast-parse', () => perfSync('ast-project', () => new Project({useInMemoryFileSystem:true})).createSourceFile('/caller.tsx',source)),node=locate(file,owner.line,owner.column);if(!node||node.getTagNameNode().getText()!==owner.tagName)throw new Error('The caller changed.');return textAttribute(node,property).value;}

/** Recompute cross-file projection from actual caller source, also used on replay. */
export function crossFileTextPatches(root:string,callerFile:string,before:string,after:string,records:ComponentDependency[]=[]) {
  // Resolve instance projections against the baseline first. The graph cache is
  // mutable; restore the after overlay before tracing any legacy callers below.
  const explicit=instancePatches(root,callerFile,before,after,records);
  const g=graph(root,{[key(callerFile)]:after}), source=g.files.get(key(callerFile)); if(!source) throw new Error('The caller is outside its project.');
  const caller=symbols(source);
  const original=perfSync('ast-parse', () => perfSync('ast-project', () => new Project({useInMemoryFileSystem:true})).createSourceFile('/__slightnudge_caller_before.tsx',before)),oldNodes=openings(original),newNodes=openings(caller);
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
