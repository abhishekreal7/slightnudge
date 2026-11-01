import type {Page} from 'playwright';
// Editor controls stay in the host. Content absent in the host is located in
// its actual preview iframe. Assertions are performed by the unchanged caller.
export function iframePageV3(page:Page):Page {
 return new Proxy(page,{get(target,key){
  if(key==='goto')return (address:string,options:any)=>{
   const url=new URL(address);if(url.pathname==='/studio'||url.pathname==='/studio/window'||/^\/studio\/[^/]+\/(edit|window)$/.test(url.pathname)){
    const parts=url.pathname.split('/');url.pathname=parts.length===4?'/editor/'+parts[2]:'/editor';url.searchParams.delete('legacyStudio');
   }console.log('HARNESS-V3 NAVIGATION '+url.href);return target.goto(url.href,options);
  };
  if(['locator','getByRole','getByText','getByLabel'].includes(String(key)))return (...args:any[])=>{
   const host=(target as any)[key](...args),frame=(target.frameLocator('iframe[title="Actual project"], iframe[title="Local source preview"]') as any)[key](...args);
   const wrap=(host:any,frame:any):any=>new Proxy(host,{get(locator,method){const member=locator[method];if(typeof member!=='function')return member;
    if(['locator','getByRole','getByText','getByLabel','filter','first','last','nth'].includes(String(method)))return (...values:any[])=>wrap(member.apply(host,values),frame[method](...values));
    return async(...values:any[])=>{if(await host.count())return member.apply(host,values);if(await target.locator('iframe[title="Actual project"], iframe[title="Local source preview"]').count())return frame[method](...values);return member.apply(host,values);};
   }});return wrap(host,frame);
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
}
