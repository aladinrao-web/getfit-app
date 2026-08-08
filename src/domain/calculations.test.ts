import { describe, expect, it } from 'vitest'
import { createSyntheticState } from '../data/seed'
import { calculateMealTotals, getPresetForDate, getWeightSummary, proteinTargets } from './calculations'

describe('fitness calculations', () => {
  it('keeps an unlogged day distinct from zero intake', () => {
    const state = createSyntheticState()
    const preset = getPresetForDate(state.mealPresets, '2026-08-08')
    const totals = calculateMealTotals(undefined, preset, state.profile)
    expect(totals.status).toBe('Not logged')
    expect(totals.actualProtein).toBeNull()
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
