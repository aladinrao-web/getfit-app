# getFit Personal-Use Product Requirements Document

| Field | Value |
| --- | --- |
| Product | getFit |
| Document status | Working baseline |
| Version | 0.1 |
| Product owner and primary user | Kovid |
| Last updated | 2026-08-08 |
| Repository baseline | `ac4cc75` — `feat: build getFit MVP` |
| Companion record | [Decision log](DECISION_LOG.md) |

## 1. Purpose of this document

This PRD is the product backbone for getFit. It records the problem, intended outcomes, user needs, scope, requirements, acceptance criteria, test strategy, success measures, risks, and release gates. It should guide decisions without freezing implementation details prematurely.

When implementation or priorities change:

1. Update the relevant requirement, assumption, or release gate here.
2. Record any material trade-off in the [decision log](DECISION_LOG.md).
3. Link the change to code or test evidence when it is implemented.

## 2. Executive summary

getFit has two outcomes, in strict priority order:

1. **Personal utility:** help Kovid reliably track daily body weight and strength training, preserve history, and turn completed workouts into clear progression decisions.
2. **Proof of work:** demonstrate product judgment and technical fluency through a public GitHub repository and a safe synthetic demo.

When these outcomes conflict, personal utility wins. Portfolio work should explain and demonstrate the real product; it must not add friction to the daily workflow or expose personal fitness data.

## 3. Problem statement

### Primary problem

Daily fitness tracking is fragmented across plans, memory, chat, and spreadsheets. Generic fitness apps can capture activity but often require too much input or fail to close the loop between:

> What did I do? → What changed? → What should I do next?

For strength training, missing or inconsistent history makes it harder to choose an appropriate working load, distinguish progression from technique work, and resume an interrupted session confidently. For body weight, individual readings create noise unless the product converts them into a stable trend and a clear next action.

### Secondary problem

A GitHub link for a PM role needs to show more than code. It should make the product problem, scoping choices, user workflow, quality bar, evidence, and iteration history easy to understand without exposing private data.

### Why existing approaches are insufficient

- A spreadsheet is durable but slower during a workout and weak at surfacing the next action in context.
- A long-running chat contains useful reasoning but is not a reliable transactional store.
- Detailed fitness and calorie apps can make tracking feel like a chore.
- A public repository containing only setup instructions does not demonstrate product reasoning.

## 4. Product vision and value proposition

### Vision

getFit is a low-friction personal fitness system that remembers the last meaningful state, makes today's action obvious, and updates tomorrow's recommendation only after today's work is confirmed.

### Value proposition

> Log a morning weight and a workout with minimal effort; get a trustworthy trend and a deliberate next target without manually reconstructing history.

### Product principles

1. **Personal usefulness before portfolio polish.** A feature must first improve the real workflow.
2. **Signal over noise.** Prefer seven-day trends, clear targets, and short exceptions over exhaustive data entry.
3. **Drafts are reversible; commits are consequential.** Typing must never silently rewrite history or progression.
4. **The user owns progression.** Hitting a rep target does not automatically override an explicit Repeat, Increase, Deload, or Technique focus decision.
5. **One obvious next action.** Each primary screen should answer what to do now.
6. **Private by default.** Personal records must not enter the repository or public demo.
7. **Offline-capable and cloud-backed.** Local persistence protects active work; cloud persistence protects the long-term record and enables phone-to-desktop continuity.
8. **Explain decisions, not just features.** Material choices belong in the decision log.

## 5. User and jobs to be done

### Primary user

Kovid is the product owner and daily user. The initial product is optimized for one known user rather than a generalized fitness market.

### Context

- Tracks a beginner/intermediate strength plan organized as Workouts A, B, and C.
- Needs previous results, today's target, warm-up context, and progression reasoning at the point of training.
- Tracks body weight for lean gain and needs weekly signal rather than daily emotional noise.
- Values approximation and presets when tracking nutrition; does not want ingredient-level logging.
- May use the app on a compact screen during workouts and a larger screen for review.

### Core jobs to be done

1. **When I wake up**, help me record my weight in seconds so I build a usable trend.
2. **When I am about to train**, show the right workout and previous context so I do not reconstruct it manually.
3. **When I finish a set**, let me record load and reps with minimal taps.
4. **When I am interrupted**, preserve the draft and make resumption unmistakable.
5. **When I finish a workout**, update history and progression together so the next target is trustworthy.
6. **When I review the week**, separate noise from trend and tell me whether to stay the course or investigate.
7. **When I share the repository**, provide a realistic demo and evidence of product decisions without revealing personal records.

## 6. Goals, non-goals, and success measures

### Goals

