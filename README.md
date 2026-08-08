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

## Quality checks

```powershell
npm.cmd run test
npm.cmd run build
```

## Data modes

- **Demo** is the public default and uses deterministic synthetic history.
- **Personal** is currently an isolated, disposable browser test workspace. It uses real timezone-aware dates but is not yet cloud-backed.

Private Personal configuration can be imported from Settings as a versioned JSON preset. Keep those files under `.private/`; that directory is ignored by Git. Preset import contains configuration only and is available before Personal check-ins or workouts begin.

The reference Google Sheet remains the operational source of truth until cloud persistence, recovery, and migration checks pass. No personal records or Sheet synchronization are included in this repository.
