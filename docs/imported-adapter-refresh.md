# Existing imported project adapter refresh

Initially verified on 29 October 2026 with protocol 13, config revision 1, and
passing generated-file hashes. All three were subsequently updated to protocol 16
for [component text editing](component-text-editing.md), following protocol 15
for [icon replacement](icon-replacement.md) and protocol 14 for
[icon appearance editing](icon-properties.md); the original config snapshots
and the protocol-13 connection results below remain historical evidence.

| Project | Preview | Studio | Separate window | Mapped elements |
| --- | --- | --- | --- | --- |
| m0-control-lab | http://127.0.0.1:3001 | Connected | Connected | 147 |
| m0-overfit-lab | http://127.0.0.1:3002 | Connected | Connected | 62 |
| Keymail | http://127.0.0.1:3003 | Connected | Connected | 834 |

Studio runs at http://127.0.0.1:3000. Previews bind only to loopback and use
Webpack, as required by the source adapter. These are local development servers,
not a deployment or a complete compatibility qualification of every application feature.

## Preservation

The two legacy adapters had no integrity records. They were preserved rather
than passed through automatic removal. Their original wrappers, original configs,
and adapter directories remain under `.slightnudge/adapter-update-backups/`, in
the project directories timestamped `2026-10-29T04-37-47-033Z`.
Both preserved original configs match the active config backups byte for byte.
The current adapter retains each project's original configuration through its
`next.config.slightnudge-original.*` file.

Keymail previously had no adapter or dependencies. Its original TypeScript config
was preserved by the installer. Its package manifest and lockfile have no Git diff.
The existing lockfile could not pass npm ci (missing/inconsistent emnapi entries).
The first install also hit an unavailable @types/estree 1.0.10 tarball. A local
installation succeeded with `npm install --no-save --package-lock=false --no-audit
--no-fund @types/estree@1.0.9`. This prepares this checkout but does not repair the
lockfile for future clean installations.

## Verification and limits

Playwright connected the real imported page in both editor modes, waited for the
current bridge handshake, and counted original source-mapped elements. The editor
rejects mismatched protocols or repository identities. No source edits, Save, or
Undo were performed during these connection checks. Evidence is recorded under
`.slightnudge/preview-logs/verification-<project-id>.json`.

Cold compilation initially exceeded the connection timeout on the lab projects;
subsequent checks after compilation passed. The machine was under memory pressure,
so previews were warmed and verified sequentially. All preview processes were
started fresh; none was running at the initial inventory.

The lab projects' Next 16.4.0 startup emits an existing security upgrade advisory.
Their framework versions were not changed during this adapter refresh. Keymail's
Next 16.2.9 also warns about inferred workspace root due to nested lockfiles; its
landing page and both editing connections nevertheless passed. Authentication,
payments, and environment-dependent application flows were not exercised.