| ID | Goal | Success measure | Initial target |
| --- | --- | --- | --- |
| G-01 | Make daily weight logging easy | Median time to save a weight entry | ≤ 20 seconds |
| G-02 | Make workout logging low-friction | Median time to record one exercise's load and sets | ≤ 30 seconds |
| G-03 | Preserve trust in workout state | Duplicate or partial committed sessions caused by the app | 0 |
| G-04 | Prevent data loss during interruption | Draft survives reload/reopen and resumes accurately | 100% in acceptance tests |
| G-05 | Make progression actionable | Completed exercises with an explicit next decision | ≥ 95% |
| G-06 | Make weight data interpretable | Weekly review shows latest, seven-day average, rate, target band, and one recommendation | 100% when enough data exists |
| G-07 | Establish personal usefulness | Weight logged on at least 4 days/week during a four-week dogfood period | ≥ 3 of 4 weeks |
| G-08 | Establish workout usefulness | Completed planned workouts recorded during dogfood | ≥ 90% |
| G-09 | Protect privacy | Personal records present in Git history or public demo | 0 |
| G-10 | Create credible proof of work | Public repo includes problem, decisions, requirements, tests, screenshots, and synthetic demo | All release checklist items complete |

Targets are hypotheses for the first dogfood cycle, not claims about current performance.

### Non-goals for the personal-use release

- A generalized multi-user fitness platform.
- Social feeds, leaderboards, challenges, or coaching marketplaces.
- Automatic medical, injury, rehabilitation, or diagnostic advice.
- Detailed ingredient, macro, or calorie weighing.
- Automatic weight progression based only on rep completion.
- Wearable, Google Fit, Health Connect, or Apple Health integration.
- Payments, subscriptions, or commercial onboarding.
- AI coaching before structured personal data and deterministic rules are reliable.
- Replacing professional medical or nutritional guidance.

## 7. Scope and priorities

Priority definitions:

- **P0:** required before the app becomes the primary personal tracker.
- **P1:** required before the public proof-of-work release is considered complete.
- **P2:** valuable follow-up after four weeks of real use.
- **Deferred:** intentionally outside the current planning horizon.

### P0 — Personal-use readiness

- Real local date and timezone behavior instead of a fixed demo date.
- Personal and Demo modes with isolated storage.
- Daily weight create/update flow.
- Workout start, autosaved draft, resume, discard, review, and confirmed completion.
- Atomic workout-history and progression updates.
- Workout history and correction path.
- Weight trend and weekly recommendation.
- Versioned local/offline persistence with authenticated cloud synchronization.
- Replace-only restore with an automatic pre-import backup.
- Versioned Sheet-ready snapshot exports for portability and optional later ChatGPT-assisted Sheet updates.
- Controlled one-time migration and reconciliation from the existing Sheet before the app becomes authoritative.
- Validation, error handling, and recovery for malformed or incompatible data.
- Responsive compact-screen workflow and baseline accessibility.

### P1 — GitHub proof of work

- Resettable synthetic Demo mode that cannot read Personal mode.
- PM-grade README with product problem, hypothesis, scope, architecture, decisions, metrics, screenshots, demo link, and next steps.
- Public deployment that opens in Demo mode.
- Automated domain and critical-flow tests.
- PRD and decision log maintained in the repository.
- Clear privacy statement and synthetic-data disclosure.

### P2 — Evidence-led improvements

- Friction fixes discovered during dogfood.
- Personal bests and volume views if they improve decisions.
- Configurable workout plans and exercise substitutions.
- Rest timer if it reduces cognitive load during training.
- Additional integrations only when real use demonstrates a need.
- Selective nutrition improvements only if daily use demonstrates value.

### Existing nutrition scope

The current preset-based nutrition and protein experience remains supported, but it is secondary to exercises and body weight. Do not expand it into ingredient-level tracking in the current milestone.

## 8. Experience architecture

### Modes

```text
Shared getFit product logic and UI
├── Personal mode
│   ├── Current local date
│   ├── Private personal records
│   ├── Local offline cache and autosaved drafts
│   ├── Authenticated cloud source of truth
│   ├── Replace-only restore with pre-import backup
│   └── Sheet-ready snapshot export
└── Demo mode
    ├── Deterministic synthetic fixtures
    ├── Fixed narrative date where useful
    ├── One-click reset
    └── No access to Personal storage
```

### Primary daily loop

```text
Open Today
  → record or review morning weight
  → start or resume the recommended workout
  → log completed exercises
  → review exact commit scope
  → confirm completion
  → update history and matching progression
  → review trend weekly
```

### Primary navigation

| Surface | Primary question answered |
| --- | --- |
| Today | What needs my attention now? |
| Train | What should I perform and record? |
| Progress | What is the next useful step for each exercise? |
| Trends | What is changing over time, and what should I do? |
| Nutrition | What is the approximate preset and did today materially differ? |
| Settings | What goals, rules, mode, and data controls are active? |

