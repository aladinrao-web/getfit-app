import { describe, expect, it } from 'vitest'
import { createPersonalState, createSyntheticState, DEMO_TODAY } from '../data/seed'
import { applyWorkoutCompletion, correctWorkoutSession, deleteWorkoutSession, startWorkoutDraft } from './workout'

describe('workout completion', () => {
  it('does not commit a draft with no recorded reps', () => {
    const state = createSyntheticState()
    const draft = startWorkoutDraft(state, 'A', DEMO_TODAY)
    expect(applyWorkoutCompletion(state, draft)).toBe(state)
  })

  it('commits completed exercises and updates matching progression', () => {
    const state = createSyntheticState()
    const draft = startWorkoutDraft(state, 'A', DEMO_TODAY)
    draft.results[0].reps = [12, 12, 12]
    draft.results[0].decision = 'Increase'
    const next = applyWorkoutCompletion(state, draft)
    expect(next.workouts).toHaveLength(state.workouts.length + 1)
    expect(next.workouts.at(-1)?.results).toHaveLength(1)
    expect(next.progressions.find((item) => item.exerciseId === draft.results[0].exerciseId)?.decision).toBe('Increase')
  })

  it('upserts the same session rather than duplicating it', () => {
    const state = createSyntheticState()
    const draft = startWorkoutDraft(state, 'B', DEMO_TODAY)
    draft.results[0].reps = [9, 9, 9]
    const once = applyWorkoutCompletion(state, draft, '2026-08-08T10:00:00.000Z')
    const twice = applyWorkoutCompletion(once, draft, '2026-08-08T10:05:00.000Z')
    expect(twice.workouts).toHaveLength(once.workouts.length)
    expect(twice.workouts.filter((item) => item.id === draft.id)).toHaveLength(1)
    expect(twice.workouts.find((item) => item.id === draft.id)?.completedAt).toBe('2026-08-08T10:00:00.000Z')
  })
})

describe('workout corrections', () => {
  function completedWorkout(state: ReturnType<typeof createPersonalState>, date: string, weightKg: number, decision: 'Increase' | 'Repeat') {
    const draft = startWorkoutDraft(state, 'A', date, `session-${date}`)
    draft.results[0] = { ...draft.results[0], weightKg, reps: [10, 10, 10], decision }
    return applyWorkoutCompletion(state, draft, `${date}T10:00:00.000Z`)
  }

  it('keeps a later result authoritative when an older session is corrected', () => {
    const first = completedWorkout(createPersonalState(), '2026-08-01', 10, 'Repeat')
    const second = completedWorkout(first, '2026-08-05', 12.5, 'Increase')
    const older = second.workouts.find((session) => session.id === 'session-2026-08-01')!
    const corrected = correctWorkoutSession(second, {
      ...older,
      results: older.results.map((result) => ({ ...result, weightKg: 7.5, decision: 'Repeat' })),
    })

    const progression = corrected.progressions.find((item) => item.exerciseId === older.results[0].exerciseId)!
    expect(progression.decision).toBe('Increase')
    expect(progression.lastResult).toContain('12.5 kg')
  })

  it('falls back to the previous result after deleting the latest session', () => {
    const first = completedWorkout(createPersonalState(), '2026-08-01', 10, 'Repeat')
    const second = completedWorkout(first, '2026-08-05', 12.5, 'Increase')
    const latest = second.workouts.find((session) => session.id === 'session-2026-08-05')!
    const next = deleteWorkoutSession(second, latest.id)
    const progression = next.progressions.find((item) => item.exerciseId === latest.results[0].exerciseId)!

    expect(progression.decision).toBe('Repeat')
    expect(progression.currentWeightKg).toBe(10)
  })

  it('restores the configured baseline after deleting the only result', () => {
    const initial = createPersonalState()
    const completed = completedWorkout(initial, '2026-08-01', 10, 'Increase')
    const next = deleteWorkoutSession(completed, 'session-2026-08-01')

    expect(next.progressions[0]).toEqual(initial.progressionBaselines[0])
  })
})
