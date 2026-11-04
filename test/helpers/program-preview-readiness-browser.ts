import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkProgramReadiness(page: Page, base: string, workspace: string) {
  const file=path.join(workspace,'fixtures/1-plain-static.tsx');
  const original=fs.readFileSync(file,'utf8');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let requests=0;
  await page.route('**/studio/preview/**',route=>{requests++;return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Controlled preview without adapter handshake</title><h1>Waiting for adapter</h1>'});});
  console.log('MOCKED-API/IFRAME: readiness UI only; no source-write proof');
  await page.clock.install();
  await page.goto(base+'/editor?view=full',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('iframe[title="Actual project"]').waitFor();
  await page.clock.runFor(61000);
  const status=page.getByRole('status',{name:'Preview connection status',exact:true});
  await status.waitFor({timeout:5000});
  assert.match(await status.innerText(),/\d+s elapsed/);
  assert.match(await status.innerText(),/compil|server|adapter/i);
  const retry=status.getByRole('button',{name:'Retry preview',exact:true});
  assert.equal(await retry.isEnabled(),true,'A slow preview must offer a usable retry');
  const before=requests;
  await retry.click();
  await page.waitForFunction(count=>performance.getEntriesByType('resource').filter(item=>item.name.includes('/studio/preview/')).length>count,0).catch(()=>{});
  await page.waitForTimeout(100);
  assert.ok(requests>before,'Retry requests a fresh preview document');
  assert.match(await status.innerText(),/0s elapsed|1s elapsed/,'Retry resets elapsed time');
  assert.equal(fs.readFileSync(file,'utf8'),original,'Readiness and Retry never change source');
  assert.deepEqual(errors,[]);
  console.log('PASS controlled 61-second readiness: elapsed time, likely cause, Retry, new preview load, reset clock, unchanged source');
  return 1;
}
