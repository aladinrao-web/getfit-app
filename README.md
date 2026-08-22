# getFit

A mobile-first lean-gain and beginner-strength tracker built around fast meal check-ins, seven-day weight trends, and deliberate workout progression.

## Product documentation

- [Personal-use PRD](docs/PRD.md) — product outcomes, user stories, requirements, test strategy, risks, and release gates.
- [Decision log](docs/DECISION_LOG.md) — timeline, rationale, alternatives, consequences, and revisit triggers for material decisions.
- [Changelog](CHANGELOG.md) — dated summaries of user-facing additions, changes, and fixes.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

For Personal cloud sync, copy `.env.example` to `.env.local` and add the dedicated Supabase project URL and publishable key. Never use a secret or service-role key in the browser.

## Quality checks

```powershell
npm.cmd run test
npm.cmd run build
```

## Data modes

- **Demo** is the public default and uses deterministic synthetic history.
- **Personal** is an isolated local-first workspace with real timezone-aware dates, authenticated Supabase persistence, visible sync state, revision conflict protection, versioned backup/restore, and recoverable workout corrections.

Private Personal configuration can be imported from Settings as a versioned JSON preset. Keep those files under `.private/`; that directory is ignored by Git. Preset import contains configuration only and is available before Personal check-ins or workouts begin.

The cloud schema uses one row per authenticated user, Postgres row-level security, and an atomic compare-and-swap function so a stale device cannot silently overwrite a newer revision. Local storage remains the immediate offline layer.

Personal Settings exports one timestamped portable ZIP containing a restorable JSON backup, Sheet-ready weight, workout, and progression CSV files, plus a manifest with schema versions and reconciled record counts. The app never writes to Google Sheets automatically.

The reference Google Sheet remains the operational source of truth until cross-device/offline validation and the one-time history migration reconcile successfully. No personal records or Sheet synchronization are included in this repository.

## Production deployment

The production PWA is published through GitHub Pages at [https://aladinrao-web.github.io/getfit-app/](https://aladinrao-web.github.io/getfit-app/).

Production deployment:

- open in credential-free synthetic Demo mode;
- allow Personal sign-in only for the existing Supabase account;
- build correctly under the `/getfit-app/` project path;
- keep Supabase API traffic outside the service-worker cache;
- run tests plus deployment-asset verification before publishing.

Public Supabase signup is disabled, the repository contains no Personal records or secrets, and production phone sign-in, offline restart, automatic reconnect, cross-device convergence, and sign-in recovery have been verified. The remaining cutover gate is the private one-time Sheet-history migration and reconciliation pass.
