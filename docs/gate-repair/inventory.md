# Helper inventory

This is the complete import closure of both workflow drivers, including branches not selected by this gate. Entries identify host-page assumptions requiring review; not every listed selector belongs in the iframe.

- test/review-consent.browser.ts:284 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}${editorPath}\`)`
- test/review-consent.browser.ts:285 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-preview-content h1')`
- test/review-consent.browser.ts:293 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: '1 Product overview' })`
- test/review-consent.browser.ts:296 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('#slightnudge-safety-ok')`
- test/review-consent.browser.ts:297 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/review-consent.browser.ts:298 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/review-consent.browser.ts:306 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-preview-content p')`
- test/review-consent.browser.ts:309 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/review-consent.browser.ts:314 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/review-consent.browser.ts:315 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Before change')`
- test/review-consent.browser.ts:316 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/review-consent.browser.ts:318 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/review-consent.browser.ts:319 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Source changed outside the editor. Discard and select again.', { exact: true })`
- test/review-consent.browser.ts:321 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/review-consent.browser.ts:322 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/review-consent.browser.ts:327 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/review-consent.browser.ts:328 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('#slightnudge-selected-box') !== null)`
- test/review-consent.browser.ts:332 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('#slightnudge-selected-box')`
- test/review-consent.browser.ts:334 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/review-consent.browser.ts:336 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/review-consent.browser.ts:337 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/review-consent.browser.ts:341 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/review-consent.browser.ts:342 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('This style cannot be previewed safely.', { exact: true })`
- test/helpers/appearance-layout-browser.ts:9 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(()=>document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy')==='false',undefined,{timeout:90000})`
- test/helpers/appearance-layout-browser.ts:10 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice',{exact:true})`
- test/helpers/appearance-layout-browser.ts:11 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('summary')`
- test/helpers/appearance-layout-browser.ts:12 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Toggle design panel',exact:true})`
- test/helpers/appearance-layout-browser.ts:12 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Toggle design panel',exact:true})`
- test/helpers/appearance-layout-browser.ts:16 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/appearance-layout-browser.ts:17 — Navigation; inspect legacy route and view assumptions
  `page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000})`
- test/helpers/appearance-layout-browser.ts:17 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/appearance-layout-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Gradient angle',{exact:true})`
- test/helpers/appearance-layout-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Gradient stop 1 color',{exact:true})`
- test/helpers/appearance-layout-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Gradient stop 2 color',{exact:true})`
- test/helpers/appearance-layout-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Set gradient',exact:true})`
- test/helpers/appearance-layout-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Add stop',exact:true})`
- test/helpers/appearance-layout-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Gradient stop 2 color',{exact:true})`
- test/helpers/appearance-layout-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Set gradient',exact:true})`
- test/helpers/appearance-layout-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Shadow preset',{exact:true})`
- test/helpers/appearance-layout-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Shadow preset',{exact:true})`
- test/helpers/appearance-layout-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Shadow preset',{exact:true})`
- test/helpers/appearance-layout-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Constraint minimum width',{exact:true})`
- test/helpers/appearance-layout-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Constraint grow',{exact:true})`
- test/helpers/appearance-layout-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Constraint shrink',{exact:true})`
- test/helpers/appearance-layout-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton',{name:'Preview width',exact:true})`
- test/helpers/appearance-layout-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox',{name:'Responsive edit scope',exact:true})`
- test/helpers/appearance-layout-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Constraint minimum width',{exact:true})`
- test/helpers/appearance-layout-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Shadow preset',{exact:true})`
- test/helpers/appearance-layout-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(()=>document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy')==='false')`
- test/helpers/appearance-layout-browser.ts:28 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/appearance-layout-browser.ts:29 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Save changes',exact:true})`
- test/helpers/appearance-layout-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Undo',exact:true})`
- test/helpers/appearance-layout-browser.ts:32 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(()=>{localStorage.clear();sessionStorage.clear()})`
- test/helpers/appearance-layout-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice',{exact:true})`
- test/helpers/shared-instance-browser.ts:13 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region',{name:'Component properties',exact:true})`
- test/helpers/shared-instance-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(()=>document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy')==='false')`
- test/helpers/shared-instance-browser.ts:19 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/shared-instance-browser.ts:21 — Navigation; inspect legacy route and view assumptions
  `page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000})`
- test/helpers/shared-instance-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/shared-instance-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Toggle design panel',exact:true})`
- test/helpers/shared-instance-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox',{name:'Canvas zoom',exact:true})`
- test/helpers/shared-instance-browser.ts:32 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(()=>{const input=document.querySelector<HTMLTextAreaElement>('[aria-label="Component prop label"]');return input?.value==='Same'&&!input.disabled})`
- test/helpers/shared-instance-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/shared-instance-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Save changes',exact:true})`
- test/helpers/shared-instance-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Toggle design panel',exact:true})`
- test/helpers/shared-instance-browser.ts:40 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Undo',exact:true})`
- test/helpers/shared-instance-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(()=>{localStorage.clear();sessionStorage.clear()})`
- test/helpers/shared-instance-browser.ts:43 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice',{exact:true})`
- test/helpers/icon-properties-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Icon appearance', exact: true })`
- test/helpers/icon-properties-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/icon-properties-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/icon-properties-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(value => (document.querySelector('[aria-label="Icon size (px)"]') as HTMLInputElement)?.value === value, value)`
- test/helpers/icon-properties-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/helpers/icon-properties-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => (window as any).__iconMessages?.slice(-12))`
- test/helpers/icon-properties-browser.ts:40 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/icon-properties-browser.ts:43 — Navigation; inspect legacy route and view assumptions
  `page.goto(editorURL, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/icon-properties-browser.ts:46 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/icon-properties-browser.ts:47 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle design panel', exact: true })`
- test/helpers/icon-properties-browser.ts:48 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/icon-properties-browser.ts:55 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Replace icon')`
- test/helpers/icon-properties-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/icon-properties-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Redo', exact: true })`
- test/helpers/icon-properties-browser.ts:90 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/icon-properties-browser.ts:91 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Redo', exact: true })`
- test/helpers/icon-properties-browser.ts:98 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/icon-properties-browser.ts:102 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/icon-properties-browser.ts:104 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Browse', exact: true })`
- test/helpers/icon-properties-browser.ts:104 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Edit', exact: true })`
- test/helpers/icon-properties-browser.ts:108 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle design panel', exact: true })`
- test/helpers/icon-properties-browser.ts:114 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/icon-properties-browser.ts:117 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })`
- test/helpers/component-actions-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/component-actions-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Component action', exact: true })`
- test/helpers/component-actions-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(({ field, expected }) => (document.querySelector(\`[aria-label="${field}"]\`) as HTMLInputElement | null)?.value === expected, { field, expected })`
- test/helpers/component-actions-browser.ts:30 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(value => (document.querySelector('[aria-label="Link destination"]') as HTMLInputElement | null)?.value === value, value)`
- test/helpers/component-actions-browser.ts:34 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/component-actions-browser.ts:36 — Navigation; inspect legacy route and view assumptions
  `page.goto(baseURL + route, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/component-actions-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/component-actions-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle design panel', exact: true })`
- test/helpers/component-actions-browser.ts:38 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/component-actions-browser.ts:48 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/component-actions-browser.ts:54 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/component-actions-browser.ts:55 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Redo', exact: true })`
- test/helpers/component-actions-browser.ts:59 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/component-actions-browser.ts:67 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/component-actions-browser.ts:70 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'true')`
- test/helpers/component-actions-browser.ts:71 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/component-actions-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/component-actions-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/component-actions-browser.ts:81 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/component-actions-browser.ts:84 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Browse', exact: true })`
- test/helpers/component-actions-browser.ts:88 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Edit', exact: true })`
- test/helpers/component-actions-browser.ts:91 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/component-actions-browser.ts:93 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })`
- test/helpers/component-actions-browser.ts:97 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/component-props-browser.ts:17 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/component-props-browser.ts:18 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', {name:'Component properties',exact:true})`
- test/helpers/component-props-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(()=> !(document.querySelector('[aria-label="Component prop label"]') as HTMLTextAreaElement)?.disabled)`
- test/helpers/component-props-browser.ts:33 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/component-props-browser.ts:35 — Navigation; inspect legacy route and view assumptions
  `page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000})`
- test/helpers/component-props-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/component-props-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Toggle design panel',exact:true})`
- test/helpers/component-props-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox',{name:'Canvas zoom',exact:true})`
- test/helpers/component-props-browser.ts:44 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice',{exact:true})`
- test/helpers/component-props-browser.ts:53 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Undo',exact:true})`
- test/helpers/component-props-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Redo',exact:true})`
- test/helpers/component-props-browser.ts:60 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/component-props-browser.ts:62 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Save changes',exact:true})`
- test/helpers/component-props-browser.ts:66 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Browse',exact:true})`
- test/helpers/component-props-browser.ts:66 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Edit',exact:true})`
- test/helpers/component-props-browser.ts:66 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Toggle design panel',exact:true})`
- test/helpers/component-props-browser.ts:68 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Undo',exact:true})`
- test/helpers/component-props-browser.ts:71 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(()=>{localStorage.clear();sessionStorage.clear()})`
- test/helpers/component-props-browser.ts:74 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice',{exact:true})`
- test/helpers/advanced-image-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/advanced-image-browser.ts:28 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/advanced-image-browser.ts:30 — Navigation; inspect legacy route and view assumptions
  `page.goto(baseURL + route, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/advanced-image-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/advanced-image-browser.ts:32 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle design panel', exact: true })`
