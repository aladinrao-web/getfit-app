import { describe, expect, it } from 'vitest'
import { createPersonalState, createSyntheticState, DEMO_TODAY } from '../data/seed'
import { addDraftExercise, applyWorkoutCompletion, correctWorkoutSession, deleteWorkoutSession, moveDraftExercise, removeDraftExercise, replaceDraftExercise, startWorkoutDraft } from './workout'
import { hasIncompleteStartedSet } from './exerciseSets'

describe('workout draft exercises', () => {
  it('adjusts a draft without changing the saved A/B/C exercise assignments', () => {
    const state = createPersonalState()
    const draft = startWorkoutDraft(state, 'A', DEMO_TODAY)
    const originalAssignments = state.exercises.map((exercise) => ({ id: exercise.id, workout: exercise.workout, order: exercise.order }))

    const added = addDraftExercise(state, draft, 'shoulder-press')
    const moved = moveDraftExercise(added, 'shoulder-press', -1)
    const removed = removeDraftExercise(moved, 'pec-deck')

    expect(added.results.at(-1)).toMatchObject({
      exerciseId: 'shoulder-press',
      decision: state.progressions.find((item) => item.exerciseId === 'shoulder-press')?.decision,
    })
    expect(added.results.at(-1)?.sets).toEqual(state.exercises.find((item) => item.id === 'shoulder-press')?.targetReps.map(() => ({
      weightKg: state.progressions.find((item) => item.exerciseId === 'shoulder-press')?.currentWeightKg,
      reps: null,
    })))
    expect(moved.results.at(-2)?.exerciseId).toBe('shoulder-press')
    expect(removed.results.some((result) => result.exerciseId === 'pec-deck')).toBe(false)
    expect(state.exercises.map((exercise) => ({ id: exercise.id, workout: exercise.workout, order: exercise.order }))).toEqual(originalAssignments)
  })

  it('replaces only with an unused exercise for the same primary muscle', () => {
    const state = createPersonalState()
    const draft = startWorkoutDraft(state, 'A', DEMO_TODAY)

    const withoutCableFly = removeDraftExercise(draft, 'cable-fly')
    const replaced = replaceDraftExercise(state, withoutCableFly, 'pec-deck', 'cable-fly')
    const wrongMuscle = replaceDraftExercise(state, draft, 'pec-deck', 'leg-extension')
    const duplicate = replaceDraftExercise(state, draft, 'pec-deck', 'incline-press')

    expect(replaced.results.some((result) => result.exerciseId === 'pec-deck')).toBe(false)
    expect(replaced.results.some((result) => result.exerciseId === 'cable-fly')).toBe(true)
    expect(wrongMuscle).toBe(draft)
    expect(duplicate).toBe(draft)
  })

  it('prevents duplicate additions and keeps at least one draft exercise', () => {
    const state = createPersonalState()
    const draft = startWorkoutDraft(state, 'A', DEMO_TODAY)
    const duplicate = addDraftExercise(state, draft, draft.results[0].exerciseId)
    const single = { ...draft, results: [draft.results[0]] }

    expect(duplicate).toBe(draft)
    expect(removeDraftExercise(single, single.results[0].exerciseId)).toBe(single)
  })

  it('commits a cross-theme addition against its own progression without changing its default theme', () => {
    const state = createPersonalState()
    const draft = addDraftExercise(state, startWorkoutDraft(state, 'A', DEMO_TODAY), 'shoulder-press')
    const added = draft.results.find((result) => result.exerciseId === 'shoulder-press')!
    added.sets = added.sets.map((set) => ({ ...set, reps: 9 }))
    added.decision = 'Increase'

    const completed = applyWorkoutCompletion(state, draft)

    expect(completed.workouts.at(-1)).toMatchObject({ workout: 'A' })
    expect(completed.workouts.at(-1)?.results.some((result) => result.exerciseId === 'shoulder-press')).toBe(true)
    expect(completed.progressions.find((item) => item.exerciseId === 'shoulder-press')?.decision).toBe('Repeat')
    expect(completed.exercises.find((exercise) => exercise.id === 'shoulder-press')?.workout).toBe('B')
  })
})

