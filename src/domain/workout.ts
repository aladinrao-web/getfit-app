import type { DraftWorkout, Exercise, ExerciseProgression, ExerciseResult, FitnessState, ProgressionDecision, WorkoutCode } from './types'
import { createRecordId } from './ids'

const cycle: WorkoutCode[] = ['A', 'B', 'C']

export function getNextWorkoutCode(state: FitnessState): WorkoutCode {
  const latest = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latest) return 'A'
  return cycle[(cycle.indexOf(latest.workout) + 1) % cycle.length]
}

export function startWorkoutDraft(state: FitnessState, code: WorkoutCode, date: string, sessionId = createRecordId('session')): DraftWorkout {
  const exercises = state.exercises.filter((exercise) => exercise.workout === code).sort((a, b) => a.order - b.order)
  const results = exercises.map((exercise) => {
    const progression = state.progressions.find((item) => item.exerciseId === exercise.id)
    return {
      exerciseId: exercise.id,
      weightKg: progression?.currentWeightKg ?? 0,
      reps: exercise.targetReps.map(() => null),
      limitingFactor: '',
      formNotes: '',
      decision: progression?.decision ?? 'Repeat',
    } satisfies ExerciseResult
  })

  return {
    id: sessionId,
    date,
    workout: code,
    results,
    sessionNotes: '',
  }
}

export function formatExerciseResult(result: ExerciseResult) {
  const reps = result.reps.filter((value): value is number => value !== null)
  return `${result.weightKg} kg × ${reps.length ? reps.join(' / ') : 'not reported'}`
}

function nextTargetFor(decision: ProgressionDecision, result: ExerciseResult, progression: ExerciseProgression, exercise: Exercise) {
  const target = exercise.targetReps.join(' / ')
  if (decision === 'Increase') return `${result.weightKg + progression.incrementKg} kg × ${target}`
  if (decision === 'Deload') return `${Math.max(0, result.weightKg - progression.incrementKg)} kg × ${target} with clean form`
  if (decision === 'Technique focus') return `${result.weightKg} kg × ${target} with technique as the priority`
  return `${result.weightKg} kg × ${target}`
}

export function applyWorkoutCompletion(state: FitnessState, draft: DraftWorkout, completedAt = new Date().toISOString()): FitnessState {
  const completedResults = draft.results.filter((result) => !result.skipped && result.reps.some((value) => value !== null))
  if (!completedResults.length) return state

  const existingIndex = state.workouts.findIndex((workout) => workout.id === draft.id)
  const existingSession = existingIndex >= 0 ? state.workouts[existingIndex] : undefined
  const completedSession = {
    id: draft.id,
    date: draft.date,
    workout: draft.workout,
    results: completedResults,
    sessionNotes: draft.sessionNotes,
    completedAt: existingSession?.completedAt ?? completedAt,
  }
  const workouts = [...state.workouts]
  if (existingIndex >= 0) workouts[existingIndex] = completedSession
  else workouts.push(completedSession)

  const progressions = state.progressions.map((progression) => {
    const result = completedResults.find((item) => item.exerciseId === progression.exerciseId)
    const exercise = state.exercises.find((item) => item.id === progression.exerciseId)
    if (!result || !exercise) return progression
    return {
      ...progression,
      currentWeightKg:
        result.decision === 'Increase'
          ? result.weightKg + progression.incrementKg
          : result.decision === 'Deload'
            ? Math.max(0, result.weightKg - progression.incrementKg)
            : result.weightKg,
      lastResult: formatExerciseResult(result),
      nextTarget: nextTargetFor(result.decision, result, progression, exercise),
      limitingFactor: result.limitingFactor,
      decision: result.decision,
      notes: result.formNotes || progression.notes,
    }
  })

  return { ...state, workouts, progressions, draftWorkout: undefined }
}
