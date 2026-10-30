# Core editing and compatibility qualification

28 October 2026. Checks run against disposable source copies with real editing APIs; they do not modify the user's playground source.

Result: both core workflow scenarios and the compatibility setup scenario passed in the final combined run. Isolated application typecheck and production build both exited successfully. The focused rendered-bridge regression passed 34 cases; button, section-order, 32 reorder-safety cases, direct-manipulation, drag-movement, adapter-integrity and compatibility-metadata tests also passed.

## Core workflow

The same authored document is exercised in Studio and the separate editing window:

- Edit text at its original rendered size and change alignment through the nearby toolbar.
- Edit a native button label while preserving its icon and button type; change its fill.
- Change section padding and percentage width in a padded container.
- Move a whole section using its keyboard handle; undo and redo the draft movement.
- Adjust grid columns and check the actual card positions.
- Reorder complete sections without losing their descendants.
- Change a responsive typography scope and verify the base size below its breakpoint.
- Save the complete draft, then Undo to the exact original source bytes.
- Keep toolbar arrow keys from moving source elements and preserve website shortcuts in Browse mode.

The width regression previously resolved the hidden verification probe against the viewport. It now uses the parent content width and accounts for the element's box sizing, padding and border. Complex containing blocks and constraints still require the normal computed-style verification; this is not a guarantee for arbitrary CSS layouts.

## Compatibility guidance

The project setup panel shows what is available after connection, limited, missing setup, or unavailable. Technical runtime details are progressively disclosed. Missing dependencies disable source-mapping installation, older Next versions get a valid development command, and generated/shared content remains explicitly limited. These are metadata checks; they do not certify individual elements or execute repository configuration.

## Reproduction

`npm run test:editing-readiness` runs core editing followed by compatibility checks and isolated application typecheck/build. A single-server equivalent is:

```powershell
node --import tsx test/review-consent.browser.ts --core-editing --compatibility --gates
```

Combined evidence: `editing-readiness-current.log`. Screenshots: `core-editing-studio.png`, `core-editing-window.png`, and `project-compatibility.png`. Focused button, rendered bridge, section-order, reorder safety, adapter-integrity and compatibility metadata tests supplement the browser checks.

The isolated application gate excludes historical tests, archived evidence scripts and scratch experiments. Licensing, customer installation, update delivery, older-save rollback and production services remain separate work. The follow-up [real-project multi-file qualification](real-multi-file-qualification.md) now verifies grouped Save/Undo and recovery on two original applications. Broader public-site qualification and its limits remain in [real-website-qualification.md](real-website-qualification.md).
