import type { DraftWorkout, Exercise, ExerciseProgression, ExerciseResult, FitnessState, ProgressionDecision, WorkoutCode, WorkoutSession } from './types'
import { createRecordId } from './ids'
import { completedExerciseSets, hasCompletedExerciseSet } from './exerciseSets'
import { formatProgressionTarget, getMaximumRepTargets, getMinimumRepTargets, getRepRange } from './progression'

const cycle: WorkoutCode[] = ['A', 'B', 'C']

function draftResultForExercise(state: FitnessState, exercise: Exercise): ExerciseResult {
  const progression = state.progressions.find((item) => item.exerciseId === exercise.id)
  return {
    exerciseId: exercise.id,
    sets: exercise.targetReps.map(() => ({ weightKg: progression?.currentWeightKg ?? 0, reps: null })),
    limitingFactor: '',
    formNotes: '',
    decision: 'Repeat',
  }
}

export function getNextWorkoutCode(state: FitnessState): WorkoutCode {
  const latest = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latest) return 'A'
  return cycle[(cycle.indexOf(latest.workout) + 1) % cycle.length]
}

export function startWorkoutDraft(state: FitnessState, code: WorkoutCode, date: string, sessionId = createRecordId('session')): DraftWorkout {
  const exercises = state.exercises
    .filter((exercise) => exercise.workout === code && exercise.isDefault !== false)
    .sort((a, b) => a.order - b.order)
  const results = exercises.map((exercise) => draftResultForExercise(state, exercise))

  return {
    id: sessionId,
    date,
    workout: code,
    results,
    sessionNotes: '',
  }
}

export function addDraftExercise(state: FitnessState, draft: DraftWorkout, exerciseId: string): DraftWorkout {
  if (draft.results.some((result) => result.exerciseId === exerciseId)) return draft
  const exercise = state.exercises.find((item) => item.id === exerciseId)
  if (!exercise) return draft
  return { ...draft, results: [...draft.results, draftResultForExercise(state, exercise)] }
}

export function replaceDraftExercise(state: FitnessState, draft: DraftWorkout, currentExerciseId: string, nextExerciseId: string): DraftWorkout {
  if (currentExerciseId === nextExerciseId || draft.results.some((result) => result.exerciseId === nextExerciseId)) return draft
  const currentExercise = state.exercises.find((item) => item.id === currentExerciseId)
  const nextExercise = state.exercises.find((item) => item.id === nextExerciseId)
  if (!currentExercise || !nextExercise || currentExercise.primaryMuscle !== nextExercise.primaryMuscle) return draft
  return {
    ...draft,
    results: draft.results.map((result) => result.exerciseId === currentExerciseId ? draftResultForExercise(state, nextExercise) : result),
  }
}

export function removeDraftExercise(draft: DraftWorkout, exerciseId: string): DraftWorkout {
  if (draft.results.length <= 1 || !draft.results.some((result) => result.exerciseId === exerciseId)) return draft
  return { ...draft, results: draft.results.filter((result) => result.exerciseId !== exerciseId) }
}

export function moveDraftExercise(draft: DraftWorkout, exerciseId: string, direction: -1 | 1): DraftWorkout {
  const currentIndex = draft.results.findIndex((result) => result.exerciseId === exerciseId)
  const nextIndex = currentIndex + direction
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= draft.results.length) return draft
  const results = [...draft.results]
  const currentResult = results[currentIndex]
  results[currentIndex] = results[nextIndex]
  results[nextIndex] = currentResult
  return { ...draft, results }
}

export function formatExerciseResult(result: ExerciseResult) {
  const sets = completedExerciseSets(result)
  if (!sets.length) return 'Not reported'

  const groups = sets.reduce<Array<{ weightKg: number; reps: number[] }>>((all, set) => {
    const latest = all.at(-1)
    if (latest?.weightKg === set.weightKg) latest.reps.push(set.reps)
    else all.push({ weightKg: set.weightKg, reps: [set.reps] })
    return all
  }, [])

  return groups.map((group) => `${group.weightKg} kg × ${group.reps.join(' / ')}`).join(' · ')
}

export function hasCompleteWorkingSets(result: ExerciseResult, exercise: Exercise) {
  const sets = completedExerciseSets(result)
  return sets.length === exercise.targetReps.length
    && sets.every((set) => Number.isFinite(set.weightKg) && set.weightKg > 0 && Number.isInteger(set.reps) && set.reps >= 0)
}

export function progressionDecisionFor(result: ExerciseResult, exercise: Exercise): ProgressionDecision {
  if (!hasCompleteWorkingSets(result, exercise)) return 'Repeat'
  const reps = completedExerciseSets(result).map((set) => set.reps)
  const range = getRepRange(exercise)
  if (reps.some((rep) => rep < range.min)) return 'Deload'
  if (reps.every((rep) => rep >= range.max)) return 'Increase'
  return 'Repeat'
}

