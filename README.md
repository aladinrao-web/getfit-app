# getFit

A mobile-first lean-gain and beginner-strength tracker built around fast meal check-ins, seven-day weight trends, and deliberate workout progression.

## Product documentation

- [Personal-use PRD](docs/PRD.md) — product outcomes, user stories, requirements, test strategy, risks, and release gates.
- [Decision log](docs/DECISION_LOG.md) — timeline, rationale, alternatives, consequences, and revisit triggers for material decisions.

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

The reference Google Sheet remains the operational source of truth until cross-device/offline validation and the one-time history migration reconcile successfully. No personal records or Sheet synchronization are included in this repository.