describe('workout completion', () => {
  it('does not commit a draft with no recorded reps', () => {
    const state = createSyntheticState()
    const draft = startWorkoutDraft(state, 'A', DEMO_TODAY)
    expect(applyWorkoutCompletion(state, draft)).toBe(state)
    expect(draft.results.some(hasIncompleteStartedSet)).toBe(false)
  })

  it('commits completed exercises and updates matching progression', () => {
    const state = createSyntheticState()
    const draft = startWorkoutDraft(state, 'A', DEMO_TODAY)
    draft.results[0].sets = draft.results[0].sets.map((set) => ({ ...set, reps: 12 }))
    draft.results[0].decision = 'Increase'
    const next = applyWorkoutCompletion(state, draft)
    expect(next.workouts).toHaveLength(state.workouts.length + 1)
    expect(next.workouts.at(-1)?.results).toHaveLength(1)
    expect(next.progressions.find((item) => item.exerciseId === draft.results[0].exerciseId)?.decision).toBe('Increase')
  })

  it('upserts the same session rather than duplicating it', () => {
    const state = createSyntheticState()
    const draft = startWorkoutDraft(state, 'B', DEMO_TODAY)
    draft.results[0].sets = draft.results[0].sets.map((set) => ({ ...set, reps: 9 }))
    const once = applyWorkoutCompletion(state, draft, '2026-08-08T10:00:00.000Z')
    const twice = applyWorkoutCompletion(once, draft, '2026-08-08T10:05:00.000Z')
    expect(twice.workouts).toHaveLength(once.workouts.length)
    expect(twice.workouts.filter((item) => item.id === draft.id)).toHaveLength(1)
    expect(twice.workouts.find((item) => item.id === draft.id)?.completedAt).toBe('2026-08-08T10:00:00.000Z')
  })
})

describe('workout corrections', () => {
  function completedWorkout(state: ReturnType<typeof createPersonalState>, date: string, weightKg: number, reps = [10, 10, 10]) {
    const draft = startWorkoutDraft(state, 'A', date, `session-${date}`)
    draft.results[0] = { ...draft.results[0], sets: reps.map((setReps) => ({ weightKg, reps: setReps })) }
    return applyWorkoutCompletion(state, draft, `${date}T10:00:00.000Z`)
  }

  it('keeps a later result authoritative when an older session is corrected', () => {
    const first = completedWorkout(createPersonalState(), '2026-08-01', 10)
    const second = completedWorkout(first, '2026-08-05', 12.5)
    const older = second.workouts.find((session) => session.id === 'session-2026-08-01')!
    const corrected = correctWorkoutSession(second, {
      ...older,
      results: older.results.map((result) => ({ ...result, sets: result.sets.map((set) => ({ ...set, weightKg: 7.5 })), decision: 'Repeat' })),
    })

    const progression = corrected.progressions.find((item) => item.exerciseId === older.results[0].exerciseId)!
    expect(progression.decision).toBe('Repeat')
    expect(progression.lastResult).toContain('12.5 kg')
  })

  it('falls back to the previous result after deleting the latest session', () => {
    const first = completedWorkout(createPersonalState(), '2026-08-01', 10)
    const second = completedWorkout(first, '2026-08-05', 12.5)
    const latest = second.workouts.find((session) => session.id === 'session-2026-08-05')!
    const next = deleteWorkoutSession(second, latest.id)
    const progression = next.progressions.find((item) => item.exerciseId === latest.results[0].exerciseId)!

    expect(progression.decision).toBe('Repeat')
    expect(progression.currentWeightKg).toBe(10)
  })

  it('restores the configured baseline after deleting the only result', () => {
    const initial = createPersonalState()
    const completed = completedWorkout(initial, '2026-08-01', 10)
    const next = deleteWorkoutSession(completed, 'session-2026-08-01')

    expect(next.progressions[0]).toEqual(initial.progressionBaselines[0])
  })

  it('uses completed set reps as the next target while preserving mixed weights', () => {
    const state = createPersonalState()
    const draft = startWorkoutDraft(state, 'A', '2026-08-10')
    draft.results[0] = {
      ...draft.results[0],
      sets: [{ weightKg: 12.5, reps: 10 }, { weightKg: 10, reps: 12 }, { weightKg: 10, reps: 11 }],
    }

    const next = applyWorkoutCompletion(state, draft)
    const result = next.workouts[0].results[0]
    const progression = next.progressions.find((item) => item.exerciseId === result.exerciseId)!

    expect(result.sets).toEqual(draft.results[0].sets)
    expect(progression.currentWeightKg).toBe(12.5)
    expect(progression.nextTargetReps).toEqual([11, 12, 12])
    expect(progression.lastResult).toBe('12.5 kg × 10 · 10 kg × 12 / 11')
  })

  it('ignores empty and half-entered sets when committing', () => {
    const state = createPersonalState()
    const draft = startWorkoutDraft(state, 'A', '2026-08-10')
    draft.results[0].sets = [{ weightKg: 10, reps: 10 }, { weightKg: 10, reps: null }, { weightKg: null, reps: 12 }]

    const next = applyWorkoutCompletion(state, draft)

    expect(next.workouts[0].results[0].sets).toEqual([{ weightKg: 10, reps: 10 }])
    expect(next.progressions.find((item) => item.exerciseId === draft.results[0].exerciseId)).toEqual(state.progressions.find((item) => item.exerciseId === draft.results[0].exerciseId))
  })
})

