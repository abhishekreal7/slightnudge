import { checkAppearanceLayout } from './helpers/appearance-layout-browser';
import { checkSharedInstances as originalCheckSharedInstances } from './helpers/shared-instance-browser';
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

async function checkSharedInstances(page:any,...args:any[]) {
 args[2]=args[1]; // screenshots and compatibility reports stay in the temp workspace
 const wrapped=new Proxy(page,{get(target,key){
  if(key==='goto')return (address:string,options:any)=>{const url=new URL(address);if(url.protocol==='http:'&&(url.pathname==='/studio'||url.pathname.endsWith('/edit')))url.searchParams.set('legacyStudio','1');return target.goto(url.toString(),options);};
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 let rejectPageError:any;const pageFailure=new Promise((_resolve,reject)=>{rejectPageError=(error:Error)=>reject(error);page.once('pageerror',rejectPageError);});
 try{return await Promise.race([(originalCheckSharedInstances as any)(wrapped,...args),pageFailure]);}finally{page.off('pageerror',rejectPageError);}
}

const responsiveFiles = ['test/helpers/multi-file-browser.ts', 'test/helpers/group-crash-worker.ts', 'lib/slightnudge/source-group.ts', 'lib/slightnudge/source-group-journal.ts', 'app/api/slightnudge/change-set/route.ts', 'test/helpers/single-canvas-browser.ts', 'components/slightnudge/CanvasStage.tsx', 'components/slightnudge/canvas-stage.module.css', 'test/helpers/editor-ergonomics-browser.ts', 'app/api/slightnudge/responsive/route.ts', 'components/slightnudge/ResponsiveControls.tsx', 'components/slightnudge/responsive-controls.module.css', 'test/helpers/responsive-editing-browser.ts', 'test/helpers/imported-responsive-browser.ts'];
if (process.argv.includes('--demo') && (process.argv.includes('--live') || process.argv.includes('--imported') || process.argv.includes('--source-project'))) {
  throw new Error('Imported-project interactive demos are not available yet. Use --m1 --demo for the current Studio with real edits in a disposable copy.');
}
const configuredTemp = process.env.TEMP || '';
if(!path.resolve(configuredTemp).startsWith(path.join(root,'scratch','security-hardening-20261101')+path.sep))throw Error('Temp root must stay inside this project');
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-review-consent-'));fs.mkdirSync(path.join(workspace,'docs'),{recursive:true});
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
const env: NodeJS.ProcessEnv = { SLIGHTNUDGE_LEGACY_STUDIO: '1', NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1' };
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
try {
  if (!gatesOnly) {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server && server.exitCode !== null) throw new Error('Isolated server exited before startup');
    try { if ((await fetch(`${baseURL}/fixtures/1`, { signal: AbortSignal.timeout(10000) })).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'Isolated server must start');
  browser = await chromium.launch({ headless: !process.argv.includes('--demo') });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('response', async response => {if(/\/api\/slightnudge\/(apply|undo|change-set)(?:\/status)?$/.test(new URL(response.url()).pathname))console.log('GATE HTTP',new URL(response.url()).pathname,response.status(),await response.text().catch(()=>'<unavailable>'));});
  page.on('requestfailed', request => {if(request.url().includes('/api/slightnudge/'))console.log('GATE REQUEST FAILED',new URL(request.url()).pathname,request.failure()?.errorText);});
  let resetDemo = () => {};
  if(process.argv.includes('--appearance-layout')){
    passed=await checkAppearanceLayout(page,baseURL,workspace,root);
    passed+=await checkImportedAdvancedImages(page,baseURL,workspace,root,checkAppearanceLayout);
  }else if(process.argv.includes('--shared-instances')){
    passed=await checkSharedInstances(page,baseURL,workspace,workspace);
    fs.mkdirSync(path.join(workspace,'docs'),{recursive:true});passed+=await checkImportedAdvancedImages(page,baseURL,workspace,workspace,checkSharedInstances);
  }else if(process.argv.includes('--component-ownership-all')||process.argv.includes('--component-ownership-project')){
    const workflow=(page:Parameters<typeof checkComponentProps>[0],base:string,workspace:string,root:string,repository?:Parameters<typeof checkComponentProps>[4])=>checkComponentProps(page,base,workspace,root,repository,true);
    if(!process.argv.includes('--component-ownership-project'))passed=await workflow(page,baseURL,workspace,root);
    passed+=await checkImportedAdvancedImages(page,baseURL,workspace,root,workflow);
  }else if (process.argv.includes('--component-props-all')) {
    passed = await checkComponentProps(page, baseURL, workspace, root);
    passed += await checkImportedAdvancedImages(page, baseURL, workspace, root, checkComponentProps);
  } else if (process.argv.includes('--icon-replacement-all') || process.argv.includes('--icon-replacement-project') || process.argv.includes('--icon-replacement')) {
    const workflow = (page: Parameters<typeof checkIconProperties>[0], base: string, workspace: string, root: string, repository?: Parameters<typeof checkIconProperties>[4]) => checkIconProperties(page, base, workspace, root, repository, true);
    if (!process.argv.includes('--icon-replacement-project')) passed += await workflow(page, baseURL, workspace, root);
    if (!process.argv.includes('--icon-replacement')) passed += await checkImportedAdvancedImages(page, baseURL, workspace, root, workflow);
  } else if (process.argv.includes('--icon-properties-all')) {
    passed = await checkIconProperties(page, baseURL, workspace, root);
    passed += await checkImportedAdvancedImages(page, baseURL, workspace, root, checkIconProperties);
  } else if (process.argv.includes('--icon-properties-project')) {
    passed = await checkImportedAdvancedImages(page, baseURL, workspace, root, checkIconProperties);
  } else if (process.argv.includes('--icon-properties')) {
    passed = await checkIconProperties(page, baseURL, workspace, root);
  } else if (process.argv.includes('--component-actions-project')) {
    passed = await checkImportedAdvancedImages(page, baseURL, workspace, root, checkComponentActions);
  } else if (process.argv.includes('--component-actions')) {
    passed = await checkComponentActions(page, baseURL, workspace, root);
  } else if (process.argv.includes('--image-advanced-project')) {
    passed = await checkImportedAdvancedImages(page, baseURL, workspace, root);
  } else if (process.argv.includes('--image-advanced')) {
    passed = await checkAdvancedImages(page, baseURL, workspace, root);
  } else if (process.argv.includes('--image-content')) {
    passed = await checkImageContent(page, baseURL, workspace, root);
  } else if (process.argv.includes('--image-framing')) {
    passed = await checkImageFraming(page, baseURL, workspace, root);
  } else if (process.argv.includes('--high-fidelity')) {
    passed = await checkHighFidelity(page, baseURL, workspace, root);
  } else if (process.argv.includes('--real-multi-file')) {
    passed = await checkRealMultiFile(page, baseURL, workspace, root);
  } else if (process.argv.includes('--core-editing')) {
    passed = await checkCoreEditing(page, baseURL, workspace);
    if (process.argv.includes('--compatibility')) passed += await checkProjectCompatibility(page, baseURL, workspace, root);
  } else if (process.argv.includes('--real-project')) {
    passed = await checkRealProjectCanvas(page, baseURL, workspace, root);
  } else if (process.argv.includes('--imported-canvas')) {
    passed = await checkImportedCanvas(page, baseURL, workspace);
  } else if (process.argv.includes('--compatibility')) {
    passed = await checkProjectCompatibility(page, baseURL, workspace, root);
  } else if (process.argv.includes('--multi-file')) {
    passed = await checkMultiFile(page, baseURL, workspace);
  } else if (process.argv.includes('--single-canvas')) {
    passed = await checkSingleCanvas(page, baseURL, workspace);
  } else if (process.argv.includes('--responsive-project')) {
    passed = await checkImportedResponsive(page, baseURL, workspace);
  } else if (process.argv.includes('--workspace-layout')) {
    await checkEditorErgonomics(page, baseURL, workspace);
    passed = await checkResponsiveEditing(page, baseURL, workspace, true);
  } else if (process.argv.includes('--responsive')) {
    passed = await checkResponsiveEditing(page, baseURL, workspace);
  } else if (process.argv.includes('--layout-controls')) {
    passed = await checkLayoutControls(page, baseURL, workspace);
  } else if (process.argv.includes('--container-move')) {
    passed = await checkContainerMove(page, baseURL, workspace);
  } else if (process.argv.includes('--section-order')) {
    passed = await checkSectionOrder(page, baseURL, workspace);
  } else if (process.argv.includes('--window')) {
    passed = await checkLiveWindow(page, baseURL, workspace);
  } else if (process.argv.includes('--buttons')) {
    passed = await checkButtonEditing(page, baseURL, workspace);
    if (process.argv.includes('--unified-canvas')) {
      await page.close();
      const freshPage = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
      passed += await checkUnifiedCanvas(freshPage, baseURL, workspace);
    }
  } else if (process.argv.includes('--unified-canvas')) {
    passed = await checkUnifiedCanvas(page, baseURL, workspace);
  } else if (process.argv.includes('--inline-text')) {
    passed = await checkInlineText(page, baseURL, workspace);
  } else if (process.argv.includes('--continuous-draft')) {
    passed = await checkContinuousDraft(page, baseURL, workspace);
  } else if (process.argv.includes('--workspace-ui')) {
    passed = await checkWorkspaceRedesign(page, baseURL);
  } else if (process.argv.includes('--manipulation-regression')) {
    passed = await checkStudioResize(page, baseURL, workspace);
    passed += await checkDirectManipulation(page, baseURL, workspace);
  } else if (process.argv.includes('--drag-move')) {
    passed = await checkDragMove(page, baseURL, workspace);
  } else if (process.argv.includes('--direct-manipulation')) {
    passed = await checkDirectManipulation(page, baseURL, workspace);
  } else if (process.argv.includes('--reload-recovery')) {
    passed = await checkStudioReloadRecovery(page, baseURL, workspace);
  } else if (process.argv.includes('--source-project')) {
    passed = await checkSourceProject(page, baseURL, workspace);
  } else if (process.argv.includes('--resize')) {
    passed = await checkStudioResize(page, baseURL, workspace);
  } else if (process.argv.includes('--m1')) {
    passed = await checkM1Interactions(page, baseURL, workspace);
  } else if (process.argv.includes('--current-live')) {
    passed = await checkCurrentStudioLive(page, baseURL, workspace);
  } else if (process.argv.includes('--current-studio')) {
    passed = await checkCurrentStudioReview(page, baseURL);
  } else if (process.argv.includes('--live')) {
    passed = await checkLiveReview(page, baseURL, workspace);
  } else if (process.argv.includes('--imported')) {
    passed = await checkImportedReview(page, baseURL);
  } else {
  let applies = 0;
  let previewCount = 0;
  let rejectApply = false;
  let rejectPreview = false;
  let releasePreview: (() => void) | undefined;
  let delayPreview = false;
  resetDemo = () => { delayPreview = false; rejectPreview = false; rejectApply = false; };
  await page.route('**/api/slightnudge/**', async route => {
    const url = new URL(route.request().url());
    let body: Record<string, unknown> = { success: true };
    let status = 200;
    if (url.pathname.endsWith('/token')) body = { token: 'isolated-browser-test-placeholder' };
    else if (url.pathname.endsWith('/inspect')) body = { success: true, safeToEdit: true, textEditable: true, className: 'text-3xl font-semibold' };
    else if (url.pathname.endsWith('/preview') && route.request().method() === 'POST') {
      previewCount++;
      if (delayPreview) await new Promise<void>(resolve => { releasePreview = resolve; });
      body = { success: true, changed: true, id: `preview-${previewCount}`, filePath: 'fixtures/1-plain-static.tsx', summary: 'Change text size', oldValue: 'text-3xl', newValue: 'text-4xl', oldClassName: 'text-3xl font-semibold', newClassName: 'text-4xl font-semibold', previewType: 'className' };
      if (rejectPreview) { status = 422; body = { success: false, error: 'This style cannot be previewed safely.' }; }
    } else if (url.pathname.endsWith('/apply')) {
      applies++;
      status = rejectApply ? 409 : 200;
      body = rejectApply ? { success: false, error: 'Source changed outside the editor. Discard and select again.' } : { success: true, className: 'text-4xl font-semibold', message: 'Applied.' };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(`${baseURL}${editorPath}`);
  const heading = page.locator('.sn-preview-content h1').first();
  if (process.argv.includes('--studio')) {
    await heading.waitFor();
    const fixture = fs.readFileSync(path.join(workspace, 'fixtures/1-plain-static.tsx'), 'utf8');
    const sourceClasses = fixture.match(/<h1\s+id="target"[^>]*className="([^"]*)"/);
    assert.ok(sourceClasses, 'Disposable fixture must have a literal heading class');
    assert.equal(await heading.getAttribute('class'), sourceClasses[1], 'Studio must render the real fixture classes, not separate default metadata'); passed++;
    assert.equal(await heading.getAttribute('data-source-file'), 'fixtures/1-plain-static.tsx'); passed++;
    assert.equal(await page.getByRole('link', { name: '1 Product overview' }).getAttribute('href'), '/studio?page=1', 'Studio page navigation must stay in the common editor'); passed++;
  }
  await heading.click();
  await page.locator('#slightnudge-safety-ok').waitFor();
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await page.getByRole('button', { name: 'Apply to code', exact: true }).waitFor();
  assert.equal(await heading.getAttribute('class'), 'text-4xl font-semibold', 'Preview must retain unrelated classes when the API returns a single changed token'); passed++;
  if (process.argv.includes('--screenshot')) {
    const screenshotPath = path.join(os.tmpdir(), 'slightnudge-review-studio.png');
    await page.waitForTimeout(500);
    await page.screenshot({ path: screenshotPath });
    console.log(`Review screenshot: ${screenshotPath}`);
  }
  await page.locator('.sn-preview-content p').first().click({ force: true });
  await page.waitForTimeout(300);
  assert.equal(applies, 0, 'Selecting another element must never apply a preview'); passed++;
  assert.equal(await page.getByRole('button', { name: 'Apply to code', exact: true }).count(), 1, 'Pending review must remain visible'); passed++;
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  assert.equal(previewCount, 1, 'A pending review must block a second change');
  assert.equal(applies, 0, 'A second change must never implicitly apply the first'); passed++;
  assert.ok(await page.getByText('Not saved to source', { exact: true }).isVisible(), 'Review must explain that the preview is unsaved');
  assert.ok(await page.getByLabel('Before change').isVisible());
  assert.ok(await page.getByLabel('After change').isVisible()); passed++;
  rejectApply = true;
  await page.getByRole('button', { name: 'Apply to code', exact: true }).click();
  await page.getByText('Source changed outside the editor. Discard and select again.', { exact: true }).waitFor();
  assert.equal(applies, 1);
  assert.ok(await page.getByRole('button', { name: 'Apply to code', exact: true }).isVisible(), 'Failed Apply must retain review'); passed++;
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await page.waitForTimeout(200);
  assert.equal(applies, 1, 'Discard must not apply');
  assert.equal(await heading.getAttribute('class'), 'text-3xl font-semibold'); passed++;
  delayPreview = true;
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#slightnudge-selected-box') !== null);
  for (let i = 0; i < 100 && !releasePreview; i++) await page.waitForTimeout(20);
  assert.ok(releasePreview, 'Second preview request must be in flight');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#slightnudge-selected-box').count(), 1, 'Escape must not detach an in-flight preview from its selected element'); passed++;
  releasePreview();
  await page.getByRole('button', { name: 'Apply to code', exact: true }).waitFor();
  rejectApply = false;
  await page.getByRole('button', { name: 'Apply to code', exact: true }).click();
  await page.getByRole('button', { name: 'Apply to code', exact: true }).waitFor({ state: 'hidden' });
  assert.equal(applies, 2, 'Explicit successful Apply must send exactly one additional request'); passed++;
  delayPreview = false; rejectPreview = true;
  const beforeRefusal = await heading.getAttribute('class');
  await page.getByTitle('Toggle bold', { exact: true }).click();
  await page.getByText('This style cannot be previewed safely.', { exact: true }).waitFor();
  assert.equal(await heading.getAttribute('class'), beforeRefusal, 'Refused preview must not leave a fake visual change'); passed++;
  }
  const realAPI = ['--appearance-layout', '--shared-instances', '--component-ownership-all', '--component-ownership-project', '--component-props-all', '--icon-replacement-all', '--icon-replacement-project', '--icon-replacement', '--icon-properties', '--icon-properties-project', '--icon-properties-all', '--multi-file', '--single-canvas', '--workspace-layout', '--responsive-project', '--responsive', '--layout-controls', '--container-move', '--section-order', '--window', '--buttons', '--unified-canvas', '--inline-text', '--continuous-draft', '--manipulation-regression', '--drag-move', '--direct-manipulation', '--reload-recovery', '--resize', '--source-project', '--m1', '--live', '--current-live'].some(flag => process.argv.includes(flag));
  console.log(`PASS: ${passed} review-consent browser cases (${realAPI || process.argv.includes('--component-actions-project') || process.argv.includes('--component-actions') || process.argv.includes('--image-advanced-project') || process.argv.includes('--image-advanced') || process.argv.includes('--image-content') || process.argv.includes('--image-framing') || process.argv.includes('--high-fidelity') || process.argv.includes('--real-multi-file') || process.argv.includes('--core-editing') || process.argv.includes('--real-project') || process.argv.includes('--compatibility') || process.argv.includes('--imported-canvas') ? 'real API' : 'mocked API'}; disposable source copy)`);
  if (process.argv.includes('--demo')) {
    resetDemo();
    await page.reload();
    console.log(process.argv.includes('--current-live') || process.argv.includes('--m1')
      ? 'Current Studio demo ready. Select the heading, click Toggle bold, review Before/After, Discard or Apply to code, then Undo. Real source writes affect ONLY this disposable copy. Close the browser to delete it.'
      : 'Consent demo ready. Editing API responses are mocked. Close this browser to delete the disposable copy.');
    await new Promise<void>(resolve => browser!.once('disconnected', () => resolve()));
    browser = undefined;
  }
  }
  if (process.argv.includes('--gates') || gatesOnly) {
    await browser?.close(); browser = undefined;
    stopServer();
    for (const [label, args] of [
      ['Application typecheck', [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--incremental', 'false']],
      ['Application build', [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack']],
    ] as const) {
      const gateEnv: NodeJS.ProcessEnv = { ...env, NODE_ENV: label === 'Application build' ? 'production' : 'development' };
      const result = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(process.execPath, [...args], { cwd: workspace, env: gateEnv, stdio: 'inherit' });
        child.once('error', reject); child.once('exit', resolve);
      });
      console.log(`${label}: exit ${result} (disposable application plus new harness; excludes historical tests/docs/scratch)`);
      if (result !== 0) process.exitCode = 1;
    }
    if (process.argv.includes('--production-smoke') && !process.exitCode) {
      const production = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: workspace, env: { ...env, NODE_ENV: 'production' }, stdio: 'ignore' });
      try {
        let ready = false;
        for (let attempt = 0; attempt < 60; attempt++) { if (production.exitCode !== null) throw new Error('Production server exited before startup'); try { if ((await fetch(baseURL, { signal: AbortSignal.timeout(5000) })).status === 200) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 300)); }
        assert.ok(ready, 'Production application must start without contacting external accounts');
        for (const [target, expected, method] of [
          ['/api/slightnudge/token', 501, 'GET'], ['/api/slightnudge/repositories', 501, 'GET'], ['/api/slightnudge/change-set', 501, 'POST'], ['/api/slightnudge/history', 501, 'POST'],
          ['/api/checkout/simulate?runId=run_test&action=confirm', 404, 'GET'],
          ['/api/runs/private', 401, 'GET'], ['/api/runs/private/report.pdf', 401, 'GET'],
          ['/api/checkout', 401, 'POST'], ['/api/sites', 401, 'POST'], ['/api/runs', 401, 'POST'],
        ] as const) { const response = await fetch(baseURL + target, { method, redirect: 'manual', signal: AbortSignal.timeout(10000) }); assert.equal(response.status, expected, `${method} ${target}`); }
        const signIn = await fetch(baseURL + '/login'); assert.equal(signIn.status, 200); const html = await signIn.text(); assert.ok(html.includes('Account sign-in awaits service setup')); assert.ok(!html.includes('window.__SLIGHTNUDGE_TOKEN__ ='));
        console.log('PASS production HTTP smoke: application/sign-in page available, filesystem editor unavailable, simulated payment disabled, authenticated run/site/checkout/report boundaries enforced, no local source token in production HTML');
      } finally { if (production.pid) { try { execFileSync('taskkill', ['/pid', String(production.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} } }
    }
  }
} catch (error) {
  if (serverDiagnostics) console.log('Isolated application diagnostics', serverDiagnostics);
  if (serverDiagnostics.includes('SyntaxError')) {
    const serverRoot = path.join(workspace, '.next/dev/server');
    if (fs.existsSync(serverRoot)) for (const name of fs.readdirSync(serverRoot, { recursive: true }).filter((value): value is string => typeof value === 'string' && value.endsWith('.js'))) {
      const generated = path.join(serverRoot, name);
      try { new Script(fs.readFileSync(generated, 'utf8'), { filename: generated }); }
      catch (failure) { console.log('Generated server module syntax failure', String(failure instanceof Error ? failure.stack : failure).slice(0, 2400)); }
    }
  }
  if (process.argv.includes('--unified-canvas')) {
    const nextLog = path.join(workspace, '.next/dev/logs/next-development.log');
    if (fs.existsSync(nextLog)) console.log('Refresh diagnostics', fs.readFileSync(nextLog, 'utf8').split(/\r?\n/).filter(line => /reload|Fast Refresh|"level":"ERROR"/i.test(line)).slice(-15).join('\n'));
    const failedPage = browser?.contexts()[0]?.pages()[0];
    if (failedPage) {
      await failedPage.screenshot({ path: path.join(root, 'docs/unified-canvas-failure.png') }).catch(() => {});
      console.log('Canvas failure state', await failedPage.locator('body').innerText().catch(() => 'unavailable'));
      console.log('Canvas geometry', JSON.stringify(await failedPage.evaluate(() => ({
        preview: document.querySelector('[aria-label="Actual project preview"]')?.outerHTML.slice(0, 500),
        messages: (window as any).canvasMessages,
        controls: [...document.querySelectorAll<HTMLElement>('[aria-label="Selected source element"], [role="toolbar"]')].map(element => ({ html: element.outerHTML.slice(0, 1000), rect: element.getBoundingClientRect().toJSON(), visibility: getComputedStyle(element).visibility })),
        headings: [...(document.querySelector('iframe')?.contentDocument?.querySelectorAll('h1') || [])].map(element => ({ rect: element.getBoundingClientRect().toJSON(), html: element.outerHTML })),
      })).catch(() => 'unavailable'), null, 2));
    }
  }
  throw error;
} finally {
  await browser?.close();
  stopServer();
  const resolved = path.resolve(workspace);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('sn-review-consent-'));
  try { const dest=path.join(root,'docs/security-hardening/shared-workflows');fs.mkdirSync(dest,{recursive:true});for(const name of fs.readdirSync(path.join(workspace,'docs'))){if(/\.(png|json|log|txt)$/.test(name))fs.copyFileSync(path.join(workspace,'docs',name),path.join(dest,name));} }catch(error){console.error('Could not preserve temp evidence',error);}
  try { fs.unlinkSync(path.join(workspace, 'node_modules')); fs.rmSync(workspace, { recursive: true, force: true }); }
  catch { console.log(`Temporary copy requires manual cleanup: ${workspace}`); }
}
