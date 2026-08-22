# Changelog

## 2026-08-22

### Added

- Per-set weight and rep entry, allowing load changes within the same exercise.
- Mixed-load workout summaries across review, history, corrections, progression, backups, and exports.
- One-row-per-set workout CSV exports with explicit set numbers, weights, and reps.
- Primary and secondary muscle attribution for every exercise, including automatic migration for existing Personal data and older presets.
- A rolling 28-day muscle coverage view with effective sets, meaningful exposures, prior-period comparison, target bands, and contributing exercises.
- One Home focus that prioritizes consistency, workout frequency, session completion, neglected muscles, body-weight progress, or exercise progression in that order.
- A low-prominence active-workout editor for adding, removing, reordering, or replacing exercises for the current session.
- Cross-theme exercise additions with existing progression weights, target reps, and primary or secondary muscle context.

### Changed

- Progression now uses the first completed working set as the reference load while preserving every completed set in history.
- Local and cloud fitness-state schema advanced to version 5. Existing exercise-level weights migrate onto each historical set, and existing exercises gain muscle metadata.
- Personal backup schema advanced to version 3 while retaining restore support for version 1 and version 2 backups.
- Portable export schema advanced to version 3 with separate exercise-result and completed-set counts plus muscle attribution in progression exports.
- Muscle coverage counts each completed primary-muscle set as 1.0 and each secondary-muscle set as 0.5. A workout counts as a meaningful exposure at 2 effective sets.
- Session exercise adjustments leave the saved A/B/C plans unchanged while completed history records the exercises actually performed.

### Fixed

- Mobile dashboard cards and progression rows now wrap without overflowing narrow screens.
- Weight and rep inputs now remain inside their set columns at 320 px, 360 px, and 390 px widths.
- Set inputs now use consistent form styling and phone-friendly touch heights.
- The app shell no longer creates a page-level horizontal overflow at narrow viewport widths.
- Snapshot revision conflicts now use a named application error, preventing automatic RPC retries and avoiding confusion with genuine database transaction failures.
