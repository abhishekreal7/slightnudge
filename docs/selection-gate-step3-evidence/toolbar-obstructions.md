# Observed toolbar hit-test obstructions

The iframe reports an intended page element at these source points, while the outer page reports the editor toolbar. No product workaround or forced click was used.

| Round | Surface | Suite/case | Result | Interceptor | Screen point | Layers result | Screenshot |
|---|---|---|---|---|---|---|---|
| 1 | old-window | regression/6 | allowed | header: Editor toolbar | {"x":336.6640625,"y":835.5} | PASS: — | [PNG](round-1-old-window-regression-case-6-blocked.png) |
| 1 | old-window | regression/19 | allowed | header: Editor toolbar | {"x":314.6640625,"y":835.5} | PASS: — | [PNG](round-1-old-window-regression-case-19-blocked.png) |
| 1 | old-window | regression/30 | NOT-CLICKABLE | select: Editor view | {"x":565.2734375,"y":848} | FAIL: Expected source node is not exposed in Layers | [PNG](round-1-old-window-regression-case-30-blocked.png) |
| 1 | full | regression/6 | allowed | header: Editor toolbar | {"x":336.6640625,"y":835.5} | PASS: — | [PNG](round-1-full-regression-case-6-blocked.png) |
| 1 | full | regression/19 | allowed | header: Editor toolbar | {"x":314.6640625,"y":835.5} | PASS: — | [PNG](round-1-full-regression-case-19-blocked.png) |
| 1 | full | regression/30 | NOT-CLICKABLE | select: Editor view | {"x":565.2734375,"y":848} | FAIL: Expected source node is not exposed in Layers | [PNG](round-1-full-regression-case-30-blocked.png) |
| 1 | fit | regression/29 | NOT-CLICKABLE | header: Editor toolbar | {"x":612.3745420773824,"y":839.5614830621499} | PASS: — | [PNG](round-1-fit-regression-case-29-blocked.png) |
| 1 | fit | regression/30 | NOT-CLICKABLE | header: Editor toolbar | {"x":686.8045919736227,"y":839.5614830621499} | FAIL: Expected source node is not exposed in Layers | [PNG](round-1-fit-regression-case-30-blocked.png) |
| 1 | fit | overfit/5 | allowed | header: Editor toolbar | {"x":339.361865234375,"y":839.0531400966183} | PASS: — | [PNG](round-1-fit-overfit-case-5-blocked.png) |
| 2 | old-window | regression/6 | allowed | header: Editor toolbar | {"x":336.6640625,"y":835.5} | PASS: — | [PNG](round-2-old-window-regression-case-6-blocked.png) |
| 2 | old-window | regression/19 | allowed | header: Editor toolbar | {"x":314.6640625,"y":835.5} | PASS: — | [PNG](round-2-old-window-regression-case-19-blocked.png) |
| 2 | old-window | regression/30 | NOT-CLICKABLE | select: Editor view | {"x":565.2734375,"y":848} | FAIL: Expected source node is not exposed in Layers | [PNG](round-2-old-window-regression-case-30-blocked.png) |
| 2 | full | regression/6 | allowed | header: Editor toolbar | {"x":336.6640625,"y":835.5} | PASS: — | [PNG](round-2-full-regression-case-6-blocked.png) |
| 2 | full | regression/19 | allowed | header: Editor toolbar | {"x":314.6640625,"y":835.5} | PASS: — | [PNG](round-2-full-regression-case-19-blocked.png) |
| 2 | full | regression/30 | NOT-CLICKABLE | select: Editor view | {"x":565.2734375,"y":848} | FAIL: Expected source node is not exposed in Layers | [PNG](round-2-full-regression-case-30-blocked.png) |
| 2 | fit | regression/29 | NOT-CLICKABLE | header: Editor toolbar | {"x":612.3745420773824,"y":839.5614830621499} | PASS: — | [PNG](round-2-fit-regression-case-29-blocked.png) |
| 2 | fit | regression/30 | NOT-CLICKABLE | header: Editor toolbar | {"x":686.8045919736227,"y":839.5614830621499} | FAIL: Expected source node is not exposed in Layers | [PNG](round-2-fit-regression-case-30-blocked.png) |
| 2 | fit | overfit/5 | allowed | header: Editor toolbar | {"x":339.361865234375,"y":839.0531400966183} | PASS: — | [PNG](round-2-fit-overfit-case-5-blocked.png) |
| 3 | old-window | regression/6 | allowed | header: Editor toolbar | {"x":336.6640625,"y":835.5} | PASS: — | [PNG](round-3-old-window-regression-case-6-blocked.png) |
| 3 | old-window | regression/19 | allowed | header: Editor toolbar | {"x":314.6640625,"y":835.5} | PASS: — | [PNG](round-3-old-window-regression-case-19-blocked.png) |
| 3 | old-window | regression/30 | NOT-CLICKABLE | select: Editor view | {"x":565.2734375,"y":848} | FAIL: Expected source node is not exposed in Layers | [PNG](round-3-old-window-regression-case-30-blocked.png) |
| 3 | full | regression/6 | allowed | header: Editor toolbar | {"x":336.6640625,"y":835.5} | PASS: — | [PNG](round-3-full-regression-case-6-blocked.png) |
| 3 | full | regression/19 | allowed | header: Editor toolbar | {"x":314.6640625,"y":835.5} | PASS: — | [PNG](round-3-full-regression-case-19-blocked.png) |
| 3 | full | regression/30 | NOT-CLICKABLE | select: Editor view | {"x":565.2734375,"y":848} | FAIL: Expected source node is not exposed in Layers | [PNG](round-3-full-regression-case-30-blocked.png) |
| 3 | fit | regression/29 | NOT-CLICKABLE | header: Editor toolbar | {"x":612.3745420773824,"y":839.5614830621499} | PASS: — | [PNG](round-3-fit-regression-case-29-blocked.png) |
| 3 | fit | regression/30 | NOT-CLICKABLE | header: Editor toolbar | {"x":686.8045919736227,"y":839.5614830621499} | FAIL: Expected source node is not exposed in Layers | [PNG](round-3-fit-regression-case-30-blocked.png) |
| 3 | fit | overfit/5 | allowed | header: Editor toolbar | {"x":339.361865234375,"y":839.0531400966183} | PASS: — | [PNG](round-3-fit-overfit-case-5-blocked.png) |