import {readFileSync,realpathSync,statSync} from 'node:fs';
import path from 'node:path';

function inside(root:string,target:string){const relative=path.relative(root,target);return Boolean(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}

/** Resolve before opening the source, including parent-directory junctions. */
export function canonicalFile(root:string,input:string){
  if(typeof input!=='string'||input.includes('\0'))throw Error('Choose a valid source path.');
  const base=realpathSync(root),resolved=path.resolve(root,input);
  if(!inside(path.resolve(root),resolved))throw Error('The source must be inside its project root.');
  const actual=realpathSync(resolved);
  if(!inside(base,actual)||!statSync(actual).isFile())throw Error('The source must be a regular file inside its project root.');
  return actual;
}

export function registeredProjectRoot(workspace:string,id:string){
  if(typeof id!=='string'||! /^[a-z0-9_.-]{1,205}$/i.test(id)||id==='.'||id==='..')throw Error('That repository could not be found.');
  const base=realpathSync(workspace),index=canonicalFile(workspace,'.slightnudge/repositories.json');
  const records=JSON.parse(readFileSync(index,'utf8'));
  if(!Array.isArray(records))throw Error('The registered project list is invalid.');
  const record=records.find(item=>item?.id===id);
  if(!record||typeof record.localPath!=='string')throw Error('That repository could not be found.');
  const store=realpathSync(path.join(workspace,'.slightnudge/repositories')),root=realpathSync(record.localPath);
  if(!inside(base,store)||!inside(store,root)||!statSync(root).isDirectory())throw Error('The registered project root is outside the managed workspace.');
  return root;
}

/** Disk snapshots carry scope too; never trust a pending/history pathname alone. */
export function assertSourceScope(workspace:string,filePath:string,repositoryId?:string,sourcePath?:string){
  const actual=canonicalFile(workspace,filePath);
  if(repositoryId===undefined){
    const managed=path.join(realpathSync(workspace),'.slightnudge/repositories');
    if(inside(managed,actual))throw Error('A managed source file requires its registered project and source path.');
    return actual;
  }
  if(typeof sourcePath!=='string'||sourcePath.length>1000||path.isAbsolute(sourcePath)||path.win32.isAbsolute(sourcePath))throw Error('The saved project source path is invalid.');
  const normalized=sourcePath.replaceAll('\\','/');
  if(normalized.split('/').some(part=>!part||part==='.'||part==='..')||! /\.(tsx?|jsx?|css|scss|mdx?)$/i.test(normalized)||/(^|\/)(node_modules|\.next|dist)\//.test(normalized))throw Error('The saved project source path is invalid.');
  const root=registeredProjectRoot(workspace,repositoryId),expected=canonicalFile(root,normalized);
  if(!inside(root,actual)||actual!==expected)throw Error('The saved source is outside its registered project or belongs to a different source file.');
  return actual;
}