function progressionFromResult(result: ExerciseResult, progression: ExerciseProgression, exercise: Exercise): ExerciseProgression {
  const sets = completedExerciseSets(result)
  const weightKg = sets[0]?.weightKg ?? progression.currentWeightKg
  const decision = progressionDecisionFor(result, exercise)
  const nextTargetReps = decision === 'Increase' || decision === 'Deload'
    ? getMinimumRepTargets(exercise)
    : sets.map((set) => Math.min(getRepRange(exercise).max, Math.max(getRepRange(exercise).min, set.reps + 1)))
  const currentWeightKg = decision === 'Increase'
    ? weightKg + progression.incrementKg
    : decision === 'Deload'
      ? Math.max(0, weightKg - progression.incrementKg)
      : weightKg
  const rebuildGoalReps = decision === 'Deload'
    ? getMaximumRepTargets(exercise)
    : decision === 'Increase' || weightKg !== progression.currentWeightKg
      ? undefined
      : progression.rebuildGoalReps
  const next = { ...progression, currentWeightKg, nextTargetReps, rebuildGoalReps, decision }

  return {
    ...next,
    lastResult: formatExerciseResult(result),
    nextTarget: formatProgressionTarget(next, exercise),
    limitingFactor: result.limitingFactor,
    notes: result.formNotes || progression.notes,
  }
}

function progressionHistoryFor(state: FitnessState, exerciseId: string) {
  const exercise = state.exercises.find((item) => item.id === exerciseId)
  if (!exercise) return []
  return state.workouts
    .flatMap((session) => session.results
      .filter((result) => result.exerciseId === exerciseId && hasCompleteWorkingSets(result, exercise))
      .map((result) => ({ session, result })))
    .sort((a, b) => a.session.date.localeCompare(b.session.date) || a.session.completedAt.localeCompare(b.session.completedAt))
}

export function recomputeProgressions(state: FitnessState, affectedExerciseIds: Iterable<string>): FitnessState {
  const affected = new Set(affectedExerciseIds)
  if (!affected.size) return state

  const progressions = state.progressions.map((progression) => {
    if (!affected.has(progression.exerciseId)) return progression
    const baseline = state.progressionBaselines.find((item) => item.exerciseId === progression.exerciseId) ?? progression
    const exercise = state.exercises.find((item) => item.id === progression.exerciseId)
    const history = progressionHistoryFor(state, progression.exerciseId)
    if (!history.length || !exercise) return { ...baseline }
    return history.reduce((current, entry) => progressionFromResult(entry.result, current, exercise), baseline)
  })

  return { ...state, progressions }
}

export function correctWorkoutSession(state: FitnessState, corrected: WorkoutSession): FitnessState {
  const existingIndex = state.workouts.findIndex((session) => session.id === corrected.id)
  if (existingIndex < 0 || !corrected.results.length) return state
  const existing = state.workouts[existingIndex]
  const workouts = [...state.workouts]
  workouts[existingIndex] = {
    ...corrected,
    completedAt: existing.completedAt,
    results: corrected.results.map((result) => {
      const exercise = state.exercises.find((item) => item.id === result.exerciseId)
      return exercise ? { ...result, decision: progressionDecisionFor(result, exercise) } : result
    }),
  }
  return recomputeProgressions(
    { ...state, workouts },
    [...existing.results, ...corrected.results].map((result) => result.exerciseId),
  )
}

export function deleteWorkoutSession(state: FitnessState, sessionId: string): FitnessState {
  const existing = state.workouts.find((session) => session.id === sessionId)
  if (!existing) return state
  return recomputeProgressions(
    { ...state, workouts: state.workouts.filter((session) => session.id !== sessionId) },
    existing.results.map((result) => result.exerciseId),
  )
}

export function applyWorkoutCompletion(state: FitnessState, draft: DraftWorkout, completedAt = new Date().toISOString()): FitnessState {
  const completedResults = draft.results
    .filter((result) => !result.skipped && hasCompletedExerciseSet(result))
    .map((result) => {
      const exercise = state.exercises.find((item) => item.id === result.exerciseId)
      const completed = { ...result, sets: completedExerciseSets(result) }
      return exercise ? { ...completed, decision: progressionDecisionFor(completed, exercise) } : completed
    })
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
  const affectedExerciseIds = [
    ...(existingSession?.results ?? []),
    ...completedResults,
  ].map((result) => result.exerciseId)

  return recomputeProgressions({ ...state, workouts, draftWorkout: undefined }, affectedExerciseIds)
}