- test/helpers/advanced-image-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/advanced-image-browser.ts:38 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Image content', exact: true })`
- test/helpers/advanced-image-browser.ts:40 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(value => (document.querySelector('[aria-label="Image alt text"]') as HTMLInputElement | null)?.value === value, expectedAlt)`
- test/helpers/advanced-image-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Replace image', { exact: true })`
- test/helpers/advanced-image-browser.ts:46 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Image fit', exact: true })`
- test/helpers/advanced-image-browser.ts:49 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('textbox', { name: 'Image alt text', exact: true })`
- test/helpers/advanced-image-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton', { name: 'Preview width', exact: true })`
- test/helpers/advanced-image-browser.ts:64 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/advanced-image-browser.ts:65 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/advanced-image-browser.ts:66 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/advanced-image-browser.ts:71 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/advanced-image-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })`
- test/helpers/advanced-image-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/image-content-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 })`
- test/helpers/image-content-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('textbox', { name: 'Image alt text', exact: true })`
- test/helpers/image-content-browser.ts:27 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/image-content-browser.ts:28 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio${windowMode ? '/window' : ''}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/image-content-browser.ts:29 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/image-content-browser.ts:30 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle design panel', exact: true })`
- test/helpers/image-content-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/image-content-browser.ts:32 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Image content', exact: true })`
- test/helpers/image-content-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Image fit', exact: true })`
- test/helpers/image-content-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('textbox', { name: 'Image alt text', exact: true })`
- test/helpers/image-content-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Mark as decorative', exact: true })`
- test/helpers/image-content-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('textbox', { name: 'Image alt text', exact: true })`
- test/helpers/image-content-browser.ts:46 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Replace image', { exact: true })`
- test/helpers/image-content-browser.ts:51 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/image-content-browser.ts:52 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Redo', exact: true })`
- test/helpers/image-content-browser.ts:53 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/image-content-browser.ts:55 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/image-content-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/image-content-browser.ts:60 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/image-content-browser.ts:63 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })`
- test/helpers/image-content-browser.ts:67 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/image-framing-browser.ts:13 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/image-framing-browser.ts:17 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/image-framing-browser.ts:18 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio${windowMode ? '/window' : ''}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/image-framing-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/image-framing-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle design panel', exact: true })`
- test/helpers/image-framing-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/image-framing-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Image framing', exact: true })`
- test/helpers/image-framing-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name, exact: true })`
- test/helpers/image-framing-browser.ts:30 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/image-framing-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Redo', exact: true })`
- test/helpers/image-framing-browser.ts:32 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Responsive edit scope', exact: true })`
- test/helpers/image-framing-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 768)`
- test/helpers/image-framing-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton', { name: 'Preview width', exact: true })`
- test/helpers/image-framing-browser.ts:38 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 375)`
- test/helpers/image-framing-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 768)`
- test/helpers/image-framing-browser.ts:44 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/image-framing-browser.ts:45 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/image-framing-browser.ts:47 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/image-framing-browser.ts:49 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/image-framing-browser.ts:52 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })`
- test/helpers/imported-review-browser.ts:43 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/review-consent\`)`
- test/helpers/imported-review-browser.ts:44 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Connect', exact: true })`
- test/helpers/imported-review-browser.ts:45 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-live-preview-frame')`
- test/helpers/imported-review-browser.ts:57 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Source verified', { exact: true })`
- test/helpers/imported-review-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-imported-control')`
- test/helpers/imported-review-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('legend', { hasText: /^Weight$/ })`
- test/helpers/imported-review-browser.ts:60 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/imported-review-browser.ts:67 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-live-selection-status')`
- test/helpers/imported-review-browser.ts:72 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/helpers/imported-review-browser.ts:73 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Before change')`
- test/helpers/imported-review-browser.ts:73 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/helpers/imported-review-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Source changed outside the editor. Discard and select again.', { exact: true })`
- test/helpers/imported-review-browser.ts:77 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/imported-review-browser.ts:87 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-live-selection-status')`
- test/helpers/imported-review-browser.ts:95 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-live-selection-status')`
- test/helpers/imported-review-browser.ts:96 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('The reviewed source changed. Select the element again.', { exact: true })`
- test/helpers/live-review-browser.ts:20 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/fixtures/1\`)`
- test/helpers/live-review-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-preview-content h1#target')`
- test/helpers/live-review-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('#slightnudge-safety-ok')`
- test/helpers/live-review-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/live-review-browser.ts:27 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/live-review-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-preview-content p')`
- test/helpers/live-review-browser.ts:40 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/live-review-browser.ts:52 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/live-review-browser.ts:55 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('#slightnudge-safety-ok')`
- test/helpers/live-review-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/live-review-browser.ts:66 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/live-review-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('#slightnudge-selected-box')`
- test/helpers/live-review-browser.ts:80 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('#slightnudge-selected-box')`
- test/helpers/current-studio-review-browser.ts:41 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'domcontentloaded' })`
- test/helpers/current-studio-review-browser.ts:43 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/current-studio-review-browser.ts:48 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/current-studio-review-browser.ts:49 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText(/Test refusal: dynamic/)`
- test/helpers/current-studio-review-browser.ts:52 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/current-studio-review-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('p')`
- test/helpers/current-studio-review-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/current-studio-review-browser.ts:60 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/current-studio-review-browser.ts:61 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/helpers/current-studio-review-browser.ts:62 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Before change')`
- test/helpers/current-studio-review-browser.ts:63 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/helpers/current-studio-review-browser.ts:66 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('aside')`
- test/helpers/current-studio-review-browser.ts:66 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('heading', { name: 'Review change', exact: true })`
- test/helpers/current-studio-review-browser.ts:70 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/current-studio-review-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/current-studio-review-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Edit text directly on canvas')`
- test/helpers/current-studio-review-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('input:focus')`
- test/helpers/current-studio-review-browser.ts:83 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText(/Test refusal: dynamic/)`
- test/helpers/current-studio-review-browser.ts:86 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/current-studio-review-browser.ts:90 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText(/Test apply failure/)`
- test/helpers/current-studio-review-browser.ts:98 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/current-studio-review-browser.ts:105 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/current-studio-review-browser.ts:106 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText(/Test undo failure/)`
- test/helpers/current-studio-review-browser.ts:109 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/current-studio-review-browser.ts:111 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Edit text directly on canvas')`
- test/helpers/current-studio-review-browser.ts:112 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('input:focus')`
- test/helpers/current-studio-review-browser.ts:113 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('input:focus')`
- test/helpers/current-studio-review-browser.ts:115 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/current-studio-review-browser.ts:116 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/current-studio-review-browser.ts:117 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/helpers/current-studio-review-browser.ts:120 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('More actions', { exact: true })`
- test/helpers/current-studio-review-browser.ts:121 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move earlier', exact: true })`
- test/helpers/current-studio-review-browser.ts:123 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('More actions', { exact: true })`
- test/helpers/current-studio-review-browser.ts:126 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/current-studio-review-browser.ts:127 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText(/source target is ambiguous/)`
- test/helpers/current-studio-review-browser.ts:130 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Pages', exact: true })`
- test/helpers/current-studio-review-browser.ts:131 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('span')`
- test/helpers/current-studio-live-browser.ts:17 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'domcontentloaded' })`
- test/helpers/current-studio-live-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/current-studio-live-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/current-studio-live-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/current-studio-live-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('p')`
- test/helpers/current-studio-live-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/current-studio-live-browser.ts:44 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/helpers/current-studio-live-browser.ts:47 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/current-studio-live-browser.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(weight => getComputedStyle(document.querySelector('h1')!).fontWeight === weight, originalWeight)`
- test/helpers/current-studio-live-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/helpers/m1-interactions-browser.ts:13 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'domcontentloaded' })`
- test/helpers/m1-interactions-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/m1-interactions-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/m1-interactions-browser.ts:17 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('group', { name: 'Element state' })`
- test/helpers/m1-interactions-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/m1-interactions-browser.ts:28 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => getComputedStyle(document.querySelector('h1')!).fontWeight === '700')`
- test/helpers/m1-interactions-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/helpers/m1-interactions-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(w => getComputedStyle(document.querySelector('h1')!).fontWeight === w, originalWeight)`
- test/helpers/m1-interactions-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/m1-interactions-browser.ts:45 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Transitions', exact: true })`
- test/helpers/m1-interactions-browser.ts:47 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel(label, { exact: true })`
- test/helpers/m1-interactions-browser.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/helpers/m1-interactions-browser.ts:51 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/m1-interactions-browser.ts:52 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/helpers/m1-interactions-browser.ts:54 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel(label, { exact: true })`
- test/helpers/m1-interactions-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/helpers/m1-interactions-browser.ts:63 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel(label, { exact: true })`
- test/helpers/m1-interactions-browser.ts:65 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('This style is already applied.', { exact: true })`
- test/helpers/m1-interactions-browser.ts:70 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/m1-interactions-browser.ts:74 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('More actions')`
- test/helpers/m1-interactions-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move earlier', exact: true })`
- test/helpers/m1-interactions-browser.ts:76 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Drag to reorder element (iOS style)')`
- test/helpers/m1-interactions-browser.ts:77 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Overflow', { exact: true })`
- test/helpers/m1-interactions-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Object', { exact: true })`
- test/helpers/m1-interactions-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Position', { exact: true })`
- test/helpers/studio-resize-browser.ts:12 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`)`
- test/helpers/studio-resize-browser.ts:13 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/studio-resize-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Drag to resize width' })`
- test/helpers/studio-resize-browser.ts:18 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel')))`
- test/helpers/studio-resize-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/studio-resize-browser.ts:27 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/studio-resize-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/studio-resize-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Maximum width', { exact: true })`
- test/helpers/studio-resize-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/helpers/studio-resize-browser.ts:42 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/studio-resize-browser.ts:45 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/studio-resize-browser.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => window.dispatchEvent(new Event('blur')))`
- test/helpers/studio-resize-browser.ts:55 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/studio-resize-browser.ts:59 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/studio-resize-browser.ts:61 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('group', { name: 'Move selected element', exact: true })`
- test/helpers/studio-resize-browser.ts:73 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move down', exact: true })`
- test/helpers/studio-resize-browser.ts:80 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/studio-resize-browser.ts:82 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => new DOMMatrix(getComputedStyle(document.querySelector('h1')!.parentElement!).transform).m42 === expected, beforeMargin, { timeout: 3000 })`
- test/helpers/studio-resize-browser.ts:84 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move down', exact: true })`
- test/helpers/studio-resize-browser.ts:90 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/studio-resize-browser.ts:92 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => new DOMMatrix(getComputedStyle(document.querySelector('h1')!.parentElement!).transform).m42 === expected, beforeMargin)`
- test/helpers/studio-resize-browser.ts:93 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('One thoughtful workspace for the people, projects, and plans that move your business forward.', { exact: true })`
- test/helpers/studio-resize-browser.ts:96 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Visual editing workspace')`
- test/helpers/studio-resize-browser.ts:96 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice')`
- test/helpers/studio-resize-browser.ts:99 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: \`Move ${direction}\`, exact: true })`
- test/helpers/studio-resize-browser.ts:105 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/studio-resize-browser.ts:117 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/source-project-browser.ts:61 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/edit\`, { waitUntil: 'domcontentloaded', timeout: 60000 })`
- test/helpers/source-project-browser.ts:67 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Project URL', { exact: true })`
- test/helpers/source-project-browser.ts:68 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Connect', exact: true })`
- test/helpers/source-project-browser.ts:69 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Live source connected', { exact: true })`
- test/helpers/source-project-browser.ts:76 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === expected, marker)`
- test/helpers/source-project-browser.ts:82 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/source-project-browser.ts:83 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/source-project-browser.ts:88 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/source-project-browser.ts:89 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 })`
- test/helpers/source-project-browser.ts:92 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/source-project-browser.ts:127 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Check save status', exact: true })`
- test/helpers/source-project-browser.ts:130 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/source-project-browser.ts:131 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Save status unconfirmed', { exact: true })`
- test/helpers/source-project-browser.ts:138 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/source-project-browser.ts:144 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/source-project-browser.ts:146 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Live source connected', { exact: true })`
- test/helpers/source-project-browser.ts:149 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => Boolean(document.querySelector('iframe')))`
- test/helpers/source-project-browser.ts:157 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/source-project-browser.ts:159 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/source-project-browser.ts:160 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Live source connected', { exact: true })`
- test/helpers/source-project-browser.ts:179 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/source-project-browser.ts:180 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Check Undo status', exact: true })`
- test/helpers/source-project-browser.ts:182 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Undo status unconfirmed. Editing is paused until it is checked.', { exact: true })`
- test/helpers/source-project-browser.ts:193 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/source-project-browser.ts:194 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Live source connected', { exact: true })`
- test/helpers/source-project-browser.ts:210 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/source-project-browser.ts:211 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/source-project-browser.ts:212 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Live source connected', { exact: true })`
- test/helpers/source-project-browser.ts:233 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/source-project-browser.ts:234 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('alert')`
- test/helpers/source-selection-workflows.ts:10 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('iframe[title="Actual project"]')`
- test/helpers/source-selection-workflows.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Live source connected', { exact: true })`
- test/helpers/source-selection-workflows.ts:87 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === expected, receipt)`
- test/helpers/source-selection-workflows.ts:91 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('select')`
- test/helpers/source-selection-workflows.ts:91 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('option[value="font-bold"]')`
- test/helpers/source-selection-workflows.ts:94 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 })`
- test/helpers/source-selection-workflows.ts:95 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/source-selection-workflows.ts:97 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/source-selection-workflows.ts:139 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/source-selection-workflows.ts:146 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 })`
- test/helpers/source-selection-workflows.ts:154 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Live source connected', { exact: true })`
- test/helpers/source-selection-workflows.ts:166 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/source-selection-workflows.ts:168 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 })`
- test/helpers/source-selection-workflows.ts:173 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Live source connected', { exact: true })`
- test/helpers/workspace-redesign-browser.ts:19 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/workspace\`)`
- test/helpers/workspace-redesign-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: /Landing.*acme/ })`
- test/helpers/workspace-redesign-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('m0-control-lab', { exact: true })`
- test/helpers/workspace-redesign-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Share', exact: true })`
- test/helpers/workspace-redesign-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Imported', exact: true })`
- test/helpers/workspace-redesign-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: /Open playground/ })`
- test/helpers/workspace-redesign-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('searchbox', { name: 'Search projects', exact: true })`
- test/helpers/workspace-redesign-browser.ts:27 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: /Landing.*acme/ })`
- test/helpers/workspace-redesign-browser.ts:28 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: /Dashboard.*studio/ })`
- test/helpers/workspace-redesign-browser.ts:29 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('No projects found', { exact: true })`
- test/helpers/workspace-redesign-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Import project', exact: true })`
- test/helpers/workspace-redesign-browser.ts:32 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('dialog', { name: 'Import a project', exact: true })`
- test/helpers/workspace-redesign-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Import project', exact: true })`
- test/helpers/workspace-redesign-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Public GitHub repository', { exact: true })`
- test/helpers/workspace-redesign-browser.ts:38 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Public GitHub repository', { exact: true })`
- test/helpers/workspace-redesign-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'All projects', exact: true })`
- test/helpers/workspace-redesign-browser.ts:42 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: /Landing.*acme/ })`
- test/helpers/workspace-redesign-browser.ts:44 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => document.documentElement.scrollWidth > innerWidth)`
- test/helpers/studio-reload-recovery-browser.ts:23 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'domcontentloaded' })`
- test/helpers/studio-reload-recovery-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/studio-reload-recovery-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('dialog', { name: 'Recover previous source operation' })`
- test/helpers/studio-reload-recovery-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/studio-reload-recovery-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/studio-reload-recovery-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/helpers/studio-reload-recovery-browser.ts:43 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/studio-reload-recovery-browser.ts:67 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => getComputedStyle(document.querySelector('h1')!).fontWeight === '700')`
- test/helpers/studio-reload-recovery-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Save status unconfirmed', { exact: true })`
- test/helpers/studio-reload-recovery-browser.ts:83 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => getComputedStyle(document.querySelector('h1')!).fontWeight === '700')`
- test/helpers/studio-reload-recovery-browser.ts:89 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Save status unconfirmed', { exact: true })`
- test/helpers/studio-reload-recovery-browser.ts:104 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/studio-reload-recovery-browser.ts:105 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Undo status unconfirmed. Editing is paused until it is checked.', { exact: true })`
- test/helpers/studio-reload-recovery-browser.ts:113 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => getComputedStyle(document.querySelector('h1')!).fontWeight === '700')`
- test/helpers/studio-reload-recovery-browser.ts:119 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/studio-reload-recovery-browser.ts:120 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Undo status unconfirmed. Editing is paused until it is checked.', { exact: true })`
- test/helpers/studio-reload-recovery-browser.ts:130 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    (window as any).__restoreRecoveryStorage = () => { Storage.prototype.setItem = originalSet; };
    Storage.prototype.setItem = function(key, value) { if (key.startsWith('slightnudge:write-recovery:')) throw new DOMException('Quota', 'QuotaExceededError'); originalSet.call(this, key, value); };
  })`
- test/helpers/studio-reload-recovery-browser.ts:136 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/studio-reload-recovery-browser.ts:138 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => (window as any).__restoreRecoveryStorage())`
- test/helpers/studio-reload-recovery-browser.ts:139 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/direct-manipulation-browser.ts:12 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/direct-manipulation-browser.ts:13 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/direct-manipulation-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => {
    (window as any).__resizeEvents = [];
    for (const type of ['pointermove', 'pointerdown', 'pointerup', 'lostpointercapture', 'scroll', 'blur', 'pointercancel']) window.addEventListener(type, event => {
      if (document.querySelector('[aria-label="Drag to resize width"]')?.getAttribute('aria-pressed') !== 'true') return;
      const events = (window as any).__resizeEvents as unknown[];
      events.push({ type, pointerId: (event as PointerEvent).pointerId, x: (event as PointerEvent).clientX });
      if (events.length > 40) events.shift();
    }, true);
  })`
- test/helpers/direct-manipulation-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Drag to resize width', exact: true })`
- test/helpers/direct-manipulation-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/direct-manipulation-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Resize measurement', { exact: true })`
- test/helpers/direct-manipulation-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/direct-manipulation-browser.ts:28 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => {
      const button = document.querySelector('[aria-label="Drag to resize width"]') as HTMLButtonElement | null;
      return button && !button.disabled && document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false';
    })`
- test/helpers/direct-manipulation-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Drag to resize width"]')?.getAttribute('aria-pressed') === 'true')`
- test/helpers/direct-manipulation-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => getComputedStyle(document.documentElement).fontSize)`
- test/helpers/direct-manipulation-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: label, exact: true })`
- test/helpers/direct-manipulation-browser.ts:48 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Resize measurement"]')?.textContent?.includes('576px'), undefined, { timeout: 5000 })`
- test/helpers/direct-manipulation-browser.ts:49 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => (window as any).__resizeEvents)`
- test/helpers/direct-manipulation-browser.ts:49 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice')`
- test/helpers/direct-manipulation-browser.ts:55 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('group', { name: 'Element state', exact: true })`
- test/helpers/direct-manipulation-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => window.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 })))`
- test/helpers/direct-manipulation-browser.ts:57 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(kind => window.dispatchEvent(kind === 'pointercancel' ? new PointerEvent(kind) : new Event(kind)), cancellation)`
- test/helpers/direct-manipulation-browser.ts:59 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Drag to resize width"]')?.getAttribute('aria-pressed') === 'false', undefined, { timeout: 3000 })`
- test/helpers/direct-manipulation-browser.ts:60 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => (window as any).__resizeEvents)`
- test/helpers/direct-manipulation-browser.ts:65 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('group', { name: 'Element state', exact: true })`
- test/helpers/direct-manipulation-browser.ts:69 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => Math.abs(document.querySelector('h1')!.parentElement!.getBoundingClientRect().width - expected) < 1, originalWidth)`
- test/helpers/direct-manipulation-browser.ts:76 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Paragraph', { exact: true })`
- test/helpers/direct-manipulation-browser.ts:77 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/direct-manipulation-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(({ x, y }) => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: x - 80, clientY: y })), point)`
- test/helpers/direct-manipulation-browser.ts:86 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/direct-manipulation-browser.ts:90 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/direct-manipulation-browser.ts:92 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Resize measurement"]')?.textContent?.includes('512px'))`
- test/helpers/direct-manipulation-browser.ts:96 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/direct-manipulation-browser.ts:97 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => Math.abs(document.querySelector('h1')!.parentElement!.getBoundingClientRect().width - expected) < 1, originalWidth)`
- test/helpers/direct-manipulation-browser.ts:101 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/direct-manipulation-browser.ts:103 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/helpers/direct-manipulation-browser.ts:105 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/direct-manipulation-browser.ts:106 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/direct-manipulation-browser.ts:108 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/helpers/direct-manipulation-browser.ts:113 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/direct-manipulation-browser.ts:116 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Resize width from right', exact: true })`
- test/helpers/direct-manipulation-browser.ts:119 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/direct-manipulation-browser.ts:120 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/direct-manipulation-browser.ts:122 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/helpers/direct-manipulation-browser.ts:124 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/drag-move-browser.ts:12 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/drag-move-browser.ts:13 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/drag-move-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/drag-move-browser.ts:15 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/helpers/drag-move-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Move measurement', { exact: true })`
- test/helpers/drag-move-browser.ts:17 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/drag-move-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('group', { name: 'Move selected element', exact: true })`
- test/helpers/drag-move-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('group', { name: 'Move selected element', exact: true })`
- test/helpers/drag-move-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => { const r = document.querySelector('h1')!.parentElement!.getBoundingClientRect(); return Math.abs(r.x - expected.x) < 1 && Math.abs(r.y - expected.y) < 1; }, origin)`
- test/helpers/drag-move-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('group', { name: 'Element state' })`
- test/helpers/drag-move-browser.ts:32 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => window.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 })))`
- test/helpers/drag-move-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(kind => window.dispatchEvent(kind === 'pointercancel' ? new PointerEvent(kind) : new Event(kind)), cancellation)`
- test/helpers/drag-move-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('group', { name: 'Element state' })`
- test/helpers/drag-move-browser.ts:38 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-selection-artboard]')`
- test/helpers/drag-move-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => { const element = document.querySelector('[data-selection-artboard]') as HTMLElement; return Math.abs(element.getBoundingClientRect().width / element.offsetWidth - .75) < .001; })`
- test/helpers/drag-move-browser.ts:45 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-selection-artboard]')`
- test/helpers/drag-move-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/drag-move-browser.ts:88 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Undo visual adjustment (Ctrl+Z)')`
- test/helpers/drag-move-browser.ts:93 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('One thoughtful workspace for the people, projects, and plans that move your business forward.', { exact: true })`
- test/helpers/drag-move-browser.ts:94 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('One thoughtful workspace for the people, projects, and plans that move your business forward.', { exact: true })`
- test/helpers/drag-move-browser.ts:99 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move right', exact: true })`
- test/helpers/drag-move-browser.ts:100 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/helpers/drag-move-browser.ts:101 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/helpers/continuous-draft-browser.ts:11 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/continuous-draft-browser.ts:12 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/continuous-draft-browser.ts:13 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 30000 })`
- test/helpers/continuous-draft-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/continuous-draft-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/continuous-draft-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('One thoughtful workspace for the people, projects, and plans that move your business forward.', { exact: true })`
- test/helpers/continuous-draft-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Review source change' })`
- test/helpers/continuous-draft-browser.ts:30 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Review changes', exact: true })`
- test/helpers/continuous-draft-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft change history')`
- test/helpers/continuous-draft-browser.ts:32 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Hide changes', exact: true })`
- test/helpers/continuous-draft-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Draft status"]')?.textContent === 'All changes saved')`
- test/helpers/continuous-draft-browser.ts:40 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/continuous-draft-browser.ts:43 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/continuous-draft-browser.ts:44 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('textbox', { name: 'Content', exact: true })`
- test/helpers/continuous-draft-browser.ts:51 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('One thoughtful workspace for the people, projects, and plans that move your business forward.', { exact: true })`
- test/helpers/continuous-draft-browser.ts:53 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Draft status"]')?.textContent === 'All changes saved', undefined, { timeout: 30000 })`
- test/helpers/continuous-draft-browser.ts:54 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/continuous-draft-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/continuous-draft-browser.ts:59 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/continuous-draft-browser.ts:67 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard draft', exact: true })`
- test/helpers/continuous-draft-browser.ts:71 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/continuous-draft-browser.ts:74 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard draft', exact: true })`
- test/helpers/inline-text-browser.ts:16 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'networkidle', timeout: 120000 })`
- test/helpers/inline-text-browser.ts:17 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 30000 })`
- test/helpers/inline-text-browser.ts:18 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/inline-text-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting' })`
- test/helpers/inline-text-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('textbox', { name: 'Edit heading text', exact: true })`
- test/helpers/inline-text-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/inline-text-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/inline-text-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/inline-text-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/inline-text-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/inline-text-browser.ts:61 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('textbox', { name: 'Edit paragraph text', exact: true })`
- test/helpers/inline-text-browser.ts:62 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText(paragraphText, { exact: true })`
- test/helpers/inline-text-browser.ts:67 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText(paragraphText, { exact: true })`
- test/helpers/inline-text-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Pasted <b>plain</b> text', { exact: true })`
- test/helpers/inline-text-browser.ts:82 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/inline-text-browser.ts:83 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/inline-text-browser.ts:84 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard draft', exact: true })`
- test/helpers/unified-canvas-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 })`
- test/helpers/unified-canvas-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting' })`
- test/helpers/unified-canvas-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/unified-canvas-browser.ts:29 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/unified-canvas-browser.ts:30 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/unified-canvas-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Source layers')`
- test/helpers/unified-canvas-browser.ts:40 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('h1')`
- test/helpers/unified-canvas-browser.ts:48 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/unified-canvas-browser.ts:51 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/unified-canvas-browser.ts:53 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Redo', exact: true })`
- test/helpers/unified-canvas-browser.ts:54 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Mobile', exact: true })`
- test/helpers/unified-canvas-browser.ts:57 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Desktop', exact: true })`
- test/helpers/unified-canvas-browser.ts:59 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => [...document.querySelectorAll<HTMLSelectElement>('[role="toolbar"] select')].some(select => select.value === '__computed'))`
- test/helpers/unified-canvas-browser.ts:62 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/unified-canvas-browser.ts:69 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/unified-canvas-browser.ts:70 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/unified-canvas-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/unified-canvas-browser.ts:89 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Draft status"]')?.textContent?.trim() === 'All changes saved', undefined, { timeout: 60000 })`
- test/helpers/unified-canvas-browser.ts:94 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/unified-canvas-browser.ts:96 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/unified-canvas-browser.ts:105 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelector('h1') && getComputedStyle(document.querySelector('iframe')!.contentDocument!.querySelector('h1')!).fontSize === '36px')`
- test/helpers/unified-canvas-browser.ts:108 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard draft', exact: true })`
- test/helpers/unified-canvas-browser.ts:109 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Pages', exact: true })`
- test/helpers/unified-canvas-browser.ts:110 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Several Utilities', { exact: true })`
- test/helpers/unified-canvas-browser.ts:117 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/unified-canvas-browser.ts:119 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/unified-canvas-browser.ts:137 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/edit?preview=${encodeURIComponent(projectURL)}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/unified-canvas-browser.ts:138 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/unified-canvas-browser.ts:141 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/unified-canvas-browser.ts:145 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/unified-canvas-browser.ts:151 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Source layers')`
- test/helpers/unified-canvas-browser.ts:152 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/unified-canvas-browser.ts:155 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/unified-canvas-browser.ts:159 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/button-editing-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting' })`
- test/helpers/button-editing-browser.ts:15 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/button-editing-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar' })`
- test/helpers/button-editing-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 })`
- test/helpers/button-editing-browser.ts:23 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'networkidle', timeout: 120000 })`
- test/helpers/button-editing-browser.ts:27 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Source layers')`
- test/helpers/button-editing-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/button-editing-browser.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Fill: Blue', exact: true })`
- test/helpers/button-editing-browser.ts:57 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Borders', exact: true })`
- test/helpers/button-editing-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Corner radius' })`
- test/helpers/button-editing-browser.ts:60 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Corner radius' })`
- test/helpers/button-editing-browser.ts:72 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/button-editing-browser.ts:87 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/button-editing-browser.ts:93 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => (window as any).buttonNotices)`
- test/helpers/live-window-browser.ts:14 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio\`, { waitUntil: 'networkidle', timeout: 120000 })`
- test/helpers/live-window-browser.ts:15 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/live-window-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Workspace options', { exact: true })`
- test/helpers/live-window-browser.ts:17 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Open editing window', exact: true })`
- test/helpers/live-window-browser.ts:84 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/edit\`, { waitUntil: 'networkidle', timeout: 120000 })`
- test/helpers/live-window-browser.ts:85 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Project URL', { exact: true })`
- test/helpers/live-window-browser.ts:85 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Connect', exact: true })`
- test/helpers/live-window-browser.ts:86 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/live-window-browser.ts:87 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Workspace options', { exact: true })`
- test/helpers/live-window-browser.ts:88 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Open editing window', exact: true })`
- test/helpers/live-window-browser.ts:150 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/live-window-browser.ts:152 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/helpers/section-order-browser.ts:18 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting' })`
- test/helpers/section-order-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar' })`
- test/helpers/section-order-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 })`
- test/helpers/section-order-browser.ts:25 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/window\`, { waitUntil: 'networkidle', timeout: 120000 })`
- test/helpers/section-order-browser.ts:29 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move earlier', exact: true })`
- test/helpers/section-order-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/section-order-browser.ts:38 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move earlier', exact: true })`
- test/helpers/section-order-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Close formatting options', exact: true })`
- test/helpers/section-order-browser.ts:42 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/section-order-browser.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/section-order-browser.ts:53 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/helpers/container-move-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting' })`
- test/helpers/container-move-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar' })`
- test/helpers/container-move-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 })`
- test/helpers/container-move-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move to…', exact: true })`
- test/helpers/container-move-browser.ts:19 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Choose move destination', { exact: true })`
- test/helpers/container-move-browser.ts:22 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/window\`, { waitUntil: 'networkidle', timeout: 120000 })`
- test/helpers/container-move-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Move destination preview', { exact: true })`
- test/helpers/container-move-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Choose move destination', { exact: true })`
- test/helpers/container-move-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Move destination preview', { exact: true })`
- test/helpers/container-move-browser.ts:27 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/container-move-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/container-move-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/helpers/layout-controls-browser.ts:10 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar' })`
- test/helpers/layout-controls-browser.ts:11 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 })`
- test/helpers/layout-controls-browser.ts:12 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: \`Layout ${label}\`, exact: true })`
- test/helpers/layout-controls-browser.ts:12 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/layout-controls-browser.ts:14 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/window\`, { waitUntil: 'networkidle', timeout: 120000 })`
- test/helpers/layout-controls-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Layout columns', exact: true })`
- test/helpers/layout-controls-browser.ts:23 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/layout-controls-browser.ts:28 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/helpers/multi-file-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar', exact: true })`
- test/helpers/multi-file-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/multi-file-browser.ts:27 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 })`
- test/helpers/multi-file-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === expected, identity)`
- test/helpers/multi-file-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/multi-file-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/multi-file-browser.ts:55 — Navigation; inspect legacy route and view assumptions
  `page.goto(baseURL + '/studio/source-proof/window?preview=' + encodeURIComponent('http://127.0.0.1:' + port + '/'), { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/multi-file-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/multi-file-browser.ts:74 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/multi-file-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/multi-file-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Review changes', exact: true })`
