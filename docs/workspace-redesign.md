# Projects workspace redesign

Branch: `codex/workspace-redesign`. Local only; no commit, push or deployment.

## What changed

The previous hero and two introductory cards have been removed completely. The Projects page now uses a full dotted canvas, a floating native-style project panel on the left, and a connected source-editing example on the right. Import lives in the compact top toolbar. The supplied reference informed the dark typography, neutral gray navigation, fine borders, shallow shadows and connected cards. The right-hand flow is explicitly labelled “Example edit”; it is an explanation, not an automation builder or live pending edit. Styling uses a dedicated CSS module and the existing font stack. This workspace redesign does not replace the Studio interface or change repository import endpoints.

Removed the oversized gradient covers, emoji project tiles, decorative cover switch, non-persistent favorites, Share dialog, board/gallery switches, duplicate New buttons, made-up route counts and the claim that five sample pages are editable in the current Studio. Internal development fixtures are excluded from the user-facing project list; their files and repository records are preserved.

Imported project names, owners and branches come from the existing repository list. They open the existing project setup route, rather than claiming every imported project is already compatible or ready to edit. The import dialog explains that source mapping currently supports Next.js and that Vite is unsupported. The small source diff is labelled as an example, not a live edit.

## What you can click

Open [Projects](http://127.0.0.1:3000/workspace).

1. Open the Playground from the sidebar or sample row.
2. Switch All projects / Imported / Playground. Imported mode shows only imported project rows.
3. Search by project name, owner or branch; Ctrl+K or Command+K focuses search.
4. Open a repository to review its setup and compatibility.
5. Import project opens the native modal. Cancel or Escape closes it before submission. Import uses the existing repository endpoint and navigates to the existing setup page on success. Errors preserve the entered URL.
6. Collapse the sidebar. On narrow screens, the project list and primary actions remain available without horizontal scrolling.

To start the local app:

```powershell
npm run dev
```

The development server was started on port 3000 and `/workspace` returned HTTP 200.

## Evidence

### Typography and control refinement — 25 October 2026

The Projects page now prioritizes the Apple system font on Apple devices and the application's existing Geist font on Windows. No proprietary font was downloaded and no font dependency was added. The type scale uses consistent body, label, caption and footnote sizes, with actual medium/semibold weights and font synthesis disabled to avoid artificial bolding.

Project names, navigation, metadata and workflow labels are larger and clearer. Controls share rounded shapes, restrained borders, keyboard focus rings and press feedback. Primary/secondary buttons are 40 pixels high on desktop and 44 on mobile; mobile search and import fields use 16-pixel text. The dotted background is lighter and less dense so it does not compete with labels.

This refinement changes only the workspace CSS module and this report. Studio behavior, repository APIs, auth and billing were not changed in this typography pass.

Final evidence: `docs/workspace-typography-final.log` — 9 existing UI checks passed; application typecheck and build exited 0 in the disposable copy. Desktop/mobile screenshots were visually inspected. The actual `/workspace` route returned HTTP 200.

The UI regression checks were written first. The old page failed because internal lab projects were still exposed. No expected source values were altered to make the redesign pass.

```powershell
node --import tsx test/review-consent.browser.ts --workspace-ui --screenshot --gates
```

- **9 UI cases passed** using controlled API responses in a disposable application copy: accurate project visibility, filtering, search and empty results, cancellation without a write, import error/payload/input retention, Escape, keyboard search, existing project navigation and mobile overflow.
- **Application typecheck: exit 0.**
- **Production build: exit 0.**
- Desktop and mobile screenshots were rendered and visually inspected. The build includes the application and the new harness, excluding historical documentation, scratch files and archived tests. This is not a claim that every historical repository test passes.
- Evidence for the final canvas redesign: `docs/workspace-canvas-final-checks.log`.
- The actual development server returned HTTP 200 and served the new canvas heading and source flow; the removed “Meet your visual editor” introduction was absent. This verifies the served route, not just a test screenshot.
- The existing Tailwind verifier `module.createRequire` warning remains in the application build. This UI change does not resolve that separate issue.

UI-specific files: `app/workspace/page.tsx`, `app/workspace/workspace.module.css`, `test/helpers/workspace-redesign-browser.ts`, and runner integration in `test/review-consent.browser.ts`. Also removed 237 unused `.nt-*` workspace rules from `app/globals.css`; shared Studio and marketing selectors were preserved.

The working tree also contains earlier Studio/source-mapping work. That work is not part of this Projects UI completion claim. Two 30-candidate runs have passed on the generated app and one public repository, but the full current real-project validation is still open. An unverified experimental editor route was not promoted through the normal project setup UI. Do not confuse the workspace tests with proof of the complete editor roadmap.

## Cleanup and review

Automated approval review blocked deletion of the disposable EdgeOne test clone. The tool reported “blocked by policy” without a more specific reason. If still present, delete this temporary test directory by hand:

`C:\Users\abhis\AppData\Local\Temp\sn-review-consent-6e9G9A`

Do not remove the original project or fixtures. An independent change to the original paragraph fixture was detected during this work and preserved.

Run a reviewer prompt in a fresh session before approving the redesign. Check desktop/mobile layout, search/filter behavior, modal keyboard behavior and the project/import links. No backend, auth or billing change is attributed to this UI redesign.
