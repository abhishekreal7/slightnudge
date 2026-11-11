const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.cwd(),docs=path.join(root,'docs/editor'),evidence=path.join(docs,'evidence');
const rows=JSON.parse(fs.readFileSync(path.join(evidence,'amendment9-engine-progress.json'),'utf8')),selection=JSON.parse(fs.readFileSync(path.join(evidence,'amendment9-baseline-selected.json'),'utf8')),commits=JSON.parse(fs.readFileSync(path.join(evidence,'amendment9-commits.json'),'utf8'));
assert.equal(rows.length,60);assert.ok(rows.every(row=>['PASS','BASELINE DEFECT','FLAKY'].includes(row.classification)));
const firstErrors={
 'apply-outcome':'ENOENT: generated .slightnudge/repositories.json is absent.',
 'test-override-guard':'Session token override honored in dev/test mode (expectation fails).',
 's3-atomic-write':'SOURCE_OPERATION_BUSY before the intended source atomic-write test.',
 'imported-draft':'Expected /different source file or project/; received ENOENT repositories.json.',
 'in-situ-focus':'ENOENT .slightnudge while resolving the adapter repository.',
 'preview-connection':'Access denied: 403 !== 200.',
 'reorder-safety':'targetIndex NaN returns status 400 (assertion fails before body validation).',
 's1-auth-origin':'Missing Origin must be allowed when token is valid (obsolete expectation).',
 'token-html-host':'307 !== 200 for the legacy /studio route.'};