- test/helpers/multi-file-browser.ts:80 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Change-set files', { exact: true })`
- test/helpers/multi-file-browser.ts:81 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Close design panel', exact: true })`
- test/helpers/multi-file-browser.ts:95 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/multi-file-browser.ts:95 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/multi-file-browser.ts:116 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Resume Save', exact: true })`
- test/helpers/multi-file-browser.ts:120 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Resume Save', exact: true })`
- test/helpers/multi-file-browser.ts:121 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Resume Save', exact: true })`
- test/helpers/multi-file-browser.ts:123 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/multi-file-browser.ts:134 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/helpers/project-compatibility-browser.ts:34 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/compatible\`)`
- test/helpers/project-compatibility-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('details')`
- test/helpers/project-compatibility-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Editing compatibility', { exact: true })`
- test/helpers/project-compatibility-browser.ts:49 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/old-next\`)`
- test/helpers/project-compatibility-browser.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Enable source mapping', exact: true })`
- test/helpers/project-compatibility-browser.ts:51 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Enable source mapping', exact: true })`
- test/helpers/project-compatibility-browser.ts:52 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Editing compatibility', { exact: true })`
- test/helpers/project-compatibility-browser.ts:53 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-compatibility-next-step]')`
- test/helpers/project-compatibility-browser.ts:54 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/pending-install\`)`
- test/helpers/project-compatibility-browser.ts:55 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Enable source mapping', exact: true })`
- test/helpers/project-compatibility-browser.ts:56 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Enable source mapping', exact: true })`
- test/helpers/project-compatibility-browser.ts:57 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Editing compatibility', { exact: true })`
- test/helpers/project-compatibility-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText(/Install dependencies in this app’s folder/)`
- test/helpers/project-compatibility-browser.ts:59 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-capability="text"]')`
- test/helpers/project-compatibility-browser.ts:60 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/tailwind-ready\`)`
- test/helpers/project-compatibility-browser.ts:61 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Editing compatibility', { exact: true })`
- test/helpers/project-compatibility-browser.ts:62 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-capability="responsive"]')`
- test/helpers/project-compatibility-browser.ts:63 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-capability="generated"]')`
- test/helpers/project-compatibility-browser.ts:64 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/vite-project\`)`
- test/helpers/project-compatibility-browser.ts:65 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Editing compatibility', { exact: true })`
- test/helpers/project-compatibility-browser.ts:66 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-compatibility-next-step]')`
- test/helpers/project-compatibility-browser.ts:67 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Enable source mapping', exact: true })`
- test/helpers/imported-canvas-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 })`
- test/helpers/imported-canvas-browser.ts:27 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/imported-canvas-browser.ts:31 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(value => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === value, identity)`
- test/helpers/imported-canvas-browser.ts:37 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/edit?preview=${encodeURIComponent(previewURL)}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/imported-canvas-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-canvas-stage]')`
- test/helpers/imported-canvas-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('iframe[title="Actual project"]')`
- test/helpers/imported-canvas-browser.ts:40 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/imported-canvas-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => (document.querySelector('iframe')?.clientHeight || 0) > 1500)`
- test/helpers/imported-canvas-browser.ts:51 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(previous => (document.querySelector('iframe')?.clientHeight || 0) >= previous + 599, height)`
- test/helpers/imported-canvas-browser.ts:53 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(previous => document.querySelector('iframe')?.clientHeight === previous, height)`
- test/helpers/imported-canvas-browser.ts:59 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(previous => document.querySelector('iframe')?.clientHeight === previous, height)`
- test/helpers/imported-canvas-browser.ts:63 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/imported-canvas-browser.ts:69 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/imported-canvas-browser.ts:72 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/imported-canvas-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/imported-canvas-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Change history', exact: true })`
- test/helpers/imported-canvas-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('dialog', { name: 'Change history', exact: true })`
- test/helpers/imported-canvas-browser.ts:90 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/imported-canvas-browser.ts:92 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/imported-canvas-browser.ts:95 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Change history', exact: true })`
- test/helpers/imported-canvas-browser.ts:102 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/imported-canvas-browser.ts:104 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Change history', exact: true })`
- test/helpers/imported-canvas-browser.ts:107 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Fit page to canvas', exact: true })`
- test/helpers/imported-canvas-browser.ts:112 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Fit page to canvas', exact: true })`
- test/helpers/imported-canvas-browser.ts:115 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/window?preview=${encodeURIComponent(previewURL)}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/real-project-canvas-browser.ts:47 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 })`
- test/helpers/real-project-canvas-browser.ts:48 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/real-project-canvas-browser.ts:62 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(value => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === value, \`${target.file}:${target.line}:${target.column}:${target.tag}\`)`
- test/helpers/real-project-canvas-browser.ts:68 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/real-project-canvas-browser.ts:73 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/real-project-canvas-browser.ts:82 — Navigation; inspect legacy route and view assumptions
  `page.goto(editURL, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/real-project-canvas-browser.ts:83 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('iframe[title="Actual project"]')`