## 9. User stories and acceptance criteria

### US-01 — Enter Personal mode

**As the primary user, I want to choose Personal mode and configure my baseline so that the app uses my goals without exposing them in Demo mode.**

It's done when:

- Personal and Demo modes are visibly distinguishable.
- Personal mode uses a separate storage namespace.
- Creating or changing Personal data does not change Demo fixtures.
- Returning to the app restores the last selected mode without exposing Personal values on a public-demo URL by default.

### US-02 — Log today's weight

**As the primary user, I want to record today's morning weight quickly so that I can build a trustworthy trend.**

It's done when:

- Today defaults to the device-local date in the configured timezone.
- Weight accepts a realistic decimal value in kilograms.
- Saving the same date updates one record rather than adding a duplicate.
- The saved value appears on Today and in Trends after reload.
- Blank weight remains distinct from zero or a failed entry.

### US-03 — Start the recommended workout

**As the primary user, I want the next planned workout and its exercises ready so that I can begin without reconstructing the plan.**

It's done when:

- The app recommends the workout after the most recent committed session.
- Previous result, next target, warm-up, and coaching cue are available for every exercise.
- Starting creates one autosaved draft with the correct date and workout code.
- Starting another workout while a draft exists resumes or surfaces the existing draft instead of replacing it.

### US-04 — Record an exercise

**As the primary user, I want to record load and reps quickly so that tracking does not interrupt training.**

It's done when:

- Load and set inputs are usable on a compact touch screen.
- Empty sets remain unreported rather than becoming zero.
- Skipped exercises are excluded from completion.
- Limiting factor, form note, and progression decision remain optional or defaulted sensibly.
- Every change persists to the draft without committing history.

### US-05 — Resume an interrupted workout

**As the primary user, I want an interrupted workout to survive reload or app closure so that I never have to reconstruct it.**

It's done when:

- Today says `Workout in progress`, `Draft autosaved`, and `Resume workout X`.
- Reloading preserves workout, load, reps, notes, skipped exercises, and decisions.
- Resume opens the existing draft without creating a second session.
- Discard requires confirmation and does not change committed history or progression.

### US-06 — Confirm workout completion

**As the primary user, I want to review the exact completed scope before committing so that history remains accurate.**

It's done when:

- Review is unavailable until at least one non-skipped exercise has a reported rep.
- Review lists only exercises that will be committed, including load, reps, and decision.
- Confirming creates or updates exactly one session.
- Confirming twice cannot duplicate the session.
- Only matching completed exercises update progression.
- The draft is removed only after a successful commit.

### US-07 — Control progression

**As the primary user, I want progression to reflect performance and context so that the plan does not blindly add weight.**

It's done when:

- Decisions are limited to Increase, Repeat, Deload, and Technique focus.
- Repeat preserves the working load.
- Increase applies the configured increment only after confirmation.
- Deload reduces by the configured increment without going below zero.
- Technique focus preserves load and states technique as the next priority.
- An explicit user decision takes precedence over automatic rep interpretation.

### US-08 — Review workout history and correct mistakes

**As the primary user, I want to review and correct an accidental entry so that future progression is based on accurate history.**

It's done when:

- History is ordered by completion date and distinguishes workout codes.
- Session detail shows every committed exercise, load, reps, limiter, decision, and note.
- A correction flow clearly shows which progression values may change.
- Destructive deletion requires confirmation and provides a recoverable backup path.
- Corrections cannot create duplicate date/session records.

### US-09 — Understand weight trend

**As the primary user, I want the app to smooth daily weight noise so that I respond to the trend rather than one reading.**

It's done when:

- Trends show the latest value and seven-day moving average separately.
- Weekly change compares current and prior periods only when sufficient observations exist.
- The gain band is configurable.
- The recommendation says whether to stay the course, review intake, or keep logging for a baseline.
- Missing days do not become zero-weight observations.

### US-10 — Back up and restore Personal data

**As the primary user, I want a portable backup so that browser storage is not a single point of failure.**

It's done when:

- Export creates a human-identifiable, versioned JSON file containing Personal data only.
- Import validates schema version and required fields before changing state.
- Invalid imports leave current data untouched and explain the error.
- A valid import presents a summary, creates a pre-import backup, and requires confirmation before replacing current Personal state.
- Merge import is explicitly unavailable in Personal v1.
- Demo reset and Personal restore cannot target the wrong mode.

### US-11 — Use the public demo safely

**As a GitHub reviewer, I want to explore a realistic product without setup or private data so that I can evaluate the product thinking.**

It's done when:

