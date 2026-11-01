> Gate NOT PASSED. Product runtime failure occurred at round-2-old-window-overfit. The initial runner incorrectly continued; subsequent rows are retained evidence, not qualifying passes. See README.md.

# Matrix summary

Process exit zero denotes completed execution without a wrong-target stop; it does not erase failed Layers assertions or NOT-CLICKABLE outcomes.

| Round | Surface | Suite | Cases /30 | Geometry /30 | Results | Pointer assertion failures | Expected-node assertion failures | Setup/harness errors |
|---|---|---|---:|---:|---|---:|---:|---|
| 1 | old-studio | regression | 30 | 0 | {"allowed":18,"refused":12} | 0 | 0 |  |
| 1 | old-studio | overfit | 30 | 0 | {"NOT-CLICKABLE":1,"allowed":25,"refused":4} | 0 | 0 |  |
| 1 | old-window | regression | 30 | 0 | {"allowed":18,"refused":11,"NOT-CLICKABLE":1} | 0 | 1 |  |
| 1 | old-window | overfit | 30 | 0 | {"allowed":26,"refused":4} | 0 | 0 |  |
| 1 | full | regression | 30 | 0 | {"allowed":18,"refused":11,"NOT-CLICKABLE":1} | 0 | 1 |  |
| 1 | full | overfit | 30 | 0 | {"allowed":26,"refused":4} | 0 | 0 |  |
| 1 | fit | regression | 30 | 30 | {"allowed":17,"refused":11,"NOT-CLICKABLE":2} | 0 | 1 |  |
| 1 | fit | overfit | 30 | 30 | {"NOT-CLICKABLE":1,"allowed":25,"refused":4} | 0 | 0 |  |
| 2 | old-studio | regression | 30 | 0 | {"allowed":18,"refused":12} | 0 | 0 |  |
| 2 | old-studio | overfit | 30 | 0 | {"NOT-CLICKABLE":1,"allowed":25,"refused":4} | 0 | 0 |  |
| 2 | old-window | regression | 30 | 0 | {"allowed":18,"refused":11,"NOT-CLICKABLE":1} | 0 | 1 |  |
| 2 | old-window | overfit | 0 | 0 | {} | 0 | 0 | TimeoutError: locator.waitFor: Timeout 30000ms exceeded. Call log: [2m  - waiting for locator('[data-source-ready="true"]') to be visible[22m  |
| 2 | full | regression | 30 | 0 | {"allowed":18,"refused":11,"NOT-CLICKABLE":1} | 0 | 1 |  |
| 2 | full | overfit | 30 | 0 | {"allowed":26,"refused":4} | 0 | 0 |  |
| 2 | fit | regression | 30 | 30 | {"allowed":17,"refused":11,"NOT-CLICKABLE":2} | 0 | 1 |  |
| 2 | fit | overfit | 30 | 30 | {"NOT-CLICKABLE":1,"allowed":25,"refused":4} | 0 | 0 |  |
| 3 | old-studio | regression | 30 | 0 | {"allowed":18,"refused":12} | 0 | 0 |  |
| 3 | old-studio | overfit | 3 | 0 | {"NOT-CLICKABLE":1,"allowed":2} | 0 | 0 | Error: frame.evaluate: Execution context was destroyed, most likely because of a navigation |
| 3 | old-window | regression | 30 | 0 | {"allowed":18,"refused":11,"NOT-CLICKABLE":1} | 0 | 1 |  |
| 3 | old-window | overfit | 30 | 0 | {"allowed":26,"refused":4} | 0 | 0 |  |
| 3 | full | regression | 30 | 0 | {"allowed":18,"refused":11,"NOT-CLICKABLE":1} | 0 | 1 |  |
| 3 | full | overfit | 30 | 0 | {"allowed":26,"refused":4} | 0 | 0 |  |
| 3 | fit | regression | 30 | 30 | {"allowed":17,"refused":11,"NOT-CLICKABLE":2} | 0 | 1 |  |
| 3 | fit | overfit | 30 | 30 | {"NOT-CLICKABLE":1,"allowed":25,"refused":4} | 0 | 0 |  |