- test/helpers/real-project-canvas-browser.ts:86 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => (document.querySelector('iframe')?.clientHeight || 0) > 300)`
- test/helpers/real-project-canvas-browser.ts:93 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => (window as any).__SLIGHTNUDGE_TOKEN__ as string)`
- test/helpers/real-project-canvas-browser.ts:99 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/real-project-canvas-browser.ts:113 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/real-project-canvas-browser.ts:123 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/real-project-canvas-browser.ts:129 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/real-project-canvas-browser.ts:140 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/real-project-canvas-browser.ts:142 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/real-project-canvas-browser.ts:154 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/real-project-canvas-browser.ts:158 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton', { name: 'Preview width', exact: true })`
- test/helpers/real-project-canvas-browser.ts:166 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Responsive edit scope', exact: true })`
- test/helpers/real-project-canvas-browser.ts:169 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/real-project-canvas-browser.ts:178 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/real-project-canvas-browser.ts:189 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/window?preview=${encodeURIComponent(previewURL)}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/real-project-canvas-browser.ts:193 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/real-project-canvas-browser.ts:198 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/real-project-canvas-browser.ts:201 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/real-project-canvas-browser.ts:209 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[role="alert"], [aria-label="Editor notice"]')`
- test/helpers/real-project-canvas-browser.ts:212 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Visual editing workspace', { exact: true })`
- test/helpers/real-multi-file-browser.ts:69 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/real-multi-file-browser.ts:70 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/real-multi-file-browser.ts:71 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/real-multi-file-browser.ts:72 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 })`
- test/helpers/real-multi-file-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(value => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === value, \`${t.file}:${t.line}:${t.column}:${t.tag}\`)`
- test/helpers/real-multi-file-browser.ts:98 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name, exact: true })`
- test/helpers/real-multi-file-browser.ts:122 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: kind === 'save' ? 'Save changes' : 'Undo', exact: true })`
- test/helpers/real-multi-file-browser.ts:123 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: kind === 'save' ? 'Resume Save' : 'Resume Undo', exact: true })`
- test/helpers/real-multi-file-browser.ts:130 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/edit?preview=${encodeURIComponent(previewURL)}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/real-multi-file-browser.ts:131 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => (window as any).__SLIGHTNUDGE_TOKEN__ as string)`
- test/helpers/real-multi-file-browser.ts:149 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/real-multi-file-browser.ts:150 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Redo', exact: true })`
- test/helpers/real-multi-file-browser.ts:163 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/window?preview=${encodeURIComponent(previewURL)}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/real-multi-file-browser.ts:167 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/real-multi-file-browser.ts:169 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Resume Save', exact: true })`
- test/helpers/real-multi-file-browser.ts:188 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Resume Save', exact: true })`
- test/helpers/real-multi-file-browser.ts:199 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Resume Undo', exact: true })`
- test/helpers/real-multi-file-browser.ts:207 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[role="alert"], [aria-label="Editor notice"]')`
- test/helpers/high-fidelity-browser.ts:45 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/high-fidelity-browser.ts:46 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/high-fidelity-browser.ts:47 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 })`
- test/helpers/high-fidelity-browser.ts:70 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton', { name: 'Preview width', exact: true })`
- test/helpers/high-fidelity-browser.ts:75 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Close formatting options', exact: true })`
- test/helpers/high-fidelity-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle layers', exact: true })`
- test/helpers/high-fidelity-browser.ts:82 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('navigation', { name: 'Source layers', exact: true })`
- test/helpers/high-fidelity-browser.ts:94 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(value => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === value, location)`
- test/helpers/high-fidelity-browser.ts:101 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: operation === 'save' ? 'Save changes' : 'Undo', exact: true })`
- test/helpers/high-fidelity-browser.ts:108 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Browse', exact: true })`
- test/helpers/high-fidelity-browser.ts:120 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Edit', exact: true })`
- test/helpers/high-fidelity-browser.ts:135 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/${windowMode ? 'window' : 'edit'}?preview=${encodeURIComponent(previewURL)}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/high-fidelity-browser.ts:136 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle design panel', exact: true })`
- test/helpers/high-fidelity-browser.ts:137 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Responsive edit scope', exact: true })`
- test/helpers/high-fidelity-browser.ts:141 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/high-fidelity-browser.ts:156 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Canvas controls', exact: true })`
- test/helpers/high-fidelity-browser.ts:173 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Text color: White', exact: true })`
- test/helpers/high-fidelity-browser.ts:175 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Close formatting options', exact: true })`
- test/helpers/high-fidelity-browser.ts:180 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Fill: Blue', exact: true })`
- test/helpers/high-fidelity-browser.ts:184 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Close formatting options', exact: true })`
- test/helpers/high-fidelity-browser.ts:206 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/core-editing-browser.ts:22 — Navigation; inspect legacy route and view assumptions
  `page.goto('about:blank')`
