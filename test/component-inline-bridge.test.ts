import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:46113/**', route => route.fulfill({ contentType: 'text/html', body: route.request().url().includes('/frame') ? `<button id="action" data-source-file="page.tsx" data-source-line="1" data-source-column="1" style="font:600 24px/1.4 sans-serif;padding:12px 20px" onclick="document.body.dataset.clicked='yes'">Start here</button><script>${getSourceCanvasBridge(true)}</script>` : '<iframe src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46113&__slightnudge_draft=1"></iframe><script>window.messages=[];addEventListener("message",event=>messages.push(event.data))</script>' }));
  await page.goto('http://127.0.0.1:46113/'); const frame=page.frames()[1], button=frame.locator('#action');
  await button.click(); await page.waitForFunction(()=>(window as any).messages.some((message:any)=>message.type==='source-selection'));
  const selection=await page.evaluate(()=>(window as any).messages.find((message:any)=>message.type==='source-selection').selection);
  let id=0;
  const command=async(operation:string,extra:Record<string,unknown>={})=>{
    const requestId=String(++id); await page.evaluate(data=>(document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(data,location.origin),{channel:'slightnudge',session:'test',type:'source-edit',requestId,operation,selection,...extra});
    await page.waitForFunction(id=>(window as any).messages.some((message:any)=>message.requestId===id&&message.type==='edit-result'),requestId);
    const result=await page.evaluate(id=>(window as any).messages.find((message:any)=>message.requestId===id&&message.type==='edit-result'),requestId); assert.equal(result.success,true,result.reason); return result;
  };
  const originalStyle=await button.getAttribute('style'), height=await button.evaluate(element=>element.getBoundingClientRect().height);
  await command('begin-text'); const editor=frame.getByRole('textbox',{name:'Edit selected text',exact:true});
  assert.equal(await editor.evaluate(element=>getComputedStyle(element).fontSize),'24px'); assert.equal(await button.evaluate(element=>element.getBoundingClientRect().height),height);
  await editor.press('Control+a'); await editor.pressSequentially('Open the workspace <now>'); assert.equal(await editor.textContent(),'Open the workspace <now>');
  await editor.press('Enter'); assert.equal(await button.textContent(),'Open the workspace <now>'); assert.equal(await button.getAttribute('contenteditable'),null); assert.equal(await button.getAttribute('style'),originalStyle); assert.equal(await frame.locator('body').getAttribute('data-clicked'),null);
  await command('cancel-text'); assert.equal(await button.textContent(),'Start here');
  await command('begin-text'); await editor.press('Control+a'); await editor.pressSequentially('Cancel this'); await editor.press('Escape'); assert.equal(await button.textContent(),'Start here');
  await command('set-mode',{edit:false}); await button.click(); assert.equal(await frame.locator('body').getAttribute('data-clicked'),'yes');
  console.log('PASS component inline bridge: real spaces and angle brackets, inherited font/height, Enter/Escape, cancellation, unchanged button props and retained click handler');
}finally{await browser.close()}