- Public deployment opens in Demo mode with synthetic records.
- The interface labels synthetic/demo state clearly.
- Reset returns to deterministic fixtures.
- No Personal storage, export, name, measurements, or history is exposed.
- The README links the demo, PRD, decision log, tests, and architecture.

### US-12 — Maintain the product backbone

**As the product owner, I want requirements and decisions versioned with the code so that future changes preserve context.**

It's done when:

- Material scope changes update this PRD.
- Material product or technical trade-offs receive a decision-log entry.
- Superseded decisions remain in history and link to their replacement.
- Pull requests or commits reference affected requirement and decision IDs where practical.

### US-13 — Use Personal data across phone and desktop

**As the primary user, I want authenticated cloud persistence with offline-capable local storage so that I can use the app on my phone daily without risking the long-term record.**

It's done when:

- The same account can access the same Personal records on supported phone and desktop browsers.
- Draft and input changes save locally immediately and synchronize when connectivity is available.
- Sync status distinguishes saved locally, syncing, synced, and failed states.
- Temporary connectivity loss does not block workout logging or lose the draft.
- Reconnect synchronizes queued changes without creating duplicate sessions or check-ins.
- Conflict handling never silently discards a committed workout or newer user edit.
- Cloud persistence and recovery pass before the Sheet-to-app cutover.

### US-14 — Migrate from and optionally export back to the Sheet

**As the product owner, I want one controlled migration from the existing Sheet and portable Sheet-ready snapshots afterward so that the source of truth changes once without creating dual-write complexity.**

It's done when:

- The existing Sheet remains authoritative until all Personal readiness gates pass.
- A migration rehearsal validates field mapping before the final cutover.
- Final migration occurs from one frozen Sheet snapshot.
- Reconciliation compares weight/check-in counts, workout sessions, exercise progression, and latest values.
- The app becomes authoritative only after reconciliation is approved.
- The Sheet remains a read-only archive unless the user later chooses a separate ChatGPT-assisted update.
- App exports are versioned snapshots; the app does not automatically write to or synchronize with Google Sheets.

## 10. Functional requirements

