import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { createPersonalState } from '../data/seed'
import { parsePersonalBackup } from './backup'
import { createPortableSnapshot, serializePortableSnapshot } from './portableExport'

const exportedAt = '2026-08-09T14:45:30.000Z'

function createPopulatedState() {
  const state = createPersonalState('Asia/Calcutta')
  state.checkIns = [
    {
      id: 'check-later',
      date: '2026-08-08',
      weightKg: 66.4,
      adherence: {},
      extrasProteinG: 0,
      extrasCalories: 0,
      notes: '',
      updatedAt: '2026-08-08T06:00:00.000Z',
      completedAt: '2026-08-08T18:00:00.000Z',
    },
    {
      id: 'check-earlier',
      date: '2026-08-07',
      weightKg: 66.2,
      adherence: {},
      extrasProteinG: 0,
      extrasCalories: 0,
      notes: '',
      updatedAt: '2026-08-07T06:00:00.000Z',
    },
    {
      id: 'check-no-weight',
      date: '2026-08-09',
      adherence: {},
      extrasProteinG: 0,
      extrasCalories: 0,
      notes: '',
      updatedAt: '2026-08-09T06:00:00.000Z',
    },
  ]
  state.workouts = [{
    id: 'session-1',
    date: '2026-08-08',
    workout: 'A',
    completedAt: '2026-08-08T18:30:00.000Z',
    sessionNotes: 'Steady, controlled work',
    results: [{
      exerciseId: state.exercises[0].id,
      weightKg: 12.5,
      reps: [10, 10, 9],
      decision: 'Repeat',
      limitingFactor: 'Grip, then fatigue',
      formNotes: 'Line one\n"Quote" and comma, retained',
    }],
  }]
  state.progressions[0] = {
    ...state.progressions[0],
    currentWeightKg: 12.5,
    lastResult: '12.5 kg x 10 / 10 / 9',
    nextTarget: 'Repeat 12.5 kg',
    notes: '=HYPERLINK("https://example.com")',
  }
  return state
}

describe('Portable Personal snapshot', () => {
  it('creates one restorable backup and reconciliation-ready CSV files', () => {
    const state = createPopulatedState()
    const snapshot = createPortableSnapshot(state, exportedAt)

    expect(snapshot.archiveFilename).toBe('getfit-portable-snapshot-2026-08-09T14-45-30-000Z.zip')
    expect(Object.keys(snapshot.files)).toEqual([
      'personal-backup.json',
      'weights.csv',
      'workouts.csv',
      'progression.csv',
      'manifest.json',
    ])
    expect(parsePersonalBackup(snapshot.files['personal-backup.json']).state).toEqual(state)
    expect(snapshot.manifest).toMatchObject({
      exportSchemaVersion: 1,
      backupSchemaVersion: 1,
      sourceMode: 'personal',
      exportedAt,
      recordCounts: {
        checkIns: 3,
        weightEntries: 2,
        workoutSessions: 1,
        workoutResults: 1,
        exercises: 12,
        progressionTargets: 12,
        draftWorkout: 0,
      },
    })
  })

  it('uses stable ordering and spreadsheet-safe CSV escaping', () => {
    const snapshot = createPortableSnapshot(createPopulatedState(), exportedAt)
    const weights = snapshot.files['weights.csv']
    const workouts = snapshot.files['workouts.csv']
    const progressions = snapshot.files['progression.csv']

    expect(weights.indexOf('check-earlier')).toBeLessThan(weights.indexOf('check-later'))
    expect(workouts).toContain('"Grip, then fatigue"')
    expect(workouts).toContain('"Line one\n""Quote"" and comma, retained"')
    expect(progressions).toContain('\'=HYPERLINK(""https://example.com"")')
  })

  it('packages deterministic file contents into a readable ZIP archive', async () => {
    const snapshot = createPortableSnapshot(createPopulatedState(), exportedAt)
    const firstArchive = await serializePortableSnapshot(snapshot)
    const secondArchive = await serializePortableSnapshot(snapshot)
    const files = unzipSync(firstArchive)

    expect(firstArchive).toEqual(secondArchive)
    expect(Object.keys(files)).toEqual(Object.keys(snapshot.files))
    expect(strFromU8(files['manifest.json'])).toBe(snapshot.files['manifest.json'])
    expect(strFromU8(files['personal-backup.json'])).toBe(snapshot.files['personal-backup.json'])
  })

  it('exports valid header-only history files for an empty Personal workspace', () => {
    const snapshot = createPortableSnapshot(createPersonalState(), exportedAt)

    expect(snapshot.manifest.recordCounts.weightEntries).toBe(0)
    expect(snapshot.manifest.recordCounts.workoutSessions).toBe(0)
    expect(snapshot.manifest.recordCounts.workoutResults).toBe(0)
    expect(snapshot.files['weights.csv'].trim().split(/\r?\n/)).toHaveLength(1)
    expect(snapshot.files['workouts.csv'].trim().split(/\r?\n/)).toHaveLength(1)
    expect(snapshot.files['progression.csv'].trim().split(/\r?\n/)).toHaveLength(13)
  })

  it('rejects invalid export timestamps', () => {
    expect(() => createPortableSnapshot(createPersonalState(), 'not-a-date')).toThrow(/timestamp/)
  })
})
