# JSON read call inventory

Every lexical JSON.parse and zero-argument .json() call in the editor client/server scope, including generated runtime templates. Context shows the response/storage/file each reads. NextResponse.json(payload) is a writer and is excluded.

## components/slightnudge/ActionControls.tsx:23

```ts
18:     void (async () => {
19:       try {
20:         const token = await getClientSessionToken();
21:         if (!active) return;
22:         const response = await fetch('/api/slightnudge/preview', { signal: controller.signal, method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ ...source, ...(source.repositoryId ? { sourcePath: source.filePath } : {}), kind: 'action', operation: 'inspect', draft: true, parentPreviewId }) });
23:         const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'This source could not be inspected.');
24:         if (active) { setInfo(result.action); if (!focused.current) setHref(result.action.fields.href?.value || ''); }
25:       } catch (error) { if (active) setError(error instanceof Error ? error.message : 'This source could not be inspected.'); }
26:     })();
```

## components/slightnudge/ChangeHistory.tsx:22

```ts
17:     const load = async () => {
18:       let token = await getClientSessionToken();
19:       const request = () => fetch('/api/slightnudge/history', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ repositoryId }) });
20:       let response = await request();
21:       if (response.status === 403) { token = await getClientSessionToken(true); response = await request(); }
22:       const data = await response.json();
23:       if (!response.ok) throw new Error(data.error || 'History is unavailable.');
24:       if (!controller.signal.aborted) setEntries(data.entries);
25:     };
```

## components/slightnudge/EditorWorkspace.tsx:485

```ts
480:     document.addEventListener('keydown', escape);
481:     return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
482:   }, []);
483:   useEffect(() => {
484:     try {
485:       const saved = JSON.parse(localStorage.getItem('slightnudge:workspace-layout') || 'null');
486:       if (saved && Number.isFinite(saved.width)) setInspectorWidth(Math.min(360, Math.max(272, saved.width)));
487:       if (saved?.collapsed === true) setInspectorCollapsed(true);
488:     } catch { /* Layout preferences are optional. */ }
```

## components/slightnudge/EditorWorkspace.tsx:583

```ts
578:   const hasResponsivePreferences = useRef(false);
579:   const responsivePreferenceKey = `slightnudge:responsive:${repositoryId || 'local'}${repositoryId && !windowMode ? ':setup' : ''}`;
580:   useEffect(() => {
581:     hasResponsivePreferences.current = false;
582:     try {
583:       const saved = JSON.parse(localStorage.getItem(responsivePreferenceKey) || 'null');
584:       if (saved && (saved.width === null || Number.isInteger(saved.width) && saved.width >= 240 && saved.width <= 3840) && typeof saved.scope === 'string' && (!saved.scope || /^[a-z0-9][a-z0-9-]{0,31}$/i.test(saved.scope))) { hasResponsivePreferences.current = true; setViewportWidth(saved.width); setActiveBreakpoint(usesDrafts ? saved.scope : ''); }
585:     } catch { /* A malformed preference does not affect source or drafts. */ }
586:     setResponsivePreferencesReady(true);
```

## components/slightnudge/EditorWorkspace.tsx:626

```ts
621:     if (!responsiveSourcePath) { setScopeLoading(false); return; }
622:     void (async () => {
623:       try {
624:         const token = await getClientSessionToken();
625:         const response = await fetch('/api/slightnudge/responsive', { method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ repositoryId, filePath: responsiveSourcePath }) });
626:         const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Project breakpoints are unavailable.');
627:         if (!cancelled) setResponsiveScopes(result.breakpoints);
628:       } catch (error) { if (!cancelled) setScopeError(error instanceof Error ? error.message : 'Project breakpoints are unavailable.'); }
629:       finally { if (!cancelled) setScopeLoading(false); }
```

## components/slightnudge/EditorWorkspace.tsx:672

```ts
667:   // Auto-detect project routes from Next.js filesystem
668:   const autoDetectPages = useCallback(async (notify = false) => {
669:     try {
670:       const res = await fetch('/api/slightnudge/pages');
671:       if (res.ok) {
672:         const data = await res.json();
673:         if (data.allPages && data.allPages.length > 0) {
674:           setPages(data.allPages);
675:           if (notify) {
```

## components/slightnudge/EditorWorkspace.tsx:805

```ts
800:       try {
801:         const patches: CanvasRenderPatch[] = [];
802:         for (const head of Object.values(draftHeads(edit))) {
803:           const token = await getClientSessionToken();
804:           const response = await fetch('/api/slightnudge/draft-view', { signal: AbortSignal.timeout(30000), method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ previewId: head.id, filePath: head.filePath, repositoryId, sourcePath: editPath(head) }) });
805:           const result = await response.json(); if (!response.ok) throw new Error(result.error); patches.push(...result.renderPatches);
806:         }
807:         await sourceCanvas.current?.command('restore', null, { patches }); needsDraftReplay.current = false; return true;
808:       } catch (error) { showToast(error instanceof Error ? error.message : 'The draft could not be rendered.'); return false; }
```

## components/slightnudge/EditorWorkspace.tsx:1286

```ts
1281:   const restoreStoredDraft = async () => {
1282:     if (!usesDrafts) return false;
1283:     try {
1284:       const raw = localStorage.getItem(projectDraftStorageKey);
1285:       if (!raw) return false;
1286:       const value = JSON.parse(raw) as StudioDraft;
1287:       if (!isStudioDraft(value)) throw new Error('The saved draft could not be restored.');
1288:       const frame = value.frames[value.cursor];
1289:       const viewport = value.viewport;
```

## components/slightnudge/EditorWorkspace.tsx:1350

```ts
1345:         if (group.success && group.state === expected) {
1346:           // A retained receipt can predate a new unsaved draft. Confirming that
1347:           // older operation must never delete the newer browser draft.
1348:           let newerDraft = false;
1349:           try {
1350:             const stored = JSON.parse(localStorage.getItem(projectDraftStorageKey) || 'null');
1351:             if (stored !== null && !isStudioDraft(stored)) throw new Error('Invalid saved draft');
1352:             newerDraft = Boolean(stored && stored.frames[stored.cursor].edit?.groupTransactionId !== view.edit.groupTransactionId);
1353:           } catch { setRecoveryError('The source operation is confirmed, but the saved draft could not be read. Its browser data has been preserved.'); return; }
```