describe('8–12 double progression', () => {
  function completeIncline(reps: number[], weightKg = 10) {
    const state = createPersonalState()
    const draft = startWorkoutDraft(state, 'A', DEMO_TODAY)
    draft.results[0].sets = reps.map((rep) => ({ weightKg, reps: rep }))
    return { state, next: applyWorkoutCompletion(state, draft) }
  }

  it('builds each next rep target from the completed three-set baseline', () => {
    const { next } = completeIncline([10, 9, 8])
    const progression = next.progressions.find((item) => item.exerciseId === 'incline-press')!

    expect(progression.currentWeightKg).toBe(10)
    expect(progression.decision).toBe('Repeat')
    expect(progression.nextTargetReps).toEqual([11, 10, 9])
  })

  it('increases weight only after 12 / 12 / 12 and resets the immediate target to 8s', () => {
    const { next } = completeIncline([12, 12, 12])
    const progression = next.progressions.find((item) => item.exerciseId === 'incline-press')!

    expect(progression.decision).toBe('Increase')
    expect(progression.currentWeightKg).toBe(12)
    expect(progression.nextTargetReps).toEqual([8, 8, 8])
  })

  it('deloads automatically below 8 reps and shows an 8-to-12 rebuild path', () => {
    const { next } = completeIncline([8, 8, 7])
    const progression = next.progressions.find((item) => item.exerciseId === 'incline-press')!

    expect(progression.decision).toBe('Deload')
    expect(progression.currentWeightKg).toBe(8)
    expect(progression.nextTargetReps).toEqual([8, 8, 8])
    expect(progression.nextTarget).toContain('rebuild toward 12 / 12 / 12')
  })

  it('returns to one-rep-at-a-time targets after the first deloaded session', () => {
    const { next: deloaded } = completeIncline([8, 8, 7])
    const rebuild = startWorkoutDraft(deloaded, 'A', '2026-08-09')
    rebuild.results[0].sets = rebuild.results[0].sets.map((set) => ({ ...set, reps: 8 }))

    const next = applyWorkoutCompletion(deloaded, rebuild)
    const progression = next.progressions.find((item) => item.exerciseId === 'incline-press')!

    expect(rebuild.results[0].sets.map((set) => set.weightKg)).toEqual([8, 8, 8])
    expect(progression.currentWeightKg).toBe(8)
    expect(progression.nextTargetReps).toEqual([9, 9, 9])
    expect(progression.rebuildGoalReps).toEqual([12, 12, 12])
  })
})
