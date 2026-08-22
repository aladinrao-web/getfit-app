# Changelog

## 2026-08-22

### Added

- Per-set weight and rep entry, allowing load changes within the same exercise.
- Mixed-load workout summaries across review, history, corrections, progression, backups, and exports.
- One-row-per-set workout CSV exports with explicit set numbers, weights, and reps.

### Changed

- Progression now uses the first completed working set as the reference load while preserving every completed set in history.
- Local and cloud fitness-state schema advanced to version 4. Existing exercise-level weights migrate onto each historical set.
- Personal backup schema advanced to version 2 while retaining restore support for version 1 backups.
- Portable export schema advanced to version 2 with separate exercise-result and completed-set counts.

### Fixed

- Mobile dashboard cards and progression rows now wrap without overflowing narrow screens.
- Weight and rep inputs now remain inside their set columns at 320 px, 360 px, and 390 px widths.
- Set inputs now use consistent form styling and phone-friendly touch heights.
