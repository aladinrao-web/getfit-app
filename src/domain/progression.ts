import type { Exercise, ExerciseProgression, FitnessState } from './types'

export const DEFAULT_REP_RANGE = { min: 8, max: 12 }

function isValidRepRange(value: unknown): value is Exercise['repRange'] {
  return Boolean(value
    && typeof value === 'object'
    && Number.isInteger((value as Exercise['repRange']).min)
    && Number.isInteger((value as Exercise['repRange']).max)
    && (value as Exercise['repRange']).min > 0
    && (value as Exercise['repRange']).max >= (value as Exercise['repRange']).min)
}

export function getRepRange(exercise: Exercise) {
  return isValidRepRange(exercise.repRange) ? exercise.repRange : DEFAULT_REP_RANGE
}

export function getSetCount(exercise: Exercise) {
  return exercise.targetReps.length
}

export function getMinimumRepTargets(exercise: Exercise) {
  return Array.from({ length: getSetCount(exercise) }, () => getRepRange(exercise).min)
}

export function getMaximumRepTargets(exercise: Exercise) {
  return Array.from({ length: getSetCount(exercise) }, () => getRepRange(exercise).max)
}

export function getNextTargetReps(progression: ExerciseProgression, exercise: Exercise) {
  const range = getRepRange(exercise)
  if (progression.nextTargetReps?.length === getSetCount(exercise)
    && progression.nextTargetReps.every((rep) => Number.isInteger(rep) && rep >= range.min && rep <= range.max)) {
    return progression.nextTargetReps
  }
  return getMinimumRepTargets(exercise)
}

export function formatRepTargets(reps: number[]) {
  return reps.join(' / ')
}

export function formatProgressionTarget(progression: Pick<ExerciseProgression, 'currentWeightKg' | 'nextTargetReps' | 'decision'>, exercise: Exercise) {
  const reps = formatRepTargets(getNextTargetReps(progression as ExerciseProgression, exercise))
  if (progression.currentWeightKg <= 0) return `Choose a starting load; aim for ${reps}`
  const immediate = `${progression.currentWeightKg} kg × ${reps}`
  const rebuildGoalReps = (progression as ExerciseProgression).rebuildGoalReps
  return rebuildGoalReps?.length
    ? `${immediate}; rebuild toward ${formatRepTargets(rebuildGoalReps)}`
    : immediate
}

export function migrateProgressionConfiguration(state: FitnessState): FitnessState {
  const exercises = state.exercises.map((exercise) => ({
    ...exercise,
    repRange: isValidRepRange(exercise.repRange) ? exercise.repRange : { ...DEFAULT_REP_RANGE },
  }))
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const migrate = (progression: ExerciseProgression) => {
    const exercise = exerciseById.get(progression.exerciseId)
    if (!exercise) return progression
    const nextTargetReps = getNextTargetReps(progression, exercise)
    const normalized = { ...progression, nextTargetReps }
    return progression.nextTargetReps?.length === exercise.targetReps.length
      ? normalized
      : { ...normalized, nextTarget: formatProgressionTarget(normalized, exercise) }
  }

  return {
    ...state,
    exercises,
    progressionBaselines: state.progressionBaselines.map(migrate),
    progressions: state.progressions.map(migrate),
  }
}
