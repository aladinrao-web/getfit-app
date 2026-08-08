import type { Exercise, ExerciseProgression, FitnessState, FoodReference, MealPreset, Profile } from './types'

export const PERSONAL_PRESET_SCHEMA_VERSION = 1

export interface PersonalPresetBundle {
  schemaVersion: typeof PERSONAL_PRESET_SCHEMA_VERSION
  profile: Profile
  mealPresets: MealPreset[]
  foodLibrary: FoodReference[]
  exercises: Exercise[]
  progressions: ExerciseProgression[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasFiniteNumbers(record: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => typeof record[key] === 'number' && Number.isFinite(record[key]))
}

export function parsePersonalPresetBundle(text: string): PersonalPresetBundle {
  const value: unknown = JSON.parse(text)
  if (!isRecord(value) || value.schemaVersion !== PERSONAL_PRESET_SCHEMA_VERSION) throw new Error('Unsupported Personal preset schema.')
  if (!isRecord(value.profile)) throw new Error('Personal preset profile is missing.')
  if (typeof value.profile.name !== 'string' || typeof value.profile.timezone !== 'string' || typeof value.profile.allergen !== 'string') throw new Error('Personal preset profile text is invalid.')
  if (!hasFiniteNumbers(value.profile, ['startingWeightKg', 'currentWeightKg', 'goalWeightKg', 'proteinFloorMultiplier', 'proteinTargetMultiplier', 'weeklyGainMin', 'weeklyGainMax', 'calorieAdjustment'])) throw new Error('Personal preset profile numbers are invalid.')
  if (!Array.isArray(value.mealPresets) || value.mealPresets.length !== 7) throw new Error('Personal presets must include seven meal-plan days.')
  if (!Array.isArray(value.foodLibrary) || !value.foodLibrary.length) throw new Error('Personal preset food references are missing.')
  if (!Array.isArray(value.exercises) || !value.exercises.length) throw new Error('Personal preset exercises are missing.')
  if (!Array.isArray(value.progressions) || value.progressions.length !== value.exercises.length) throw new Error('Every Personal exercise needs one progression record.')

  const exerciseIds = new Set(value.exercises.map((exercise) => isRecord(exercise) ? exercise.id : undefined))
  if (exerciseIds.has(undefined) || exerciseIds.size !== value.exercises.length) throw new Error('Personal exercise IDs must be present and unique.')
  if (!value.progressions.every((progression) => isRecord(progression) && typeof progression.exerciseId === 'string' && exerciseIds.has(progression.exerciseId))) throw new Error('Personal progression references are invalid.')

  return value as unknown as PersonalPresetBundle
}

export function applyPersonalPresetBundle(state: FitnessState, bundle: PersonalPresetBundle): FitnessState {
  if (state.checkIns.length || state.workouts.length || state.draftWorkout) throw new Error('Personal presets can only be applied to an empty Personal workspace.')
  return {
    ...state,
    profile: { ...bundle.profile },
    mealPresets: bundle.mealPresets.map((preset) => ({ ...preset, slots: preset.slots.map((slot) => ({ ...slot })) })),
    foodLibrary: bundle.foodLibrary.map((item) => ({ ...item })),
    exercises: bundle.exercises.map((exercise) => ({ ...exercise, targetReps: [...exercise.targetReps] })),
    progressions: bundle.progressions.map((progression) => ({ ...progression })),
  }
}
