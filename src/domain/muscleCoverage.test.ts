import { describe, expect, it } from 'vitest'
import { createPersonalState } from '../data/seed'
import type { ExerciseResult, WorkoutCode, WorkoutSession } from './types'
import { getHomeFocus, getMuscleCoverage } from './muscleCoverage'

function result(exerciseId: string, setCount = 3): ExerciseResult {
  return {
    exerciseId,
    sets: Array.from({ length: setCount }, () => ({ weightKg: 10, reps: 10 })),
    limitingFactor: '',
    formNotes: '',
    decision: 'Repeat',
  }
}

function session(id: string, date: string, workout: WorkoutCode, results: ExerciseResult[]): WorkoutSession {
  return { id, date, workout, results, sessionNotes: '', completedAt: `${date}T18:00:00.000Z` }
}

describe('muscle coverage', () => {
  it('counts primary sets fully and secondary sets fractionally', () => {
    const state = createPersonalState()
    state.workouts = [session('a-1', '2026-08-08', 'A', [result('incline-press')])]

    const summary = getMuscleCoverage(state, '2026-08-08')

    expect(summary.muscles.find((item) => item.muscle === 'chest')).toMatchObject({ effectiveSets: 3, exposures: 1 })
    expect(summary.muscles.find((item) => item.muscle === 'front-shoulders')).toMatchObject({ effectiveSets: 1.5, exposures: 0 })
    expect(summary.muscles.find((item) => item.muscle === 'triceps')).toMatchObject({ effectiveSets: 1.5, exposures: 0 })
  })

  it('compares the current rolling 28 days with the preceding period', () => {
    const state = createPersonalState()
    state.workouts = [
      session('previous', '2026-07-01', 'A', [result('incline-press')]),
      session('current', '2026-08-01', 'A', [result('incline-press', 4)]),
    ]

    const chest = getMuscleCoverage(state, '2026-08-08').muscles.find((item) => item.muscle === 'chest')!

    expect(chest.effectiveSets).toBe(4)
    expect(chest.previousEffectiveSets).toBe(3)
  })

  it('prioritizes attendance before exercise or muscle changes', () => {
    const state = createPersonalState()
    expect(getHomeFocus(state, '2026-08-08').kind).toBe('consistency')

    state.workouts = Array.from({ length: 9 }, (_, index) => session(`a-${index}`, `2026-07-${String(20 + index).padStart(2, '0')}`, 'A', [result('incline-press')]))
    expect(getHomeFocus(state, '2026-08-08').kind).toBe('frequency')
  })

  it('prioritizes finishing current workouts before adding muscle volume', () => {
    const state = createPersonalState()
    state.workouts = Array.from({ length: 12 }, (_, index) => session(
      `partial-${index}`,
      `2026-07-${String(17 + index).padStart(2, '0')}`,
      'A',
      [result('incline-press')],
    ))

    expect(getHomeFocus(state, '2026-08-08').kind).toBe('workload')
  })

  it('uses nutrition instead of more exercise when coverage is sufficient and weight is flat', () => {
    const state = createPersonalState()
    state.checkIns = Array.from({ length: 14 }, (_, index) => {
      const date = new Date('2026-07-26T00:00:00Z')
      date.setUTCDate(date.getUTCDate() + index)
      const normalizedDate = date.toISOString().slice(0, 10)
      return {
        id: `weight-${index}`,
        date: normalizedDate,
        weightKg: 65,
        adherence: {},
        extrasProteinG: 0,
        extrasCalories: 0,
        notes: '',
        updatedAt: `${normalizedDate}T08:00:00.000Z`,
        completedAt: `${normalizedDate}T08:00:00.000Z`,
      }
    })
    const covered = getMuscleCoverage(state, '2026-08-08')
    covered.sessionCount = 12
    covered.completionRate = 1
    covered.muscles = covered.muscles.map((muscle) => ({ ...muscle, effectiveSets: muscle.targetMin, status: 'On target' }))

    expect(getHomeFocus(state, '2026-08-08', covered).kind).toBe('nutrition')
  })
})
