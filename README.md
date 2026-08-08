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

The application uses deterministic synthetic data. It does not contain or synchronize personal records from the reference Google Sheet.
