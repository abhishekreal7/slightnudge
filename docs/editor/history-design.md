# History storage design — Amendment 5, Step 2a

Design only. The current engine is unchanged. Step 2 implementation, mutation proofs and safety battery remain pending.

## Current format and measured cost

`edit-history.ts` reads the entire edits.json array, parses full before/after source strings and checks each source path, including realpath for existing files. Writes serialize a retained array and replace the whole file atomically. This branch currently retains at most 100 records on writes; that must not become an implicit migration or truncation policy in the new store.

The synthetic baseline measured readHistory median 30.28 ms at 100 small-source records, 421.61 ms at 500 and 1850.78 ms at 2000; p95 at 500 was 3835.52 ms and at 2000 was 5190.72 ms. With 2000-line snapshots and 2000 records, the 607632892-byte legacy file failed all twenty reads with ERR_STRING_TOO_LONG. These are library measurements, not Apply response times. [Baseline and provenance](perf/baseline.md)

## Versioned store

Keep the original edits.json byte-for-byte and never replace, delete or compact it. Place a sibling `store-v2/` beside it, honoring the same test-only path overrides as the existing history path; production ignores those overrides. The new code uses v2 only after a valid activation manifest exists. Legacy fallback is read-only until an explicit, consented migration finishes successfully. An ordinary append never grants consent.

```text
history/edits.json                  immutable legacy fallback
history/store-v2/active.json        atomic activation pointer/version
history/store-v2/blobs/ab/<sha256>   immutable UTF-8 source bytes
history/store-v2/generations/<id>/head.json
history/store-v2/generations/<id>/pages/00000000.json
history/store-v2/mutation.lock      exclusive cross-process mutation lock
```

`head.json` has a format version, revision, committed record count and page size (50). Page numbers are derived from ordinal/count; the head does not contain an ever-growing list of records or pages. Each page has at most 50 metadata records. IDs map to their ordinal through individually stored, atomically published locator metadata when direct ID lookup is needed. No append scans the existing history. Latest undo candidates can be walked backward one bounded page at a time, validating only materialized candidates; a per-file candidate hint can speed this but must be treated as an untrusted hint with a safe fallback. File identity for any hint is workspace-scoped and never shared between projects.

Record metadata contains id, project-relative file path, status, preview kind, position, element identity, timestamp, grouping/change-count fields, removed/added tokens and blob descriptors `{sha256, size}` for before and after. Preserve all existing semantic metadata and unknown extension fields during migration in a metadata extension object, excluding before/after payloads. Recovery-specific metadata in stage/S1 must be reconciled separately before integrating there; no fields may silently disappear. Index pages must not duplicate source snapshots. Hash source bytes, not normalized line endings: exact Undo depends on preserving the original bytes.

## Complexity and pagination

An append writes at most two new blobs (identical digests share one), one bounded page, a fixed-size locator and a fixed-size head. Cost is O(new edit bytes plus bounded metadata), independent of record count. Existing identical blobs are verified before reuse; merely finding the name does not establish integrity. Updating status rewrites one bounded page under the same mutation lock. No full-array serialize or retention slice is permitted.

`listHistory({cursor, limit})` reads head and only the requested bounded metadata pages (maximum limit 50), never source snapshots or blob contents. A cursor includes revision and ordinal; invalid/stale cursors produce an explicit restart result rather than silently skipping records. Listing may check relative path grammar but must not stat/realpath every source file. Materializing a record for Undo or inspection validates that record's path and payload only. Legacy `readHistory()` compatibility can materialize the full collection where an old caller requires it; that expensive compatibility operation must not be used in the new listing or append path. Existing callers and tests will be audited before switching the engine.

## Publication order and crash recovery

All replacements use the existing temp-file, flush, close, rename and retry behavior. New storage must reuse this atomic-write path, not introduce weaker filesystem writes. Flush containing directories where supported for durability; unsupported directory flushing is recorded without pretending stronger power-loss guarantees than the platform provides.

Under an exclusive store mutation lock:

