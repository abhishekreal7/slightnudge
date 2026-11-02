import type {Page} from 'playwright';
const wrappers=new WeakMap<Page,Page>();
const preview='iframe[title="Actual project"], iframe[title="Local source preview"]';
const hostRoles=new Set(['region','group','toolbar','banner','combobox','spinbutton','separator','tab','tablist','menu','dialog','status']);
// Editor controls remain in the host even before they mount. A missing editor
// control must not silently become a website query. Assertions stay in callers.
export function iframePageV3(page:Page):Page {
 const previous=wrappers.get(page);if(previous)return previous;
 const result=new Proxy(page,{get(target,key){
  if(key==='goto')return (address:string,options:any)=>{
   const url=new URL(address);if(url.pathname==='/studio'||url.pathname==='/studio/window'||/^\/studio\/[^/]+\/(edit|window)$/.test(url.pathname)){
    const studio=url.pathname==='/studio'||url.pathname.endsWith('/edit');
    const parts=url.pathname.split('/');url.pathname=parts.length===4?'/editor/'+parts[2]:'/editor';url.searchParams.delete('legacyStudio');
    if(studio)url.searchParams.set('panel','inspector');
   }console.log('HARNESS-V3 NAVIGATION '+url.href);return target.goto(url.href,options);
  };
  if(['locator','getByRole','getByText','getByLabel'].includes(String(key)))return (...args:any[])=>{
   const host=(target as any)[key](...args),frame=(target.frameLocator(preview) as any)[key](...args);
   const mode=key==='getByRole'&&hostRoles.has(args[0])||key==='getByLabel'||key==='locator'&&/^\[(?:data-source-ready|data-editor|aria-)/.test(args[0])?'host':key==='locator'&&/^(?:h[1-6]|p(?:\b|\[)|#|\[data-source-file)/.test(args[0])?'content':'auto';
   const wrap=(host:any,frame:any):any=>new Proxy(host,{get(locator,method){const member=locator[method];if(typeof member!=='function')return member;
    if(['locator','getByRole','getByText','getByLabel','filter','first','last','nth'].includes(String(method)))return (...values:any[])=>wrap(member.apply(host,values),frame[method](...values));
    return async(...values:any[])=>{
     console.log(`HARNESS-V3 OP ${Date.now()} START ${String(method)} ${host}`);
     try{const useFrame=mode==='content'||mode==='auto'&&!await host.count()&&await target.locator(preview).count();const value=await(useFrame?frame[method](...values):member.apply(host,values));console.log(`HARNESS-V3 OP ${Date.now()} END ${String(method)} ${host}`);return value;}
     catch(error){console.log(`HARNESS-V3 OP ${Date.now()} ERROR ${String(method)} ${host}`);throw error;}
    };
   }});return wrap(host,frame);
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 wrappers.set(page,result);wrappers.set(result,result);return result;
}
