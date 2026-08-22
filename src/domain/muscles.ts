import type { Exercise, FitnessState, MuscleGroup, WorkoutCode } from './types'

export interface MuscleTarget {
  id: MuscleGroup
  label: string
  weeklyMin: number
  weeklyMax: number
}

export const MUSCLE_TARGETS: MuscleTarget[] = [
  { id: 'chest', label: 'Chest', weeklyMin: 6, weeklyMax: 10 },
  { id: 'back-lats', label: 'Back & lats', weeklyMin: 6, weeklyMax: 10 },
  { id: 'upper-back', label: 'Upper back', weeklyMin: 4, weeklyMax: 8 },
  { id: 'front-shoulders', label: 'Front shoulders', weeklyMin: 4, weeklyMax: 8 },
  { id: 'side-shoulders', label: 'Side shoulders', weeklyMin: 4, weeklyMax: 8 },
  { id: 'rear-shoulders', label: 'Rear shoulders', weeklyMin: 4, weeklyMax: 8 },
  { id: 'biceps', label: 'Biceps', weeklyMin: 4, weeklyMax: 8 },
  { id: 'triceps', label: 'Triceps', weeklyMin: 4, weeklyMax: 8 },
  { id: 'quads', label: 'Quads', weeklyMin: 6, weeklyMax: 10 },
  { id: 'hamstrings', label: 'Hamstrings', weeklyMin: 6, weeklyMax: 10 },
  { id: 'glutes', label: 'Glutes', weeklyMin: 6, weeklyMax: 10 },
  { id: 'calves', label: 'Calves', weeklyMin: 4, weeklyMax: 8 },
  { id: 'core', label: 'Core', weeklyMin: 4, weeklyMax: 8 },
]

const muscleIds = new Set<MuscleGroup>(MUSCLE_TARGETS.map((target) => target.id))

const knownMuscles: Record<string, { primary: MuscleGroup; secondary: MuscleGroup[] }> = {
  'incline-press': { primary: 'chest', secondary: ['front-shoulders', 'triceps'] },
  'pec-deck': { primary: 'chest', secondary: [] },
  'lateral-raise': { primary: 'side-shoulders', secondary: [] },
  'cable-fly': { primary: 'chest', secondary: [] },
  'shoulder-press': { primary: 'front-shoulders', secondary: ['side-shoulders', 'triceps'] },
  'leg-extension': { primary: 'quads', secondary: [] },
  rdl: { primary: 'hamstrings', secondary: ['glutes'] },
  triceps: { primary: 'triceps', secondary: [] },
  pulldown: { primary: 'back-lats', secondary: ['biceps'] },
  'supported-row': { primary: 'upper-back', secondary: ['back-lats', 'rear-shoulders', 'biceps'] },
  'one-arm-row': { primary: 'back-lats', secondary: ['upper-back', 'rear-shoulders', 'biceps'] },
  biceps: { primary: 'biceps', secondary: [] },
  'face-pull': { primary: 'rear-shoulders', secondary: ['upper-back'] },
  'two-arm-db-triceps-extension': { primary: 'triceps', secondary: [] },
}

function inferFromName(name: string, workout: WorkoutCode) {
  const value = name.toLowerCase()
  if (/face pull|rear delt/.test(value)) return { primary: 'rear-shoulders' as const, secondary: ['upper-back' as const] }
  if (/lateral raise/.test(value)) return { primary: 'side-shoulders' as const, secondary: [] }
  if (/shoulder press|overhead press/.test(value)) return { primary: 'front-shoulders' as const, secondary: ['side-shoulders' as const, 'triceps' as const] }
  if (/incline|chest press|bench|pec|fly/.test(value)) return { primary: 'chest' as const, secondary: ['front-shoulders' as const, 'triceps' as const] }
  if (/pulldown|pull-up|chin-up/.test(value)) return { primary: 'back-lats' as const, secondary: ['biceps' as const] }
  if (/row/.test(value)) return { primary: 'upper-back' as const, secondary: ['back-lats' as const, 'rear-shoulders' as const, 'biceps' as const] }
  if (/curl/.test(value)) return { primary: 'biceps' as const, secondary: [] }
  if (/triceps|pushdown|extension/.test(value)) return { primary: 'triceps' as const, secondary: [] }
  if (/leg extension|squat|leg press|lunge/.test(value)) return { primary: 'quads' as const, secondary: ['glutes' as const] }
  if (/romanian|rdl|leg curl|hamstring/.test(value)) return { primary: 'hamstrings' as const, secondary: ['glutes' as const] }
  if (/hip thrust|glute/.test(value)) return { primary: 'glutes' as const, secondary: ['hamstrings' as const] }
  if (/calf/.test(value)) return { primary: 'calves' as const, secondary: [] }
  if (/plank|crunch|core|ab/.test(value)) return { primary: 'core' as const, secondary: [] }

  const fallback: Record<WorkoutCode, MuscleGroup> = { A: 'chest', B: 'quads', C: 'back-lats' }
  return { primary: fallback[workout], secondary: [] }
}

export function normalizeExerciseMuscles(exercise: Exercise): Exercise {
  const configuredPrimary = muscleIds.has(exercise.primaryMuscle) ? exercise.primaryMuscle : undefined
  const configuredSecondary = Array.isArray(exercise.secondaryMuscles)
    ? exercise.secondaryMuscles.filter((muscle): muscle is MuscleGroup => muscleIds.has(muscle))
    : []
  const inferred = knownMuscles[exercise.id] ?? inferFromName(exercise.name, exercise.workout)
  const primaryMuscle = configuredPrimary ?? inferred.primary
  const secondaryMuscles = [...new Set((configuredPrimary ? configuredSecondary : inferred.secondary).filter((muscle) => muscle !== primaryMuscle))]
  return { ...exercise, primaryMuscle, secondaryMuscles }
}

export function migrateMuscleMetadataInState(state: FitnessState): FitnessState {
  return {
    ...state,
    exercises: state.exercises.map((exercise) => normalizeExerciseMuscles(exercise)),
  }
}

export function muscleLabel(muscle: MuscleGroup) {
  return MUSCLE_TARGETS.find((target) => target.id === muscle)?.label ?? muscle
}
