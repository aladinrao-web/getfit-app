import { describe, expect, it } from 'vitest'
import { createPersonalState } from '../data/seed'
import { createPersonalBackup, parsePersonalBackup, serializePersonalBackup } from './backup'

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
})