1. Validate the store root and paths, and read/validate the active head/page. Re-check source containment immediately before a source write in the existing Apply/Undo pipeline, retaining auth, AST/refusal, Tailwind, syntax and write-time CAS checks.
2. Hash, write and flush immutable before/after blobs. Verify existing blobs by digest and byte length. Every referenced blob must exist and verify before metadata publication.
3. Write the modified bounded page and locator atomically. Until the head advances, appended ordinals beyond its committed count are invisible. Readers honor that count; they never infer commitment from directory contents.
4. Atomically replace head last with the incremented committed count/revision. This is append visibility. Release the lock in finally.

A crash before step 3 leaves only harmless orphan blobs. A crash after page write and before head publication leaves an uncommitted tail; reads ignore it, and the next writer replaces that tail at the committed ordinal. A stale locator cannot make such a tail visible. A crash after head publication leaves a fully referenced edit. Status-only page replacement is atomic and has no new blob dependency. The ordering mutant must try publishing metadata before blob writes and be killed by an injected blob-write failure assertion on the visible store.

The source-file write and history publication are not one filesystem transaction. Preserve the engine's existing rollback behavior and add crash recovery evidence; do not claim these steps alone solve a process death between source replacement and history publication. Before enabling v2, a durable operation-intent record must link the reviewed source hashes, blobs and pending history update. On recovery, compare the actual source against before/after hashes and reconcile only a proven state; a third value refuses with recovery instructions. Interrupted recovery blocks writes only for the affected target, never guesses a write. This protocol must also cover exact and token Undo status transitions.

Different source files can verify concurrently. Store mutation/publication is serialized across processes so concurrent applies cannot lose metadata. Source operations on the same file must remain ordered through verification and CAS; lock acquisition must not use an unvalidated source path. Busy/abandoned locks produce an explicit recoverable error; never delete a lock based only on age or steal an apparently live owner's lock. The later queue is a separate scheduling layer and cannot replace filesystem coordination.

## Migration and rollback

Build a new generation in a staging directory; do not activate a partial import. Stream the top-level legacy array so the 608 MB synthetic case is not forced into one V8 string. The streaming reader must preserve JSON string escaping and nesting across chunks and reject malformed top-level JSON without publishing an active store. Apply per-record limits that report unsupported oversized records explicitly, not silent truncation. Migration is exceptional O(legacy bytes); the first migrated append measurement must be reported separately from steady-state append.

For valid records, store exact snapshot bytes in verified blobs and preserve metadata in ordinal order, including old IDs and statuses. Malformed or escaping records are skipped with aggregate reason counts. Materialization still validates containment before following a target; migration never follows a legacy record to read a source file. The immutable legacy input remains the recovery source. Fingerprint its path, size, mtime and streamed SHA-256, and verify it did not change before activation. A concurrent legacy writer causes migration refusal and retry; do not merge a moving input by guesswork.

An existing valid activation manifest makes migration idempotent. If a crash occurs before activation, the inactive generation is harmless; retry builds or validates an incomplete generation, never appends its records twice. Publish the activation pointer only after generation metadata and every referenced blob are verified and flushed. A corrupt active pointer/index must fail clearly and stay untouched: never fall back silently and overwrite the store with stale legacy history.

Rollback to the old code can read the untouched original file, but cannot see new v2 edits. That compatibility limit must be explicit. Safe operational rollback is read-only until an explicit verified export into a separate legacy-format file has been reviewed; never overwrite the original edits.json or silently resume old-version writes against stale history. No automatic blob cleanup. A future explicit maintenance command must lock, enumerate committed references and recovery intents, and refuse on index corruption before removing any unreferenced blob.

## Validation and non-disclosure

Treat every index, locator, descriptor and record as untrusted. Require a SHA-256 grammar and exact byte length. Construct blob paths from validated hashes only; require regular files and reject symlinks/reparse escapes in the store path. Resolve store containment before access. Check the requested source's realpath containment on materialization and again at the actual write boundary. No path obtained from an escaping index record is followed.