| ID | Priority | Requirement | Verification |
| --- | --- | --- | --- |
| FR-MODE-01 | P0 | The app shall provide isolated Personal and Demo data modes. | Integration + manual |
| FR-MODE-02 | P0 | Public deployments shall default to Demo mode. | E2E |
| FR-MODE-03 | P0 | Mode changes shall never copy data implicitly. | Integration |
| FR-DATE-01 | P0 | Personal mode shall derive today from the configured local timezone. | Unit + integration |
| FR-DATE-02 | P0 | Stored calendar dates shall use `YYYY-MM-DD`; completion instants shall retain timestamp and timezone context. | Unit |
| FR-WGT-01 | P0 | The user shall be able to create or update one weight entry per date. | Integration + E2E |
| FR-WGT-02 | P0 | Weight shall support 0.1 kg precision and reject non-finite or implausible values. | Unit + UI |
| FR-WGT-03 | P0 | Missing weight shall remain null/absent and shall not affect averages. | Unit |
| FR-WKO-01 | P0 | The app shall recommend the next workout from committed history only. | Unit |
| FR-WKO-02 | P0 | Starting a workout shall create one autosaved draft. | Integration |
| FR-WKO-03 | P0 | A draft shall persist load, reps, skip state, limiter, form note, decision, and session note. | Integration + E2E |
| FR-WKO-04 | P0 | Existing drafts shall be resumed rather than silently replaced. | Integration + E2E |
| FR-WKO-05 | P0 | Empty sets shall remain null; only reported reps make an exercise committable. | Unit |
| FR-WKO-06 | P0 | The review step shall show the exact commit scope. | E2E |
| FR-WKO-07 | P0 | Completion shall upsert by stable session ID and be idempotent. | Unit + integration |
| FR-WKO-08 | P0 | Completion shall exclude skipped and unreported exercises. | Unit |
| FR-WKO-09 | P0 | Discard shall require confirmation and leave committed records unchanged. | E2E |
| FR-PRG-01 | P0 | Only committed exercises shall update matching progression records. | Unit |
| FR-PRG-02 | P0 | The four allowed progression decisions shall have deterministic effects. | Unit |
| FR-PRG-03 | P0 | Explicit user decisions shall not be overwritten by automatic rules. | Unit |
| FR-HIS-01 | P0 | History shall show committed sessions in reverse chronological order. | Unit + UI |
| FR-HIS-02 | P0 | The app shall provide a deliberate correction path with impact preview. | Integration + E2E |
| FR-TRD-01 | P0 | Weight points shall calculate a seven-day moving average from available observations. | Unit |
| FR-TRD-02 | P0 | Recommendations shall wait for sufficient current and prior observations. | Unit |
| FR-TRD-03 | P0 | Trends shall show data, interpretation, and next action separately. | UI review |
| FR-DATA-01 | P0 | Personal state shall persist across reload and app restart. | Integration + E2E |
| FR-DATA-02 | P0 | Stored state shall include a schema version and migration path. | Unit + integration |
| FR-DATA-03 | P0 | Personal data shall support validated export and restore. | Integration + E2E |
| FR-DATA-04 | P0 | Persistence failure shall not present unsaved data as saved. | Failure test |
| FR-SYNC-01 | P0 | Personal mode shall persist the authoritative long-term record in an authenticated cloud data store. | Integration + E2E |
| FR-SYNC-02 | P0 | Personal changes shall save to a local offline cache before background synchronization. | Integration + offline E2E |
| FR-SYNC-03 | P0 | The interface shall show whether data is saved locally, syncing, synced, or failed. | UI + E2E |
| FR-SYNC-04 | P0 | Retried or repeated synchronization shall preserve stable IDs and prevent duplicate sessions/check-ins. | Integration + failure test |
| FR-SYNC-05 | P0 | Conflict handling shall preserve the latest deliberate user action and surface unresolved conflicts. | Integration + E2E |
| FR-EXP-01 | P0 | Export shall produce a versioned Personal backup plus Sheet-ready weight, workout-log, and progression files. | Integration |
| FR-EXP-02 | P0 | Exported files shall include an export timestamp, schema version, record counts, and source mode. | Unit + integration |
| FR-EXP-03 | P0 | Restore shall replace Personal state only after validation, automatic pre-import backup, summary, and confirmation. | Integration + E2E |
| FR-EXP-04 | P0 | The app shall not automatically write to or synchronize with Google Sheets. | Architecture + release audit |
| FR-MIG-01 | P0 | The existing Sheet shall remain authoritative until Personal readiness and migration reconciliation pass. | Release audit |
| FR-MIG-02 | P0 | Migration shall use a documented mapping from Sheet fields to the versioned app schema. | Migration test |
| FR-MIG-03 | P0 | Final migration shall use one frozen Sheet snapshot and shall not require dual entry. | Operational rehearsal |
| FR-MIG-04 | P0 | Reconciliation shall compare counts and latest values for weights, workouts, and progression before cutover. | Migration test |
| FR-MIG-05 | P0 | After cutover, the app cloud data store shall be the only operational source of truth. | Release audit |
| FR-NUT-01 | P1 | Nutrition shall remain preset-based and exception-oriented. | Product review |
| FR-NUT-02 | P1 | Over-target bars shall cap visual fill, show an overflow marker, and announce the real percentage. | Unit + accessibility |
| FR-DEMO-01 | P1 | Demo mode shall use deterministic synthetic data and support reset. | Unit + E2E |
| FR-DEMO-02 | P1 | Repository and public build shall contain no Personal records. | Release audit |
| FR-PORT-01 | P1 | README shall explain problem, hypothesis, scope, decisions, architecture, evidence, demo, and next steps. | Documentation review |
| FR-PORT-02 | P1 | Public demo shall be usable without credentials. | Deployment smoke test |

## 11. Data model and integrity rules

### Core entities

- **Profile:** goals, gain band, progression/nutrition rules, allergen note, timezone.
- **Weight/check-in:** calendar date, optional weight, optional preset adherence and exceptions.
- **Exercise:** workout code, order, target reps, warm-up, coaching cue.
- **Exercise progression:** working load, last result, next target, limiter, decision, notes, increment.
- **Workout draft:** stable session ID, date, workout code, mutable exercise results, notes.
- **Workout session:** committed version of completed exercise results and completion timestamp.
- **Mode metadata:** Personal or Demo, schema version, created/updated timestamps.
- **Sync metadata:** account ID, stable record ID, local/cloud revision, sync state, and last successful synchronization.
- **Export manifest:** schema version, export timestamp, source mode, record counts, and included files.

### Invariants

1. One weight/check-in record per mode and calendar date.
2. One committed workout session per stable session ID.
3. A draft is not history.
4. An exercise with no reported reps is not completed.
5. Skipped exercises do not update progression.
6. Workout completion and matching progression updates succeed or fail together.
7. Repeating the same completion operation cannot create a duplicate.
8. Personal and Demo storage never share record identifiers or namespaces.
9. Import validation completes before current state changes.
10. Synthetic fixtures are identifiable and resettable.
11. Local offline state and cloud state use the same stable record identifiers.
12. A repeated sync operation cannot create a duplicate committed record.
13. The Sheet and the app are never simultaneously treated as editable sources of truth.
14. Sheet-ready exports are immutable snapshots, not synchronization instructions.
15. Restore replaces Personal state only after a pre-import backup succeeds.

## 12. Non-functional requirements

