import type { ExerciseResult, ExerciseSetResult, FitnessState } from './types'

interface LegacyExerciseResult extends Omit<ExerciseResult, 'sets'> {
  weightKg: number
  reps: Array<number | null>
}

export function completedExerciseSets(result: ExerciseResult) {
  return result.sets.filter((set): set is { weightKg: number; reps: number } => set.weightKg !== null && set.reps !== null)
}

export function hasCompletedExerciseSet(result: ExerciseResult) {
  return completedExerciseSets(result).length > 0
}

export function hasIncompleteStartedSet(result: ExerciseResult) {
  return result.sets.some((set) => set.reps !== null && set.weightKg === null)
}

export function migrateExerciseResult(result: ExerciseResult | LegacyExerciseResult): ExerciseResult {
  if (Array.isArray((result as ExerciseResult).sets)) {
    const current = result as ExerciseResult
    return {
      ...current,
      sets: current.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
    }
  }

  const { weightKg, reps, ...rest } = result as LegacyExerciseResult
  return {
    ...rest,
    sets: reps.map((setReps): ExerciseSetResult => ({ weightKg, reps: setReps })),
  }
}

export function migrateExerciseSetsInState(state: FitnessState): FitnessState {
  return {
    ...state,
    workouts: state.workouts.map((session) => ({
      ...session,
      results: session.results.map((result) => migrateExerciseResult(result)),
    })),
    draftWorkout: state.draftWorkout
      ? {
          ...state.draftWorkout,
          results: state.draftWorkout.results.map((result) => migrateExerciseResult(result)),
        }
      : undefined,
  }
}
