import { describe, expect, it } from 'vitest'
import { createPersonalState } from '../data/seed'
import { createPersonalBackup, parsePersonalBackup, PERSONAL_BACKUP_SCHEMA_VERSION, serializePersonalBackup } from './backup'
import { startWorkoutDraft, applyWorkoutCompletion } from './workout'

describe('Personal backup', () => {
  it('round trips a full Personal workspace with verifiable record counts', () => {
    const state = createPersonalState()
    state.draftWorkout = {
      id: 'draft-1',
      date: '2026-08-08',
      workout: 'A',
      results: [],
      sessionNotes: 'Resume later',
    }

    const parsed = parsePersonalBackup(serializePersonalBackup(createPersonalBackup(state, '2026-08-08T12:00:00.000Z')))

    expect(parsed.state).toEqual(state)
    expect(parsed.recordCounts.draftWorkout).toBe(1)
    expect(parsed.recordCounts.progressions).toBe(state.progressions.length)
  })

  it('rejects unsupported versions and record-count mismatches', () => {
    const backup = createPersonalBackup(createPersonalState())
    expect(() => parsePersonalBackup(JSON.stringify({ ...backup, backupSchemaVersion: 99 }))).toThrow(/version/)
    expect(() => parsePersonalBackup(JSON.stringify({ ...backup, recordCounts: { ...backup.recordCounts, workouts: 3 } }))).toThrow(/integrity/)
  })

  it('restores a version-one backup by migrating one exercise weight onto every set', () => {
    const initial = createPersonalState()
    const draft = startWorkoutDraft(initial, 'A', '2026-08-08')
    draft.results[0].sets = [{ weightKg: 12.5, reps: 10 }, { weightKg: 12.5, reps: 9 }, { weightKg: 12.5, reps: 8 }]
    const state = applyWorkoutCompletion(initial, draft)
    const legacyState = structuredClone(state) as unknown as Record<string, unknown>
    const workouts = legacyState.workouts as Array<Record<string, unknown>>
    workouts.forEach((workout) => {
      workout.results = (workout.results as Array<Record<string, unknown>>).map((result) => {
        const sets = result.sets as Array<{ weightKg: number; reps: number }>
        const { sets: _sets, ...rest } = result
        return { ...rest, weightKg: sets[0].weightKg, reps: sets.map((set) => set.reps) }
      })
    })
    const recordCounts = createPersonalBackup(state).recordCounts
    const parsed = parsePersonalBackup(JSON.stringify({
      backupSchemaVersion: 1,
      sourceMode: 'personal',
      exportedAt: '2026-08-08T12:00:00.000Z',
      recordCounts,
      state: legacyState,
    }))

    expect(parsed.backupSchemaVersion).toBe(PERSONAL_BACKUP_SCHEMA_VERSION)
    expect(parsed.state.workouts[0].results[0].sets).toEqual(state.workouts[0].results[0].sets)
  })
})
