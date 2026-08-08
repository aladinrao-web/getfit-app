import { describe, expect, it } from 'vitest'
import { createSyntheticState, DEMO_TODAY } from '../data/seed'
import { applyWorkoutCompletion, startWorkoutDraft } from './workout'

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
    const once = applyWorkoutCompletion(state, draft)
    const twice = applyWorkoutCompletion(once, draft)
    expect(twice.workouts).toHaveLength(once.workouts.length)
    expect(twice.workouts.filter((item) => item.id === draft.id)).toHaveLength(1)
  })
})
