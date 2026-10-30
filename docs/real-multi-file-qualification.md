# Real-project multi-file Save and recovery

Qualification date: 28 October 2026. This follows the already implemented grouped-save foundation with fresh browser checks against original public application components. The projects are not replaced by generated sections.

## Evidence

Both scenarios passed seven check groups each, with zero unexpected browser errors and exact final source restoration. Only a JSON report with `state: passed` counts as completed qualification:

The final isolated application typecheck and production build also passed, recorded in `real-multi-file-open-react.log`. Focused grouped-save, process-crash, delayed-preview, continuous-draft and adapter-integrity regressions passed as well.

| Project | Installed runtime | Result and source scope |
| --- | --- | --- |
| nextjs/saas-starter | Next 15.6.0-canary.59 / Tailwind 4.1.7 | [Passed](real-multi-file-next-saas.json): original dashboard layout and landing-page targets; 42 tracked source files checked |
| cruip/open-react-template | Next 15.1.11 / Tailwind 4.3.3 | [Passed](real-multi-file-open-react.json): original hero and workflow components, including animation-controlled markup; 26 tracked source files checked |

The reports record the exact upstream commit, installed Next/Tailwind versions, selected paths and source locations, checks completed, injected faults, and browser errors. Matching `.log` and `.png` files provide execution and visual evidence. A failed or running report must not be interpreted as a pass.

## What is checked

1. Literal text edits alternate between two original source files. Draft Undo/Redo and refreshing the browser preserve both file heads without writing application source.
2. One explicit Save writes exactly the two selected files. One grouped Undo restores their original source bytes and rendered text. Other tracked application JS/TS/CSS files remain unchanged.
3. A simulated external editor appends a valid comment to one source before Save. Whole-group validation refuses Save without overwriting either file. The test resolves only its own comment, then explicitly retries Save and Undo.
4. The real save writer runs in a child process which exits with code 47 after writing its first member. The browser's response is aborted. The test verifies that exactly one file changed, then checks status in a fresh process and through the actual API without changing source bytes.
5. The imported application's development server is restarted. Browser recovery preserves the partial source state until the user explicitly chooses Resume Save. Both original components must render the completed draft afterward.
6. The same process-death injection interrupts grouped Undo after its first member. Fresh-process status, browser refresh and explicit Resume Undo must restore every tracked application source snapshot exactly.

The fault worker uses the production group-writing functions and their existing development-only test hooks. It replaces the browser transport for the injected failure; it does not pretend that an API response wrote a file. The imported preview server is really stopped and restarted. This does not claim to kill and restart the main editor API server during the browser scenario; fresh writer/status processes verify durable recovery separately.

## Fixes found

- A temporary recovery lock could consume the automatic preview connection attempt before it was allowed to run. Connection now waits for the lock to clear. Recovery does not spend a refresh deadline waiting for a nonexistent iframe.
- A four-second preview probe falsely rejected a development server rebuilding after recovery. The server check now allows a bounded fifteen seconds. The client retries only transient read-only connection probes, at most three times; Save and Undo are never automatically retried.
- A focused regression uses an actual local response delayed over four seconds and verifies that redirect, frame-policy, remote-URL, token and production restrictions remain enforced.
- Text-only render patches no longer replace or verify an unchanged class attribute. Runtime animation/widget classes remain owned by the website; mixed drafts still replay and verify classes which the user actually changed.
- Imported draft replay and edits wait for the actual React host targets to hydrate, rather than relying solely on the root signal. This conservative guard checks the host-instance marker used by the tested React 18/19 runtimes and refuses edits if readiness cannot be confirmed. Adapter protocol 8 requires updating older installed adapters through project setup.

A missing chunk from the intentionally stopped imported server is recorded separately only during the restart/reconnection window and only for that server's exact origin. Unexpected editor errors and chunk failures after reconnection still fail qualification; successful recovery must verify the original components again.

## Reproduction

```powershell
npm run test:real-multi-file
node --import tsx test/multi-file-group.test.ts
node --import tsx test/multi-file-crash.test.ts
```

Append `--gates` to an individual browser command to run the isolated application typecheck and production build afterward. The isolated gate excludes historical tests, archived evidence scripts and scratch experiments.

Public checkouts omit environment/credential files and install dependencies with lifecycle scripts disabled. The official SaaS starter receives only nonfunctional loopback database and placeholder auth/payment configuration needed to load its landing page. No account, database or payment operation is qualified. Open React's license declaration is in its README; its source/assets stay in the disposable checkout and are not added to the product.

## Boundaries

These are two-file literal-text workflows on the tested routes, not a certification of arbitrary repositories, generated/shared expressions, every compiler, or mixed style/structural batches. Snapshots cover tracked application JS/TS/CSS, excluding generated `next-env.d.ts`; they do not promise byte preservation of installed dependencies, generated build files or Next's generated TypeScript configuration changes. Files are still written individually: interruption can leave a partial batch, which requires explicit recovery. Older-save rollback, customer packaging and production service setup remain separate work.
