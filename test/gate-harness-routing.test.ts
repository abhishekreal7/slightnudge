import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

// Synthetic pages qualify harness routing only; they do not qualify product APIs.
const modulePath=process.env.GATE_PROXY_MODULE||'test/helpers/gate-page-v3.ts';
const {iframePageV3}=await import(pathToFileURL(path.resolve(modulePath)).href);
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();page.setDefaultTimeout(2000);
 await page.setContent(`<iframe title="Actual project" srcdoc='<section aria-label="Component properties"><button onclick="document.body.dataset.clicked=1">Change</button></section><h1>Website heading</h1>'></iframe>`);
 await page.frameLocator('iframe').locator('h1').waitFor();
 await page.evaluate(()=>setTimeout(()=>{
  const region=document.createElement('section');region.setAttribute('aria-label','Component properties');
  const button=document.createElement('button');button.textContent='Change';button.onclick=()=>{document.body.dataset.clicked='host';};region.append(button);document.body.append(region);
 },200));
 const editor=iframePageV3(page);
 await editor.getByRole('region',{name:'Component properties',exact:true}).getByRole('button',{name:'Change',exact:true}).click();
 assert.equal(await page.locator('body').getAttribute('data-clicked'),'host','A delayed editor control must not route into the website');
 assert.equal(await page.frameLocator('iframe').locator('body').getAttribute('data-clicked'),null);
 assert.equal(iframePageV3(editor),editor,'Wrapping an already wrapped Page is idempotent');
 await page.evaluate(()=>setTimeout(()=>{
  const ready=document.createElement('section');ready.dataset.sourceReady='true';ready.textContent='Preview ready';document.body.append(ready);
 },100));
 await editor.locator('[data-source-ready="true"]').waitFor();
 assert.equal(await editor.locator('h1').textContent(),'Website heading');
 console.log('PASS HARNESS-ONLY: delayed host control, nested control scope, idempotence, readiness, website heading');
} finally {await browser.close();}
