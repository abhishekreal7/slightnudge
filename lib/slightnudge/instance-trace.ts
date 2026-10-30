export interface InstanceCall { path: string; index: number; hash: string }
/** Serialized into the preview bridge; keep independent of server modules. */
export function parseInstanceTrace(value: unknown): InstanceCall[] | undefined {
  if(typeof value!=='string'||!value||value.length>8192)return undefined;
  const lines=value.split('\n');if(lines.length>16)return undefined;
  try{return lines.map(line=>{const row=JSON.parse(line);if(!Array.isArray(row)||row.length!==3||typeof row[0]!=='string'||!row[0]||row[0].length>1000||row[0].includes('\\')||row[0].startsWith('/')||/^[a-z]:/i.test(row[0])||row[0].split('/').includes('..')||!Number.isSafeInteger(row[1])||row[1]<0||row[1]>100000||typeof row[2]!=='string'||! /^[a-f0-9]{64}$/.test(row[2]))throw Error();return {path:row[0],index:row[1],hash:row[2]}})}catch{return undefined}
}
export function rebaseInstanceTrace(value:string,file:string,hash:string){const calls=parseInstanceTrace(value);if(!calls)throw new Error('The component instance marker is invalid.');return calls.map(call=>JSON.stringify([call.path,call.index,call.path===file?hash:call.hash])).join('\n');}
