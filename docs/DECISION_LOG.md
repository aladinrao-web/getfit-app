# getFit Decision Log

This log preserves the timeline, context, alternatives, rationale, and consequences of material product and technical decisions. It complements the [personal-use PRD](PRD.md); it is not a changelog and should not record routine implementation details.

The format adapts the lightweight decision-record structure described by [Microsoft's Engineering Fundamentals Playbook](https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/decision-log/) and [The GDS Way](https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html): title, date, status, context, decision, alternatives, and consequences.

## How to use this log

Add an entry when a choice materially affects:

- product goals, scope, or priority;
- user workflow or data integrity;
- architecture, persistence, privacy, or security;
- a release gate or quality standard;
- a meaningful trade-off that future contributors may otherwise reopen without context.

Do not silently rewrite an implemented decision. If the decision changes after implementation:

1. Add a new decision with a new ID.
2. Mark the old decision `Superseded` and link to the replacement.
3. Preserve the original context and consequences.

### Status values

- **Proposed:** under discussion; not authoritative.
- **Accepted:** governing decision.
- **Superseded:** replaced by a later decision.
- **Deprecated:** no longer applicable and not replaced.

### Entry template

```markdown
## D-XXX — Decision title

- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded | Deprecated
- Owners: Product / Engineering / Design
- Related: PRD requirement IDs, commit, issue, or replacement decision

### Context

Objective facts and forces that made a decision necessary.

### Options considered

1. Option and trade-off.
2. Option and trade-off.

### Decision

We will...

### Rationale

Why this option best serves the current goals and constraints.

### Consequences

- Positive consequence.
- Cost, limitation, or follow-up obligation.

### Revisit when

Evidence or condition that should reopen the decision.
```

## Decision index

| ID | Date | Status | Decision | Key reason |
| --- | --- | --- | --- | --- |
| [D-001](#d-001--use-the-existing-tracker-and-strength-plan-as-product-references) | 2026-08-08 | Accepted | Use the existing tracker and strength plan as product references | Start from a real workflow rather than an invented portfolio problem |
| [D-002](#d-002--align-on-the-plan-before-building) | 2026-08-08 | Accepted | Align on the MVP and screens before implementation | Preserve product intent and avoid premature scope |
| [D-003](#d-003--optimize-for-low-friction-tracking) | 2026-08-08 | Accepted | Prefer presets, completion, exceptions, and weekly summaries | Tracking must not become a chore |
| [D-004](#d-004--make-workout-completion-the-commit-boundary) | 2026-08-08 | Accepted | Keep drafts separate; update history and progression only on confirmation | Prevent partial and accidental writes |
| [D-005](#d-005--make-workout-commits-idempotent-and-atomic) | 2026-08-08 | Accepted | Upsert a stable session and matching progressions together | Prevent duplicates and inconsistent state |
| [D-006](#d-006--keep-progression-decisions-user-authoritative) | 2026-08-08 | Accepted | Explicit Increase/Repeat/Deload/Technique focus controls progression | Performance context matters more than blind automation |
| [D-007](#d-007--use-synthetic-data-for-the-public-baseline) | 2026-08-08 | Accepted | Build the repository and demo with deterministic synthetic data | Protect privacy and make the demo resettable |
| [D-008](#d-008--use-seven-day-weight-trends-as-the-decision-signal) | 2026-08-08 | Accepted | Separate daily readings from the weekly trend and recommendation | One reading is noisy and should not drive action |
| [D-009](#d-009--signal-over-target-progress-with-a-star-and-real-accessible-value) | 2026-08-08 | Accepted | Cap the fill, show a light red star, announce the true percentage | Preserve visual scale and semantic truth |
| [D-010](#d-010--prioritize-personal-utility-before-github-proof-of-work) | 2026-08-08 | Accepted | Personal daily fitness is priority 1; GitHub proof is priority 2 | The portfolio is strongest when it documents a real product |
| [D-011](#d-011--separate-personal-and-demo-modes) | 2026-08-08 | Accepted | Share product logic but isolate Personal and Demo data | Enable real use and safe public demonstration |
| [D-012](#d-012--use-local-first-personal-persistence-before-adding-cloud-sync) | 2026-08-08 | Superseded by D-016 | Add versioned local persistence and export/import before a backend | Phone durability and cross-device use made cloud persistence a cutover requirement |
| [D-013](#d-013--keep-exercise-and-weight-tracking-primary) | 2026-08-08 | Accepted | Exercises and body weight are core; nutrition remains secondary | Reflect the explicit personal-use priority |
| [D-014](#d-014--version-the-prd-and-decision-log-with-the-code) | 2026-08-08 | Accepted | Use repository documentation as the decision backbone | Keep requirements and rationale discoverable with implementation |
| [D-015](#d-015--keep-the-sheet-authoritative-until-controlled-cutover) | 2026-08-08 | Accepted | Keep the Sheet authoritative until migration and reconciliation pass | Avoid dual entry and ambiguous source-of-truth state |
| [D-016](#d-016--require-cloud-backed-personal-mode-before-cutover) | 2026-08-08 | Accepted | Use local offline cache with authenticated cloud persistence | Support daily phone use, recovery, and phone-to-desktop continuity |
| [D-017](#d-017--use-replace-only-restore-with-a-pre-import-backup) | 2026-08-08 | Accepted | Replace Personal state only after validation and automatic backup | Avoid merge conflicts and duplicate records in Personal v1 |
| [D-018](#d-018--recompute-affected-progression-after-history-correction) | 2026-08-08 | Accepted | Recompute the affected exercise from its latest remaining result | Keep progression trustworthy after edits without rewriting later decisions |
| [D-019](#d-019--use-sheet-ready-exports-as-snapshots-not-synchronization) | 2026-08-08 | Accepted | Export versioned snapshots; do not automate Google Sheets writes | Preserve portability without creating another synchronization system |
| [D-020](#d-020--import-private-personal-presets-without-versioning-the-data) | 2026-08-08 | Accepted | Apply ignored local preset bundles to an empty Personal workspace | Personalize the app without exposing health data in Git |
| [D-021](#d-021--make-the-daily-check-in-progressively-saved-and-explicitly-completed) | 2026-08-08 | Accepted | Save one daily check-in progressively and complete it explicitly | Fit tracking around the day without corrupting nutrition meaning |
| [D-022](#d-022--migrate-sheet-history-once-at-cloud-cutover) | 2026-08-08 | Accepted | Load Sheet history once into the private cloud store | Avoid productizing a temporary migration path |
| [D-023](#d-023--use-supabase-and-a-revisioned-personal-snapshot) | 2026-08-08 | Accepted | Use Supabase Auth, RLS, and one revisioned state snapshot per user | Preserve atomic app behavior with low operating complexity |
| [D-024](#d-024--resolve-cloud-conflicts-by-explicit-whole-copy-selection) | 2026-08-09 | Accepted | Compare both snapshots and require an explicit cloud-or-device choice | Preserve deliberate fitness state without unsafe automatic merges |
| [D-025](#d-025--target-github-pages-behind-an-explicit-public-repository-gate) | 2026-08-09 | Proposed | Target GitHub Pages after explicit public visibility approval | Align hosting with proof of work without silently publishing the repository |

## Timeline

### 2026-08-08 — Product framing and synthetic MVP

- Existing getFit tracking and beginner strength workflows selected as references.
- MVP planned around Today, Check-in, Train, Progression, Nutrition, and Trends.
- Low-friction and explicit workout completion established as core principles.
- Synthetic MVP built, inspected, and committed as `ac4cc75`.

### 2026-08-08 — Acceptance walkthrough and cleanup

- Draft persistence verified through reload.
- Resume language added to Today for an active workout.
- Workout completion verified to update history and progression together.
- Over-target protein progress changed to show a light red star and announce the true percentage.

### 2026-08-08 — Personal-use and portfolio strategy

- Product outcomes ordered: personal daily fitness first, GitHub proof of work second.
- Personal and Demo mode separation chosen as the next structural milestone.
- PRD and decision log established as governing project artifacts.

### 2026-08-08 — Personal persistence, migration, and export strategy

- The existing Sheet remains authoritative until the app passes cloud, offline, recovery, and migration gates.
- Personal mode will be offline-capable and cloud-backed before cutover.
- Import is replace-only with an automatic pre-import backup.
- Historical corrections recompute only the affected exercise from its latest remaining result.
- App exports are versioned Sheet-ready snapshots, not automatic or bidirectional Sheet synchronization.
- Any optional later Sheet update will be a separate ChatGPT-assisted action.

### 2026-08-08 — Private Personal preset strategy

- Profile, meal, food, and exercise presets are read from the authoritative Sheet without importing logs.
- The repository contains only the versioned importer and validation rules.
- Actual Personal preset values remain in a Git-ignored local file and browser state.

### 2026-08-08 — Personal cloud foundation

- A dedicated Supabase project in Mumbai was selected for Personal authentication and persistence.
- Demo remains credential-free and synthetic; only Personal mode can synchronize.
- Local state remains the immediate offline cache, while one RLS-protected snapshot per user is the cloud recovery and cross-device record.
- Compare-and-swap revisions surface concurrent edits instead of allowing silent last-write-wins data loss.

### 2026-08-09 — Conflict recovery

- Conflicting device and cloud snapshots are compared by timestamp, record counts, progression targets, and workout-draft presence.
- The user must select the complete cloud copy or complete device copy; the app does not merge fields or records automatically.
- The displaced copy becomes the latest browser safety backup before replacement.
- Keeping the device copy writes against the reviewed cloud revision, so another concurrent cloud change reopens comparison instead of being overwritten.

### 2026-08-09 — Production deployment readiness

- The hosted Supabase project contains one confirmed account, but new signup remains enabled and must be closed before the public URL is released.
- Public account-creation controls are removed from the app; Personal mode becomes sign-in-only.
- GitHub Pages is the proposed hosting target because it connects the running artifact to the proof-of-work repository without another platform.
- GitHub rejected Pages activation while the repository is private on the current plan, so repository visibility remains an explicit owner decision rather than an inferred deployment step.
- The full Git history scan found no credential-shaped values, Personal email, Google Sheet link, or private data file; synthetic environment placeholders remain intentionally versioned.
- PWA paths become deployment-relative and the service worker is restricted to same-origin shell assets so it cannot cache Supabase API responses.

## D-001 — Use the existing tracker and strength plan as product references

- Date: 2026-08-08
- Status: Accepted
- Owners: Product
- Related: PRD sections 3–5

### Context

The product already had a real spreadsheet-based lean-gain tracker and an established beginner strength workflow. Inventing a generic fitness persona would weaken both personal usefulness and portfolio credibility.

### Options considered

1. Design a generic fitness app from market conventions.
2. Copy the spreadsheet literally into a web interface.
3. Use the existing workflow as evidence, then redesign it around faster decisions.

### Decision

We will use the existing tracker and strength plan as product references while designing a low-friction app workflow rather than reproducing sheet tabs mechanically.

### Rationale

This preserves validated needs and progression rules while allowing a more useful interaction model.

### Consequences

- The app starts with a credible real-user problem.
- The spreadsheet remains a reference and possible migration source, not a runtime dependency.
- Public artifacts must not copy personal records.

### Revisit when

A second real user or a materially different training plan introduces needs the reference workflow cannot represent.

## D-002 — Align on the plan before building

- Date: 2026-08-08
- Status: Accepted
- Owners: Product
- Related: Initial MVP plan

### Context

Premature implementation could lock the product into a screen structure before the primary workflow and scope were agreed.

### Options considered

1. Build immediately and discover the plan through code.
2. Produce a full technical specification before any prototype.
3. Agree on an MVP plan and proposed screens, then build and validate iteratively.

### Decision

We will align on the product plan and screens before major implementation, while keeping the PRD living rather than requiring exhaustive upfront specification.

### Rationale

This provides enough direction for coherent work without turning the PRD into a waterfall handoff.

### Consequences

- Major scope begins with explicit product alignment.
- Small evidence-led refinements can proceed without rewriting the whole plan.

### Revisit when

The planning step becomes ceremonial or delays small, reversible experiments.

## D-003 — Optimize for low-friction tracking

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Design
- Related: G-01, G-02, FR-NUT-01

### Context

Detailed logging can create more data while reducing consistency. The user explicitly wants tracking that does not become a chore.

### Options considered

1. Ingredient-, gram-, and calorie-level tracking.
2. Free-form notes with no structure.
3. Presets, completion percentages, short exceptions, and weekly summaries.

### Decision

We will prefer approximate presets, quick set inputs, default values, exception notes, and weekly summaries over exhaustive entry.

### Rationale

The product's value depends on repeated real use; unnecessary precision is harmful if it reduces adherence.

### Consequences

- Nutrition values are estimates, not exact accounting.
- The product must clearly distinguish approximation from allergen or medical certainty.
- New fields require evidence that they improve a decision.

### Revisit when

Dogfood shows a missing detail repeatedly causes wrong recommendations or manual work elsewhere.

## D-004 — Make workout completion the commit boundary

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: US-05, US-06, FR-WKO-02 through FR-WKO-09

### Context

Workout inputs change frequently during a session. Updating history or progression on every input would create partial records and make interruption unsafe.

### Options considered

1. Commit each set immediately to history.
2. Save nothing until the end.
3. Autosave a draft, then commit only reviewed completed exercises.

### Decision

We will autosave mutable workout drafts and update committed history/progression only after explicit review and confirmation.

### Rationale

This combines interruption safety with a clear consequential action.

### Consequences

- The UI must distinguish draft and committed state consistently.
- Resume and discard flows are required.
- Draft persistence is a P0 reliability concern.

### Revisit when

Real use shows the explicit review creates unacceptable friction or users need per-exercise commit semantics.

## D-005 — Make workout commits idempotent and atomic

- Date: 2026-08-08
- Status: Accepted
- Owners: Engineering, Product
- Related: FR-WKO-07, FR-PRG-01, TC-009, TC-010

### Context

A duplicate confirmation or interrupted write must not create duplicate sessions or update progression without matching history.

### Options considered

1. Append every confirmation as a new session.
2. Update history and progression in separate independent operations.
3. Upsert a stable session ID and derive matching progression changes in one state transition.

### Decision

We will make completion idempotent by stable session ID and atomic across the session and its matching exercise progressions.

### Rationale

Trust in recommendations depends on consistent history. Duplicate prevention is more important than append-only simplicity.

### Consequences

- Stable identifiers and deterministic tests are required.
- Future backends must preserve equivalent transactional behavior.

### Revisit when

The persistence architecture changes or offline conflict resolution introduces multiple writers.

## D-006 — Keep progression decisions user-authoritative

- Date: 2026-08-08
- Status: Accepted
- Owners: Product
- Related: US-07, FR-PRG-02, FR-PRG-03

### Context

Reps alone do not capture form, pain, fatigue, stability, or exercise order. Blind automatic progression can recommend the wrong next step.

### Options considered

1. Always increase when target reps are reached.
2. Provide no recommendation logic.
3. Use deterministic decision effects controlled by an explicit user choice.

### Decision

We will use Increase, Repeat, Deload, and Technique focus as explicit progression decisions, with the user's selection controlling the next state.

### Rationale

This preserves context and makes the reasoning inspectable.

### Consequences

- The user must make or accept a decision for completed exercises.
- Future automation may recommend but must not silently override.

### Revisit when

Enough real data exists to evaluate recommendation quality and acceptance safely.

## D-007 — Use synthetic data for the public baseline

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: FR-DEMO-01, FR-DEMO-02

### Context

The app needs realistic history for design and demonstration, but personal Sheet data cannot be committed or exposed.

### Options considered

1. Use empty state only.
2. Copy personal records into the repository.
3. Create deterministic synthetic fixtures with realistic behavior and reset.

### Decision

We will use deterministic synthetic data for the repository, tests, screenshots, and public demo.

### Rationale

Synthetic fixtures make the product demonstrable and testable without privacy risk.

### Consequences

- Demo state must be labeled clearly.
- Personal mode needs an isolated data path.
- Public claims must distinguish fixture evidence from real usage evidence.

### Revisit when

An anonymized research dataset is genuinely needed and can be reviewed separately.

## D-008 — Use seven-day weight trends as the decision signal

- Date: 2026-08-08
- Status: Accepted
- Owners: Product
- Related: US-09, FR-TRD-01 through FR-TRD-03

### Context

Daily body weight varies for reasons unrelated to lean-gain progress. Acting on one morning can cause unnecessary changes.

### Options considered

1. Show and react to latest weight only.
2. Hide daily readings and show only a weekly value.
3. Show both, but let a seven-day average and minimum-data gate drive recommendations.

### Decision

We will display daily readings while using a seven-day average and weekly comparison as the primary decision signal.

### Rationale

This preserves transparency while reducing noise-driven action.

### Consequences

- Recommendations must wait for sufficient observations.
- Sparse logging needs explicit baseline language.

### Revisit when

Four weeks of Personal data show the averaging or minimum-data rule is misleading.

## D-009 — Signal over-target progress with a star and real accessible value

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Design, Engineering
- Related: FR-NUT-02, TC-019

### Context

A progress bar cannot visually extend past 100%, but capping both the graphic and accessible text hides meaningful over-target information.

### Options considered

1. Cap all values at 100%.
2. Extend the bar beyond its track.
3. Cap the fill, add a subtle overflow marker, and announce the true percentage.

### Decision

We will cap the visual fill at 100%, place a light red star at the right edge when exceeded, and expose the real percentage in accessible text.

### Rationale

This maintains a stable visual scale while preserving semantic truth.

### Consequences

- The marker is decorative and hidden from assistive technology.
- Automated tests must verify capped visual and uncapped semantic values.

### Revisit when

Usability or accessibility review shows the star is confusing or insufficiently perceivable.

## D-010 — Prioritize personal utility before GitHub proof of work

- Date: 2026-08-08
- Status: Accepted
- Owners: Product
- Related: PRD sections 2, 6, and 7

### Context

The product is intended both for daily fitness tracking and as a PM portfolio artifact. Portfolio polish could otherwise drive features that do not help the primary user.

### Options considered

1. Optimize for a polished public demo first.
2. Treat both outcomes as equal in every trade-off.
3. Make personal daily utility priority 1 and proof of work priority 2.

### Decision

We will prioritize personal daily fitness tracking first. GitHub artifacts will document, test, and demonstrate the real product.

### Rationale

A product used and iterated from evidence is stronger personally and as proof of work.

### Consequences

- Personal readiness precedes portfolio expansion.
- Public-demo work cannot add friction or expose private data.
- Real dogfood findings become future portfolio evidence.

### Revisit when

The personal workflow is stable and the project enters an explicitly portfolio-focused release cycle.

## D-011 — Separate Personal and Demo modes

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: US-01, US-11, FR-MODE-01 through FR-MODE-03

### Context

One codebase must support private daily use and a safe public demonstration. Sharing one data store risks leakage and makes reset dangerous.

### Options considered

1. Maintain separate applications or repositories.
2. Use one store and hide personal fields in Demo mode.
3. Share product logic and UI while isolating storage namespaces and defaults.

### Decision

We will implement distinct Personal and Demo modes with shared product logic but isolated state and data controls.

### Rationale

This prevents product drift between two apps while creating a strong privacy boundary.

### Consequences

- Mode must be visible and testable.
- Reset, export, import, and public default behavior are mode-sensitive.
- No implicit data copy is allowed.

### Revisit when

Authentication or cloud sync changes the storage and identity model.

## D-012 — Use local-first Personal persistence before adding cloud sync

- Date: 2026-08-08
- Status: Superseded by [D-016](#d-016--require-cloud-backed-personal-mode-before-cutover)
- Owners: Product, Engineering
- Related: US-10, FR-DATA-01 through FR-DATA-04, OQ-01

### Context

Personal daily use needs durable state, but no demonstrated requirement yet justifies authentication, a remote database, or synchronization complexity.

### Options considered

1. Build authentication and cloud storage immediately.
2. Keep unversioned browser storage with no backup.
3. Use versioned local storage with validated export/import, then revisit sync from evidence.

### Decision

We will make Personal mode local-first with schema versioning, export/import backup, and recovery behavior before selecting a cloud backend.

### Rationale

This addresses immediate reliability with lower cost and preserves the option to add sync later.

### Consequences

- Data is device-specific until restored elsewhere.
- Backup usability becomes a P0 concern.
- The storage interface should not prevent a later remote adapter.

### Revisit when

Multi-device use, browser-storage loss, or backup burden becomes a repeated real problem.

## D-013 — Keep exercise and weight tracking primary

- Date: 2026-08-08
- Status: Accepted
- Owners: Product
- Related: PRD sections 2 and 7

### Context

The synthetic MVP includes nutrition, but the explicit personal priority is exercises and body weight. Expanding all surfaces equally would dilute delivery.

### Options considered

1. Expand workouts, weight, and nutrition in parallel.
2. Remove nutrition immediately.
3. Prioritize exercise and weight readiness while maintaining the existing low-friction nutrition surface.

### Decision

We will treat exercises, workout progression, workout history, and body-weight trends as the primary product. Nutrition remains secondary and maintenance-only in the current milestone.

### Rationale

This aligns scope with the stated daily job while preserving useful existing work.

### Consequences

- Nutrition improvements require evidence or a new decision.
- P0 planning and tests focus on exercise, weight, persistence, and integrity.

### Revisit when

Dogfood shows nutrition is used frequently enough to affect the primary outcomes.

## D-014 — Version the PRD and decision log with the code

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: US-12

### Context

The project needs a durable backbone for decisions, requirements, and portfolio explanation. Chat context alone is hard to audit and may drift from implementation.

### Options considered

1. Keep decisions only in chat.
2. Maintain an external document disconnected from code.
3. Store a living PRD and decision log in the repository and link them from README.

### Decision

We will version the PRD and decision log with the code, update them when material behavior changes, and preserve superseded decisions.

### Rationale

Repository documentation is discoverable to the owner, contributors, and GitHub reviewers and evolves with implementation history.

### Consequences

- Documentation updates are part of definition of done for material changes.
- The log must remain selective enough to be useful.
- Git history provides a secondary timeline of document evolution.

### Revisit when

The project gains a collaboration system that provides stronger traceability without separating decisions from the repository.

## D-015 — Keep the Sheet authoritative until controlled cutover

- Date: 2026-08-08
- Status: Accepted
- Owners: Product
- Related: US-14, FR-MIG-01 through FR-MIG-05

### Context

The existing Sheet is the working tracker while Personal mode is under development. Entering real records into both systems would create reconciliation work and uncertainty about which record is correct.

### Options considered

1. Enter every workout and weight in both systems during development.
2. Move to the local app immediately and use the Sheet only if the app fails.
3. Keep the Sheet authoritative until the app passes readiness gates, then migrate once and cut over explicitly.

### Decision

We will keep the existing Sheet as the sole operational source of truth until Personal mode passes cloud, offline, recovery, and migration checks. Final migration will use one frozen Sheet snapshot, followed by reconciliation and explicit cutover approval.

### Rationale

One authoritative system at a time prevents dual-entry burden, duplicate records, and ambiguous corrections.

### Consequences

- Development and phone validation use synthetic or disposable test data.
- Real app dogfood begins only after cloud readiness and migration.
- The Sheet becomes a read-only archive after cutover unless the user deliberately updates it later.

### Revisit when

A migration rehearsal shows that a short controlled overlap is necessary for verification.

## D-016 — Require cloud-backed Personal mode before cutover

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: Supersedes [D-012](#d-012--use-local-first-personal-persistence-before-adding-cloud-sync); US-13; FR-SYNC-01 through FR-SYNC-05

### Context

A hosted PWA can run on a phone with local browser storage, but local-only data would be device-specific and vulnerable to browser clearing, app removal, or phone loss. Daily phone use also benefits from recovery and optional desktop access.

### Options considered

1. Use phone-local storage as the long-term source of truth with manual backups.
2. Require connectivity and write every interaction directly to the cloud.
3. Save immediately to a local offline cache and synchronize to an authenticated cloud source of truth.

### Decision

We will make Personal mode offline-capable and cloud-backed before the Sheet-to-app cutover. Local persistence protects drafts and temporary offline work; authenticated cloud persistence protects the long-term record and enables cross-device continuity.

### Rationale

This provides the phone experience and durability expected from the sole personal tracker without making network availability a workout dependency.

### Consequences

- Cloud/authentication architecture moves into Personal readiness rather than post-dogfood scope.
- Stable IDs, visible sync status, idempotent retry, and conflict handling become P0 requirements.
- A short local/test-data validation period may occur, but local-only use is not the product destination.

### Revisit when

The selected cloud service cannot meet privacy, offline, recovery, or maintenance requirements at reasonable complexity.

## D-017 — Use replace-only restore with a pre-import backup

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: US-10, FR-EXP-03, OQ-02

### Context

Merging an imported backup with existing Personal state requires conflict rules for duplicate dates, stable session IDs, edited history, and progression. That complexity is unnecessary for the first personal release.

### Options considered

1. Merge imported and current data automatically.
2. Ask the user to resolve every conflicting record.
3. Validate the import, create a backup of current state, summarize the change, and replace after confirmation.

### Decision

We will support replace-only Personal restore in v1. A valid restore must create an automatic pre-import backup before replacing current state.

### Rationale

Replacement is easier to explain, test, and recover than merge while still providing portability and disaster recovery.

### Consequences

- Merge import is explicitly out of scope for Personal v1.
- Import UI must state that current Personal data will be replaced.
- Backup creation and validation are part of the same guarded operation.
- The implemented restore retains the pre-change snapshot in the browser and downloads a portable copy before replacement.

### Revisit when

Real use produces a recurring need to combine independent datasets rather than restore one authoritative snapshot.

## D-018 — Recompute affected progression after history correction

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: US-08, FR-HIS-02, OQ-03

### Context

Editing or deleting a committed workout can make stored progression inconsistent with history. Recomputing every later choice would also risk rewriting explicit decisions that were valid in their original context.

### Options considered

1. Forbid edits to committed history.
2. Re-run the entire progression timeline and overwrite later decisions.
3. Preserve stable session history and recompute only the affected exercise from its latest remaining chronological result.

### Decision

We will recompute the affected exercise's derived progression from its latest remaining chronological committed result after a correction. Later recorded progression decisions remain authoritative and are not silently rewritten.

### Rationale

This restores consistency while respecting the user's explicit historical decisions and limiting the correction's blast radius.

### Consequences

- Correction review must preview the affected exercise and next target.
- Deleting the latest result falls back to the previous committed result.
- Deterministic correction tests are required.
- The implemented fallback returns to the configured exercise baseline when no committed result remains.

### Revisit when

Configurable plans or automated recommendation models introduce dependencies across multiple exercises or sessions.

## D-019 — Use Sheet-ready exports as snapshots, not synchronization

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: US-14, FR-EXP-01, FR-EXP-02, FR-EXP-04

### Context

The user wants portable app-to-Sheet exports during Personal readiness and may update the Sheet through ChatGPT later. Automatic Google Sheets writes would add authentication, retries, duplicate prevention, formula protection, and another synchronization path.

### Options considered

1. Build automatic one-way writes from the app into the existing Sheet.
2. Build bidirectional app/Sheet synchronization.
3. Export versioned Sheet-ready snapshots and treat any later Sheet update as a separate user-directed action.

### Decision

We will generate versioned Personal backup and Sheet-ready snapshot files during Personal readiness. The app will not automatically write to or synchronize with Google Sheets. Any later Sheet update will be a separate ChatGPT-assisted operation using an exported snapshot.

### Rationale

Snapshots provide portability, auditability, and an escape route without turning the Sheet into a second operational data store.

### Consequences

- Cloud app data remains authoritative after cutover.
- The Sheet may become stale by design unless the user updates it deliberately.
- Exports need manifests, schema versions, record counts, and reconciliation-friendly columns.

### Revisit when

Manual snapshot handling becomes a repeated burden and a one-way archival integration has clear value independent of operational sync.

## D-020 — Import private Personal presets without versioning the data

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: D-007, D-011, D-015; Personal-use release privacy gate

### Context

Personal mode needs the user's real profile, meal presets, food references, and strength targets to be useful. Those values include health and allergy information that should not appear in a public proof-of-work repository. Cloud-backed Personal storage is not ready yet, and the Sheet remains the operational source of truth.

### Options considered

1. Commit real Personal defaults in the source-controlled seed.
2. Keep generic defaults and require repeated manual setup in the browser.
3. Version a generic preset importer while keeping the actual preset bundle in a Git-ignored local file.

### Decision

We will import Personal configuration from a schema-versioned local JSON bundle that is excluded from Git. Import is allowed only while the Personal workspace has no check-ins, completed workouts, or draft workout. The bundle contains configuration and progression baselines, not workout or check-in history.

### Rationale

This makes the local product personally useful now without weakening the privacy boundary of the GitHub portfolio or creating an unofficial history migration before cutover.

### Consequences

- The public repository contains importer code and tests but no Personal preset values.
- Resetting browser storage requires re-importing the ignored local bundle.
- Preset schema validation and configuration/history separation are testable proof-of-work artifacts.
- Cross-device availability still depends on the future authenticated cloud milestone.

### Revisit when

Authenticated cloud storage and the controlled Sheet migration replace the local Personal setup path.

## D-021 — Make the daily check-in progressively saved and explicitly completed

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering, Design
- Related: US-02, US-02A, FR-CHK-01 through FR-CHK-05, TC-032 through TC-035

### Context

Weight is usually known in the morning, while meal outcomes become known throughout the day. Requiring every field in one sitting turns a low-friction check-in into a deferred task and makes the app less useful as the daily system of record. Treating untouched meals as zero would make partial data look complete and distort nutrition summaries.

### Options considered

1. Require one complete form submission at the end of the day.
2. Store a separate opaque draft and publish all data only on completion.
3. Progressively save one dated record, use valid partial signals immediately, and retain an explicit completion boundary.

### Decision

We will progressively autosave one daily check-in record per date. Weight, explicit meal answers, extras, and notes remain available when the user returns. An unanswered meal stays open and is not interpreted as `Skipped`. Weight contributes to weight trends immediately, while aggregate nutrition coverage includes the record only after every meal is answered and the user explicitly completes the check-in.

### Rationale

This matches when the information becomes available and removes the need to remember it later. One progressively saved record avoids duplicate draft and committed entities, while the completion timestamp preserves a trustworthy boundary for nutrition reporting.

### Consequences

- Today needs three states: not started, in progress, and completed.
- The persisted schema must represent partial adherence and completion timestamps and migrate older complete records.
- Autosave communicates local durability but does not imply future cloud synchronization.
- Completion remains deliberate even when all meal answers are present.

### Revisit when

The product supports multiple check-ins per date, meal plans with variable slot counts, or collaborative edits that require a separate draft/version model.

## D-022 — Migrate Sheet history once at cloud cutover

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: D-015, D-016, FR-MIG-01 through FR-MIG-07, TC-036, TC-037

### Context

The Sheet is the authoritative source only until cloud-backed Personal mode is ready. Its current history must be present before phone use begins, but a reusable Sheet-history importer would add permanent product surface and maintenance for a one-time transition.

Some historical rep values are ranges such as `7–8` and `12–13`, while the app model uses one numeric result per set.

### Options considered

1. Build and maintain a reusable history-import feature in the app.
2. Seed Personal history in the public source code.
3. Run one private, repeatable migration operation against the cloud store during rehearsal and final cutover.

### Decision

We will run Sheet history migration as a private operational step after the cloud schema is ready and immediately before phone cutover. The public app will not expose a reusable Sheet-history import feature, and Personal records will not enter Git.

Historical rep ranges will use the lower number of the range: `7–8` becomes `7`, and `12–13` becomes `12`. The original source text will remain in migration evidence or existing notes for auditability.

### Rationale

This keeps temporary migration complexity out of the daily product while still making the cutover complete and testable. A repeatable private operation supports rehearsal and duplicate checks without becoming a permanent user workflow.

### Consequences

- The cloud schema must exist before final history migration.
- Migration logic may live in a temporary private script or controlled operator workflow and is not shipped in the public UI.
- Rehearsal and final migration use stable IDs so reruns cannot duplicate records.
- The final reconciliation report is retained privately; no Personal values are committed or pushed.

### Revisit when

Another user or recurring external source creates a genuine ongoing import need.

## D-023 — Use Supabase and a revisioned Personal snapshot

- Date: 2026-08-08
- Status: Accepted
- Owners: Product, Engineering
- Related: D-005, D-016, D-022, FR-SYNC-01 through FR-SYNC-06, OQ-09

### Context

Phone-to-desktop continuity requires identity, durable storage, access control, and a conflict boundary. The current app already treats a completed workout and its progression updates as one atomic state transition, and the Personal dataset is small enough that record-level cloud tables would add mapping and partial-write paths before they add user value.

### Options considered

1. Keep Personal mode local-only with manual backups.
2. Build a custom API and normalized cloud schema for each fitness entity.
3. Use Supabase Auth and Postgres with one revisioned Personal snapshot per user, retaining local storage as the offline cache.

### Decision

We will use a dedicated Supabase project in Mumbai. Personal users authenticate with email and password. Postgres row-level security restricts every snapshot to its owner, and anonymous clients receive no table or write-function access.

The cloud stores one versioned `FitnessState` snapshot per user. Writes call a security-invoker function with the client’s expected revision; a stale revision fails as a conflict. Demo mode never authenticates or synchronizes.

### Rationale

This preserves the app’s proven atomic workflow, minimizes permanent backend surface, and provides managed identity and recovery at zero initial infrastructure cost. Revision checks make multi-device risk explicit without pretending that automatic merging of workout and progression state is safe.

### Consequences

- Cross-device changes synchronize at whole-workspace granularity.
- Concurrent edits are preserved on both sides and require explicit resolution; the app does not silently apply last-write-wins.
- A larger or multi-user product may eventually need normalized domain tables and a real mutation queue.
- Public deployment must close or otherwise control account creation after the Personal account is established.
- Database migrations, generated types, security policies, and sync tests remain versioned as proof of work; Personal values do not.

### Revisit when

The snapshot grows enough to affect latency, multiple users collaborate, conflict frequency becomes material, or product analytics require queryable record-level history.

## D-024 — Resolve cloud conflicts by explicit whole-copy selection

- Date: 2026-08-09
- Status: Accepted
- Owners: Product, Engineering
- Related: D-017, D-023, FR-SYNC-04, FR-SYNC-05

### Context

A revision conflict means the device and cloud both changed after their last common snapshot. Workouts, progression decisions, check-ins, and profile settings are related parts of one fitness state, so automatically combining fields or records can produce a state the user never intended.

### Options considered

1. Apply the last arriving write automatically.
2. Merge records or fields automatically.
3. Compare both whole snapshots and require the user to choose which complete copy becomes current.

### Decision

The conflict interface will show the device and cloud timestamps, check-in and workout counts, progression-target counts, and whether each copy contains a workout draft. It will offer two explicit actions: use the latest cloud version on this device, or keep this device version and replace the reviewed cloud revision.

The action requires confirmation. Before replacement, the displaced snapshot is stored as the existing versioned browser safety backup. Keeping the device copy uses compare-and-swap against the displayed cloud revision; if the cloud changes again first, the app refreshes the comparison and asks again.

### Rationale

Whole-copy selection preserves the atomic relationship between workout completion and progression while making the user, not timing, authoritative. Reusing the existing safety-backup format keeps recovery inspectable without adding record-level merge rules or a second persistence system.

### Consequences

- Conflict recovery requires an online connection because the cloud copy is refreshed or replaced during resolution.
- The app never claims that two divergent snapshots were safely merged.
- The Latest safety copy always contains the version displaced by the most recent resolved conflict.
- Frequent conflicts would indicate that the snapshot model or device-use guidance should be revisited.

### Revisit when

Conflict frequency becomes material, multiple people edit the same workspace, or record-level synchronization can preserve workout and progression invariants with equal clarity.

## D-025 — Target GitHub Pages behind an explicit public repository gate

- Date: 2026-08-09
- Status: Proposed
- Owners: Product, Engineering
- Related: D-007, D-010, D-016, D-023, FR-PORT-02 through FR-PORT-04, OQ-07

### Context

getFit needs one stable HTTPS PWA URL for daily phone use and a public synthetic demo for GitHub proof of work. The app is a static Vite client and already uses Supabase for authenticated Personal persistence, so the host does not need a second backend. The repository is currently private, and GitHub reports that the current plan does not support Pages for a private repository.

### Options considered

1. Make the audited repository public and deploy through GitHub Pages at no additional platform cost.
2. Keep the repository private and upgrade the GitHub plan for private-repository Pages.
3. Keep the repository private and add a separate static-hosting provider.

### Decision

GitHub Pages is the proposed target once the owner explicitly approves public repository visibility. The deployment workflow remains inactive while the repository is private. Codex must not change visibility automatically.

The production build opens in synthetic Demo mode. Personal mode exposes sign-in only for the existing account. Supabase signup must be disabled separately before release, and the deployment must use only the publishable browser key. The PWA must support the `/getfit-app/` project path and restrict its service-worker cache to same-origin application assets.

### Rationale

GitHub Pages makes the running product, source, CI, product documentation, and decision history one inspectable proof-of-work system. It avoids another vendor and recurring deployment configuration while serving the static PWA over HTTPS. Keeping visibility as a separate approval gate prevents deployment convenience from weakening the privacy review.

### Consequences

- The full Git history must pass a privacy and secret audit before visibility changes.
- A private repository requires either a paid GitHub plan or a different host.
- The public site can expose Demo mode safely, while Personal records remain behind Supabase authentication and RLS.
- Publishing remains blocked until repository visibility and Supabase signup are explicitly closed.

### Revisit when

The repository must remain private, the user chooses a custom domain or preview environments, or another host materially improves reliability without adding operating complexity.