- test/helpers/core-editing-browser.ts:23 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio${windowMode ? '/window' : ''}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/core-editing-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/core-editing-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/core-editing-browser.ts:27 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/core-editing-browser.ts:28 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-editor-panel="inspector"]')`
- test/helpers/core-editing-browser.ts:29 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false')`
- test/helpers/core-editing-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/core-editing-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('dialog', { name: 'More formatting options', exact: true })`
- test/helpers/core-editing-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Fill: Blue', exact: true })`
- test/helpers/core-editing-browser.ts:79 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Close formatting options', exact: true })`
- test/helpers/core-editing-browser.ts:82 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Toggle design panel', exact: true })`
- test/helpers/core-editing-browser.ts:92 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/core-editing-browser.ts:96 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/core-editing-browser.ts:98 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Redo', exact: true })`
- test/helpers/core-editing-browser.ts:109 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move earlier', exact: true })`
- test/helpers/core-editing-browser.ts:112 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Responsive edit scope', exact: true })`
- test/helpers/core-editing-browser.ts:114 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 768)`
- test/helpers/core-editing-browser.ts:117 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton', { name: 'Preview width', exact: true })`
- test/helpers/core-editing-browser.ts:119 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 375)`
- test/helpers/core-editing-browser.ts:123 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 1100)`
- test/helpers/core-editing-browser.ts:125 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/core-editing-browser.ts:128 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Undo', exact: true })`
- test/helpers/core-editing-browser.ts:132 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Browse', exact: true })`
- test/helpers/core-editing-browser.ts:139 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })`
- test/helpers/core-editing-browser.ts:143 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/single-canvas-browser.ts:12 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 })`
- test/helpers/single-canvas-browser.ts:13 — Navigation; inspect legacy route and view assumptions
  `page.goto(baseURL + '/studio', { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/single-canvas-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/single-canvas-browser.ts:15 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-canvas-stage]')`
