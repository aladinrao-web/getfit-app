import { describe, expect, it } from 'vitest'
import { createPersonalState } from '../data/seed'
import { PERSONAL_PRESET_SCHEMA_VERSION, applyPersonalPresetBundle, parsePersonalPresetBundle, type PersonalPresetBundle } from './presets'

function validBundle(): PersonalPresetBundle {
  const state = createPersonalState('Asia/Calcutta')
  return {
    schemaVersion: PERSONAL_PRESET_SCHEMA_VERSION,
    profile: { ...state.profile, name: 'Private athlete' },
    mealPresets: state.mealPresets,
    foodLibrary: state.foodLibrary,
    exercises: state.exercises,
    progressions: state.progressions,
  }
}

describe('Personal preset import', () => {
  it('validates and applies configuration without importing history', () => {
    const state = createPersonalState()
    const bundle = parsePersonalPresetBundle(JSON.stringify(validBundle()))
    const next = applyPersonalPresetBundle(state, bundle)
    expect(next.profile.name).toBe('Private athlete')
    expect(next.checkIns).toEqual([])
    expect(next.workouts).toEqual([])
  })

  it('refuses to replace configuration after Personal tracking begins', () => {
    const state = createPersonalState()
    state.checkIns.push({ id: 'personal-checkin-2026-08-08', date: '2026-08-08', adherence: { breakfast: 1, lunch: 1, dinner: 1, shake: 1 }, extrasProteinG: 0, extrasCalories: 0, notes: '', updatedAt: '2026-08-08T20:00:00.000Z', completedAt: '2026-08-08T20:00:00.000Z' })
    expect(() => applyPersonalPresetBundle(state, validBundle())).toThrow(/empty Personal workspace/)
  })
})
