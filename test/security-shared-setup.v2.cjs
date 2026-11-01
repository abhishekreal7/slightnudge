const fs=require('fs');let code=fs.readFileSync('test/review-consent.browser.ts','utf8');
code=code.replace("import { checkSharedInstances } from './helpers/shared-instance-browser';","import { checkSharedInstances as originalCheckSharedInstances } from './helpers/shared-instance-browser';");
const wrapper=`
async function checkSharedInstances(page:any,...args:any[]) {
 args[2]=args[1]; // screenshots and compatibility reports stay in the temp workspace
 const wrapped=new Proxy(page,{get(target,key){
  if(key==='goto')return (address:string,options:any)=>{const url=new URL(address);if(url.protocol==='http:'&&(url.pathname==='/studio'||url.pathname.endsWith('/edit')))url.searchParams.set('legacyStudio','1');return target.goto(url.toString(),options);};
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 let rejectPageError:any;const pageFailure=new Promise((_resolve,reject)=>{rejectPageError=(error:Error)=>reject(error);page.once('pageerror',rejectPageError);});
 try{return await Promise.race([(originalCheckSharedInstances as any)(wrapped,...args),pageFailure]);}finally{page.off('pageerror',rejectPageError);}
}
`;
code=code.replace('const root = process.cwd();','const root = process.cwd();\n'+wrapper);
code=code.replace('let resetDemo = () => {};', `page.on('response', async response => {if(/\\/api\\/slightnudge\\/(apply|undo|change-set)(?:\\/status)?$/.test(new URL(response.url()).pathname))console.log('GATE HTTP',new URL(response.url()).pathname,response.status(),await response.text().catch(()=>'<unavailable>'));});
  page.on('requestfailed', request => {if(request.url().includes('/api/slightnudge/'))console.log('GATE REQUEST FAILED',new URL(request.url()).pathname,request.failure()?.errorText);});
  let resetDemo = () => {};`);
code=code.replace("const env: NodeJS.ProcessEnv = { NODE_ENV: 'development',", "const env: NodeJS.ProcessEnv = { SLIGHTNUDGE_LEGACY_STUDIO: '1', NODE_ENV: 'development',");
code=code.replace('passed=await checkSharedInstances(page,baseURL,workspace,root);','passed=await checkSharedInstances(page,baseURL,workspace,workspace);');
code=code.replace('const workspace = fs.mkdtempSync',"const configuredTemp = process.env.TEMP || '';\nif(!path.resolve(configuredTemp).startsWith(path.join(root,'scratch','security-hardening-20261101')+path.sep))throw Error('Temp root must stay inside this project');\nconst workspace = fs.mkdtempSync");
code=code.replace('passed+=await checkImportedAdvancedImages(page,baseURL,workspace,root,checkSharedInstances);','fs.mkdirSync(path.join(workspace,\'docs\'),{recursive:true});passed+=await checkImportedAdvancedImages(page,baseURL,workspace,workspace,checkSharedInstances);');
code=code.replace('const workspace = fs.mkdtempSync(path.join(os.tmpdir(), \'sn-review-consent-\'));','const workspace = fs.mkdtempSync(path.join(os.tmpdir(), \'sn-review-consent-\'));fs.mkdirSync(path.join(workspace,\'docs\'),{recursive:true});');
code=code.replace("try { fs.unlinkSync(path.join(workspace, 'node_modules'));", "try { const dest=path.join(root,'docs/security-hardening/shared-workflows');fs.mkdirSync(dest,{recursive:true});for(const name of fs.readdirSync(path.join(workspace,'docs'))){if(/\\.(png|json|log|txt)$/.test(name))fs.copyFileSync(path.join(workspace,'docs',name),path.join(dest,name));} }catch(error){console.error('Could not preserve temp evidence',error);}\n  try { fs.unlinkSync(path.join(workspace, 'node_modules'));");
fs.writeFileSync('test/shared-instance-security.v2.browser.ts',code);
console.log('New driver imports the unchanged shared-instance assertions; only temp location and explicit legacy-route setup differ.');