- test/helpers/single-canvas-browser.ts:15 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('iframe')`
- test/helpers/single-canvas-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Canvas zoom', exact: true })`
- test/helpers/single-canvas-browser.ts:18 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => (document.querySelector('iframe')?.clientHeight || 0) >= 2200)`
- test/helpers/single-canvas-browser.ts:34 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[data-canvas-stage]')?.getAttribute('data-zoom') === '0.25')`
- test/helpers/single-canvas-browser.ts:36 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Move element', exact: true })`
- test/helpers/single-canvas-browser.ts:42 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/single-canvas-browser.ts:46 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Pan canvas', exact: true })`
- test/helpers/single-canvas-browser.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Select elements', exact: true })`
- test/helpers/single-canvas-browser.ts:51 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Fit page to canvas', exact: true })`
- test/helpers/single-canvas-browser.ts:57 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Fit page to canvas', exact: true })`
- test/helpers/single-canvas-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name:'Save changes',exact:true })`
- test/helpers/single-canvas-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status',{exact:true})`
- test/helpers/single-canvas-browser.ts:58 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/helpers/single-canvas-browser.ts:60 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button',{name:'Undo',exact:true})`
- test/helpers/single-canvas-browser.ts:61 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Fit page to canvas', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:13 — Navigation; inspect legacy route and view assumptions
  `page.goto(baseURL + '/studio', { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/editor-ergonomics-browser.ts:14 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/editor-ergonomics-browser.ts:15 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('navigation', { name: 'Source layers', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('searchbox', { name: 'Search layers', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:29 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('No matching layers.', { exact: true })`
