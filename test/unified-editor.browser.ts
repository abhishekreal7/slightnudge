import { checkAppearanceLayout } from './helpers/appearance-layout-browser';
import { checkSharedInstances } from './helpers/shared-instance-browser';
import { checkIconProperties } from './helpers/icon-properties-browser';
import { checkComponentActions } from './helpers/component-actions-browser';
import { checkComponentProps } from './helpers/component-props-browser';
import { checkImportedAdvancedImages } from './helpers/imported-advanced-image-browser';
import { checkAdvancedImages } from './helpers/advanced-image-browser';
import { checkImageContent } from './helpers/image-content-browser';
import { checkImageFraming } from './helpers/image-framing-browser';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { execFileSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { Script } from 'node:vm';
import { checkImportedReview } from './helpers/imported-review-browser';
import { checkLiveReview } from './helpers/live-review-browser';
import { checkCurrentStudioReview } from './helpers/current-studio-review-browser';
import { checkCurrentStudioLive } from './helpers/current-studio-live-browser';
import { checkM1Interactions } from './helpers/m1-interactions-browser';
import { checkStudioResize } from './helpers/studio-resize-browser';
import { checkSourceProject } from './helpers/source-project-browser';
import { checkWorkspaceRedesign } from './helpers/workspace-redesign-browser';
import { checkStudioReloadRecovery } from './helpers/studio-reload-recovery-browser';
import { checkDirectManipulation } from './helpers/direct-manipulation-browser';
import { checkDragMove } from './helpers/drag-move-browser';
import { checkContinuousDraft } from './helpers/continuous-draft-browser';
import { checkInlineText } from './helpers/inline-text-browser';
import { checkUnifiedCanvas } from './helpers/unified-canvas-browser';
import { checkButtonEditing } from './helpers/button-editing-browser';
import { checkLiveWindow } from './helpers/live-window-browser';
import { checkSectionOrder } from './helpers/section-order-browser';
import { checkContainerMove } from './helpers/container-move-browser';
import { checkLayoutControls } from './helpers/layout-controls-browser';
import { checkMultiFile } from './helpers/multi-file-browser';
import { checkProjectCompatibility } from './helpers/project-compatibility-browser';
import { checkImportedCanvas } from './helpers/imported-canvas-browser';
import { checkRealProjectCanvas } from './helpers/real-project-canvas-browser';
import { checkRealMultiFile } from './helpers/real-multi-file-browser';
import { checkHighFidelity } from './helpers/high-fidelity-browser';
import { checkCoreEditing } from './helpers/core-editing-browser';
import { checkSingleCanvas } from './helpers/single-canvas-browser';
import { checkEditorErgonomics } from './helpers/editor-ergonomics-browser';
import { checkResponsiveEditing } from './helpers/responsive-editing-browser';
import { checkImportedResponsive } from './helpers/imported-responsive-browser';

// Run the real UI in a disposable copy. API stubs deliberately make implicit
// Apply observable without ever writing source or handling real session tokens.
const root = process.cwd();
const responsiveFiles = ['test/helpers/multi-file-browser.ts', 'test/helpers/group-crash-worker.ts', 'lib/slightnudge/source-group.ts', 'lib/slightnudge/source-group-journal.ts', 'app/api/slightnudge/change-set/route.ts', 'test/helpers/single-canvas-browser.ts', 'components/slightnudge/CanvasStage.tsx', 'components/slightnudge/canvas-stage.module.css', 'test/helpers/editor-ergonomics-browser.ts', 'app/api/slightnudge/responsive/route.ts', 'components/slightnudge/ResponsiveControls.tsx', 'components/slightnudge/responsive-controls.module.css', 'test/helpers/responsive-editing-browser.ts', 'test/helpers/imported-responsive-browser.ts'];
if (process.argv.includes('--demo') && (process.argv.includes('--live') || process.argv.includes('--imported') || process.argv.includes('--source-project'))) {
  throw new Error('Imported-project interactive demos are not available yet. Use --m1 --demo for the current Studio with real edits in a disposable copy.');
}
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-review-consent-'));
for (const file of ['lib/slightnudge/appearance-values.ts','components/slightnudge/AppearanceControls.tsx','components/slightnudge/ConstraintControls.tsx','components/slightnudge/appearance-controls.module.css','test/helpers/appearance-layout-browser.ts','lib/slightnudge/instance-ownership.ts','lib/slightnudge/instance-props.ts','lib/slightnudge/instance-trace.ts','test/helpers/shared-instance-browser.ts','lib/slightnudge/component-ownership.ts', 'lib/slightnudge/component-props.ts', 'components/slightnudge/ComponentProps.tsx', 'test/helpers/component-props-browser.ts']) { const dest = path.join(workspace, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest); }
for (const file of ['test/helpers/high-fidelity-browser.ts', 'test/preview-connection.test.ts', 'test/helpers/real-multi-file-browser.ts', 'lib/slightnudge/editing-capabilities.ts', 'test/helpers/core-editing-browser.ts', 'test/helpers/real-project-canvas-browser.ts', 'components/marketing/ReviewWorkflowSection.tsx', 'lib/slightnudge/jsx-text.ts']) {
  const dest = path.join(workspace, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest);
}
for (const file of ['test/helpers/icon-properties-browser.ts', 'lib/slightnudge/icon-library.ts', 'lib/slightnudge/icon-shape-values.ts', 'lib/slightnudge/icon-source.ts', 'lib/slightnudge/icon-identity.ts', 'lib/slightnudge/icon-source-values.ts', 'components/slightnudge/IconControls.tsx', 'test/helpers/imported-advanced-image-browser.ts', 'test/helpers/component-actions-browser.ts', 'test/helpers/advanced-image-browser.ts', 'test/helpers/image-content-browser.ts', 'app/api/slightnudge/assets/route.ts', 'lib/slightnudge/link-source.ts', 'lib/slightnudge/link-identity.ts', 'lib/slightnudge/link-values.ts', 'components/slightnudge/ActionControls.tsx', 'lib/slightnudge/image-source.ts', 'lib/slightnudge/image-source-advanced.ts', 'lib/slightnudge/image-identity.ts', 'components/slightnudge/ImageContent.tsx', 'components/slightnudge/ImageFraming.tsx', 'test/helpers/image-framing-browser.ts']) { const dest = path.join(workspace, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest); }
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/);
for (const file of [...responsiveFiles, 'test/helpers/imported-canvas-browser.ts', 'lib/slightnudge/imported-canvas-runtime.ts', 'components/slightnudge/imported-canvas.module.css', 'test/helpers/project-compatibility-browser.ts', 'lib/slightnudge/project-compatibility.ts', 'components/slightnudge/ProjectCompatibility.tsx', 'components/slightnudge/project-compatibility.module.css']) { const dest = path.join(workspace, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest); }
for (const file of ['lib/slightnudge/history-summary.ts', 'app/api/slightnudge/history/route.ts', 'components/slightnudge/ChangeHistory.tsx', 'components/slightnudge/change-history.module.css']) { const dest = path.join(workspace, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest); }
for (const file of tracked) {
  if (!/^(app\/|components\/|lib\/|fixtures\/|public\/|types\/|package\.json$|tsconfig\.json$|next-env\.d\.ts$|next\.config\.|postcss\.config\.)/.test(file)) continue;
  if (file.split('/').some(part => /^\.env(?:\.|$)|secret|credential|token|\.pem$|\.key$/i.test(part))) continue;
  // Token route source is application code, so copied explicitly below.
  const dest = path.join(workspace, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, file), dest);
}
// Copy only known application modules whose filenames contain "token".
for (const file of ['proxy.ts', 'lib/payments/paid-event.ts', 'lib/auth/account.ts', 'lib/auth/browser.ts', 'app/login/page.tsx', 'app/login/sign-in.module.css', 'lib/security/html.ts']) {
  const dest = path.join(workspace, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest);
}
for (const file of ['components/slightnudge/LayoutControls.tsx', 'components/slightnudge/layout-controls.module.css', 'test/helpers/layout-controls-browser.ts', 'lib/slightnudge/container-move.ts', 'test/helpers/container-move-browser.ts', 'test/helpers/section-order-browser.ts', 'app/workspace/workspace.module.css', 'test/helpers/workspace-redesign-browser.ts', 'test/helpers/prepare-source-project.ts', 'test/helpers/source-selection-workflows.ts', 'test/helpers/source-project-browser.ts', 'components/slightnudge/SourceProjectCanvas.tsx', 'app/studio/[repoId]/edit/page.tsx', 'test/helpers/studio-resize-browser.ts', 'app/api/slightnudge/token/route.ts']) {
  const dest = path.join(workspace, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, file), dest);
}
// Include this new harness in compilation without copying historical tests,
// private history, evidence archives or scratch files into the application.
for (const file of ['components/slightnudge/EditorWorkspace.tsx', 'components/slightnudge/EditorSurface.tsx', 'components/slightnudge/EditorSessionControls.tsx', 'components/slightnudge/editor-workspace.module.css', 'lib/slightnudge/interaction-controls.ts', 'test/m1-interactions.test.ts', 'test/helpers/m1-interactions-browser.ts', 'test/review-consent.browser.ts', 'test/helpers/imported-review-browser.ts', 'test/helpers/live-review-browser.ts', 'test/helpers/current-studio-review-browser.ts', 'test/helpers/current-studio-live-browser.ts', 'test/helpers/create-saas-sample.ts', 'test/apply-review-race.test.ts', 'test/adapter-webpack-regression.test.ts', 'test/real-project-benchmark.ts']) {
  const dest = path.join(workspace, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, file), dest);
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), 'junction');
fs.copyFileSync(path.join(root, '.gitignore'), path.join(workspace, '.gitignore'));
fs.copyFileSync(path.join(root, 'components/slightnudge/useWindowDock.ts'), path.join(workspace, 'components/slightnudge/useWindowDock.ts'));
for (const file of ['test/helpers/live-window-browser.ts', 'components/slightnudge/source-window.module.css', 'app/studio/window/page.tsx', 'app/studio/[repoId]/window/page.tsx', 'app/studio/[repoId]/edit/page.tsx']) { const destination = path.join(workspace, file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(path.join(root, file), destination); }
fs.copyFileSync(path.join(root, 'components/slightnudge/LocalSourcePreview.tsx'), path.join(workspace, 'components/slightnudge/LocalSourcePreview.tsx'));
fs.mkdirSync(path.join(workspace, 'test/helpers'), { recursive: true });
fs.copyFileSync(path.join(root, 'test/helpers/button-editing-browser.ts'), path.join(workspace, 'test/helpers/button-editing-browser.ts'));
for (const file of ['components/slightnudge/SourceLayers.tsx', 'components/slightnudge/source-layers.module.css']) {
  const dest = path.join(workspace, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest);
}
for (const file of ['lib/slightnudge/next-hmr-sync-loader.cjs', 'test/helpers/unified-canvas-browser.ts', 'app/studio/preview/[pageId]/page.tsx', 'app/api/slightnudge/draft-view/route.ts', 'lib/slightnudge/source-canvas-bridge.ts', 'lib/slightnudge/source-canvas-contract.ts', 'test/helpers/inline-text-browser.ts', 'components/slightnudge/InlineCanvasText.tsx', 'lib/slightnudge/source-draft.ts', 'test/continuous-draft.test.ts', 'test/helpers/continuous-draft-browser.ts', 'lib/slightnudge/translation.ts', 'test/drag-move.test.ts', 'test/helpers/drag-move-browser.ts']) {
  const dest = path.join(workspace, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest);
}
for (const file of ['lib/slightnudge/direct-manipulation.ts', 'test/direct-manipulation.test.ts', 'test/helpers/direct-manipulation-browser.ts', 'lib/slightnudge/studio-recovery.ts', 'test/studio-recovery.test.ts', 'test/helpers/studio-reload-recovery-browser.ts', 'app/api/slightnudge/undo/status/route.ts', 'test/undo-recovery.test.ts', 'test/undo-client-recovery.test.ts', 'test/helpers/undo-crash-worker.ts', 'app/api/slightnudge/apply/status/route.ts', 'lib/slightnudge/source-operation-lock.ts', 'test/apply-outcome.test.ts', 'test/apply-client-recovery.test.ts', 'test/apply-denial.test.ts', 'test/apply-crash-recovery.test.ts', 'test/helpers/apply-crash-worker.ts', 'test/source-operation-lock.test.ts', 'test/helpers/source-lock-worker.ts']) {
  const dest = path.join(workspace, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, file), dest);
}
if (process.argv.includes('--baseline')) {
  fs.writeFileSync(path.join(workspace, 'components/slightnudge/SlightNudgeOverlay.tsx'), execFileSync('git', ['show', 'HEAD:components/slightnudge/SlightNudgeOverlay.tsx']));
}
if (process.argv.includes('--current-baseline')) {
  fs.writeFileSync(path.join(workspace, 'app/studio/page.tsx'), execFileSync('git', ['show', 'HEAD:app/studio/page.tsx']));
}
for(const file of ['app/editor/[[...project]]/page.tsx','lib/slightnudge/editor-route.ts']){const dest=path.join(workspace,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
const env: NodeJS.ProcessEnv = { SLIGHTNUDGE_LEGACY_STUDIO:'1', NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) {
  if (process.env[key]) env[key] = process.env[key];
}
const port = await new Promise<number>((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address() as net.AddressInfo;
    socket.close(() => resolve(address.port));
  });
});
const baseURL = `http://127.0.0.1:${port}`;
env.PORT = String(port);
const editorPath = process.argv.includes('--studio') ? '/studio' : '/fixtures/1';
const gatesOnly = process.argv.includes('--gates-only');
const server = gatesOnly ? undefined : spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], { cwd: workspace, env, stdio: ['ignore', 'pipe', 'pipe'] });
let serverDiagnostics = '';
for (const stream of [server?.stdout, server?.stderr]) stream?.on('data', chunk => { serverDiagnostics = (serverDiagnostics + chunk.toString()).slice(-16000); });
let serverStopped = false;
function stopServer() {
  if (serverStopped) return;
  serverStopped = true;
  if (server?.pid) { try { execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }
}
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let passed = 0;
const round=process.argv.find(arg=>arg.startsWith('--round='))?.split('=')[1]||'1';
const evidence=path.join(root,'docs/unified-editor-evidence');
const supplement=process.argv.includes('--supplement-fit');
const evidenceRound=round+(supplement?'-supplement-fit':'');
async function migrate(sourcePage:import('playwright').Page,view:'full'|'fit',repository?:{id:string;root:string;url:string}){
 await sourcePage.goto('about:blank');
 const context=await sourcePage.context().browser()!.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();page.setDefaultTimeout(60000);
 const file=path.join(repository?.root||workspace,repository?'app/page.tsx':'fixtures/1-plain-static.tsx'),before=fs.readFileSync(file,'utf8');
 const fixture=`'use client';export default function Page(){return <main className="p-8 min-h-screen bg-white"><h1 id="target" className="text-4xl p-8">Route migration</h1></main>}`;
 const frame=page.frameLocator('iframe[title="Actual project"]');
 const idle=()=>page.waitForFunction(()=>document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy')==='false');
 const ready=async()=>{await page.locator('[data-source-ready="true"]').waitFor({timeout:120000});await idle();};
 const edit=async(text:string)=>{await frame.locator('#target').dblclick();const editor=frame.getByRole('textbox',{name:'Edit selected text',exact:true});await editor.waitFor();await editor.press('Control+a');await editor.pressSequentially(text);const [response]=await Promise.all([page.waitForResponse(response=>{if(new URL(response.url()).pathname!=='/api/slightnudge/preview'||response.request().method()!=='POST')return false;const body=response.request().postDataJSON();return body.kind==='text'}),editor.press('Enter')]);const result=await response.json();assert.equal(result.success,true,JSON.stringify(result));await idle();await frame.getByRole('heading',{name:text,exact:true}).waitFor();return result.id;};
 const history=()=>page.evaluate(async repositoryId=>{const response=await fetch('/api/slightnudge/history',{method:'POST',headers:{'content-type':'application/json','x-slightnudge-token':(window as any).__SLIGHTNUDGE_TOKEN__},body:JSON.stringify({repositoryId})});if(!response.ok)throw Error('History request failed');return await response.json()},repository?.id);
 try{
  fs.writeFileSync(file,fixture);await page.goto('about:blank');
  const preview=repository?`&preview=${encodeURIComponent(repository.url)}`:'';
  const old=repository?`/studio/${repository.id}/edit?legacyStudio=1${preview}`:'/studio?legacyStudio=1';
  await page.goto(baseURL+old,{waitUntil:'domcontentloaded',timeout:120000});await ready();assert.equal(await page.locator('[data-editor-legacy="true"]').count(),1);
  const firstId=await edit('Edited in legacy');assert.equal(fs.readFileSync(file,'utf8'),fixture);
  const key='slightnudge:studio:continuous-draft:v1'+(repository?':'+repository.id:'');
  assert.ok(await page.evaluate(key=>localStorage.getItem(key),key));
  await page.reload({waitUntil:'domcontentloaded'});await ready();await frame.getByRole('heading',{name:'Edited in legacy',exact:true}).waitFor();
  const next='/editor'+(repository?'/'+repository.id:'')+`?view=${view}${preview}`;
  await page.goto(baseURL+next,{waitUntil:'domcontentloaded'});await ready();await frame.getByRole('heading',{name:'Edited in legacy',exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'Editor view',exact:true}).inputValue(),view);
  const recovered=await page.evaluate(key=>localStorage.getItem(key),key);assert.ok(recovered?.includes(firstId),'Original preview ID must survive the route change');
  await edit('Continued in unified');assert.equal(fs.readFileSync(file,'utf8'),fixture);
  const width=page.getByRole('spinbutton',{name:'Preview width',exact:true});await width.fill('2000');await width.press('Enter');await ready();
  await frame.locator('#target').click();await page.getByLabel('Selected source element',{exact:true}).waitFor();
  const actual=await frame.locator('#target').boundingBox(),overlay=await page.getByLabel('Selected source element',{exact:true}).boundingBox();assert.ok(actual&&overlay);for(const axis of ['x','y','width','height'] as const)assert.ok(Math.abs(actual![axis]-overlay![axis])<=1,`${view}: selection ${axis} ${actual![axis]} vs ${overlay![axis]}`);
  const scale=await page.locator('iframe[title="Actual project"]').evaluate(frame=>frame.getBoundingClientRect().width/(frame as HTMLIFrameElement).clientWidth);if(view==='full')assert.ok(Math.abs(scale-1)<.001);else assert.ok(scale<1,`Fit should scale a 2000px viewport: ${scale}`);
  const previous=await history();
  const [saved]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/apply'&&response.request().method()==='POST'),page.getByRole('button',{name:'Save changes',exact:true}).click()]);assert.equal((await saved.json()).success,true);await idle();assert.ok(fs.readFileSync(file,'utf8').includes('Continued in unified'));
  const current=await history(),fresh=current.entries.filter((entry:any)=>!previous.entries.some((old:any)=>old.id===entry.id));assert.equal(fresh.length,1);assert.deepEqual(fresh[0].files,[repository?'app/page.tsx':'fixtures/1-plain-static.tsx']);
  await page.reload({waitUntil:'domcontentloaded'});await ready();const afterRefresh=await history();assert.ok(afterRefresh.entries.some((entry:any)=>entry.id===fresh[0].id));
  await frame.locator('#target').click();const [undone]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/slightnudge/undo'&&response.request().method()==='POST'),page.getByRole('button',{name:'Undo',exact:true}).click()]);assert.equal((await undone.json()).success,true);await idle();assert.equal(fs.readFileSync(file,'utf8'),fixture);
  console.log(`PASS migration ${repository?'imported':'local'} ${view}: real legacy edit, refresh, same draft ID in canonical route, continue, project/file history, persisted Save history, exact Undo, selection geometry <=1px, scale ${scale}`);
 }catch(error){console.log('MIGRATION FAILURE '+view+' '+(repository?.id||'local'),await page.locator('body').innerText().catch(()=>''));throw error;}finally{await context.close();fs.writeFileSync(file,before);}
}
async function existing(page:import('playwright').Page,view:'full'|'fit',repository?:{id:string;root:string;url:string}){
 const goto=page.goto.bind(page);
 page.goto=((input:string,options:any)=>{const url=new URL(input);const match=url.pathname.match(/^\/studio(?:\/([^/]+)\/(edit|window)|\/(window))?$/);if(match){const windowCase=match[2]==='window'||!!match[3];url.pathname='/editor'+(match[1]?'/'+match[1]:'');url.searchParams.set('view',view);if(!windowCase)url.searchParams.set('panel','inspector');console.log('WORKFLOW NAVIGATION '+url.pathname+url.search);}return goto(url.toString(),options);}) as typeof page.goto;
 try{return await checkSharedInstances(page,baseURL,workspace,root,repository);}catch(error){process.exitCode=1;console.log(`FAILED shared-instance suite ${repository?'imported':'local'} ${view}; remaining case in this existing suite may be unreached`,String(error));return 0;}finally{page.goto=goto;}
}
try{
 let ready=false;for(let attempt=0;attempt<120;attempt++){if(server&&server.exitCode!==null)throw Error('Isolated server exited');try{if((await fetch(baseURL+'/fixtures/1',{signal:AbortSignal.timeout(10000)})).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}assert.ok(ready);
 browser=await chromium.launch();let page=await browser.newPage({viewport:{width:1600,height:1000}});
 for(const [old,destination] of [['/studio','/editor'],['/studio/window','/editor'],['/studio/source-proof/edit','/editor/source-proof'],['/studio/source-proof/window','/editor/source-proof']]){
  const response=await page.request.get(baseURL+old+'?tag=a&tag=b&empty=&preview=http%3A%2F%2Flocalhost%3A3001%2Fa%3Fx%3D1%26y%3D2',{maxRedirects:0});assert.equal(response.status(),307,old);const target=new URL(response.headers().location,baseURL);assert.equal(target.pathname,destination);assert.deepEqual(target.searchParams.getAll('tag'),['a','b']);assert.equal(target.searchParams.get('empty'),'');assert.equal(target.searchParams.get('preview'),'http://localhost:3001/a?x=1&y=2');
 }console.log('PASS four HTTP redirects: project path and repeated/empty/encoded query values preserved');
 for(const view of (supplement?['fit']:['full','fit']) as ('full'|'fit')[]){
  console.log(`ROUND ${round} VIEW ${view}`);
  if(!supplement){passed+=await existing(page,view);if(round==='1')try{await migrate(page,view);}catch(error){process.exitCode=1;console.log('FAILED migration local '+view,String(error));}}
  const imported=path.resolve(workspace,'.slightnudge/repositories/source-proof');if(fs.existsSync(imported)){assert.ok(imported.startsWith(path.resolve(workspace)+path.sep));fs.renameSync(imported,imported+'-retained-'+view);}
  try{passed+=await checkImportedAdvancedImages(page,baseURL,workspace,root,async(page,base,workspace,root,repository)=>{const count=await existing(page,view,repository);if(round==='1')try{await migrate(page,view,repository);}catch(error){process.exitCode=1;console.log('FAILED migration imported '+view,String(error));}return count;});}catch(error){process.exitCode=1;console.log('FAILED imported setup/workflow '+view,String(error));}
  assert.ok(browser, 'The workflow browser must still be open'); await browser.close();browser=undefined;
  if(!supplement){const selectionLog=path.join(evidence,`round-${round}-selection-${view}.log`),fd=fs.openSync(selectionLog,'w');
  const code=await new Promise<number|null>((resolve,reject)=>{const child=spawn(process.execPath,['--require',path.join(root,'test/unified-navigation-preload.cjs'),'--import','tsx',path.join(root,'test/step1-selection.test.ts')],{cwd:root,env:{...process.env,STUDIO_BASE_URL:baseURL,UNIFIED_TEST_VIEW:view},stdio:['ignore',fd,fd]});child.once('error',reject);child.once('exit',resolve);});fs.closeSync(fd);fs.writeFileSync(selectionLog+'.exit.json',JSON.stringify({code,view,round}));console.log(`UNCHANGED SELECTION ${view}: exit ${code}; raw output ${selectionLog}`);console.log(fs.readFileSync(selectionLog,'utf8'));if(code!==0)process.exitCode=1;}
  if(view==='full'){browser=await chromium.launch();page=await browser.newPage({viewport:{width:1600,height:1000}});}
 }
 console.log(`COMPLETED ${passed}/8 existing shared-instance workflows on canonical route; old workflow assertions and limits unchanged. Failures and unreached cases remain failures.`);
}catch(error){console.log(serverDiagnostics);throw error;}finally{
 await browser?.close();stopServer();
 fs.writeFileSync(path.join(evidence,`round-${evidenceRound}-git-status.txt`),execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}));
 fs.writeFileSync(path.join(evidence,`round-${round}-git-diff-stat.txt`),execFileSync('git',['diff','--stat'],{cwd:root,encoding:'utf8'}));
 console.log(`RAW GIT STATUS: docs/unified-editor-evidence/round-${round}-git-status.txt`);
 // Keep the disposable workspace for inspection. No source, fixture or test files
 // are deleted from the user's checkout by this qualification harness.
 console.log('Disposable workspace retained: '+workspace);
}
