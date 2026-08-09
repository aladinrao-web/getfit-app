import type { FitnessState } from './types'

export const PERSONAL_BACKUP_SCHEMA_VERSION = 1

export interface PersonalBackupCounts {
  checkIns: number
  workouts: number
  exercises: number
  progressions: number
  draftWorkout: number
}

export interface PersonalBackup {
  backupSchemaVersion: typeof PERSONAL_BACKUP_SCHEMA_VERSION
  sourceMode: 'personal'
  exportedAt: string
  recordCounts: PersonalBackupCounts
  state: FitnessState
}

function countsFor(state: FitnessState): PersonalBackupCounts {
  return {
    checkIns: state.checkIns.length,
    workouts: state.workouts.length,
    exercises: state.exercises.length,
    progressions: state.progressions.length,
    draftWorkout: state.draftWorkout ? 1 : 0,
  }
}

function hasArray(value: unknown, key: string): value is Record<string, unknown[]> {
  return Boolean(value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>)[key]))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasUniqueStrings(items: unknown[], key: string) {
  const values = items.map((item) => isRecord(item) ? item[key] : undefined)
  return values.every((value) => typeof value === 'string') && new Set(values).size === values.length
}

function validateState(value: unknown): asserts value is FitnessState {
  if (!isRecord(value)) throw new Error('This file does not contain a fitness state.')
  const requiredArrays = ['mealPresets', 'foodLibrary', 'checkIns', 'exercises', 'progressionBaselines', 'progressions', 'workouts']
  if (requiredArrays.some((key) => !hasArray(value, key))) throw new Error('This backup is missing required fitness data.')
  const profile = value.profile
  if (!isRecord(profile)) throw new Error('This backup is missing its profile.')
  const profileStrings = ['name', 'timezone', 'allergen']
  const profileNumbers = ['startingWeightKg', 'currentWeightKg', 'goalWeightKg', 'proteinFloorMultiplier', 'proteinTargetMultiplier', 'weeklyGainMin', 'weeklyGainMax', 'calorieAdjustment']
  if (profileStrings.some((key) => typeof profile[key] !== 'string') || profileNumbers.some((key) => !isFiniteNumber(profile[key]))) {
    throw new Error('This backup has an invalid profile.')
  }

  const exercises = value.exercises as unknown[]
  if (!hasUniqueStrings(exercises, 'id') || exercises.some((exercise) => !isRecord(exercise)
    || !['A', 'B', 'C'].includes(String(exercise.workout))
    || typeof exercise.name !== 'string'
    || !Array.isArray(exercise.targetReps)
    || exercise.targetReps.some((rep) => !isFiniteNumber(rep)))) {
    throw new Error('This backup has invalid exercise configuration.')
  }

  const exerciseIds = new Set(exercises.map((exercise) => (exercise as Record<string, unknown>).id))
  for (const key of ['progressionBaselines', 'progressions'] as const) {
    const progressions = value[key] as unknown[]
    if (!hasUniqueStrings(progressions, 'exerciseId') || progressions.some((progression) => !isRecord(progression)
      || !exerciseIds.has(progression.exerciseId)
      || !isFiniteNumber(progression.currentWeightKg)
      || !isFiniteNumber(progression.incrementKg)
      || !['Increase', 'Repeat', 'Deload', 'Technique focus'].includes(String(progression.decision)))) {
      throw new Error('This backup has invalid progression data.')
    }
  }

  const workouts = value.workouts as unknown[]
  if (!hasUniqueStrings(workouts, 'id') || workouts.some((workout) => !isRecord(workout)
    || typeof workout.date !== 'string'
    || typeof workout.completedAt !== 'string'
    || !Array.isArray(workout.results)
    || workout.results.some((result) => !isRecord(result)
      || !exerciseIds.has(result.exerciseId)
      || !isFiniteNumber(result.weightKg)
      || !Array.isArray(result.reps)
      || result.reps.some((rep) => rep !== null && !isFiniteNumber(rep))))) {
    throw new Error('This backup has invalid workout history.')
  }

  const checkIns = value.checkIns as unknown[]
  if (!hasUniqueStrings(checkIns, 'id') || checkIns.some((entry) => !isRecord(entry)
    || typeof entry.date !== 'string'
    || !isFiniteNumber(entry.extrasProteinG)
    || !isFiniteNumber(entry.extrasCalories))) {
    throw new Error('This backup has invalid check-in history.')
  }
}

export function parsePersonalState(value: unknown): FitnessState {
  validateState(value)
  return structuredClone(value)
}

export function createPersonalBackup(state: FitnessState, exportedAt = new Date().toISOString()): PersonalBackup {
  return {
    backupSchemaVersion: PERSONAL_BACKUP_SCHEMA_VERSION,
    sourceMode: 'personal',
    exportedAt,
    recordCounts: countsFor(state),
    state: structuredClone(state),
  }
}

export function serializePersonalBackup(backup: PersonalBackup) {
  return JSON.stringify(backup, null, 2)
}

export function parsePersonalBackup(raw: string): PersonalBackup {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('Choose a valid JSON backup file.')
  }

  if (!value || typeof value !== 'object') throw new Error('This file is not a Personal backup.')
  const candidate = value as Partial<PersonalBackup>
  if (candidate.backupSchemaVersion !== PERSONAL_BACKUP_SCHEMA_VERSION) {
    throw new Error('This backup version is not supported by this app build.')
  }
  if (candidate.sourceMode !== 'personal') throw new Error('Only Personal workspace backups can be restored here.')
  if (!candidate.exportedAt || Number.isNaN(Date.parse(candidate.exportedAt))) throw new Error('This backup has an invalid export timestamp.')
  validateState(candidate.state)

  const actualCounts = countsFor(candidate.state)
  const expectedCounts = candidate.recordCounts
  if (!expectedCounts || Object.entries(actualCounts).some(([key, count]) => expectedCounts[key as keyof PersonalBackupCounts] !== count)) {
    throw new Error('This backup failed its record-count integrity check.')
  }

  return candidate as PersonalBackup
}
