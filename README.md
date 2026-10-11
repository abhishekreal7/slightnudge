# ShipCheck 🚢

> **AI QA Tester for Vibecoded Apps**  
> *"Find the bugs before your users do. One scan, one price, no subscription."*

ShipCheck automates end-to-end exploratory testing on desktop and mobile cloud browsers (Hyperbrowser + Playwright over CDP), generates evidence-backed bug reports with exact reproduction steps, console/network captures, video replays, and **ready-to-paste fix prompts for Cursor, Claude Code, and Lovable**.

---

## Architecture Overview

- **Web Shell**: Next.js (App Router), TypeScript (Strict), Tailwind CSS.
- **Database & Storage**: Supabase (Postgres with RLS on all tables, Auth, Object Storage).
- **Browser Automation**: Hyperbrowser Cloud Chromium sessions connected via Playwright over CDP (`BrowserProvider` interface).
- **Intelligence**: Anthropic Claude API (model configurable via `ANTHROPIC_MODEL`).
- **Payments**: Dodo Payments (one-time checkout, webhook signature verification with `standardwebhooks`).
- **Worker**: Autonomous Node background worker polling Supabase `jobs` queue.

---

## Directory Structure

```text
vibecheck/
├── demo-app/               # Buggy benchmark test application for regression benchmarks
├── lib/
│   ├── browser/            # BrowserProvider interface, Hyperbrowser & local providers
│   ├── pipeline/           # Stages A-F (Preflight, Discovery, Planning, Execution, Analysis, Report)
│   ├── llm/                # Anthropic client & structured prompt engines with Zod schemas
│   ├── payments/           # Dodo Payments checkout, webhooks, refund flows
│   └── security/           # Ownership verification, SSRF blocking, AES-GCM credential encryption
├── spikes/                 # Standalone spike scripts (Phase 1, etc.)
├── worker/                 # Dedicated background job worker
├── .env.example            # Canonical environment variables template
└── README.md
```

---

## Setup & Running

### 1. Prerequisites
- Node.js 20+ (Node 24 tested)
- npm or pnpm
- Playwright Chromium (`npx playwright install chromium`)

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

Key variables:
- `HYPERBROWSER_API_KEY`: Your Hyperbrowser API key.
- `ANTHROPIC_API_KEY`: Anthropic Claude API key.
- `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Supabase credentials.
- `DODO_PAYMENTS_API_KEY` & `DODO_PAYMENTS_WEBHOOK_KEY`: Dodo Payments credentials.
- `CREDENTIALS_ENCRYPTION_KEY`: 32-byte (64 hex characters) AES-GCM secret.

### 3. Running All Tests & Verification Suites
ShipCheck features comprehensive unit, payments, security, analytics, and end-to-end integration benchmark test suites:
```bash
# Run all unit, payment idempotency, SSRF hardening, and funnel analytics tests (72 tests)
npm test

# Run end-to-end pipeline against the buggy benchmark app (verifies 4/4 defects, 100% precision)
npm run test:integration

# Run full combined suite
npm run test:all

# Production build validation (Next.js Turbopack)
npm run build
```

### 4. Running the Background Worker
```bash
npm run worker
```

### 5. Running the Development Server
```bash
npm run dev
```

---

## Admin Telemetry Dashboard

ShipCheck includes a protected internal metrics dashboard accessible at `/admin`.
- Authenticate via `x-admin-key` matching `ADMIN_METRICS_KEY` in `.env`.
- Displays active scans, daily spend vs spend caps, conversion funnel ratios, and automated refund logs.

---

## Deployment Checklist

- [ ] **Vercel (Web Frontend)**:
  - Configure Next.js environment variables.
  - Set `NEXT_PUBLIC_APP_URL` to the production domain.
- [ ] **Worker Host (Railway, Fly.io, or VPS)**:
  - Run `worker/index.ts` as an always-on background process.
  - Ensure outbound network access to Hyperbrowser WebSocket endpoints and Anthropic API.
  - Verify `SUPABASE_SERVICE_ROLE_KEY` is present on the worker environment only (never client-exposed).
- [ ] **Supabase**:
  - Apply migrations in `supabase/migrations/`.
  - Enable RLS policies across all 9 tables.
  - Create Storage bucket `shipcheck-artifacts` with private read/write policies.
- [ ] **Dodo Payments**:
  - Configure webhook URL: `https://your-domain.com/api/webhooks/dodo`
  - Set events: `payment.succeeded`, `payment.failed`, `refund.succeeded`.
  - Confirm webhook secret matches `DODO_PAYMENTS_WEBHOOK_KEY`.
