import type { Page, Frame, Locator } from 'playwright';

export type Point={x:number;y:number};
type Conversion={logical:Point;screen:Point;scale:Point;iframeRect:any;parentHit:any};
/** The single conversion used by every physical page-content click. */
export function logicalToScreen(page:Page,logical:Point):Promise<Conversion>;
export function logicalToScreen(page:Page,logical:Point[]):Promise<Conversion[]>;
export async function logicalToScreen(page:Page,input:Point|Point[]){
 const iframe=page.locator('iframe[title="Actual project"]');
 const box=await iframe.boundingBox();if(!box)throw Error('Iframe has no rendered rectangle');
 const metrics=await iframe.evaluate(el=>({width:(el as HTMLElement).offsetWidth,height:(el as HTMLElement).offsetHeight,left:(el as HTMLElement).clientLeft,top:(el as HTMLElement).clientTop}));
 const scale={x:box.width/metrics.width,y:box.height/metrics.height};
 const points=(Array.isArray(input)?input:[input]).map(logical=>({logical,screen:{x:box.x+(metrics.left+logical.x)*scale.x,y:box.y+(metrics.top+logical.y)*scale.y}}));
 const hits=await page.evaluate(points=>points.map(p=>{const el=document.elementFromPoint(p.x,p.y);return el?{tag:el.tagName.toLowerCase(),id:el.id,classes:String(el.className||''),label:el.getAttribute('aria-label'),role:el.getAttribute('role'),isIframe:el instanceof HTMLIFrameElement}:null;}),points.map(p=>p.screen));
 const result=points.map((p,i)=>({...p,scale,iframeRect:box,parentHit:hits[i]}));
 return Array.isArray(input)?result:result[0];
}

export async function probeElement(locator:Locator,position?:Point){
 const callback=(element:Element,position?:Point)=>{
  const el=element as HTMLElement,r=el.getBoundingClientRect(),style=getComputedStyle(el);
  const rect=(r:DOMRect)=>({x:r.x,y:r.y,width:r.width,height:r.height});
  const source=(el:Element|null)=>{const node=el?.closest<HTMLElement>('[data-source-file]');return node?{path:node.dataset.sourceFile,line:Number(node.dataset.sourceLine),column:Number(node.dataset.sourceColumn)||(node.id?1:0),tag:node.tagName.toLowerCase(),id:node.id,instance:node.dataset.slightnudgeCallsite}:null;};
  const describe=(el:Element|null)=>el?{tag:el.tagName.toLowerCase(),id:el.id,classes:String(el.className||''),source:source(el)}:null;
  const initial={x:r.left+(position?.x??r.width/2),y:r.top+(position?.y??r.height/2)};
  const initialHit=document.elementFromPoint(initial.x,initial.y);
  const xs=new Set<number>([r.left,r.right]),ys=new Set<number>([r.top,r.bottom]);
  const descendants=Array.from(el.querySelectorAll('*'));
  for(const child of descendants){const b=child.getBoundingClientRect();for(const x of [b.left,b.right])if(x>r.left&&x<r.right)xs.add(x);for(const y of [b.top,b.bottom])if(y>r.top&&y<r.bottom)ys.add(y);}
  const axis=(values:Set<number>,min:number,max:number)=>{const a=[...values].sort((a,b)=>a-b),out:number[]=[];for(let i=1;i<a.length;i++)out.push((a[i-1]+a[i])/2);for(const fraction of [.001,.01,.05,.25,.5,.75,.95,.99,.999])out.push(min+(max-min)*fraction);return [...new Set(out)].filter(x=>x>=min&&x<max);};
  const xCandidates=axis(xs,Math.max(0,r.left),Math.min(innerWidth,r.right)),yCandidates=axis(ys,Math.max(0,r.top),Math.min(innerHeight,r.bottom));
  const candidates:Point[]=[];
  if(initialHit===el)candidates.push(initial);
  let checked=0;
  // Cell midpoints derived from descendant edges cover gaps/padding; relative
  // edge probes include exposed rounded corners without fixed pixel offsets.
  for(const y of yCandidates)for(const x of xCandidates){checked++;if(document.elementFromPoint(x,y)===el)candidates.push({x,y});}
  const children=Array.from(el.children).map(child=>{const cs=getComputedStyle(child);return {...describe(child),rect:rect(child.getBoundingClientRect()),padding:{top:cs.paddingTop,right:cs.paddingRight,bottom:cs.paddingBottom,left:cs.paddingLeft},gap:cs.gap,borderRadius:cs.borderRadius,clipPath:cs.clipPath,maskImage:cs.maskImage,transform:cs.transform,pointerEvents:cs.pointerEvents,visibility:cs.visibility};});
  const covering=children.filter(c=>c.borderRadius==='0px'&&c.clipPath==='none'&&c.maskImage==='none'&&c.transform==='none'&&c.pointerEvents!=='none'&&c.visibility==='visible');
  const cx=[...new Set([r.left,r.right,...covering.flatMap(c=>[Math.max(r.left,c.rect.x),Math.min(r.right,c.rect.x+c.rect.width)])])].filter(x=>x>=r.left&&x<=r.right).sort((a,b)=>a-b);
  const cy=[...new Set([r.top,r.bottom,...covering.flatMap(c=>[Math.max(r.top,c.rect.y),Math.min(r.bottom,c.rect.y+c.rect.height)])])].filter(y=>y>=r.top&&y<=r.bottom).sort((a,b)=>a-b);
  let fullChildRectangleCoverage=covering.length>0;
  for(let yi=1;yi<cy.length;yi++)for(let xi=1;xi<cx.length;xi++){const x=(cx[xi-1]+cx[xi])/2,y=(cy[yi-1]+cy[yi])/2;if(!covering.some(c=>x>=c.rect.x&&x<c.rect.x+c.rect.width&&y>=c.rect.y&&y<c.rect.y+c.rect.height))fullChildRectangleCoverage=false;}
  return {source:source(el),rect:rect(r),classes:el.className,style:{display:style.display,padding:{top:style.paddingTop,right:style.paddingRight,bottom:style.paddingBottom,left:style.paddingLeft},gap:style.gap,rowGap:style.rowGap,columnGap:style.columnGap,border:{top:style.borderTopWidth,right:style.borderRightWidth,bottom:style.borderBottomWidth,left:style.borderLeftWidth}},children,initial,initialHit:describe(initialHit),initialDirect:initialHit===el,scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight},candidates,checked,fullChildRectangleCoverage,search:'descendant-rectangle cell midpoints plus relative edge samples; full rectangular child coverage is separately recorded when applicable'};
 };
 // Remove only esbuild's function-name decorator while serializing the test
 // callback. This avoids injecting a helper into the application page.
 const serializable=Function('return ('+callback.toString().replace(/\b__name\(/g,'((value)=>value)(')+')')();
 return locator.evaluate(serializable,position) as Promise<any>;
}

export async function hitSource(frame:Frame,point:Point){
 return frame.evaluate(p=>{const el=document.elementFromPoint(p.x,p.y),node=el?.closest<HTMLElement>('[data-source-file]');return {point:p,element:el?{tag:el.tagName.toLowerCase(),id:el.id,classes:String(el.className||'')}:null,source:node?{path:node.dataset.sourceFile,line:Number(node.dataset.sourceLine),column:Number(node.dataset.sourceColumn)||(node.id?1:0),tag:node.tagName.toLowerCase(),id:node.id,instance:node.dataset.slightnudgeCallsite}:null};},point);
}
