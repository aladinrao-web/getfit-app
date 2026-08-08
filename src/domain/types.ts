export type WorkoutCode = 'A' | 'B' | 'C'
export type ProgressionDecision = 'Increase' | 'Repeat' | 'Deload' | 'Technique focus'
export type ProteinStatus = 'Not logged' | 'Below floor' | 'In line' | 'Target met'
export type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'shake'
export type Adherence = 0 | 0.5 | 0.75 | 1

export interface Profile {
  name: string
  currentWeightKg: number
  goalWeightKg: number
  proteinFloorMultiplier: number
  proteinTargetMultiplier: number
  weeklyGainMin: number
  weeklyGainMax: number
  calorieAdjustment: number
  allergen: string
}

export interface MealSlot {
  key: MealSlotKey
  label: string
  description: string
  proteinG: number
  calories: number
}

export interface MealPreset {
  day: string
  slots: MealSlot[]
}

export interface FoodReference {
  id: string
  name: string
  serving: string
  proteinG: number
  calories: number
  allergenStatus: string
}

export interface DailyCheckIn {
  date: string
  weightKg?: number
  adherence: Record<MealSlotKey, Adherence>
  extrasProteinG: number
  extrasCalories: number
  notes: string
}

export interface Exercise {
  id: string
  workout: WorkoutCode
  order: number
  name: string
  targetReps: number[]
  warmup: string
  coachingCue: string
}

export interface ExerciseProgression {
  exerciseId: string
  currentWeightKg: number
  lastResult: string
  nextTarget: string
  limitingFactor: string
  decision: ProgressionDecision
  notes: string
  incrementKg: number
}

export interface ExerciseResult {
  exerciseId: string
  weightKg: number
  reps: Array<number | null>
  limitingFactor: string
  formNotes: string
  decision: ProgressionDecision
  skipped?: boolean
}

export interface WorkoutSession {
  id: string
  date: string
  workout: WorkoutCode
  results: ExerciseResult[]
  sessionNotes: string
  completedAt: string
}

export interface DraftWorkout {
  id: string
  date: string
  workout: WorkoutCode
  results: ExerciseResult[]
  sessionNotes: string
}

export interface FitnessState {
  profile: Profile
  mealPresets: MealPreset[]
  foodLibrary: FoodReference[]
  checkIns: DailyCheckIn[]
  exercises: Exercise[]
  progressions: ExerciseProgression[]
  workouts: WorkoutSession[]
  draftWorkout?: DraftWorkout
}