const pass=rows.filter(row=>row.classification==='PASS').length+2,defects=rows.filter(row=>row.classification==='BASELINE DEFECT').length;
const table=['| Suite | Result / raw output | Classification | First failing assertion or error |','| --- | --- | --- | --- |'];
table.push('| apply-review-race | [PASS](../evidence/amendment8-s1-apply-review-race.txt) | PASS | Four race cases passed on the original tip. |');
table.push('| apply-crash-recovery | [Red](../evidence/amendment8-s1-apply-crash-recovery.txt), [retry](../evidence/amendment8-s1-apply-crash-recovery-retry.txt), [setup-only green](../evidence/amendment9-crash-setup-green.txt) | BASELINE DEFECT repaired; PASS | Scoped setup omitted the managed root/registry; child 1 instead of expected 73 before recovery ran. |');
for(const row of rows){const links=[row.first,row.retry].filter(Boolean).map((run,i)=>`[${i?'retry':run.code===0?'PASS':'FAIL'}](../evidence/${run.label}.txt)`).join(', ');table.push(`| ${row.suite} | ${links} | ${row.classification} | ${firstErrors[row.suite]||'All assertions passed.'} |`);}
const targeted=['component-actions-bridge','icon-properties-bridge','icon-replacement-bridge','image-attributes-bridge','runtime-class-ownership','source-rendered-bridge'];
for(const row of selection.deferred){table.push(`| ${row.suite} | ${targeted.includes(row.suite)?`Deferred for baseline; [typed targeted PASS](../evidence/amendment9-browser-fixed-${row.suite}.txt)`:'UNRUN'} | DEFERRED | ${row.status==='ready'?'Browser/lab scope deferred as requested.':row.status.replaceAll('|','/')} |`);}
const old=fs.readFileSync(path.join(docs,'perf/s1-baseline.md'),'utf8');const provenance=old.slice(old.indexOf('## Checkout and scope'),old.indexOf('## Isolation method'));
const types=[['EventTarget focus',1,55,'amendment9-types-focus.txt','focus'],['Readonly NODE_ENV',9,46,'amendment9-types-env.txt','readonly-env'],['Optional values',20,26,'amendment9-optional-typecheck.txt','optional'],['Older browser-test typings',26,0,'amendment9-types-final-candidate.txt','browser']].map(([cause,count,remaining,log,key])=>`| ${cause} | ${count} | ${remaining} | ${commits.find(c=>c.group===key).sha.slice(0,7)} | [Raw tsc](../evidence/${log}) |`).join('\n');
const text=`# S1 baseline — engine and typing checkpoint

Amendment 9 supersedes the earlier baseline STOP. CONFIRMED: fixture-only crash-test repair, the selected engine/recovery battery and all 56 typing fixes are complete. TypeScript and npm run build pass. **The owner's lag is not yet measured or fixed.** This is the clean checkpoint before dev instrumentation/measurement, not completion of Amendment 8 Steps 3–6.

${provenance}
## Current integration state and method

All code commits are on codex/editor-safety-port-20261108 in C:/dev/vibecheck/scratch/editor-safety-port-20261108. Original product provenance remains 7a4c44a. Crash-fixture setup repair: 8c61361. Current integration tip: ${commits.at(-1).sha}.

The baseline ran before applying the typing changes, on product-identical 8c61361 plus the unchanged new snapshot helper. Each group used a fresh environment-file-excluding Git archive, a disposable Git index, junctioned integration dependencies, nested TEMP/TMP and the existing real-state helper around both checkouts. Failed suites ran once more in isolation; assertions, timeouts, authentication and source verification were not weakened. The 300 randomized stacked-Undo seeds all ran. Temporary copies stage only explicit paths, including the intentional removal of omitted .env.example from their private index; next-env.d.ts is never staged. No environment-file contents were read.

The typing changes were first validated as cumulative overlays in disposable copies while the baseline checkout remained unchanged. The validated bytes were then applied in four cause-specific commits. The original real-state helper was copied unchanged and retained in its own commit. No new dependency, instrumentation or performance optimization is present.

## Crash fixture diagnosis

CONFIRMED BASELINE DEFECT, repaired in test setup only. The scoped case supplied repositoryId but setup wrote only root/page.tsx, and did not generate .slightnudge/repositories.json or its managed repository directory. The child reaches source-paths canonicalFile → registeredProjectRoot → assertSourceScope → pending validation and exits 1 before the intended rename/crash hook. Earlier passing apply-review-race uses an unscoped temporary file and requires no registry. Setup now creates the scoped managed directory and registry before writing its fixture. Every original assertion and expected exit 73 remains unchanged; the entire crash suite passes. [Child stderr, stack and line-level comparison](../evidence/amendment9-fixture-triage.txt) · [Green](../evidence/amendment9-crash-setup-green.txt)

## Baseline results

${pass} engine/recovery suites pass (including the repaired crash suite and the earlier race suite); ${defects} remain reproduced BASELINE DEFECTs; 28 browser/lab/live-URL candidates were deferred from the 90-candidate baseline inventory as requested. Six of those browser bridge suites subsequently pass as targeted typing validation, distinguished below. No raw output proves a safety violation under Amendment 9. This is **not** an all-green safety battery: missing setup and obsolete expectations remain visible failures.

${table.join('\n')}

## Failure classifications

${rows.filter(row=>row.classification==='BASELINE DEFECT').map(row=>`- **${row.suite}, BASELINE DEFECT:** ${row.reason} [First](../evidence/${row.first.label}.txt) · [Retry](../evidence/${row.retry.label}.txt)`).join('\n')}

These classifications do not authorize weaker behavior. In particular, Origin/token requirements, project registries, explicit Undo binding and legacy-route redirects remain intact. Valid new Apply/Undo recovery and guarded-hook suites pass. Dedicated S1/S2/S3 proof scripts also pass after their typing-only change: [Auth](../evidence/amendment9-env-security-hardening-v2-proofs.txt), [containment](../evidence/amendment9-env-proofs-s2.txt), [atomic writes](../evidence/amendment9-env-proofs-s3.txt).

## TypeScript and build

The original 56 diagnostics are listed individually and grouped in [diagnostic inventory](../evidence/amendment9-typing-table.md), with [raw original failure](../evidence/amendment8-s1-tsc.txt). No other cause group was present.

| Cause | Original diagnostics | Remaining after group | Commit | Validation |
| --- | ---: | ---: | --- | --- |
${types}

Focus uses React.PointerEvent<HTMLElement> for the HTML drag handle; emitted behavior is unchanged. Tests mutate NODE_ENV through a typed record referencing process.env. Draft assertions now first require renderPatches to exist; optional diagnostic messages receive a fallback without changing success assertions. Browser callbacks use window.location to avoid shadowed Node variables, check HTMLElement/source metadata before use, preserve the serialized probe's inferred return type and require an open browser before close. The stronger return type exposed nullable metadata at callers; explicit checks handle it. There is no new any, suppression, non-null assertion or config relaxation. [Added-line audit](../evidence/amendment9-typing-added-lines.txt) · [Validation summary](../evidence/amendment9-type-validation.json)

Affected direct suites: drag-move, direct-manipulation, account-isolation, production-boundaries, appearance-layout, button-editing, component-ownership, container-move, image-content, image-framing, section-order and shared-instance pass. Six in-memory bridge suites and the new transformed-iframe coordinate probe pass. The latter verifies typed probe serialization, metadata and absent metadata, array/single coordinate conversion, scaled iframe geometry and the actual physical source hit, without a server. [Coordinate proof](../evidence/amendment9-browser-coordinate-probe.txt)

imported-draft still fails before its expected scope-refusal assertion because its generated registry is absent; one post-change retry reproduces it. The formatter/report script still cannot find its historical disposable Prettier tool dependency; one retry reproduces MODULE_NOT_FOUND. These are recorded setup defects, not passing tests. Existing full-editor selection/lab workflows with hard-coded live URLs remain UNVERIFIED and were not contacted. [Retry: imported draft](../evidence/amendment9-types-retry-imported-draft.txt) · [Retry: formatter](../evidence/amendment9-types-retry-format-and-tailwind-report-v2.txt)

CONFIRMED: final TypeScript has zero diagnostics, including the new coordinate test. The literal npm run build succeeds, including Next type checking and static generation. The existing webpack module.createRequire warning remains. [Final tsc](../evidence/amendment9-types-final-candidate.txt) · [Production build](../evidence/amendment9-types-build.txt)

## Measurement status and next step

h2–h9 remain UNVERIFIED by timing evidence. No stuck interval, per-stage timing, top-three bottleneck ranking, remount counter, long-task/frame/render/network/bridge table, delay matrix, speedup or before/after video is claimed. A passing production build now permits production measurement after the required dev-first matrix. No optimization should be selected before those measurements.

Resume at Amendment 9 item 5 / Amendment 8 Step 3: test-first guarded instrumentation, prove production/unset inertness, then disposable dev workspace measurements (20 runs per scenario; small/2000-line sources and 0/500/1500 ms pre-write delays), followed by production, measured-impact fixes, preview check and videos. No owner's server is involved. The current scripts accept fresh unique evidence labels:

\x60\x60\x60powershell
Set-Location -LiteralPath 'C:\\dev\\vibecheck'
git -C scratch/editor-safety-port-20261108 status --short
git -C scratch/editor-safety-port-20261108 log -6 --oneline
node --import tsx scratch/editor-sprint1-run-group.ts amendment9-resume-tsc node --import tsx scratch/editor-s1-group.ts amendment9-resume-tsc typecheck
\x60\x60\x60

After adding the new guard test in the integration worktree, its missing-instrumentation red can run with a fresh label through the same isolation wrapper:

\x60\x60\x60powershell
node --import tsx scratch/editor-sprint1-run-group.ts amendment9-perf-guard-red node --import tsx scratch/editor-s1-group.ts amendment9-perf-guard-red perf-stage-guard test/perf-stage-guard.test.ts
\x60\x60\x60

The guard test and measurement harness do not exist yet. Create them in the integration checkout, never in the original S1 worktree. Keep store-v2 parked. Remaining work after performance/preview: safety ports in port-plan.md order, design pass C, controls wave and Part 2c restart/reload/copy work.

## Noticed but not fixed

- Nine reproduced baseline defects above remain; no assertions were rewritten to match stronger auth or changed redirects.
- Historical formatter tool dependency is absent; no new dependency was installed to repair that optional script.
- Webpack warns about module.createRequire in lib/slightnudge/tailwind-verifier.ts.
- Tracked .env.example is deliberately omitted from disposable archives; its contents were not read.
- Windows file-symlink cases requiring unavailable privilege remain UNVERIFIED; directory-junction containment passes. One theme suite cannot perform its optional v3 probe, while dedicated s5-v3-support passes both real v3 cases.
- The integration copy excludes the original S1 worktree's five uncommitted entries. No claim about those uncommitted behaviors is made.

## Protected state and cleanup

[Snapshot/root audit](../evidence/amendment9-audit.json) enumerates every isolation root and before/after pair. All completed protected-state and Git-status comparisons match. All named disposable roots, nested data, dependency junctions, compiler/npm caches and browser temp state are removed at checkpoint. The authorized integration checkout/dependencies remain. No real developer history records were parsed, migrated or edited; required fingerprint snapshots are the only access.

Server instances in this battery: s1-auth-origin twice and token-html-host twice use the unmodified helper's own free-port Next servers; preview-connection twice creates its own port-0 HTTP server. Their awaited teardown runs in finally, and owning groups exit and remove their roots. The HTTP port numbers and helper child PIDs were not all logged; no complete per-PID inventory is claimed. Browser bridge/coordinate tests use routed or in-memory documents and start no server. The original stage/S1 checkout and all pre-existing servers, including 3100/3102, were never contacted, stopped or modified.

## What I did NOT verify

The user's actual lag, dev/production timing matrix, instrumentation inertness, h2–h9 by measurements, performance fixes/budgets/queues, preview correctness on this line, before/after videos, original S1 uncommitted changes, or deferred full-editor/lab/live-URL suites. The nine baseline defects remain failures. No safety-port merge, design pass or controls work was started.
`;
fs.writeFileSync(path.join(docs,'perf/s1-baseline.md'),text);
fs.writeFileSync(path.join(evidence,'amendment9-engine-table.md'),table.join('\n')+'\n');
console.log('Updated baseline report with '+(rows.length+selection.alreadyPassed.length+selection.deferred.length)+' classified candidates.');
