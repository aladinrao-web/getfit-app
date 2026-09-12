import { describe, expect, it } from 'vitest'
import { createPersonalState, createSyntheticState } from '../data/seed'
import {
  ACTIVE_MODE_KEY,
  LEGACY_DEMO_KEY,
  MODE_STORAGE_KEYS,
  PRE_CHANGE_BACKUP_KEY,
  SCHEMA_VERSION,
  loadActiveMode,
  loadModeState,
  loadModeStateUpdatedAt,
  saveActiveMode,
  saveModeState,
} from './persistence'
import { parsePersonalBackup } from '../domain/backup'
import { applyWorkoutCompletion, startWorkoutDraft } from '../domain/workout'

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private values = new Map<string, string>()

  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('mode persistence', () => {
  it('keeps Demo and Personal state in separate versioned envelopes', () => {
    const storage = new MemoryStorage()
    const demo = createSyntheticState()
    const personal = loadModeState(storage, 'personal')
    personal.profile.name = 'Local test athlete'

    saveModeState(storage, 'demo', demo, new Date('2026-08-08T10:00:00.000Z'))
    saveModeState(storage, 'personal', personal, new Date('2026-08-08T10:01:00.000Z'))

    expect(JSON.parse(storage.getItem(MODE_STORAGE_KEYS.demo)!).schemaVersion).toBe(SCHEMA_VERSION)
    expect(JSON.parse(storage.getItem(MODE_STORAGE_KEYS.personal)!).mode).toBe('personal')
    expect(loadModeState(storage, 'demo').profile.name).toBe('Demo Athlete')
    expect(loadModeState(storage, 'personal').profile.name).toBe('Local test athlete')
  })

  it('persists the active mode independently from either dataset', () => {
    const storage = new MemoryStorage()
    expect(loadActiveMode(storage)).toBe('demo')
    saveActiveMode(storage, 'personal')
    expect(storage.getItem(ACTIVE_MODE_KEY)).toBe('personal')
    expect(loadActiveMode(storage)).toBe('personal')
  })

  it('exposes the persisted device timestamp for conflict comparison', () => {
    const storage = new MemoryStorage()
    const personal = loadModeState(storage, 'personal')
    saveModeState(storage, 'personal', personal, new Date('2026-08-08T10:01:00.000Z'))

    expect(loadModeStateUpdatedAt(storage, 'personal')).toBe('2026-08-08T10:01:00.000Z')
    expect(loadModeStateUpdatedAt(storage, 'demo')).toBeNull()
  })

  it('migrates the legacy demo blob and assigns stable check-in IDs', () => {
    const storage = new MemoryStorage()
    const legacy = createSyntheticState()
    const legacyWithoutNewFields = {
      ...legacy,
      profile: { ...legacy.profile, timezone: undefined },
      checkIns: legacy.checkIns.map(({ id: _id, ...entry }) => entry),
    }
    storage.setItem(LEGACY_DEMO_KEY, JSON.stringify(legacyWithoutNewFields))

    const migrated = loadModeState(storage, 'demo')

    expect(migrated.profile.timezone).toBe('Asia/Calcutta')
    expect(migrated.checkIns[0].id).toBe(`demo-checkin-${migrated.checkIns[0].date}`)
    expect(storage.getItem(LEGACY_DEMO_KEY)).toBeNull()
    expect(storage.getItem(MODE_STORAGE_KEYS.demo)).not.toBeNull()
  })

  it('migrates schema-one completed check-ins without losing their completion state', () => {
    const storage = new MemoryStorage()
    const legacy = createSyntheticState()
    const state = {
      ...legacy,
      checkIns: legacy.checkIns.map(({ updatedAt: _updatedAt, completedAt: _completedAt, ...entry }) => entry),
    }
    storage.setItem(MODE_STORAGE_KEYS.demo, JSON.stringify({ schemaVersion: 1, mode: 'demo', createdAt: '2026-08-08T10:00:00.000Z', updatedAt: '2026-08-08T10:00:00.000Z', state }))

    const migrated = loadModeState(storage, 'demo')

    expect(migrated.checkIns[0].updatedAt).toBeTruthy()
    expect(migrated.checkIns[0].completedAt).toBeTruthy()
  })

  it('creates correction baselines when loading a pre-schema-three workspace', () => {
    const storage = new MemoryStorage()
    const current = createSyntheticState()
    const { progressionBaselines: _progressionBaselines, ...state } = current
    storage.setItem(MODE_STORAGE_KEYS.demo, JSON.stringify({ schemaVersion: 2, mode: 'demo', createdAt: '2026-08-08T10:00:00.000Z', updatedAt: '2026-08-08T10:00:00.000Z', state }))

    const migrated = loadModeState(storage, 'demo')

    expect(migrated.progressionBaselines).toHaveLength(migrated.progressions.length)
    expect(migrated.progressionBaselines[0].nextTargetReps).toEqual([8, 8, 8])
    expect(migrated.progressions[0].nextTargetReps).toEqual([12, 11, 11])
    expect(migrated.progressionBaselines).not.toBe(migrated.progressions)
  })

  it('migrates schema-three exercise results and saves a restorable pre-migration Personal backup', () => {
    const storage = new MemoryStorage()
    const initial = createPersonalState()
    const draft = startWorkoutDraft(initial, 'A', '2026-08-08')
    draft.results[0].sets = [{ weightKg: 12.5, reps: 10 }, { weightKg: 12.5, reps: 9 }, { weightKg: 12.5, reps: 8 }]
    const current = applyWorkoutCompletion(initial, draft)
    const legacyState = structuredClone(current) as unknown as Record<string, unknown>
    const workouts = legacyState.workouts as Array<Record<string, unknown>>
    workouts.forEach((workout) => {
      workout.results = (workout.results as Array<Record<string, unknown>>).map((result) => {
        const sets = result.sets as Array<{ weightKg: number; reps: number }>
        const { sets: _sets, ...rest } = result
        return { ...rest, weightKg: sets[0].weightKg, reps: sets.map((set) => set.reps) }
      })
    })
    storage.setItem(MODE_STORAGE_KEYS.personal, JSON.stringify({
      schemaVersion: 3,
      mode: 'personal',
      createdAt: '2026-08-08T10:00:00.000Z',
      updatedAt: '2026-08-08T10:00:00.000Z',
      state: legacyState,
    }))

    const migrated = loadModeState(storage, 'personal')
    const safetyCopy = parsePersonalBackup(storage.getItem(PRE_CHANGE_BACKUP_KEY)!)

    expect(migrated.workouts[0].results[0].sets).toEqual(current.workouts[0].results[0].sets)
    expect(safetyCopy.state.workouts[0].results[0].sets).toEqual(current.workouts[0].results[0].sets)
  })

  it('migrates schema-four exercises with primary and secondary muscle metadata', () => {
    const storage = new MemoryStorage()
    const current = createPersonalState()
    const legacyState = structuredClone(current) as unknown as Record<string, unknown>
    ;(legacyState.exercises as Array<Record<string, unknown>>).forEach((exercise) => {
      delete exercise.primaryMuscle
      delete exercise.secondaryMuscles
    })
    storage.setItem(MODE_STORAGE_KEYS.personal, JSON.stringify({
      schemaVersion: 4,
      mode: 'personal',
      createdAt: '2026-08-08T10:00:00.000Z',
      updatedAt: '2026-08-08T10:00:00.000Z',
      state: legacyState,
    }))

    const migrated = loadModeState(storage, 'personal')

    expect(migrated.exercises.find((exercise) => exercise.id === 'incline-press')).toMatchObject({
      primaryMuscle: 'chest',
      secondaryMuscles: ['front-shoulders', 'triceps'],
    })
    expect(storage.getItem(PRE_CHANGE_BACKUP_KEY)).not.toBeNull()
  })

  it('adds the broad exercise library to a prior Personal workspace without changing completed workouts', () => {
    const storage = new MemoryStorage()
    const current = createPersonalState()
    const draft = startWorkoutDraft(current, 'A', '2026-08-08')
    draft.results[0].sets = draft.results[0].sets.map((set) => ({ ...set, weightKg: 12.5, reps: 8 }))
    const completed = applyWorkoutCompletion(current, draft)
    const legacyExercises = completed.exercises.filter((exercise) => exercise.isDefault !== false)
    const legacyProgressions = completed.progressions.filter((progression) => legacyExercises.some((exercise) => exercise.id === progression.exerciseId))
    const legacyState = { ...completed, exercises: legacyExercises, progressions: legacyProgressions, progressionBaselines: legacyProgressions.map((progression) => ({ ...progression })) }
    storage.setItem(MODE_STORAGE_KEYS.personal, JSON.stringify({
      schemaVersion: 6,
      mode: 'personal',
      createdAt: '2026-08-08T10:00:00.000Z',
      updatedAt: '2026-08-08T10:00:00.000Z',
      state: legacyState,
    }))

    const migrated = loadModeState(storage, 'personal')

    expect(migrated.exercises).toHaveLength(createPersonalState().exercises.length)
    expect(migrated.exercises.find((exercise) => exercise.id === 'machine-chest-press')).toMatchObject({ isDefault: false, primaryMuscle: 'chest' })
    expect(migrated.progressions.find((progression) => progression.exerciseId === 'machine-chest-press')).toMatchObject({ currentWeightKg: 0, lastResult: 'No result yet' })
    expect(migrated.workouts).toEqual(completed.workouts)
    expect(storage.getItem(PRE_CHANGE_BACKUP_KEY)).not.toBeNull()
  })

  it('migrates legacy progressions to numeric 8-to-12 targets and saves a Personal safety copy', () => {
    const storage = new MemoryStorage()
    const current = createPersonalState()
    const legacyState = structuredClone(current) as unknown as Record<string, unknown>
    ;(legacyState.exercises as Array<Record<string, unknown>>).forEach((exercise) => delete exercise.repRange)
    for (const key of ['progressions', 'progressionBaselines']) {
      ;(legacyState[key] as Array<Record<string, unknown>>).forEach((progression) => delete progression.nextTargetReps)
    }
    storage.setItem(MODE_STORAGE_KEYS.personal, JSON.stringify({
      schemaVersion: 5,
      mode: 'personal',
      createdAt: '2026-08-08T10:00:00.000Z',
      updatedAt: '2026-08-08T10:00:00.000Z',
      state: legacyState,
    }))

    const migrated = loadModeState(storage, 'personal')

    expect(migrated.exercises[0].repRange).toEqual({ min: 8, max: 12 })
    expect(migrated.progressions[0].nextTargetReps).toEqual([8, 8, 8])
    expect(storage.getItem(PRE_CHANGE_BACKUP_KEY)).not.toBeNull()
  })
})
