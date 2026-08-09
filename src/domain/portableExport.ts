import { strToU8, zipSync, type Zippable } from 'fflate'
import { createPersonalBackup, PERSONAL_BACKUP_SCHEMA_VERSION, serializePersonalBackup } from './backup'
import type { Exercise, FitnessState, WorkoutCode } from './types'

export const PORTABLE_EXPORT_SCHEMA_VERSION = 1

const fileNames = {
  backup: 'personal-backup.json',
  weights: 'weights.csv',
  workouts: 'workouts.csv',
  progressions: 'progression.csv',
  manifest: 'manifest.json',
} as const

export interface PortableExportManifest {
  exportSchemaVersion: typeof PORTABLE_EXPORT_SCHEMA_VERSION
  backupSchemaVersion: typeof PERSONAL_BACKUP_SCHEMA_VERSION
  sourceMode: 'personal'
  exportedAt: string
  recordCounts: {
    checkIns: number
    weightEntries: number
    workoutSessions: number
    workoutResults: number
    exercises: number
    progressionTargets: number
    draftWorkout: number
  }
  files: Array<{
    name: string
    mediaType: 'application/json' | 'text/csv'
    recordCount: number
  }>
}

export interface PortableSnapshot {
  archiveFilename: string
  exportedAt: string
  manifest: PortableExportManifest
  files: Record<string, string>
}

type CsvValue = string | number | boolean | null | undefined

function safeText(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n')
  return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized
}

