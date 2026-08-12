# Productiv.

Productiv is the coordination surface that combines the existing Productiv project-management UI with Autom8-it style automation and a real agent orchestration bus. It is designed for Base44 Superagents, Hermes runtimes, OpenClaw, Telegram bots, ChatGPT-compatible MCP clients, and other harnesses without requiring a paid automation platform.

## Phase 1 scope

The current phase establishes the shared control plane and the first verified runtime slots:

- Vivienne St. James — Base44 Superagent slot; the verified Base44 app ID is stored as non-secret metadata.
- Dutchess — Hermes VPS slot.
- Hermes Managed — managed Hermes slot.
- ChatGPT Harness — MCP-capable slot.
- OpenClaw — runtime slot ready for registration.
- ExpenseRecoveryBot — Telegram runtime slot for `@ExpenseRecoveryBot`.

A slot is **not** displayed as connected until it registers with a one-time invite and sends a real heartbeat. Productiv never manufactures online states, task completions, reports, messages, or performance figures.

## What is implemented

### Orchestration

- One-time runtime enrollment with hashed invite and runtime tokens.
- Heartbeats and timestamp-derived `online`, `stale`, `registered`, `unconfigured`, and `disabled` states.
- Durable SQLite task queue with correlation IDs, parent/child delegation, deterministic capability routing, and least-active-workload tie breaking.
- Agent-to-agent message bus independent of Telegram transport limitations.
- Claim, progress, completion, delegation, check-in, and check-out endpoints.
- Completion requires a non-empty summary and at least one evidence reference.
- Append-only operational event log for auditable handoffs and scheduler actions.

### Productiv + Autom8-it

The Automations view executes real timer-driven rules. Phase 1 supports:

- daily-time triggers;
- interval-minute triggers;
- create-and-route-duty actions;
- runtime-message actions;
- pause/resume;
- last run, run count, and last error from actual execution state.

The built-in scheduler also requests a daily check-in and end-of-day check-out from every registered runtime. It records requests only; it never fabricates a report on an agent's behalf.

### ChatGPT / MCP

`POST /mcp` exposes authenticated Productiv tools. It supports the current stateless MCP `2026-07-28` request shape plus legacy initialization fallback. The current tool set can read Productiv status/tasks, send runtime messages, and complete assigned tasks with evidence.

### Connections and secrets

The old browser-side reversible token vault has been removed from the app. Connections now store only:

- endpoint;
- transport/type;
- server-side environment-variable **name** (`secret_ref`);
- real verification result/timestamp/error.

Raw connector secrets never enter the browser or Productiv SQLite database. A Supabase migration quarantines the legacy `builder_connections` table without deleting its existing rows.

## Runtime protocol

After an administrator creates a one-time invite, a runtime registers once and receives its runtime token once. That token authenticates these calls:

- `POST /api/agent/heartbeat`
- `GET /api/agent/inbox`
- `POST /api/agent/tasks/:id/claim`
- `POST /api/agent/tasks/:id/progress`
- `POST /api/agent/tasks/:id/complete`
- `POST /api/agent/delegate`
- `POST /api/agent/messages`
- `POST /api/agent/reports/checkin`
- `POST /api/agent/reports/checkout`
- `POST /mcp`

`scripts/productiv-agent-client.mjs` is a zero-subscription pull bridge. It heartbeats and polls Productiv on a timer. If `PRODUCTIV_TASK_HANDLER` is set, it passes real inbox work to that runtime-specific handler and accepts only structured results. A task is marked complete only when that handler returns `completed: true`, a summary, and evidence.

## Deployment

Requirements: Docker with Compose and the existing Supabase project used by the Productiv UI. Node 22 is used because the orchestration service relies on the built-in `node:sqlite` module.

1. Copy `.env.example` to `.env.runtime` on the host and populate the required values. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required both while building the browser bundle and while the server is running. Never commit `.env.runtime`.
2. Run `bash scripts/deploy-hostinger-vps.sh`. The script validates Compose, builds with `.env.runtime`, starts the service, waits for `http://127.0.0.1:8788/healthz`, and fails with container logs if health never becomes good.

The equivalent manual command is `docker compose --env-file .env.runtime up -d --build`. The same container serves the built Productiv UI and orchestration API on port `8788`. Persistent orchestration state lives in the `productiv-data` volume.

## QA/QC gates

`npm run qa` must pass before merge. The gate runs:

- TypeScript typecheck for the React application;
- ESLint;
- five end-to-end orchestration tests using an in-memory real SQLite database;
- runtime placeholder/simulation scan;
- secret-pattern scan;
- production Vite build.

The tests cover registration + heartbeat, deterministic routing, completion evidence enforcement, daily check-in/check-out requests, current MCP header validation, and Autom8-style scheduled actions.

## Security rules

- No credentials in source, browser storage, SQLite, task descriptions, event logs, or chat messages.
- Store only environment secret references in Productiv connection records.
- Invite tokens expire and are single-use.
- Runtime tokens are stored server-side only as SHA-256 hashes.
- MCP calls require a registered runtime token.
- Browser cross-origin calls are denied unless explicitly allow-listed.
- The Docker runtime drops Linux capabilities and enables `no-new-privileges`.
- Legacy browser token storage is quarantined, not silently destroyed.
