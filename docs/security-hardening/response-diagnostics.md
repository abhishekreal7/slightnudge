# Bounded API response diagnostics

Before: response-diagnostics-before-extended.log/json. All 15 operation/body cases lack the required URL/status/body diagnostic. After: response-diagnostics-after.log/json, all 15 pass. The direct helper test verifies empty/truncated/HTML bodies, the 200-character cap, valid JSON and a self-contained serialized helper for legacy adapters.

Browser UI evidence: browser-responses-verified.log/json and three response-ui-responses-verified PNGs. Each malformed compatibility response appears in the editor alert with its actual URL, HTTP 502 and body preview; no page error occurs. The first browser harness selected Next's empty route-announcer alert; its failed exploratory output is retained. Only the new harness selector was corrected.

## Product hunks tied to proof

| Hunk group | Proof |
|---|---|
| New api-response.ts | Empty/truncated/non-JSON helper tests; valid response and 200-char cap; serialized helper revives without external scope. |
| client.ts response consumers and import | 15 Inspect/Preview/Apply/Undo/change-set malformed-response cases. |
| client.ts inspect error reason | Same three Inspect cases now preserve diagnostic instead of generic refusal. |
| client.ts token body parsing/error propagation | Token caller still validates status; malformed bodies use the same helper. Token failure remains pre-write; UI consumers catch it. |
| client.ts Apply/status, Undo/status and change-set catch hunks | Same nine mutation cases preserve UNCERTAIN/status recovery and include diagnostic. Tests assert at most one write; no automatic write retry is introduced. |
| SourceProjectCanvas two response readers | Three real-browser editor alert cases. |
| ChangeHistory, ActionControls, IconControls, ImageContent, EditorWorkspace, SlightNudgeOverlay and project-management page imports/readers | Mechanical replacement by the tested helper; existing error UI receives its Error.message. Route-discovery errors now use the editor toast. Overlay discard catches token/body failure rather than leaking an unhandled rejection. |
| next-source-adapter import/serialized helper/legacy response readers | Self-contained serialization test; generated adapter uses the same bounded parser. Existing installed adapters need regeneration to receive client diagnostics; backend security checks apply independently. Only temp adapters are generated/refreshed in these experiments. |

No storage-preference JSON.parse is changed: those parse browser state, not API responses. The helper is the sole JSON.parse of API body text. Responses are rendered as ordinary React text, never injected as HTML. Network failures before an HTTP response exists have no HTTP body/status to quote.

Because the thin client's Apply/Undo/status error paths change, this is a separate `core: surface bounded API response diagnostics` commit. Every product hunk is saved in response-product-hunks.patch. It changes diagnostics, not server write ownership or outcome-recovery decisions.