Malformed metadata, a missing blob, wrong hash or escaping record yields a typed reason and is skipped while other valid records remain available. Reports contain aggregate counts and reason codes only; no record values, paths, source text, blob bytes or tokens are logged. A corrupt page/head/index yields a clear error and no writes, rather than partial rewrites of corrupted metadata. Listing does not open blobs; payload corruption is reported when that payload is requested. These rules distinguish one invalid record from an unparseable index.

## Test-first implementation sequence

1. New isolated store contract tests fail before the module exists. Generate legacy histories from EditRecord without opening real developer data. Inject an I/O adapter that counts all physical bytes, reads and phases; fault injection is test-only. Append at 10 and 2000 preexisting records must write no more than a fixed bound plus incoming snapshot/metadata bytes; report timings without gates. Paginated listing of 50/2000 must read only head/index metadata and no blob.
2. Migration preserves record meaning, source bytes and the legacy file's bytes/mtime/hash; repeat migration is idempotent. Test malformed top-level legacy JSON, chunk boundaries, interruptions, and activation failure. No capacity slicing to 100 records.
3. Inject failures before/after each blob, page, head and activation publication, then reopen the store and prove no visible record lacks its blobs. Exercise two-process mutations on different files and recovery of interrupted source/history transitions.
4. Corrupt hash, missing blob, path escape, symlink/reparse containment and corrupt index tests verify skip/report versus fail-without-write behavior. Named mutants remove blob verification, remove read containment, and publish index before blobs; each must fail a named assertion.
5. Wire Apply and both Undo paths only after store tests pass. Prove legacy and v2 exact/token Undo and unchanged history-resilience, token-undo, undo-refusals, undo-stacked-edits, s3-atomic-write and containment suites. Add the new suites to BRIEF.md's final battery only when created; do not list nonexistent suites as passing.
6. Rerun all eight baseline cells with 20 attempts each plus append timings/physical-byte counters. Report full compatibility reads separately from paginated metadata listing. Then run the complete Part 0c battery, unchanged assertions, in isolated sources with real-state snapshots around every group. No real legacy migration, maintenance, write or blob read is authorized by this design.


## Amendment 6 — approved changes (take precedence)

The UI line of record is stage/S1; this module stays self-contained on the sprint branch. Neither stage/S1 nor any live server is touched. Porting is deliberate and deferred.

The activation manifest records exactly one mode: legacy-only, migrating, v2-active. Every writer acquires the cross-process mutation lock and reads mode while holding it. A sibling marker `<legacy filename>.migrated-to-v2` tells cooperating legacy writers to refuse writes. The existing legacy engine does not yet honor it; it must be guarded before production activation. Old versions cannot be forced to honor a marker. Concurrent old/new writers are forbidden by deployment coordination across both code lines, not magically made safe by the new store.

`dryRunMigration()` streams generated/consented legacy input and returns only aggregate legacy bytes, estimated record count, estimated v2 bytes and blob count. Parsing for these counts must not expose record fields. `migrate({consent: true})` is mandatory and refuses missing/false consent before mutating anything. Session scripts/tests may migrate only explicitly generated disposable workspaces. Mode migrating must survive a process death and allow idempotent, consented recovery; active index corruption is never overwritten via a legacy fallback.

Pending operation intents are capped at eight per store. A full cap refuses writes with a recoverable reason code, without evicting intents. Apply, exact Undo and token Undo each need process-death tests at every source-write/history-publish boundary. Recovery accepts only verified source-before or source-after identity; any third state refuses with instructions. Reopening and recovering must not guess or overwrite external changes.

All store diagnostics are aggregate counts and fixed reason codes only. No path, hash, size, token, source text or record id may appear in thrown errors or logs. A privacy test captures every store failure case and checks the complete thrown/log output against synthetic secret sentinel values and payload representations. The public API remains openStore, append, updateStatus, listPage, getRecord, getBlob, recover, dryRunMigration, migrate(consent), plus a readHistory-shaped compatibility adapter. Unimplemented API portions must stay explicitly marked pending, never silently fall back to writes.
