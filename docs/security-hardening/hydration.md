# Hydration and startup evidence

The mismatch is in owned code. It is not dismissed as dependency noise.

`browser-hydration-before.json` records 16 cold-context/recompile cycles and nine console hydration attribute mismatches involving the editor controls' generated `data-slightnudge-callsite` hashes. `instrumentation-before.json` fails the new loader-boundary checks. The editor-control exclusion removes these transient attributes while retaining instrumentation for LocalSourcePreview and customer fixtures.

That exclusion alone did not fix the reported fatal mismatch. `browser-hydration-after.json` captures the full failure at cycle 13, including the stylesheet/Suspense DOM disagreement; `hydration-hydration-after-13.png` and its HTML snapshot preserve the failure. Giving the stylesheet React precedence also failed on a cold rerun (`browser-hydration-final.json`, cycle 10). These failed attempts are retained.

A shared EditorClient mount boundary prevents a streamed workspace from hydrating against a different HMR revision. The first mount-boundary experiment had zero hydration exceptions but timed out at cycle 14. `browser-font-blocked-before.json` independently proves that an unavailable external stylesheet could suspend startup. The final change uses Next's self-hosted Inter and Manrope variables instead of runtime Google stylesheet links. `browser-font-blocked-after.json` proves startup with external font CSS unavailable.

Product hunks and their checks:

| Hunk | Verification |
|---|---|
| next.config.mjs excludes owned editor controls, preserving LocalSourcePreview | New eight-case instrumentation test and browser recompile probe |
| New EditorClient stable initial placeholder and client mount | Browser cold-context/source-recompile probe, all editor routes share this boundary |
| Three server route imports use EditorClient | Selection matrix on legacy and unified routes |
| RootLayout self-hosts Manrope; existing Inter retained | Browser font-resource check and blocked-external-font startup |
| EditorWorkspace removes body stylesheet nodes and uses font variables | Same font/startup and hydration probes |

Final combined probe output is `browser-self-hosted-final.json/log`: two font/startup checks followed by 16 recompile cycles. No suppression of hydration warnings is added. This is finite development-mode evidence, not a claim that every possible hot-reload timing has been exhausted. Offline first-build font downloads, production deployment, and arbitrary dependency upgrades are not verified.