### Reliability and recovery

- Critical draft changes should persist promptly enough that reload loses no completed field interaction.
- Corrupt or incompatible local state must fail safely, preserve a backup when possible, and offer recovery.
- Export/import and Sheet-ready snapshots must be deterministic and versioned.
- Temporary network loss must not block recording; queued changes must synchronize after reconnect.
- Cloud failure must remain visible until resolved and must not be represented as fully synced.
- No screen may claim `Saved` before persistence succeeds.

### Performance

- Primary navigation and local state updates should feel immediate on a typical modern phone or laptop.
- Initial demo load target: interactive within 2 seconds on a normal broadband connection and mid-range device.
- Inputs must remain responsive during autosave.

### Accessibility

- All primary actions must have programmatic names and visible keyboard focus.
- Touch targets should be usable on compact screens.
- Status cannot rely on color alone.
- Charts require meaningful text alternatives and underlying numeric summaries.
- Progress indicators must announce their real value, including values above a visual cap.
- Modal dialogs require clear labels, focus handling, and keyboard dismissal/confirmation behavior.

### Privacy and security

- Personal records use authenticated cloud persistence plus an isolated local offline cache.
- No analytics, telemetry, or transmission beyond the selected cloud data service without a separate accepted decision.
- Export warns that the file contains private fitness data.
- Public Demo mode cannot enumerate or display Personal storage.
- No secrets or personal exports may be committed to Git.

### Maintainability

- Domain calculations remain separated from rendering where practical.
- Data-changing rules have deterministic automated tests.
- Requirement and decision IDs should be referenced in meaningful changes.
- The schema version changes when persisted shape changes.

## 13. Testing and validation strategy

### Test layers

1. **Unit tests:** workout completion, progression effects, date logic, weight averages, protein calculations, import validation, migrations.
2. **State integration tests:** draft persistence, mode isolation, upserts, recovery, export/import.
3. **Critical-flow browser tests:** weight save, start/resume, set logging, review/finish, history/progression update, reset.
4. **Accessibility checks:** semantic controls, keyboard path, focus, progress values, chart alternatives, contrast review.
5. **Responsive/manual checks:** compact phone layout, larger desktop layout, sticky controls, offline/reload behavior.
6. **Dogfood evidence:** four weeks of real use with friction notes and observed completion times.
7. **Release audit:** synthetic-only public state, clean repository, build/test pass, deployed demo smoke test.

### Critical acceptance test matrix

| Test ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| TC-001 | P0 | Save a valid weight for today | One record appears on Today and Trends after reload |
| TC-002 | P0 | Save a second weight for the same date | Existing record updates; count does not increase |
| TC-003 | P0 | Leave weight blank | No zero-value observation is created |
| TC-004 | P0 | Start the recommended workout | One correctly dated draft is created |
| TC-005 | P0 | Enter load/reps, then reload | Every entered draft field survives |
| TC-006 | P0 | Return to Today with a draft | Resume language and active workout are correct |
| TC-007 | P0 | Attempt to start another workout with a draft | Existing draft is protected and surfaced |
| TC-008 | P0 | Review with no completed exercise | Completion remains unavailable |
| TC-009 | P0 | Complete one of four exercises | History contains only that exercise |
| TC-010 | P0 | Confirm the same session twice | Only one session exists |
| TC-011 | P0 | Finish with Repeat | Working load remains unchanged |
| TC-012 | P0 | Finish with Increase | Configured increment applies after confirmation |
| TC-013 | P0 | Finish with Deload | Load decreases by increment and not below zero |
| TC-014 | P0 | Finish with Technique focus | Load remains and technique target is explicit |
| TC-015 | P0 | Discard a draft | Draft disappears; history/progression remain unchanged |
| TC-016 | P0 | Import malformed or future-schema data | Import is rejected; current data remains unchanged |
| TC-017 | P0 | Export and restore valid Personal data | Record counts and values reconcile exactly |
| TC-018 | P0 | Switch between Personal and Demo modes | Neither mode's data changes or leaks into the other |
| TC-019 | P1 | Planned protein exceeds target | Fill caps, star appears, accessible text reports real percentage |
| TC-020 | P1 | Reset Demo mode | Deterministic fixtures return; Personal mode is unchanged |
| TC-021 | P1 | Inspect public build and Git history | No Personal records or exports are present |
| TC-022 | P1 | Install/open production PWA and lose network | Cached shell opens and saved local data remains available |
| TC-023 | P0 | Save changes while offline, then reconnect | Changes sync once with stable IDs and no duplicates |
| TC-024 | P0 | Open the same Personal account on phone and desktop | Both devices converge on the same committed history |
| TC-025 | P0 | Force a cloud write failure | Local work remains available and sync failure stays visible |
| TC-026 | P0 | Retry the same cloud write | The operation is idempotent and creates no duplicate |
| TC-027 | P0 | Restore a valid backup | A pre-import backup is created before Personal state is replaced |
| TC-028 | P0 | Produce a Sheet-ready export | Manifest and file counts reconcile with Personal state |
| TC-029 | P0 | Rehearse Sheet migration | Mapped records, counts, latest values, and progression reconcile |
| TC-030 | P0 | Inspect network and Sheet access | No automatic Google Sheets write or bidirectional sync exists |

