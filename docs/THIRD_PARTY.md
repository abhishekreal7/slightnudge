# Third-Party Dependencies & License Inventory

All production and development third-party dependencies are explicitly tracked below in compliance with open-source licensing requirements.

| Package | Version | Kind | License | Source / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `next` | `16.4.3` | `dependency` | `MIT` | https://github.com/vercel/next.js — Core React web framework |
| `react` / `react-dom` | `19.3.0` | `dependency` | `MIT` | https://github.com/facebook/react — UI component runtime |
| `ts-morph` | `28.0.0` | `dependency` | `MIT` | https://github.com/dsherret/ts-morph — TypeScript AST manipulation engine |
| `lucide-react` | `1.55.0` | `dependency` | `ISC` | https://github.com/lucide-icons/lucide — Studio icon system |
| `clsx` | `2.1.1` | `dependency` | `MIT` | https://github.com/lukeed/clsx — Conditional class name composition |
| `dodopayments` | `2.54.2` | `dependency` | `MIT` | https://github.com/dodopayments/dodopayments-node — Payment checkout integration |
| `standardwebhooks` | `1.1.1` | `dependency` | `MIT` | https://github.com/standard-webhooks/standard-webhooks — Webhook HMAC signature verification |
| `zod` | `4.6.5` | `dependency` | `MIT` | https://github.com/colinhacks/zod — Runtime schema validation |
| `@anthropic-ai/sdk` | `0.133.0` | `dependency` | `MIT` | https://github.com/anthropics/anthropic-sdk-typescript — AI scanning model provider |
| `@supabase/supabase-js` | `2.117.3` | `dependency` | `MIT` | https://github.com/supabase/supabase-js — Backend client storage |
| `fast-check` | `4.10.2` | `devDependency` | `MIT` | https://github.com/dubzzz/fast-check — Deterministic property-based geometry testing |
| `playwright` | `1.64.0` | `devDependency` | `Apache-2.0` | https://github.com/microsoft/playwright — Automated browser testing and rendering verification |
| `tailwindcss` | `4.3.3` | `devDependency` | `MIT` | https://github.com/tailwindlabs/tailwindcss — Utility-first CSS styling engine |
| `typescript` | `7.0.2` | `devDependency` | `Apache-2.0` | https://github.com/microsoft/TypeScript — Static typechecking |

### Permissive vs Copyleft Review
* **No AGPL or GPL dependencies** are bundled or executed in production.
* All production dependencies are licensed under permissive open-source licenses (`MIT`, `Apache-2.0`, `ISC`).
* No binary distributions require reverse engineering waivers or source code disclosure.