- test/helpers/editor-ergonomics-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => (document.querySelector('[aria-label="Search layers"]') as HTMLInputElement)?.value === '')`
- test/helpers/editor-ergonomics-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('separator', { name: 'Resize design panel', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Save changes', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Focus canvas', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:42 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Canvas controls', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:43 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-editor-canvas]')`
- test/helpers/editor-ergonomics-browser.ts:48 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton', { name: 'Preview width', exact: true })`
- test/helpers/editor-ergonomics-browser.ts:51 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Restore sidebars', exact: true })`
- test/helpers/responsive-editing-browser.ts:15 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Responsive edit scope', exact: true })`
- test/helpers/responsive-editing-browser.ts:15 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton', { name: 'Preview width', exact: true })`
- test/helpers/responsive-editing-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting' })`
- test/helpers/responsive-editing-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Visual editing workspace', { exact: true })`
- test/helpers/responsive-editing-browser.ts:16 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar' })`
- test/helpers/responsive-editing-browser.ts:17 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 })`
- test/helpers/responsive-editing-browser.ts:18 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(expected => document.querySelector('iframe')?.contentWindow?.innerWidth === expected, value)`
- test/helpers/responsive-editing-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/responsive-editing-browser.ts:22 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio${classic ? '' : '/window'}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/responsive-editing-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-editor-panel="inspector"]')`
- test/helpers/responsive-editing-browser.ts:24 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('separator', { name: 'Resize design panel' })`
- test/helpers/responsive-editing-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-editor-canvas]')`
- test/helpers/responsive-editing-browser.ts:26 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar' })`
- test/helpers/responsive-editing-browser.ts:38 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Show design panel', exact: true })`
- test/helpers/responsive-editing-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Focus canvas', exact: true })`
- test/helpers/responsive-editing-browser.ts:39 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-editor-panel="layers"]')`
- test/helpers/responsive-editing-browser.ts:41 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Restore sidebars', exact: true })`
- test/helpers/responsive-editing-browser.ts:42 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Workspace options', { exact: true })`
- test/helpers/responsive-editing-browser.ts:42 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: 'Open editing window', exact: true })`
- test/helpers/responsive-editing-browser.ts:43 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: 'Open editing window', exact: true })`
- test/helpers/responsive-editing-browser.ts:50 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 832)`
- test/helpers/responsive-editing-browser.ts:52 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 928)`
- test/helpers/responsive-editing-browser.ts:61 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Editor notice', { exact: true })`
- test/helpers/responsive-editing-browser.ts:63 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Show tablet', exact: true })`
- test/helpers/responsive-editing-browser.ts:70 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/responsive-editing-browser.ts:76 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-editor-canvas]')`
- test/helpers/responsive-editing-browser.ts:76 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('iframe')`
- test/helpers/responsive-editing-browser.ts:78 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('region', { name: 'Canvas controls', exact: true })`
- test/helpers/responsive-editing-browser.ts:83 — Navigation; inspect legacy route and view assumptions
  `page.goto(baseURL + '/studio/window')`
