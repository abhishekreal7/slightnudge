# Gate repair results

| Workflow | Harness | API | Current | Seconds | 7f1b9cd | Same failure? | First failure |
|---|---|---|---|---:|---|---|---|
| selection-full-regression | existing | REAL | HARNESS-ERROR | 0 | HARNESS-ERROR | same setup error; cases not run | Error: listen EADDRINUSE: address already in use 127.0.0.1:3000 |
| selection-full-overfit | existing | REAL | HARNESS-ERROR | 0 | HARNESS-ERROR | same setup error; cases not run | Error: listen EADDRINUSE: address already in use 127.0.0.1:3000 |
| selection-fit-regression | existing | REAL | HARNESS-ERROR | 0 | HARNESS-ERROR | same setup error; cases not run | Error: listen EADDRINUSE: address already in use 127.0.0.1:3000 |
| selection-fit-overfit | existing | REAL | HARNESS-ERROR | 0 | HARNESS-ERROR | same setup error; cases not run | Error: listen EADDRINUSE: address already in use 127.0.0.1:3000 |
| shared-local-studio | HARNESS-V3 | REAL | TIMEOUT | 121.46 | TIMEOUT | same outer cap; inner step unverified | No assertion error captured before termination; see last timing/operation in raw log |
| shared-local-window | HARNESS-V3 | REAL | TIMEOUT | 121.08 | TIMEOUT | same outer cap; inner step unverified | No assertion error captured before termination; see last timing/operation in raw log |
| shared-imported-studio | HARNESS-V3 | REAL | TIMEOUT | 121.31 | FAIL | blocked by historical harness setup | No assertion error captured before termination; see last timing/operation in raw log |
| shared-imported-window | HARNESS-V3 | REAL | TIMEOUT | 121.75 | FAIL | blocked by historical harness setup | No assertion error captured before termination; see last timing/operation in raw log |
| movement | HARNESS-V3 | REAL | FAIL | 98.89 | FAIL | same first assertion/lookup | AssertionError [ERR_ASSERTION]: Move handle is centered above the selection |
| state-and-transitions | HARNESS-V3 | REAL | FAIL | 131.62 | FAIL | different or insufficient evidence | locator.click: Timeout 30000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('group', { name: 'Element state' }).getByRole('button', { name: 'Hover', exact: true })[22m |
| responsive | HARNESS-V3 | REAL | FAIL | 134.32 | FAIL | different or insufficient evidence | locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }) to be visible[22m |
| responsive-imported | HARNESS-V3 | REAL | FAIL | 159.02 | FAIL | blocked by historical harness setup | locator.selectOption: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('toolbar', { name: 'Selection formatting' }).getByRole('combobox', { name: 'Font size', exact: true })[22m |
| appearance-layout | HARNESS-V3 | REAL | FAIL | 176.76 | FAIL | different or insufficient evidence | Error: aborted |
| images-local | HARNESS-V3 | REAL | FAIL | 165.75 | FAIL | same first assertion/lookup | locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Image content', exact: true }) to be visible[22m |
| images-imported | HARNESS-V3 | REAL | FAIL | 216.33 | FAIL | blocked by historical harness setup | locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Image content', exact: true }) to be visible[22m |
| component-actions-local | HARNESS-V3 | MOCKED | FAIL | 189.52 | FAIL | same first assertion/lookup | locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Component action', exact: true }) to be visible[22m |
| component-actions-imported | HARNESS-V3 | MOCKED | FAIL | 225.47 | FAIL | blocked by historical harness setup | locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Component action', exact: true }) to be visible[22m |
| icon-replacement | HARNESS-V3 | REAL | FAIL | 164.87 | FAIL | same first assertion/lookup | locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Icon appearance', exact: true }) to be visible[22m |
| icon-properties | HARNESS-V3 | REAL | FAIL | 156.3 | FAIL | same first assertion/lookup | locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Icon appearance', exact: true }) to be visible[22m |
| section-order | HARNESS-V3 | REAL | FAIL | 182.66 | FAIL | same first assertion/lookup | locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }) to be visible[22m |
| container-move | HARNESS-V3 | REAL | FAIL | 164.26 | FAIL | different or insufficient evidence | page.goto: Timeout 120000ms exceeded. |
| text-editing | HARNESS-V3 | REAL | FAIL | 72.92 | FAIL | same first assertion/lookup | locator.waitFor: Timeout 30000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('textbox', { name: 'Edit heading text', exact: true }) to be visible[22m |
| history | HARNESS-V3 | REAL | FAIL | 210.96 | FAIL | blocked by historical harness setup | page.waitForFunction: Timeout 60000ms exceeded. |
| recovery | HARNESS-V3 | MOCKED | FAIL | 98.57 | FAIL | different or insufficient evidence | page.waitForResponse: Timeout 30000ms exceeded while waiting for event "response" |

The baseline status alone does not establish the same failure; compare first-error evidence below.

## selection-full-regression

Current: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000

7f1b9cd: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000

## selection-full-overfit

Current: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000

7f1b9cd: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000

## selection-fit-regression

Current: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000

7f1b9cd: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000

## selection-fit-overfit

Current: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000

7f1b9cd: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000

## shared-local-studio

Current: No assertion error captured before termination; see last timing/operation in raw log

7f1b9cd: No assertion error captured before termination; see last timing/operation in raw log

## shared-local-window

Current: No assertion error captured before termination; see last timing/operation in raw log

7f1b9cd: No assertion error captured before termination; see last timing/operation in raw log

## shared-imported-studio

Current: No assertion error captured before termination; see last timing/operation in raw log

7f1b9cd: SETUP ERROR error: unable to write file .git/objects/d9/629d4a2fd277979dd390fe586ed157e096afad: Filename too long

## shared-imported-window

Current: No assertion error captured before termination; see last timing/operation in raw log

7f1b9cd: SETUP ERROR error: unable to write file .git/objects/d9/629d4a2fd277979dd390fe586ed157e096afad: Filename too long

## movement

Current: AssertionError [ERR_ASSERTION]: Move handle is centered above the selection

7f1b9cd: AssertionError [ERR_ASSERTION]: Move handle is centered above the selection

## state-and-transitions

Current: locator.click: Timeout 30000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('group', { name: 'Element state' }).getByRole('button', { name: 'Hover', exact: true })[22m

7f1b9cd: page.waitForResponse: Target page, context or browser has been closed

## responsive

Current: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }) to be visible[22m

7f1b9cd: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('toolbar', { name: 'Selection formatting' }) to be visible[22m

## responsive-imported

Current: locator.selectOption: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('toolbar', { name: 'Selection formatting' }).getByRole('combobox', { name: 'Font size', exact: true })[22m

7f1b9cd: SETUP ERROR error: unable to write file .git/objects/d9/629d4a2fd277979dd390fe586ed157e096afad: Filename too long

## appearance-layout

Current: Error: aborted

7f1b9cd: locator.waitFor: Timeout 120000ms exceeded. [2m  - waiting for locator('[data-source-ready="true"]') to be visible[22m

## images-local

Current: locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Image content', exact: true }) to be visible[22m

7f1b9cd: locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Image content', exact: true }) to be visible[22m

## images-imported

Current: locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Image content', exact: true }) to be visible[22m

7f1b9cd: SETUP ERROR error: unable to write file .git/objects/d9/629d4a2fd277979dd390fe586ed157e096afad: Filename too long

## component-actions-local

Current: locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Component action', exact: true }) to be visible[22m

7f1b9cd: locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Component action', exact: true }) to be visible[22m

## component-actions-imported

Current: locator.waitFor: Timeout 60000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Component action', exact: true }) to be visible[22m

7f1b9cd: SETUP ERROR error: unable to write file .git/objects/d9/629d4a2fd277979dd390fe586ed157e096afad: Filename too long

## icon-replacement

Current: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Icon appearance', exact: true }) to be visible[22m

7f1b9cd: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Icon appearance', exact: true }) to be visible[22m

## icon-properties

Current: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Icon appearance', exact: true }) to be visible[22m

7f1b9cd: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('region', { name: 'Icon appearance', exact: true }) to be visible[22m

## section-order

Current: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }) to be visible[22m

7f1b9cd: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }) to be visible[22m

## container-move

Current: page.goto: Timeout 120000ms exceeded.

7f1b9cd: locator.waitFor: Timeout 45000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }) to be visible[22m

## text-editing

Current: locator.waitFor: Timeout 30000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('textbox', { name: 'Edit heading text', exact: true }) to be visible[22m

7f1b9cd: locator.waitFor: Timeout 30000ms exceeded. [2m  - waiting for locator('iframe[title="Actual project"], iframe[title="Local source preview"]').contentFrame().getByRole('textbox', { name: 'Edit heading text', exact: true }) to be visible[22m

## history

Current: page.waitForFunction: Timeout 60000ms exceeded.

7f1b9cd: SETUP ERROR error: unable to write file .git/objects/d9/629d4a2fd277979dd390fe586ed157e096afad: Filename too long

## recovery

Current: page.waitForResponse: Timeout 30000ms exceeded while waiting for event "response"

7f1b9cd: locator.click: Timeout 30000ms exceeded.