### Personal-use release gates

The Personal mode release is ready only when:

- All P0 requirements are implemented or explicitly deferred through an accepted decision.
- All P0 automated tests pass.
- TC-001 through TC-018 pass on the release build.
- No known path creates duplicate committed sessions or silently loses a draft.
- Authenticated cloud persistence, offline queueing, reconnect, and recovery are proven on phone and desktop.
- Export and replace-only restore are proven with a fresh browser profile.
- A Sheet migration rehearsal and reconciliation pass before final cutover.
- Compact-screen and keyboard walkthroughs have no blocking issue.
- The PRD and decision log reflect the shipped behavior.

### Proof-of-work release gates

The public GitHub release is ready only when:

- The Personal release gates are satisfied for the shared core.
- Demo mode is the public default and contains synthetic data only.
- README, PRD, decision log, screenshots, architecture, and test instructions are current.
- The deployed URL passes a clean-profile smoke test.
- Repository status is clean and the intended release commit/tag is identifiable.

## 14. Assumptions and validation plan

| ID | Assumption | Risk if false | Validation |
| --- | --- | --- | --- |
| A-01 | One primary user allows a focused workflow | Product may overfit and become hard to generalize | Accept for Personal v1; revisit only with a second real user |
| A-02 | An offline cache plus cloud persistence provides the right phone experience | Sync may add complexity or conflict risk | Validate offline, reconnect, phone/desktop convergence, and recovery before cutover |
| A-03 | Replace-only restore and Sheet-ready snapshots provide adequate portability | Manual exports may be forgotten | Show last export time and validate restore regularly |
| A-04 | A/B/C rotation remains the relevant plan | Training plan may change | Make plan data configurable before adding more hardcoded screens |
| A-05 | Seven-day weight averages reduce noise usefully | Sparse entries may produce misleading interpretation | Require minimum observations and inspect four-week data |
| A-06 | Explicit progression decisions improve trust | Manual choice may be skipped or inconsistent | Measure decision completion and review confusing cases |
| A-07 | Preset nutrition remains useful but secondary | It may distract from the exercise/weight core | Track actual usage; do not expand without evidence |
| A-08 | A public synthetic demo is enough for GitHub review | Reviewers may want deployment and architecture evidence | Add demo link, screenshots, tests, and case-study README |
| A-09 | A one-time Sheet migration avoids dual-write complexity | Cutover errors could omit or mis-map history | Rehearse mapping and reconcile before approval |
| A-10 | ChatGPT-assisted Sheet updates are sufficient if an archive update is desired later | Archive may become stale | Treat exports as optional snapshots and keep the app authoritative |

## 15. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Local browser storage is cleared or corrupted | Medium | High | Authenticated cloud recovery plus versioned export/import |
| Cloud sync fails or conflicts across devices | Medium | High | Stable IDs, revisions, visible status, idempotent retry, conflict tests |
| Personal and Demo data leak across modes | Low | High | Separate namespaces, isolation tests, public clean-profile audit |
| Fixed-date assumptions remain in Personal mode | Medium | High | Central date service and timezone tests before Personal release |
| Progression becomes incorrect after editing history | Medium | High | Impact preview, deterministic recomputation or explicit reconciliation |
| Logging still feels too slow in the gym | Medium | High | Measure task time and record friction during dogfood |
| Weight advice overreacts to sparse data | Medium | Medium | Minimum observation gate and visible explanation |
| Nutrition scope expands and dilutes the core | Medium | Medium | Keep nutrition secondary; require evidence and decision-log entry |
| Portfolio polish drives unnecessary architecture | Medium | Medium | Personal utility has explicit priority; defer backend/AI until needed |
| Public README overstates maturity | Low | Medium | Separate current behavior, planned behavior, and evidence |
| Accessibility regressions occur in custom controls | Medium | Medium | Semantic tests plus keyboard and screen-reader-oriented review |
| Sheet migration omits or duplicates records | Low | High | Frozen snapshot, mapping rehearsal, count/latest-value reconciliation |
| Sheet and app are both treated as editable | Low | High | Explicit cutover, read-only archive, no automatic Sheet synchronization |

## 16. Dependencies and constraints