- test/helpers/responsive-editing-browser.ts:83 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/responsive-editing-browser.ts:84 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar', exact: true })`
- test/helpers/responsive-editing-browser.ts:94 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/helpers/imported-responsive-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('toolbar', { name: 'Selection formatting' })`
- test/helpers/imported-responsive-browser.ts:20 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('banner', { name: 'Editor toolbar' })`
- test/helpers/imported-responsive-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('spinbutton', { name: 'Preview width', exact: true })`
- test/helpers/imported-responsive-browser.ts:21 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('combobox', { name: 'Responsive edit scope', exact: true })`
- test/helpers/imported-responsive-browser.ts:22 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 })`
- test/helpers/imported-responsive-browser.ts:25 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/imported-responsive-browser.ts:28 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}/studio/source-proof/window?preview=${encodeURIComponent(\`http://127.0.0.1:${port}/\`)}\`, { waitUntil: 'domcontentloaded', timeout: 120000 })`
- test/helpers/imported-responsive-browser.ts:28 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/imported-responsive-browser.ts:29 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/imported-responsive-browser.ts:33 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/imported-responsive-browser.ts:35 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/imported-responsive-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Draft status', { exact: true })`
- test/helpers/imported-responsive-browser.ts:37 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('[data-source-ready="true"]')`
- test/helpers/imported-responsive-browser.ts:43 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('body')`
- test/shared-instance-security.v2.browser.ts:299 — Navigation; inspect legacy route and view assumptions
  `page.goto(\`${baseURL}${editorPath}\`)`
- test/shared-instance-security.v2.browser.ts:300 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-preview-content h1')`
- test/shared-instance-security.v2.browser.ts:308 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('link', { name: '1 Product overview' })`
- test/shared-instance-security.v2.browser.ts:311 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('#slightnudge-safety-ok')`
- test/shared-instance-security.v2.browser.ts:312 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/shared-instance-security.v2.browser.ts:313 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/shared-instance-security.v2.browser.ts:321 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('.sn-preview-content p')`
- test/shared-instance-security.v2.browser.ts:324 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/shared-instance-security.v2.browser.ts:329 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Not saved to source', { exact: true })`
- test/shared-instance-security.v2.browser.ts:330 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('Before change')`
- test/shared-instance-security.v2.browser.ts:331 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByLabel('After change')`
- test/shared-instance-security.v2.browser.ts:333 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/shared-instance-security.v2.browser.ts:334 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('Source changed outside the editor. Discard and select again.', { exact: true })`
- test/shared-instance-security.v2.browser.ts:336 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/shared-instance-security.v2.browser.ts:337 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Discard', exact: true })`
- test/shared-instance-security.v2.browser.ts:342 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/shared-instance-security.v2.browser.ts:343 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.waitForFunction(() => document.querySelector('#slightnudge-selected-box') !== null)`
- test/shared-instance-security.v2.browser.ts:347 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.locator('#slightnudge-selected-box')`
- test/shared-instance-security.v2.browser.ts:349 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/shared-instance-security.v2.browser.ts:351 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/shared-instance-security.v2.browser.ts:352 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByRole('button', { name: 'Apply to code', exact: true })`
- test/shared-instance-security.v2.browser.ts:356 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByTitle('Toggle bold', { exact: true })`
- test/shared-instance-security.v2.browser.ts:357 — Top-document DOM/locator assumption; editor controls must remain in host, content needs explicit iframe scope
  `page.getByText('This style cannot be previewed safely.', { exact: true })`