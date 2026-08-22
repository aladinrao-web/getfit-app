import type { DraftWorkout, Exercise, ExerciseProgression, ExerciseResult, FitnessState, ProgressionDecision, WorkoutCode, WorkoutSession } from './types'
import { createRecordId } from './ids'
import { completedExerciseSets, hasCompletedExerciseSet } from './exerciseSets'

const cycle: WorkoutCode[] = ['A', 'B', 'C']

function draftResultForExercise(state: FitnessState, exercise: Exercise): ExerciseResult {
  const progression = state.progressions.find((item) => item.exerciseId === exercise.id)
  return {
    exerciseId: exercise.id,
    sets: exercise.targetReps.map(() => ({ weightKg: progression?.currentWeightKg ?? 0, reps: null })),
    limitingFactor: '',
    formNotes: '',
    decision: progression?.decision ?? 'Repeat',
  }
}

export function getNextWorkoutCode(state: FitnessState): WorkoutCode {
  const latest = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latest) return 'A'
  return cycle[(cycle.indexOf(latest.workout) + 1) % cycle.length]
}

export function startWorkoutDraft(state: FitnessState, code: WorkoutCode, date: string, sessionId = createRecordId('session')): DraftWorkout {
  const exercises = state.exercises.filter((exercise) => exercise.workout === code).sort((a, b) => a.order - b.order)
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

function referenceWeight(result: ExerciseResult) {
  return completedExerciseSets(result)[0]?.weightKg ?? 0
}

function nextTargetFor(decision: ProgressionDecision, result: ExerciseResult, progression: ExerciseProgression, exercise: Exercise) {
  const target = exercise.targetReps.join(' / ')
  const weightKg = referenceWeight(result)
  if (decision === 'Increase') return `${weightKg + progression.incrementKg} kg × ${target}`
  if (decision === 'Deload') return `${Math.max(0, weightKg - progression.incrementKg)} kg × ${target} with clean form`
  if (decision === 'Technique focus') return `${weightKg} kg × ${target} with technique as the priority`
  return `${weightKg} kg × ${target}`
}

function progressionFromResult(result: ExerciseResult, progression: ExerciseProgression, exercise: Exercise): ExerciseProgression {
  const weightKg = referenceWeight(result)
  return {
    ...progression,
    currentWeightKg:
      result.decision === 'Increase'
        ? weightKg + progression.incrementKg
        : result.decision === 'Deload'
          ? Math.max(0, weightKg - progression.incrementKg)
          : weightKg,
    lastResult: formatExerciseResult(result),
    nextTarget: nextTargetFor(result.decision, result, progression, exercise),
    limitingFactor: result.limitingFactor,
    decision: result.decision,
    notes: result.formNotes || progression.notes,
  }
}

function latestResultFor(state: FitnessState, exerciseId: string) {
  return state.workouts
    .flatMap((session) => session.results
      .filter((result) => result.exerciseId === exerciseId)
      .map((result) => ({ session, result })))
    .sort((a, b) => b.session.date.localeCompare(a.session.date) || b.session.completedAt.localeCompare(a.session.completedAt))[0]
}

export function recomputeProgressions(state: FitnessState, affectedExerciseIds: Iterable<string>): FitnessState {
  const affected = new Set(affectedExerciseIds)
  if (!affected.size) return state

  const progressions = state.progressions.map((progression) => {
    if (!affected.has(progression.exerciseId)) return progression
    const baseline = state.progressionBaselines.find((item) => item.exerciseId === progression.exerciseId) ?? progression
    const exercise = state.exercises.find((item) => item.id === progression.exerciseId)
    const latest = latestResultFor(state, progression.exerciseId)
    if (!latest || !exercise) return { ...baseline }
    return progressionFromResult(latest.result, baseline, exercise)
  })

  return { ...state, progressions }
}

export function correctWorkoutSession(state: FitnessState, corrected: WorkoutSession): FitnessState {
  const existingIndex = state.workouts.findIndex((session) => session.id === corrected.id)
  if (existingIndex < 0 || !corrected.results.length) return state
  const existing = state.workouts[existingIndex]
  const workouts = [...state.workouts]
  workouts[existingIndex] = { ...corrected, completedAt: existing.completedAt }
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
    .map((result) => ({ ...result, sets: completedExerciseSets(result) }))
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
