import { describe, expect, it } from 'vitest'
import { createSyntheticState } from '../data/seed'
import { calculateMealTotals, getFourteenDayNutrition, getPresetForDate, getWeightSummary, proteinTargets } from './calculations'

describe('fitness calculations', () => {
  it('keeps an unlogged day distinct from zero intake', () => {
    const state = createSyntheticState()
    const preset = getPresetForDate(state.mealPresets, '2026-08-08')
    const totals = calculateMealTotals(undefined, preset, state.profile)
    expect(totals.status).toBe('Not logged')
    expect(totals.actualProtein).toBeNull()
  })

  it('keeps an unanswered meal distinct from a skipped meal during a staged check-in', () => {
    const state = createSyntheticState()
    const preset = getPresetForDate(state.mealPresets, '2026-08-08')
    const staged = {
      ...state.checkIns[0],
      date: '2026-08-08',
      adherence: { breakfast: 0 as const },
      completedAt: undefined,
    }
    const totals = calculateMealTotals(staged, preset, state.profile)
    expect(totals.status).toBe('In progress')
    expect(totals.actualProtein).toBe(0)
    expect(totals.coverage).toBe(0)
  })

  it('excludes partial check-ins from completed nutrition summaries', () => {
    const state = createSyntheticState()
    const staged = { ...state.checkIns[0], completedAt: undefined }
    const summary = getFourteenDayNutrition([staged], state.mealPresets, state.profile)
    expect(summary).toEqual({ daysLogged: 0, energyCoverage: null, proteinTargetDays: 0 })
  })

  it('derives protein floor and target from current body weight', () => {
    const state = createSyntheticState()
    expect(proteinTargets(state.profile)).toEqual({ floor: 95, target: 108 })
  })

  it('uses multi-day averages for the weight recommendation', () => {
    const state = createSyntheticState()
    const summary = getWeightSummary(state.checkIns, state.profile)
    expect(summary.average).not.toBeNull()
    expect(summary.weeklyChange).not.toBeNull()
    expect(summary.recommendation.length).toBeGreaterThan(10)
  })
})