## components/slightnudge/IconControls.tsx:41

```ts
36:     const controller = new AbortController(); let active = true;
37:     void (async () => {
38:       try {
39:         const token = await getClientSessionToken(); if (!active) return;
40:         const response = await fetch('/api/slightnudge/preview', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ ...source, ...(source.repositoryId ? { sourcePath: source.filePath } : {}), kind: 'icon', operation: 'inspect', draft: true, parentPreviewId }) });
41:         const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'This icon cannot be inspected.');
42:         if (active) { setInfo({ ...data.icon, choices: (data.icon.choices || []).filter(validIconShape) }); setInfoKey(requestKey); setError(''); }
43:       } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'This icon cannot be inspected.'); }
44:     })();
```

## components/slightnudge/ImageContent.tsx:17

```ts
12:       const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!file) return;
13:       setUploading(true); setError('');
14:       try {
15:         const token = await getClientSessionToken(); const form = new FormData(); form.set('file', file);
16:         const response = await fetch(`/api/slightnudge/assets${repositoryId ? `?repositoryId=${encodeURIComponent(repositoryId)}` : ''}`, { method: 'POST', headers: { 'x-slightnudge-token': token }, body: form });
17:         const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not import this image.');
18:         if (currentSelection.current === selectionKey) await onChange('src', result.asset.url);
19:       } catch (error) { setError(error instanceof Error ? error.message : 'Image import failed.'); }
20:       finally { setUploading(false); }
```

## components/slightnudge/SlightNudgeOverlay.tsx:467

```ts
462:     try {
463:       const token = await getClientSessionToken();
464:       const response = await fetch('/api/slightnudge/preview', {
465:         method: 'POST', headers: { 'Content-Type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify(payload),
466:       });
467:       const result = await response.json();
468:       if (!response.ok || !result.success) throw new Error(result.error || 'Could not prepare this change.');
469:       if (result.changed === false) {
470:         setNotice(result.message || 'No source change is needed.');
```

## components/slightnudge/SlightNudgeOverlay.tsx:625

```ts
620:       const token = await getClientSessionToken();
621:       const response = await fetch('/api/slightnudge/apply', {
622:         method: 'POST', headers: { 'Content-Type': 'application/json', 'x-slightnudge-token': token },
623:         body: JSON.stringify({ previewId: pendingEdit.id, groupId: editGroupIdRef.current }),
624:       });
625:       const result = await response.json();
626:       if (!response.ok || !result.success) {
627:         if (result.code === 'SOURCE_CHANGED') {
628:           await discardPreview();
```

## components/slightnudge/SlightNudgeOverlay.tsx:693

```ts
688:           className: info.className,
689:           rect: info.rect,
690:           clickedRect: info.clickedRect,
691:         }),
692:       });
693:       const result = await response.json();
694:       if (typeof result.className === 'string' && element.isConnected) {
695:         element.className = result.className;
696:         applyMarginInline(element, result.className);
```

## components/slightnudge/SourceProjectCanvas.tsx:97

```ts
92:       if (!windowMode) next.searchParams.set('__slightnudge_canvas', '1');
93:       documentUrl.current = next.toString(); setUrl(next.toString()); return;
94:     }
95:     let active = true;
96:     fetch(`/api/slightnudge/repositories/${encodeURIComponent(repositoryId)}`).then(async response => {
97:       const data = await response.json();
98:       if (!response.ok) throw new Error(data.error || 'Could not inspect project compatibility.');
99:       if (!active) return;
100:       setFramework(data.framework);
```

## components/slightnudge/SourceProjectCanvas.tsx:219