function csvCell(value: CsvValue) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  const text = safeText(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function createCsv(headers: string[], rows: CsvValue[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

function safeTimestamp(exportedAt: string) {
  return exportedAt.replaceAll(':', '-').replaceAll('.', '-')
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, 'en')
}

function exerciseOrder(exercise: Exercise) {
  const workoutOrder: Record<WorkoutCode, number> = { A: 0, B: 1, C: 2 }
  return workoutOrder[exercise.workout] * 1000 + exercise.order
}

function createWeightsCsv(state: FitnessState) {
  const rows = state.checkIns
    .filter((entry) => entry.weightKg !== undefined)
    .sort((left, right) => compareText(left.date, right.date) || compareText(left.id, right.id))
    .map((entry) => [
      entry.id,
      entry.date,
      entry.weightKg,
      entry.completedAt ? 'complete' : 'in_progress',
      entry.updatedAt,
      entry.completedAt ?? '',
    ])

  return {
    rows,
    csv: createCsv(['check_in_id', 'date', 'weight_kg', 'check_in_status', 'updated_at', 'completed_at'], rows),
  }
}

function createWorkoutsCsv(state: FitnessState) {
  const exercises = new Map(state.exercises.map((exercise) => [exercise.id, exercise]))
  const rows = [...state.workouts]
    .sort((left, right) => compareText(left.date, right.date) || compareText(left.completedAt, right.completedAt) || compareText(left.id, right.id))
    .flatMap((session) => session.results
      .map((result, resultIndex) => ({ result, resultIndex, exercise: exercises.get(result.exerciseId) }))
      .sort((left, right) => (left.exercise?.order ?? left.resultIndex) - (right.exercise?.order ?? right.resultIndex))
      .map(({ result, exercise }) => [
        session.id,
        session.date,
        session.workout,
        session.completedAt,
        result.exerciseId,
        exercise?.name ?? result.exerciseId,
        exercise?.order ?? '',
        result.weightKg,
        result.reps[0] ?? '',
        result.reps[1] ?? '',
        result.reps[2] ?? '',
        result.reps.map((rep) => rep ?? '').join('|'),
        result.skipped ?? false,
        result.decision,
        result.limitingFactor,
        result.formNotes,
        session.sessionNotes,
      ]))

  return {
    rows,
    csv: createCsv([
      'session_id',
      'date',
      'workout_code',
      'completed_at',
      'exercise_id',
      'exercise_name',
      'exercise_order',
      'weight_kg',
      'set_1_reps',
      'set_2_reps',
      'set_3_reps',
      'all_reps',
      'skipped',
      'decision',
      'limiting_factor',
      'form_notes',
      'session_notes',
    ], rows),
  }
}

function createProgressionCsv(state: FitnessState) {
  const exercises = new Map(state.exercises.map((exercise) => [exercise.id, exercise]))
  const rows = state.progressions
    .map((progression) => ({ progression, exercise: exercises.get(progression.exerciseId) }))
    .sort((left, right) => {
      if (left.exercise && right.exercise) return exerciseOrder(left.exercise) - exerciseOrder(right.exercise)
      if (left.exercise) return -1
      if (right.exercise) return 1
      return compareText(left.progression.exerciseId, right.progression.exerciseId)
    })
    .map(({ progression, exercise }) => [
      progression.exerciseId,
      exercise?.name ?? progression.exerciseId,
      exercise?.workout ?? '',
      exercise?.order ?? '',
      exercise?.targetReps.join('|') ?? '',
      progression.currentWeightKg,
      progression.incrementKg,
      progression.lastResult,
      progression.nextTarget,
      progression.decision,
      progression.limitingFactor,
      progression.notes,
    ])

  return {
    rows,
    csv: createCsv([
      'exercise_id',
      'exercise_name',
      'workout_code',
      'exercise_order',
      'target_reps',
      'current_weight_kg',
      'increment_kg',
      'last_result',
      'next_target',
      'decision',
      'limiting_factor',
      'notes',
    ], rows),
  }
}

export function createPortableSnapshot(state: FitnessState, exportedAt = new Date().toISOString()): PortableSnapshot {
  if (Number.isNaN(Date.parse(exportedAt))) throw new Error('The export timestamp is invalid.')

  const backup = createPersonalBackup(state, exportedAt)
  const weights = createWeightsCsv(state)
  const workouts = createWorkoutsCsv(state)
  const progressions = createProgressionCsv(state)
  const manifest: PortableExportManifest = {
    exportSchemaVersion: PORTABLE_EXPORT_SCHEMA_VERSION,
    backupSchemaVersion: PERSONAL_BACKUP_SCHEMA_VERSION,
    sourceMode: 'personal',
    exportedAt,
    recordCounts: {
      checkIns: state.checkIns.length,
      weightEntries: weights.rows.length,
      workoutSessions: state.workouts.length,
      workoutResults: workouts.rows.length,
      exercises: state.exercises.length,
      progressionTargets: state.progressions.length,
      draftWorkout: state.draftWorkout ? 1 : 0,
    },
    files: [
      { name: fileNames.backup, mediaType: 'application/json', recordCount: 1 },
      { name: fileNames.weights, mediaType: 'text/csv', recordCount: weights.rows.length },
      { name: fileNames.workouts, mediaType: 'text/csv', recordCount: workouts.rows.length },
      { name: fileNames.progressions, mediaType: 'text/csv', recordCount: progressions.rows.length },
    ],
  }
  const files = {
    [fileNames.backup]: serializePersonalBackup(backup),
    [fileNames.weights]: weights.csv,
    [fileNames.workouts]: workouts.csv,
    [fileNames.progressions]: progressions.csv,
    [fileNames.manifest]: JSON.stringify(manifest, null, 2),
  }

  return {
    archiveFilename: `getfit-portable-snapshot-${safeTimestamp(exportedAt)}.zip`,
    exportedAt,
    manifest,
    files,
  }
}

export function serializePortableSnapshot(snapshot: PortableSnapshot) {
  const entries: Zippable = {}
  const mtime = new Date(snapshot.exportedAt)
  Object.entries(snapshot.files).forEach(([name, contents]) => {
    entries[name] = [strToU8(contents), { mtime }]
  })
  return zipSync(entries, { level: 6 })
}