- Current implementation: React, TypeScript, Vite, local browser persistence, synthetic fixture data.
- Current baseline is a client-only PWA; authenticated cloud persistence is required before Personal cutover.
- Public hosting must support SPA/PWA paths and service-worker assets.
- Personal mode must not depend on the reference Google Sheet at runtime.
- Existing tracker and strength plan remain product references and the controlled migration source, not public repository data.
- The selected cloud service must support authentication, per-user access controls, stable IDs, and offline-safe synchronization behavior.
- Google Sheets API integration is not a dependency; Sheet updates after cutover are optional and ChatGPT-assisted from exported snapshots.
- Health recommendations are informational fitness guidance, not medical advice.

## 17. Delivery sequence

### Milestone 0 — Synthetic MVP baseline

Status: complete at `ac4cc75`.

- Dashboard, check-in, workout log, progression, nutrition, and trends.
- Draft/commit boundary and idempotent workout completion.
- Synthetic fixtures, demo reset, responsive walkthrough.

### Milestone 1 — Personal-use readiness

- Real date/time abstraction.
- Personal/Demo mode isolation.
- Personal onboarding and settings.
- Versioned local/offline persistence and stable record IDs.
- Replace-only restore with pre-import backup.
- Sheet-ready snapshot exports.
- History correction with progression impact handling.
- P0 automated and browser test coverage.

### Milestone 2 — Cloud, migration, and cutover readiness

- Authenticated cloud persistence and access controls.
- Offline queue, visible sync status, idempotent retry, and conflict handling.
- Private hosted phone preview and three-to-seven-day test-data validation.
- Sheet-to-app mapping, migration rehearsal, and reconciliation report.
- Final migration from one frozen Sheet snapshot.
- Explicit approval that the app replaces the Sheet as the operational source of truth.

### Milestone 3 — Four-week Personal dogfood

- Use for real daily weight and workout tracking.
- Capture task times, missed logs, friction, corrections, and trust failures.
- Prioritize fixes from evidence rather than feature enthusiasm.
- Revisit assumptions A-02 through A-10.

### Milestone 4 — GitHub proof-of-work release

- PM case-study README.
- Architecture and product-flow diagram.
- Current screenshots and public synthetic deployment.
- Test/evidence summary and known limitations.
- Release tag and concise changelog.

### Milestone 5 — Evidence-led expansion

- Only features supported by dogfood evidence or a new explicit objective.
- Potential candidates: configurable plans, rest timer, personal bests, and selective analytics.

## 18. Open questions

| ID | Question | Decision trigger | Status |
| --- | --- | --- | --- |
| OQ-01 | Should Personal mode stay device-local or support cloud sync? | Phone durability and cross-device requirement | Resolved: cloud-backed with local offline cache before cutover |
| OQ-02 | Should import replace all state or support merge? | Data-integrity review | Resolved: replace-only with automatic pre-import backup |
| OQ-03 | How should editing an old workout recompute later progression? | History-correction design | Resolved: recompute the affected exercise from its latest remaining chronological result; later explicit decisions remain authoritative |
| OQ-04 | Should the A/B/C plan be configurable in Milestone 1 or after dogfood? | First real plan change | Open |
| OQ-05 | What minimum observations should unlock weight recommendations? | Four-week data review | Open; current hypothesis is 4 + 4 observations |
| OQ-06 | Should Personal and Demo mode share settings such as theme only? | Mode architecture design | Resolved for Personal v1: share no fitness data or settings; reconsider UI-only preferences later |
| OQ-07 | What hosting target best supports private phone validation and a public PWA demo? | Milestone 2 and 4 planning | Open |
| OQ-08 | Which product-usage metrics can be computed locally without telemetry? | Dogfood instrumentation planning | Open |
| OQ-09 | Which cloud/authentication service best meets offline, privacy, recovery, and maintenance needs? | Milestone 2 architecture comparison | Open |

## 19. Definition of done for future work

A requirement or story is done when:

1. Its user outcome and acceptance criteria are satisfied.
2. The relevant automated tests pass.
3. The critical UI path is verified at compact and desktop widths when applicable.
4. Failure and recovery behavior are handled in proportion to risk.
5. No Personal data is added to source control or Demo mode.
6. Documentation reflects actual behavior, not intended behavior.
7. A material trade-off is recorded in the decision log.
8. The repository is left in a clean, reproducible state.

## 20. Change history

| Version | Date | Change |
| --- | --- | --- |
| 0.2 | 2026-08-08 | Required cloud-backed Personal persistence before cutover; resolved import, correction, and mode questions; added controlled Sheet migration and snapshot export requirements. |
| 0.1 | 2026-08-08 | Created the personal-use PRD backbone from the synthetic MVP, product priorities, and external PRD/decision-record practices. |
