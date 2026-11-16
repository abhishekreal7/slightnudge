import path from 'node:path';
import { Node, Project } from 'ts-morph';
import { componentSourceHash as hash, instanceGraph as graph, instanceSymbols as symbols, instanceOpenings as openings, componentOverlayKey as key, type ComponentDependency } from './ownership-graph';
import { isElementInsideLoop } from './ast-nudger';
import { parseInstanceTrace, rebaseInstanceTrace } from './instance-trace';
import { instanceProvider, instanceFieldValue, instanceFieldClass, validateInstanceValue } from './instance-props';
import type { CanvasRenderPatch } from './source-canvas-contract';

function resolve(g:ReturnType<typeof graph>,definition:string,line:number,column:number,instance:string,record?:ComponentDependency){
  const calls=parseInstanceTrace(instance);
  if(!calls||calls.length!==1)throw Error('This instance is nested inside another shared component. Edit its forwarding props in source.');
  const marker=calls[0],source=g.files.get(key(path.resolve(g.root,definition))),callerSource=g.files.get(key(path.resolve(g.root,marker.path)));
  if(!source||!callerSource)throw Error('The instance source is outside this project.');
  const callerHash=hash(callerSource.getFullText());
  if(record ? ![record.callerBeforeHash,record.callerAfterHash].includes(callerHash) : marker.hash!==callerHash)throw Error('The component caller changed. Reload the preview before editing.');
  const file=symbols(source),caller=symbols(callerSource),node=record?openings(file)[record.nativeIndex!]:openings(file).find(node=>{const pos=file.getLineAndColumnAtPos(node.getStart());return pos.line===line&&pos.column===column}),call=openings(caller)[marker.index];
  const provider=node&&instanceProvider(node);
  if(!node||!provider||!call||isElementInsideLoop(call))throw Error('This instance has no supported directly owned props, or comes from repeated data.');
  if(record&&(hash(provider.declaration.getText())!==record.hash||record.caller!==marker.path||record.callerIndex!==marker.index))throw Error('The shared definition or caller ownership changed. Nothing was overwritten.');
  const tag=call.getTagNameNode();if(!Node.isIdentifier(tag))throw Error('This component call is indirect.');
  const localName=provider.declaration.getNameNode();
  let belongs=file.getFilePath()===caller.getFilePath()&&localName?.getSymbol()===tag.getSymbol();
  for(const imported of caller.getImportDeclarations()){
    if(g.resolve(imported.getModuleSpecifierValue(),caller.getFilePath())!==key(file.getFilePath()))continue;
    const named=imported.getNamedImports().find(item=>(item.getAliasNode()||item.getNameNode()).getSymbol()===tag.getSymbol());
    const name=named?named.getName():imported.getDefaultImport()?.getSymbol()===tag.getSymbol()?'default':undefined;
    if(name&&file.getExportedDeclarations().get(name)?.includes(provider.declaration))belongs=true;
  }
  if(!belongs)throw Error('This caller does not own the selected component.');
  return {file,node,provider,caller,call,marker};
}
export function validateInstanceDependency(g:ReturnType<typeof graph>,record:ComponentDependency){resolve(g,record.definition,record.line,record.column,record.instance!,record);}
export function inspectInstanceComponent(options:{root:string;filePath:string;line:number;column:number;instance:string}){
  const g=graph(options.root),resolved=resolve(g,options.filePath,options.line,options.column,options.instance);
  const fields=resolved.provider.fields.flatMap(field=>{try{return [{name:field.name,type:field.type,target:field.target,options:field.options,value:instanceFieldValue(resolved.call,field)}]}catch{return []}});
  if(!fields.length)throw Error('These props come from computed data. Edit their provider in source.');
  return {component:resolved.provider.component,fields,reason:'',ownership:'instance-call' as const,owner:{filePath:resolved.marker.path,...resolved.caller.getLineAndColumnAtPos(resolved.call.getStart()),tagName:resolved.call.getTagNameNode().getText()},
    dependency:{root:g.root,definition:options.filePath,line:options.line,column:options.column,hash:hash(resolved.provider.declaration.getText()),caller:resolved.marker.path,property:'*',instance:options.instance,nativeIndex:openings(resolved.file).indexOf(resolved.node),callerIndex:resolved.marker.index,callerBeforeHash:resolved.marker.hash,callerAfterHash:resolved.marker.hash} satisfies ComponentDependency};
}
export function instanceDraftValues(root:string,record:ComponentDependency,source:string){
  const resolved=resolve(graph(root),record.definition,record.line,record.column,record.instance!,record);
  const file=new Project({useInMemoryFileSystem:true}).createSourceFile('/instance-draft.tsx',source),call=openings(file)[record.callerIndex!];if(!call)throw Error('The caller changed.');
  return resolved.provider.fields.flatMap(field=>{try{return [{name:field.name,type:field.type,target:field.target,options:field.options,value:instanceFieldValue(call,field)}]}catch{return []}});
}
export function updateInstanceComponent(root:string,record:ComponentDependency,source:string,baseline:string,property:string,value:string){
  const resolved=resolve(graph(root),record.definition,record.line,record.column,record.instance!,record),field=resolved.provider.fields.find(field=>field.name===property);if(!field)throw Error('Choose a directly owned prop.');
  validateInstanceValue(field,value);
  const project=new Project({useInMemoryFileSystem:true}),file=project.createSourceFile('/instance-current.tsx',source),base=project.createSourceFile('/instance-before.tsx',baseline),call=openings(file)[record.callerIndex!],original=openings(base)[record.callerIndex!];
  if(!call||!original||call.getTagNameNode().getText()!==original.getTagNameNode().getText())throw Error('The caller structure changed.');
  const previous=instanceFieldValue(call,field),initial=instanceFieldValue(original,field),attribute=call.getAttribute(property),old=original.getAttribute(property);
  if(value===initial){
    if(old&&Node.isJsxAttribute(old)&&attribute&&Node.isJsxAttribute(attribute)&&old.getInitializer())attribute.setInitializer(old.getInitializer()!.getText());
    else{const index=attribute?call.getAttributes().indexOf(attribute):old?original.getAttributes().indexOf(old):0;if(attribute&&Node.isJsxAttribute(attribute))attribute.remove();if(old&&Node.isJsxAttribute(old))call.insertAttribute(index,{name:property,initializer:old.getInitializer()?.getText()});}
  }
  else if(previous!==value){const initializer=field.type==='boolean'?`{${value}}`:`{${JSON.stringify(value)}}`;if(attribute&&Node.isJsxAttribute(attribute))attribute.setInitializer(initializer);else call.addAttribute({name:property,initializer});}
  return {before:source,after:file.getFullText(),oldValue:previous,newValue:value};
}
export function instancePatches(root:string,callerFile:string,before:string,after:string,records:ComponentDependency[]){
  const explicit=[...new Map(records.filter(record=>record.instance).map(record=>[record.definition+':'+record.nativeIndex+':'+record.callerIndex,record])).values()];
  const patches:CanvasRenderPatch[]=[],dependencies:ComponentDependency[]=[];
  if(!explicit.length)return {patches,dependencies};
  const g=graph(root),project=new Project({useInMemoryFileSystem:true}),original=project.createSourceFile('/instance-before.tsx',before),updated=project.createSourceFile('/instance-after.tsx',after);
  for(const record of explicit){
    const resolved=resolve(g,record.definition,record.line,record.column,record.instance!,record),old=openings(original)[record.callerIndex!],current=openings(updated)[record.callerIndex!];
    if(!old||!current)throw Error('The instance caller structure changed.');
    const savedDefinition=key(path.resolve(root,record.definition))===key(callerFile)?updated:resolved.file;
    const savedNative=openings(savedDefinition)[record.nativeIndex!];if(!savedNative)throw Error('The shared definition structure changed.');
    const patch:CanvasRenderPatch={before:{path:record.definition,line:record.line,column:record.column,instance:record.instance},after:{path:record.definition,...savedDefinition.getLineAndColumnAtPos(savedNative.getStart()),instance:rebaseInstanceTrace(record.instance!,record.caller,hash(after))},css:''};
    let changed=false;
    for(const field of resolved.provider.fields){
      let previous:string,next:string;try{previous=instanceFieldValue(old,field);next=instanceFieldValue(current,field)}catch{continue}
      if(previous===next)continue;changed=true;
      if(field.target==='text'){patch.beforeText=previous;patch.text=next;}
      else if(field.target==='className'){patch.beforeClassName=instanceFieldClass(field,previous);patch.className=instanceFieldClass(field,next);}
      else{patch.beforeAttributes={...patch.beforeAttributes,[field.target]:field.target==='disabled'?(previous==='true'?'':null):previous};patch.attributes={...patch.attributes,[field.target]:field.target==='disabled'?(next==='true'?'':null):next};}
    }
    if(changed){patches.push(patch);dependencies.push({...record,callerBeforeHash:hash(before),callerAfterHash:hash(after)});}
  }
  return {patches,dependencies};
}