```ts
214:       // restarted Next server can be listening while its route still rebuilds.
215:       for (let attempt = 0; attempt < 3; attempt++) {
216:         const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(repositoryId)}/preview-check`, {
217:           method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ url: address }),
218:         });
219:         data = await response.json();
220:         if (response.ok) break;
221:         if ((response.status === 502 || response.status === 504) && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); continue; }
222:         throw new Error(data?.error || 'Could not connect to the project.');
```

## lib/slightnudge/client.ts:73

```ts
68:   const response = await fetch('/api/slightnudge/preview', {
69:     method: 'POST', signal: signal || AbortSignal.timeout(30000),
70:     headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
71:     body: JSON.stringify({ ...params, ...(params.repositoryId ? { sourcePath: params.filePath } : {}), kind: 'component', operation: 'inspect', draft: true }),
72:   });
73:   const result = await response.json();
74:   if (!response.ok || !result.success) throw new Error(result.error || 'Unable to inspect component props.');
75:   return result.component;
76: }
```

## lib/slightnudge/client.ts:115

```ts
110:           method: 'POST',
111:           headers: { 'Content-Type': 'application/json' },
112:           body: JSON.stringify(params.repositoryId ? { ...params, path: params.filePath } : params),
113:         });
114:         if (attempt === 0 && [502, 503, 504].includes(res.status)) { await new Promise(resolve => setTimeout(resolve, 250)); continue; }
115:         return await res.json();
116:       } catch (error) {
117:         if (attempt === 0 && error instanceof Error && ['AbortError', 'TimeoutError', 'TypeError'].includes(error.name)) { await new Promise(resolve => setTimeout(resolve, 250)); continue; }
118:         throw error;
```

## lib/slightnudge/client.ts:148

```ts
143:     return cachedSessionToken!;
144:   }
145:   try {
146:     const res = await fetch('/api/slightnudge/token', { signal: AbortSignal.timeout(10000), cache: 'no-store' });
147:     if (res.ok) {
148:       const data = await res.json();
149:       cachedSessionToken = data.token;
150:       if (typeof window !== 'undefined') {
151:         (window as any).__SLIGHTNUDGE_TOKEN__ = data.token;
```

## lib/slightnudge/client.ts:171

```ts
166:         'Content-Type': 'application/json',
167:         'x-slightnudge-token': token,
168:       },
169:       body: JSON.stringify(params),
170:     });
171:     const data = await res.json();
172:     if (!res.ok || !data.success) {
173:       return {
174:         success: false,
```

## lib/slightnudge/client.ts:223

```ts
218:     });
219:     let res = await lookup();
220:     // A restarted server has a new session token. Refresh authorization for this
221:     // read only; never retry the write when its outcome is uncertain.
222:     if (res.status === 403) { token = await getClientSessionToken(true); res = await lookup(); }
223:     const data = await res.json();
224:     if (res.ok && data.success === true) return { success: true, editId: data.editId };
225:     if (['SOURCE_CHANGED', 'APPLY_ALREADY_UNDONE', 'OUTCOME_SCOPE_MISMATCH', 'APPLY_NOT_APPLIED', 'SOURCE_RECOVERY_REQUIRED'].includes(data.code)) return { success: false, code: data.code, error: data.error };
226:   } catch { /* A failed lookup says nothing about whether the save succeeded. */ }
```

## lib/slightnudge/client.ts:245

```ts
240:         'Content-Type': 'application/json',
241:         'x-slightnudge-token': token,
242:       },
243:       body: JSON.stringify({ previewId, ...context }),
244:     });
245:     const data = await res.json();
246:     if (res.status === 403) {
247:       // This endpoint's authorization guard runs before any source operation.
248:       // Refresh the credential, but leave the reviewed write to an explicit retry.
```

## lib/slightnudge/client.ts:292

```ts
287:     let token = await getClientSessionToken();
288:     const request = () => fetch('/api/slightnudge/change-set', { method:'POST', signal:AbortSignal.timeout(15000), headers:{'content-type':'application/json','x-slightnudge-token':token},body:JSON.stringify({operation,transactionId,repositoryId,...(operation==='save'?{members}:{})}) });
289:     let response=await request();
290:     if(response.status===403&&operation==='status'){token=await getClientSessionToken(true);response=await request();}
291:     if(response.status===403)return {success:false,transactionId,code:'GROUP_AUTH_DENIED',error:'The change-set request was denied before writing. Reconnect, then explicitly retry.'};
292:     const data=await response.json();
293:     if(response.status>=500&&operation!=='status')return changeSetAPI('status',transactionId,[],repositoryId);
294:     return {...data,transactionId};
295:   }catch{
```

## lib/slightnudge/client.ts:315

```ts
310:       headers: { 'Content-Type': 'application/json', 'x-slightnudge-token': token },
311:       body: JSON.stringify({ filePath, ...context }),
312:     });
313:     let response = await lookup();
314:     if (response.status === 403) { token = await getClientSessionToken(true); response = await lookup(); }
315:     const data = await response.json();
316:     if (response.ok && data.success === true && (!data.previewId || data.previewId === context.previewId)) {
317:       uncertainUndos.delete(key);
318:       return { success: true, editId: data.editId, message: data.message, sourceCurrent: data.sourceCurrent };
```

## lib/slightnudge/client.ts:346

```ts
341:         'Content-Type': 'application/json',
342:         'x-slightnudge-token': token,
343:       },
344:       body: JSON.stringify({ filePath, ...context }),
345:     });
346:     const data = await res.json();
347:     if (res.status === 403) {
348:       uncertainUndos.delete(key); await getClientSessionToken(true);
349:       return { success: false, code: 'AUTH_REQUIRED', error: 'Undo was denied before writing. Explicitly retry it after checking the connection.' };
```

## lib/slightnudge/docker-preview.ts:52

```ts
47: }
48: 
49: async function getRepoConfig(repositoryId: string) {
50:   const root = await resolveRepositoryRoot(repositoryId);
51:   const packagePath = path.join(root, 'package.json');
52:   const manifest = JSON.parse(await readFile(packagePath, 'utf8')) as {
53:     scripts?: Record<string, string>;
54:     dependencies?: Record<string, string>;
55:     devDependencies?: Record<string, string>;
```

## lib/slightnudge/edit-history.ts:140

```ts
135:     throw error;
136:   }
137: 
138:   let rawRecords: any;
139:   try {
140:     rawRecords = JSON.parse(contents);
141:   } catch (err: any) {
142:     throw new Error(`The local edit history is invalid or corrupted: ${err.message}`);
143:   }
```

## lib/slightnudge/edit-history.ts:512

```ts
507:     for (const entry of readdirSync(dir)) {
508:       if (!/^[0-9a-f-]{36}\.json$/i.test(entry)) continue;
509:       const entryPath = path.join(dir, entry);
510:       const age = Date.now() - statSync(entryPath).mtimeMs;
511:       if (!existsSync(applyIntentPath(entry.slice(0, -5))) && age > 30 * 60 * 1000) {
512:         const persisted = JSON.parse(readFileSync(entryPath, 'utf8'));
513:         if (!persisted.draft || age > 30 * 24 * 60 * 60 * 1000) unlinkSync(entryPath);
514:       }
515:     }
```

## lib/slightnudge/edit-history.ts:592

```ts
587:     newClassName: pending.newClassName,
588:   };
589: }
590: 
591: export function readPendingSourceEdit(id: string): PendingEdit {
592:   const pending = JSON.parse(readFileSync(pendingPath(id), 'utf8')) as PendingEdit;
593:   validatePending(pending, id);
594:   return pending;
595: }
```

## lib/slightnudge/edit-history.ts:626

```ts
621:   let contents: string;
622:   try {
623:     if (statSync(applyIntentPath(id)).size > maxSnapshotBytes * 32) throw new Error('The save recovery record is too large.');
624:     contents = readFileSync(applyIntentPath(id), 'utf8');
625:   } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
626:   const intent = JSON.parse(contents) as ApplyIntent;
627:   if (intent.version !== 1 || !['applying', 'not-applied'].includes(intent.phase) || typeof intent.historyDigest !== 'string' || !/^[a-f0-9]{64}$/.test(intent.historyDigest) ||
628:       (intent.groupId !== undefined && !/^[0-9a-f-]{36}$/i.test(intent.groupId))) throw new Error('The save recovery record is invalid. No source was changed.');
629:   validatePending(intent.pending, id);
```

## lib/slightnudge/icon-library.ts:30

```ts
25:     const candidate = path.join(directory, 'node_modules/lucide-react/package.json');
26:     if (existsSync(candidate)) { packageFile = candidate; break; }
27:     const parent = path.dirname(directory); if (parent === directory) break; directory = parent;
28:   }
29:   if (!packageFile) throw new Error('Install Lucide in this project before replacing icons.');
30:   const packageRoot = path.dirname(packageFile), pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
31:   if (pkg.name !== 'lucide-react') throw new Error('This project uses a custom icon provider.');
32:   if (typeof pkg.module !== 'string') throw new Error('This Lucide build does not expose supported static icon data.');
33:   const entryPath = path.resolve(packageRoot, pkg.module), entry = ts.createSourceFile('library.js', read(packageRoot, pkg.module, 2_000_000), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
```

## lib/slightnudge/instance-trace.ts:6

```ts
1: export interface InstanceCall { path: string; index: number; hash: string }
2: /** Serialized into the preview bridge; keep independent of server modules. */
3: export function parseInstanceTrace(value: unknown): InstanceCall[] | undefined {
4:   if(typeof value!=='string'||!value||value.length>8192)return undefined;
5:   const lines=value.split('\n');if(lines.length>16)return undefined;
6:   try{return lines.map(line=>{const row=JSON.parse(line);if(!Array.isArray(row)||row.length!==3||typeof row[0]!=='string'||!row[0]||row[0].length>1000||row[0].includes('\\')||row[0].startsWith('/')||/^[a-z]:/i.test(row[0])||row[0].split('/').includes('..')||!Number.isSafeInteger(row[1])||row[1]<0||row[1]>100000||typeof row[2]!=='string'||! /^[a-f0-9]{64}$/.test(row[2]))throw Error();return {path:row[0],index:row[1],hash:row[2]}})}catch{return undefined}
7: }
8: export function rebaseInstanceTrace(value:string,file:string,hash:string){const calls=parseInstanceTrace(value);if(!calls)throw new Error('The component instance marker is invalid.');return calls.map(call=>JSON.stringify([call.path,call.index,call.path===file?hash:call.hash])).join('\n');}
9: 
```

## lib/slightnudge/next-source-adapter.ts:423

```ts
418:         method: 'POST',
419:         headers: { 'Content-Type': 'application/json' },
420:         body: JSON.stringify(defaultRepo ? payload : { filePath: payload.path, ...payload }),
421:       });
422:       if (res.ok) {
423:         inspectedData = await res.json();
424:         if (!undoNeedsCheck && !undoBusy) {
425:           undoTarget = inspectedData.undoTarget ? { ...inspectedData.undoTarget, sourcePath: payload.path } : null;
426:           canUndoState = Boolean(undoTarget);
```

## lib/slightnudge/next-source-adapter.ts:459

```ts
454:       const res = await fetch(\`\${backendOrigin}/api/slightnudge/preview\`, {
455:         method: 'POST',
456:         headers: { 'Content-Type': 'application/json' },
457:         body: JSON.stringify(body),
458:       });
459:       const data = await res.json();
460:       if (res.ok && data.success) {
461:         pendingEdit = { id: data.id, summary: data.summary, kind, sourcePath };
462:         if (kind === 'style' && payload.value) {
```

## lib/slightnudge/next-source-adapter.ts:492

```ts
487:   async function getBridgeToken() {
488:     if (cachedToken) return cachedToken;
489:     try {
490:       const res = await fetch(\`\${backendOrigin}/api/slightnudge/token\`);
491:       if (res.ok) {
492:         const data = await res.json();
493:         cachedToken = data.token;
494:         return cachedToken;
495:       }
```

## lib/slightnudge/next-source-adapter.ts:517

```ts
512:           previewId: accepted.id,
513:           repositoryId: defaultRepo || undefined,
514:           sourcePath: accepted.sourcePath,
515:         }),
516:       });
517:       const data = await res.json();
518:       if (res.ok && data.success) {
519:         undoTarget = { previewId: accepted.id, editId: data.editId, sourcePath: accepted.sourcePath };
520:         pendingEdit = null;
```

## lib/slightnudge/next-source-adapter.ts:566

```ts
561:           previewId: target.previewId,
562:           editId: target.editId,
563:         }),
564:         signal: AbortSignal.timeout(15000),
565:       });
566:       const data = await res.json();
567:       if (res.ok && data.success) {
568:         pendingEdit = null;
569:         canUndoState = false;
```

## lib/slightnudge/next-source-adapter.ts:830

```ts
825: async function getState(root: string): Promise<AdapterState | null> {
826:   const statePath = path.join(root, adapterDirectoryName, stateFileName);
827:   try {
828:     const directory = await lstat(path.join(root, adapterDirectoryName));
829:     if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('Adapter directory was replaced');
830:     const state = JSON.parse(await readFile(statePath, 'utf8')) as AdapterState;
831:     if (state?.version !== 1 || !safeConfigName(state.wrapperName) || state.backupName !== null && (typeof state.backupName !== 'string' || !/^next\.config\.slightnudge-original\.(?:js|mjs|cjs|ts|mts|cts)$/.test(state.backupName))) throw new Error('Invalid adapter state');
832:     return state;
833:   } catch (error) {
```

## lib/slightnudge/next-source-adapter.ts:851

```ts
846:   const root = await resolveRepositoryRoot(repositoryId);
847:   const existingState = await getState(root);
848:   if (existingState) return { success: true as const, alreadyInstalled: true, restartRequired: true };
849: 
850:   const packagePath = path.join(root, 'package.json');
851:   const packageInfo = JSON.parse(await readFile(packagePath, 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
852:   const declaredNext = packageInfo.dependencies?.next || packageInfo.devDependencies?.next || '';
853:   if (!declaredNext) throw new Error('This adapter currently supports Next.js repositories only.');
854:   const nextVersionPath = path.join(root, 'node_modules', 'next', 'package.json');
```

## lib/slightnudge/next-source-adapter.ts:856

```ts
851:   const packageInfo = JSON.parse(await readFile(packagePath, 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
852:   const declaredNext = packageInfo.dependencies?.next || packageInfo.devDependencies?.next || '';
853:   if (!declaredNext) throw new Error('This adapter currently supports Next.js repositories only.');
854:   const nextVersionPath = path.join(root, 'node_modules', 'next', 'package.json');
855:   let nextVersion = declaredNext;
856:   try { nextVersion = (JSON.parse(await readFile(nextVersionPath, 'utf8')) as { version: string }).version; } catch { /* Resolve from manifest */ }
857:   const match = nextVersion.match(/(?:^|[^0-9])(\d+)/);
858:   if (!match || Number(match[1]) < 13) {
859:     throw new Error('Click-to-source needs Next.js 13 or newer. This adapter will not change an older Next.js configuration.');
```

## lib/slightnudge/project-compatibility.ts:25

```ts
20: 
21: async function manifest(file: string): Promise<Manifest | null> {
22:   try {
23:     const source = await readFile(file, 'utf8');
24:     if (source.length > 1024 * 1024) return null;
25:     const value = JSON.parse(source);
26:     return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
27:   } catch { return null; }
28: }
```

## lib/slightnudge/repository-store.ts:23

```ts
18:   importedAt: string;
19: }
20: 
21: async function readIndex(): Promise<LocalRepository[]> {
22:   try {
23:     const value = JSON.parse(await readFile(indexPath, 'utf8'));
24:     return Array.isArray(value) ? value : [];
25:   } catch (error) {
26:     if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
```

## lib/slightnudge/source-canvas-bridge.ts:12

```ts
7: 
8: /** Browser runtime shared by local source previews and imported adapters. Keep
9:  * this function self-contained: it is serialized into the preview document. */
10: function sourceCanvasRuntime(continuous: boolean, repositoryId = '', protocol = 18, setupCanvas: typeof importedCanvasRuntime | undefined, classMatches: typeof sourceClassesMatch, runtimeClasses: typeof withRuntimeClasses, linkDestination: typeof validLinkDestination, iconValue: typeof validIconValue, iconShape: typeof validIconShape, instanceTrace: typeof parseInstanceTrace) {
11:   const url = new URL(location.href);
12:   let saved: any = null; try { saved = JSON.parse(sessionStorage.getItem('slightnudge:preview-session') || 'null'); } catch {}
13:   const session = url.searchParams.get('__slightnudge_session') || (window.parent !== window ? saved?.session : null), origin = url.searchParams.get('__slightnudge_parent') || (window.parent !== window ? saved?.origin : null);
14:   if (repositoryId && (url.searchParams.get('__slightnudge_draft') === '1' || saved?.session === session && saved?.continuous)) continuous = true;
15:   if (!session || !origin || window.parent === window || (window as any).__slightnudge_bridge_active) return;
```

## lib/slightnudge/source-group-journal.ts:43

```ts
38:     catch (error) {
39:         if ((error as NodeJS.ErrnoException).code === 'ENOENT')
40:             return null;
41:         throw error;
42:     }
43:     const value = JSON.parse(fs.readFileSync(file, 'utf8')) as SourceGroupJournal;
44:     if (value.version !== 1 || value.id !== id || !['saving', 'saved', 'undoing', 'undone'].includes(value.phase) || typeof value.root !== 'string' || path.isAbsolute(value.root) || typeof value.createdAt !== 'string' || value.repositoryId !== undefined && typeof value.repositoryId !== 'string' || !Array.isArray(value.members) || !value.members.length || value.members.length > 16 || value.digest !== groupDigest(value.members))
45:         throw new Error('Change-set recovery data is invalid. Source writes are paused.');
46:     const paths = new Set<string>(), ids = new Set<string>();
```

## lib/slightnudge/source-operation-lock.ts:53

```ts
48:       }
49:       let contents: string;
50:       try { contents = fs.readFileSync(path.join(root, entry), 'utf8'); }
51:       catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
52:       try {
53:         const data = JSON.parse(contents);
54:         if (data.pid !== pid || (data.ticket !== null && (!Number.isSafeInteger(data.ticket) || data.ticket < 1))) throw new Error('Invalid ticket');
55:         if (pid === process.pid && typeof data.processStart === 'number' && data.processStart !== processStart) {
56:           // A restarted process can reuse its predecessor's PID. In the same
```

## lib/slightnudge/studio-recovery.ts:29

```ts
24: export function readStudioRecovery(repositoryId?: string, storage?: RecoveryStorage): RecoveryRead {
25:   try {
26:     const raw = (storage || browserStorage()).getItem(keyFor(repositoryId));
27:     if (!raw) return { status: 'empty' };
28:     if (raw.length > maxBytes) throw new Error('Oversized recovery record');
29:     const record = JSON.parse(raw) as StudioRecoveryRecord;
30:     if (record.version !== 1 || !shortString(record.operationId, 128) || !['apply', 'undo'].includes(record.kind) ||
31:       !shortString(record.previewId, 128) || !shortString(record.filePath) || !Number.isFinite(record.startedAt) ||
32:       record.repositoryId !== repositoryId || (record.editId !== undefined && !shortString(record.editId, 128)) ||
```

## lib/slightnudge/tailwind-verifier.ts:118

```ts
113:   let fallbackRoot: string | null = null;
114:   while (curr && curr !== root) {
115:     const pkgJsonPath = path.join(curr, 'package.json');
116:     if (existsSync(pkgJsonPath)) {
117:       try {
118:         const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
119:         const deps = { ...pkg.dependencies, ...pkg.devDependencies };
120:         if (deps.tailwindcss) {
121:           return curr;
```

## lib/slightnudge/tailwind-verifier.ts:163

```ts
158:   const root = path.parse(curr).root;
159:   while (curr && curr !== root) {
160:     const pkgJsonPath = path.join(curr, 'node_modules', packageName, 'package.json');
161:     if (existsSync(pkgJsonPath)) {
162:       try {
163:         const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
164:         return { dir: path.dirname(pkgJsonPath), pkg };
165:       } catch {}
166:     }
```

## lib/slightnudge/tailwind-verifier.ts:388

```ts
383:   }
384: 
385:   const targetPkgJsonPath = path.join(rootDir, 'package.json');
386:   if (existsSync(targetPkgJsonPath)) {
387:     try {
388:       const targetPkg = JSON.parse(readFileSync(targetPkgJsonPath, 'utf8'));
389:       const deps = { ...targetPkg.dependencies, ...targetPkg.devDependencies };
390:       if (!deps.tailwindcss) {
391:         return { verified: false, error: "can't verify this class: tailwindcss is not installed" };
```

## app/api/slightnudge/apply/route.ts:16

```ts
11: export async function POST(request: Request) {
12:   const auth = validateMutatingRequest(request);
13:   if (!auth.valid) return auth.response;
14: 
15:   try {
16:     const body = await request.json();
17:     if (typeof body.previewId !== 'string') return NextResponse.json({ error: 'Review a change before applying it.' }, { status: 400, headers: corsHeaders(request) });
18:     const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
19:     const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : undefined;
```

## app/api/slightnudge/apply/status/route.ts:18

```ts
13: export async function POST(request: Request) {
14:   const auth = validateMutatingRequest(request);
15:   if (!auth.valid) return auth.response;
16:   const headers = { ...corsHeaders(request), 'Cache-Control': 'no-store' };
17:   try {
18:     const body = await request.json();
19:     if (typeof body.previewId !== 'string') return NextResponse.json({ success: false, error: 'A reviewed change is required.' }, { status: 400, headers });
20:     const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
21:     const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : undefined;
```

## app/api/slightnudge/change-set/route.ts:14

```ts
9:     const auth = validateMutatingRequest(request);
10:     if (!auth.valid)
11:         return auth.response;
12:     const headers = { ...corsHeaders(request), 'Cache-Control': 'no-store' };
13:     try {
14:         const body = await request.json();
15:         if (!validGroupId(body.transactionId) || !['save', 'status', 'undo'].includes(body.operation) || body.repositoryId !== undefined && typeof body.repositoryId !== 'string')
16:             throw new Error('Choose a valid change set and operation.');
17:         const repositoryId = body.repositoryId as string | undefined;
```

## app/api/slightnudge/draft-view/route.ts:10

```ts
5: 
6: /** Read/compile a persisted local proposal without writing its project file. */
7: export async function POST(request: Request) {
8:   const auth = validateMutatingRequest(request); if (!auth.valid) return auth.response;
9:   try {
10:     const body = await request.json();
11:     if (typeof body.previewId !== 'string' || typeof body.filePath !== 'string') return NextResponse.json({ error: 'Choose a saved local draft.' }, { status: 400 });
12:     const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
13:     const file = repositoryId ? (await resolveRepositorySourcePath(repositoryId, body.sourcePath)).filePath : resolveWorkspaceSourcePath(body.filePath);
```

## app/api/slightnudge/history/route.ts:13

```ts
8:   if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Local history requires the development app.' }, { status: 501 });
9:   const auth = validateMutatingRequest(request);
10:   if (!auth.valid) return auth.response;
11:   const headers = { 'Cache-Control': 'no-store' };
12:   try {
13:     const body = await request.json();
14:     if (!body || typeof body !== 'object' || Array.isArray(body) || body.repositoryId !== undefined && (typeof body.repositoryId !== 'string' || !body.repositoryId)) return NextResponse.json({ error: 'Choose a valid project.' }, { status: 400, headers });
15:     const root = body.repositoryId ? await resolveRepositoryRoot(body.repositoryId) : process.cwd();
16:     return NextResponse.json({ entries: getHistorySummary(root, body.repositoryId) }, { headers });
```

## app/api/slightnudge/inspect/route.ts:17

```ts
12:   try {
13:     const origin = request.headers.get('origin');
14:     if (origin && !isAllowedOrigin(origin, request.url)) {
15:       return NextResponse.json({ error: 'Inspection must come from an authorized workspace.' }, { status: 403, headers: corsHeaders(request) });
16:     }
17:     const body = await request.json();
18:     const { filePath, line, column, elementId, tagName, className, rect, clickedRect } = body;
19: 
20:     if (!filePath) {
```

## app/api/slightnudge/preview/route.ts:42

```ts
37: export async function POST(request: Request) {
38:   const auth = validateMutatingRequest(request);
39:   if (!auth.valid) return auth.response;
40: 
41:   try {
42:     const body = await request.json();
43:     if (typeof body.kind !== 'string') {
44:       return NextResponse.json({ error: 'A source file and edit type are required.' }, { status: 400, headers: corsHeaders(request) });
45:     }
```

## app/api/slightnudge/repositories/route.ts:19

```ts
14: export async function POST(request: Request) {
15:   const auth = validateMutatingRequest(request);
16:   if (!auth.valid) return auth.response;
17: 
18:   try {
19:     const body = await request.json();
20:     if (typeof body.url !== 'string' || body.url.length > 500) {
21:       return NextResponse.json({ error: 'A repository URL is required.' }, { status: 400 });
22:     }
```

## app/api/slightnudge/repositories/[id]/inspect/route.ts:22

```ts
17:     if (origin && !isAllowedOrigin(origin, request.url)) {
18:       return NextResponse.json({ error: 'Source inspection must come from this SlightNudge workspace.' }, { status: 403, headers: corsHeaders(request) });
19:     }
20: 
21:     const { id } = await context.params;
22:     const body = await request.json();
23:     if (typeof body.path !== 'string' || body.path.length > 1000) {
24:       return NextResponse.json({ error: 'Choose a source file from the imported repository.' }, { status: 400, headers: corsHeaders(request) });
25:     }
```

## app/api/slightnudge/repositories/[id]/preview-check/route.ts:20

```ts
15: 
16:     const { id } = await context.params;
17:     const repository = (await listLocalRepositories()).find((item) => item.id === id);
18:     if (!repository) return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });
19: 
20:     const body = await request.json();
21:     if (typeof body.url !== 'string' || body.url.length > 2048) {
22:       return NextResponse.json({ error: 'Enter your local preview URL.' }, { status: 400 });
23:     }
```

## app/api/slightnudge/responsive/route.ts:9

```ts
4: import { findProjectRoot, getProjectResponsiveScopes } from '@/lib/slightnudge/tailwind-verifier';
5: 
6: export async function POST(request: Request) {
7:   const auth = validateMutatingRequest(request); if (!auth.valid) return auth.response;
8:   try {
9:     const body = await request.json();
10:     if (typeof body.filePath !== 'string') return NextResponse.json({ error: 'Choose a project source file.' }, { status: 400 });
11:     const target = typeof body.repositoryId === 'string' ? (await resolveRepositorySourcePath(body.repositoryId, body.filePath)).filePath : resolveWorkspaceSourcePath(body.filePath);
12:     return NextResponse.json({ breakpoints: await getProjectResponsiveScopes(findProjectRoot(target)) });
```

## app/api/slightnudge/undo/route.ts:16

```ts
11: export async function POST(request: Request) {
12:   const auth = validateMutatingRequest(request);
13:   if (!auth.valid) return auth.response;
14: 
15:   try {
16:     const body = await request.json();
17:     if (typeof body.previewId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.previewId)) return NextResponse.json({ success: false, code: 'UNDO_TARGET_REQUIRED', error: 'Choose the accepted edit to undo. Unbound Undo requests are not supported.' }, { status: 400, headers: corsHeaders(request) });
18:     if (body.repositoryId !== undefined && (typeof body.repositoryId !== 'string' || typeof body.sourcePath !== 'string')) return NextResponse.json({ success: false, code: 'UNDO_TARGET_REQUIRED', error: 'Choose the project and source file for this Undo.' }, { status: 400, headers: corsHeaders(request) });
19:     const filePath = typeof body.repositoryId === 'string' && typeof body.sourcePath === 'string'
```

## app/api/slightnudge/undo/status/route.ts:14

```ts
9: export async function POST(request: Request) {
10:   const auth = validateMutatingRequest(request);
11:   if (!auth.valid) return auth.response;
12:   const headers = { ...corsHeaders(request), 'Cache-Control': 'no-store' };
13:   try {
14:     const body = await request.json();
15:     if (typeof body.previewId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.previewId)) return NextResponse.json({ success: false, code: 'UNDO_TARGET_REQUIRED', error: 'An accepted edit reference is required.' }, { status: 400, headers });
16:     if (body.repositoryId !== undefined && (typeof body.repositoryId !== 'string' || typeof body.sourcePath !== 'string')) return NextResponse.json({ success: false, code: 'UNDO_TARGET_REQUIRED', error: 'Choose the project and source file for this Undo.' }, { status: 400, headers });
17:     const filePath = typeof body.repositoryId === 'string'
```

## app/studio/[repoId]/page.tsx:150

```ts
145: 
146:   useEffect(() => {
147:     let cancelled = false;
148:     fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}`)
149:       .then(async (response) => {
150:         const data = await response.json();
151:         if (!response.ok) throw new Error(data.error || 'Repository details could not be loaded.');
152:         if (!cancelled) {
153:           setProject(data);
```

## app/studio/[repoId]/page.tsx:158

```ts
153:           setProject(data);
154:           setSelectedFile(data.files[0] || '');
155:           setAdapterEnabled(Boolean(data.sourceAdapterEnabled));
156:           fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/docker-preview`)
157:             .then(async (response) => {
158:               const status = await response.json();
159:               if (!response.ok) throw new Error(status.error || 'Could not read Docker status.');
160:               if (!cancelled) setDockerStatus(status);
161:             })
```

## app/studio/[repoId]/page.tsx:177

```ts
172:     const sourceQuery = new URLSearchParams({ path: selectedFile });
173:     setSourceLoading(true);
174:     setSourceError('');
175:     fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/source?${sourceQuery}`)
176:       .then(async (response) => {
177:         const data = await response.json();
178:         if (!response.ok) throw new Error(data.error || 'Could not inspect this source file.');
179:         if (!cancelled) setSource(data.content);
180:       })
```

## app/studio/[repoId]/page.tsx:195

```ts
190:       fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/preview-check`, {
191:         method: 'POST',
192:         headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
193:         body: JSON.stringify({ url: dockerStatus.url }),
194:       }).then(async (response) => {
195:         const data = await response.json();
196:         if (!response.ok) return;
197:         if (cancelled) return;
198:         const session = crypto.randomUUID();
```

## app/studio/[repoId]/page.tsx:266

```ts
261:             className: nextSelection.className,
262:             rect: nextSelection.rect,
263:             clickedRect: nextSelection.clickedRect,
264:           }),
265:         });
266:         const result = await response.json();
267:         if (!response.ok || !active || selectionRequestId !== selectionRequestRef.current) return;
268:         setSelection((current) => current && current.path === nextSelection.path && current.line === nextSelection.line
269:           ? {
```

## app/studio/[repoId]/page.tsx:301

```ts
296:   useEffect(() => {
297:     if (selection?.tagName !== 'img') { setAssets([]); return; }
298:     let cancelled = false;
299:     fetch(`/api/slightnudge/assets?repositoryId=${encodeURIComponent(params.repoId)}`)
300:       .then(async (response) => {
301:         const data = await response.json();
302:         if (!response.ok) throw new Error(data.error || 'Could not load imported images.');
303:         if (!cancelled) setAssets(data.assets || []);
304:       })
```

## app/studio/[repoId]/page.tsx:324

```ts
319:       const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/preview-check`, {
320:         method: 'POST',
321:         headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
322:         body: JSON.stringify({ url: previewInput }),
323:       });
324:       const data = await response.json();
325:       if (!response.ok) throw new Error(data.error || 'Could not connect to your local preview.');
326:       attachPreview(data.url);
327:     } catch (cause) {
```

## app/studio/[repoId]/page.tsx:359

```ts
354:       const token = await getClientSessionToken();
355:       const started = await fetch(endpoint, {
356:         method: 'POST',
357:         headers: { 'x-slightnudge-token': token },
358:       });
359:       const startResult = await started.json();
360:       if (!started.ok) throw new Error(startResult.error || 'Could not start the Docker preview.');
361:       setDockerStatus({ available: true, state: 'starting', url: startResult.url, logs: '', message: startResult.message });
362: 
```

## app/studio/[repoId]/page.tsx:369

```ts
364:         const check = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/preview-check`, {
365:           method: 'POST',
366:           headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
367:           body: JSON.stringify({ url: startResult.url }),
368:         });
369:         const checkResult = await check.json();
370:         if (check.ok) {
371:           attachPreview(checkResult.url);
372:           setDockerStatus({ available: true, state: 'running', url: checkResult.url, logs: '', message: 'The isolated preview is ready.' });
```

## app/studio/[repoId]/page.tsx:377

```ts
372:           setDockerStatus({ available: true, state: 'running', url: checkResult.url, logs: '', message: 'The isolated preview is ready.' });
373:           return;
374:         }
375:         if (check.status === 403 || check.status === 422) throw new Error(checkResult.error || 'The preview server cannot be embedded.');
376:         const statusResponse = await fetch(endpoint);
377:         const status = await statusResponse.json();
378:         if (statusResponse.ok) setDockerStatus(status);
379:         if (status.state === 'exited') throw new Error(`${status.message}\n${status.logs || 'The container exited before the dev server was ready.'}`);
380:         if (attempt % 4 === 3) setDockerStatus({ ...status, state: 'starting', message: 'Installing dependencies and starting the dev server…' });
```

## app/studio/[repoId]/page.tsx:384

```ts
379:         if (status.state === 'exited') throw new Error(`${status.message}\n${status.logs || 'The container exited before the dev server was ready.'}`);
380:         if (attempt % 4 === 3) setDockerStatus({ ...status, state: 'starting', message: 'Installing dependencies and starting the dev server…' });
381:         await new Promise((resolve) => window.setTimeout(resolve, 2500));
382:       }
383:       const statusResponse = await fetch(endpoint);
384:       const status = await statusResponse.json();
385:       setDockerStatus(status);
386:       throw new Error(`The preview is still starting. You can retry the connection in a moment.${status.logs ? `\n${status.logs}` : ''}`);
387:     } catch (cause) {
```

## app/studio/[repoId]/page.tsx:407

```ts
402:       const token = await getClientSessionToken();
403:       const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/docker-preview`, {
404:         method: 'DELETE',
405:         headers: { 'x-slightnudge-token': token },
406:       });
407:       const data = await response.json();
408:       if (!response.ok) throw new Error(data.error || 'Could not stop the Docker preview.');
409:       setDockerStatus({ available: true, state: 'missing', url: null, logs: '', message: data.message });
410:       setPreviewUrl('');
```

## app/studio/[repoId]/page.tsx:443

```ts
438:       const token = await getClientSessionToken();
439:       const response = await fetch('/api/slightnudge/preview', {
440:         method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
441:         body: JSON.stringify({ repositoryId: params.repoId, sourcePath: selection.path, line: selection.line, column: selection.column, kind, ...(property ? { property, breakpoint } : {}), ...(direction ? { direction } : {}), value }),
442:       });
443:       const data = await response.json();
444:       if (!response.ok) throw new Error(data.error || 'Could not prepare this source change.');
445:       if (data.changed === false) { setEditNotice(data.message || 'That value is already applied.'); return; }
446:       const preview = data as ImportedEditPreview;
```

## app/studio/[repoId]/page.tsx:481

```ts
476:       const response = await fetch(`/api/slightnudge/assets?repositoryId=${encodeURIComponent(params.repoId)}`, {
477:         method: 'POST',
478:         headers: { 'x-slightnudge-token': token },
479:         body: form,
480:       });
481:       const data = await response.json();
482:       if (!response.ok) throw new Error(data.error || 'Could not import this image.');
483:       setAssets((current) => [data.asset, ...current.filter((asset) => asset.id !== data.asset.id)]);
484:       setEditNotice('Image imported into this repository’s public/slightnudge-assets folder.');
```

## app/studio/[repoId]/page.tsx:503

```ts
498:       const token = await getClientSessionToken();
499:       const response = await fetch(`/api/slightnudge/preview?id=${encodeURIComponent(editPreview.id)}`, {
500:         method: 'DELETE',
501:         headers: { 'x-slightnudge-token': token },
502:       });
503:       const data = await response.json();
504:       if (!response.ok) throw new Error(data.error || 'Could not discard this source change.');
505:       if (editPreview.previewType === 'reorder') {
506:         const revertDir = editPreview.summary.includes('earlier') ? 'later' : 'earlier';
```

## app/studio/[repoId]/page.tsx:532

```ts
527:       const token = await getClientSessionToken();
528:       const response = await fetch('/api/slightnudge/apply', {
529:         method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token },
530:         body: JSON.stringify({ previewId: editPreview.id, groupId: editGroupIdRef.current, repositoryId: params.repoId, sourcePath: selection.path }),
531:       });
532:       const data = await response.json();
533:       if (!response.ok || !data.success) {
534:         if (data.code === 'SOURCE_CHANGED') {
535:           sendImportedPreview(editPreview.previewType === 'textContent' ? 'textContent' : editPreview.previewType === 'imageSource' ? 'imageSource' : editPreview.previewType === 'reorder' ? 'reorder' : 'className', editPreview.previewType === 'className' ? editPreview.oldClassName! : editPreview.oldValue, editPreview.previewType === 'reorder' ? editPreview.summary.includes('earlier') ? 'later' : 'earlier' : undefined);
```

## app/studio/[repoId]/page.tsx:600

```ts
595:       const token = await getClientSessionToken();
596:       const response = await fetch(`/api/slightnudge/repositories/${encodeURIComponent(params.repoId)}/adapter`, {
597:         method: enable ? 'POST' : 'DELETE',
598:         headers: { 'x-slightnudge-token': token },
599:       });
600:       const data = await response.json();
601:       if (!response.ok) throw new Error(data.error || 'Could not update the Next.js source adapter.');
602:       setAdapterEnabled(enable);
603:       setProject(current => current ? { ...current, sourceAdapterEnabled: enable, sourceAdapterNeedsUpdate: false } : current);
```
