import type {
  Adherence,
  DailyCheckIn,
  Exercise,
  ExerciseProgression,
  ExerciseResult,
  FitnessState,
  FoodReference,
  MealPreset,
  ProgressionDecision,
  WorkoutCode,
  WorkoutSession,
} from '../domain/types'
import { getSystemTimeZone } from '../domain/date'
import { recomputeProgressions } from '../domain/workout'

export const DEMO_TODAY = '2026-08-08'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return isoDate(value)
}

function mealPreset(day: string, offset: number): MealPreset {
  const lunches = [
    'Tofu, rice & greens bowl',
    'Paneer, dal & vegetable bowl',
    'Chicken, rajma & rice bowl',
  ]
  const dinners = [
    'Chicken, potatoes & broccoli',
    'Tofu noodles with vegetables',
    'Paneer, rice & mushroom curry',
  ]

  return {
    day,
    slots: [
      { key: 'breakfast', label: 'Breakfast', description: 'Egg-free PB banana toast', proteinG: 18, calories: 420 },
      { key: 'lunch', label: 'Lunch', description: lunches[offset % lunches.length], proteinG: 38 + (offset % 3) * 2, calories: 720 },
      { key: 'dinner', label: 'Dinner', description: dinners[offset % dinners.length], proteinG: 42 + (offset % 2) * 3, calories: 780 },
      { key: 'shake', label: 'Protein shake', description: 'Protein blend with soy milk', proteinG: 32, calories: 310 },
    ],
  }
}

export const syntheticMealPresets = days.map(mealPreset)

export const syntheticFoodLibrary: FoodReference[] = [
  { id: 'soy', name: 'High-protein soy milk', serving: '400 ml', proteinG: 22, calories: 160, allergenStatus: 'Check current label' },
  { id: 'tofu', name: 'Firm tofu', serving: '200 g', proteinG: 28, calories: 290, allergenStatus: 'Egg-free' },
  { id: 'paneer', name: 'Paneer', serving: '200 g', proteinG: 36, calories: 530, allergenStatus: 'Egg-free' },
  { id: 'chicken', name: 'Chicken breast', serving: '200 g', proteinG: 45, calories: 240, allergenStatus: 'Egg-free; avoid cross-contact' },
  { id: 'dal', name: 'Cooked dal', serving: '250 g', proteinG: 18, calories: 330, allergenStatus: 'Egg-free' },
  { id: 'powder', name: 'Protein blend', serving: '1 scoop', proteinG: 24, calories: 140, allergenStatus: 'Check current label' },
]

export const syntheticExercises: Exercise[] = [
  { id: 'incline-press', workout: 'A', order: 1, name: 'Incline DB Press', primaryMuscle: 'chest', secondaryMuscles: ['front-shoulders', 'triceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: '7.5 kg × 10, then 10 kg × 5', coachingCue: 'Stable wrists; drive through the chest.' },
  { id: 'pec-deck', workout: 'A', order: 2, name: 'Pec Deck', primaryMuscle: 'chest', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: '25 kg × 10', coachingCue: 'Shoulder blades back; controlled stretch.' },
  { id: 'lateral-raise', workout: 'A', order: 3, name: 'DB Lateral Raise', primaryMuscle: 'side-shoulders', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'No swinging; stop around shoulder height.' },
  { id: 'cable-fly', workout: 'A', order: 4, name: 'Cable Fly', primaryMuscle: 'chest', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Light stack × 12', coachingCue: 'Soft elbows; bring biceps toward each other.' },
  { id: 'shoulder-press', workout: 'B', order: 1, name: 'DB Shoulder Press', primaryMuscle: 'front-shoulders', secondaryMuscles: ['side-shoulders', 'triceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: '7.5 kg × 10, then 10 kg × 5', coachingCue: 'Keep the right wrist stacked and stable.' },
  { id: 'leg-extension', workout: 'B', order: 2, name: 'Leg Extension', primaryMuscle: 'quads', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Adjust shin pad before loading', coachingCue: 'Stop if the pad causes discomfort.' },
  { id: 'rdl', workout: 'B', order: 3, name: 'Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: '5 kg each × 10', coachingCue: 'Soft knees; hips back; weights close.' },
  { id: 'triceps', workout: 'B', order: 4, name: 'Cable Triceps Pushdown', primaryMuscle: 'triceps', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Elbows pinned; no torso swing.' },
  { id: 'pulldown', workout: 'C', order: 1, name: 'Lat Pulldown', primaryMuscle: 'back-lats', secondaryMuscles: ['biceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: '25 kg × 10', coachingCue: 'Do before rows; pull elbows toward ribs.' },
  { id: 'supported-row', workout: 'C', order: 2, name: 'Chest-Supported Row', primaryMuscle: 'upper-back', secondaryMuscles: ['back-lats', 'rear-shoulders', 'biceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Light set × 10', coachingCue: 'No shrugging; keep the full range.' },
  { id: 'one-arm-row', workout: 'C', order: 3, name: 'One-Arm DB Row', primaryMuscle: 'back-lats', secondaryMuscles: ['upper-back', 'rear-shoulders', 'biceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: '7.5 kg × 10', coachingCue: 'Pull toward the hip to bias the lats.' },
  { id: 'biceps', workout: 'C', order: 4, name: 'DB Bicep Curl', primaryMuscle: 'biceps', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Strict top set; controlled back-offs.' },
]

const progressionSeed: Array<[string, number, string, string, string, ProgressionDecision, string, number]> = [
  ['incline-press', 14, '14 kg × 11 / 10 / 10', '14 kg × 12 / 12 / 12 with stable wrists', 'Right-wrist stability', 'Repeat', 'One more clean session before moving up.', 2],
  ['pec-deck', 32.5, '32.5 kg × 13 / 13 / 13', '35 kg × 10 / 10 / 10', '', 'Increase', 'Target completed twice with controlled form.', 2.5],
  ['lateral-raise', 6, '6 kg × 12 / 11; 4 kg × 18', '6 kg × 12 / 12; 4 kg × 20', 'Momentum on final reps', 'Repeat', 'Keep the back-off slow.', 1],
  ['cable-fly', 12.5, '12.5 kg × 12 / 12 / 12', '12.5 kg × 13 / 13 / 13', '', 'Repeat', 'Build reps before adding weight.', 2.5],
  ['shoulder-press', 12.5, '12.5 kg × 9 / 9 / 8', '12.5 kg × 9 / 9 / 9', 'Right-hand stability', 'Repeat', 'Shorten the final warm-up set.', 2.5],
  ['leg-extension', 17.5, '17.5 kg × 15 / 15 / 15', 'Improve machine setup first', 'Shin-pad discomfort', 'Technique focus', 'Position the pad lower on the shin.', 2.5],
  ['rdl', 10, '10 kg × 10 / 10 / 10', '10 kg × 10 / 10 / 10 pain-free', 'Technique confidence', 'Technique focus', 'Keep the range controlled.', 2.5],
  ['triceps', 12.5, '12.5 kg × 12 / 10 / 10', '12.5 kg × 12 / 12 / 12', 'Triceps fatigue', 'Repeat', 'Do not test 15 kg yet.', 2.5],
  ['pulldown', 42.5, '42.5 kg × 10 / 8 / 8', '40 kg × 10 / 10 / 10 with full range', 'Fatigue and shortened range', 'Deload', 'Rebuild clean reps before returning to 42.5 kg.', 2.5],
  ['supported-row', 37.5, '37.5 kg × 12 / 12 / 11', '37.5 kg × 12 / 12 / 12', 'General fatigue', 'Repeat', 'Rest two to three minutes.', 2.5],
  ['one-arm-row', 16, '16 kg × 15 / 15 / 15', '16 kg × 15 / 15 / 15 with lat-focused form', 'Rear delts dominated', 'Technique focus', 'Keep the elbow close and pull toward the hip.', 2],
  ['biceps', 10, '10 kg × 10; 8 kg × 12 / 12', '10 kg × 11; 8 kg × 12 / 12', 'Grip fatigue', 'Repeat', 'Use one strict top set.', 2],
]

export const syntheticProgressions: ExerciseProgression[] = progressionSeed.map(
  ([exerciseId, currentWeightKg, lastResult, nextTarget, limitingFactor, decision, notes, incrementKg]) => ({
    exerciseId,
    currentWeightKg,
    lastResult,
    nextTarget,
    nextTargetReps: [8, 8, 8],
    limitingFactor,
    decision,
    notes,
    incrementKg,
  }),
)

function makeCheckIns(): DailyCheckIn[] {
  const start = '2026-06-29'
  const entries: DailyCheckIn[] = []
  const levels: Adherence[] = [1, 1, 0.75, 1, 0.5, 1, 1]

  for (let index = 0; index < 40; index += 1) {
    if (index % 11 === 3) continue
    const date = addDays(start, index)
    const weight = 67 + index * 0.018 + Math.sin(index * 1.7) * 0.16
    entries.push({
      id: `demo-checkin-${date}`,
      date,
      weightKg: index % 6 === 2 ? undefined : Number(weight.toFixed(1)),
      adherence: {
        breakfast: levels[index % levels.length],
        lunch: index % 9 === 4 ? 0.5 : 1,
        dinner: index % 8 === 5 ? 0.75 : 1,
        shake: index % 7 === 4 ? 0 : 1,
      },
      extrasProteinG: index % 10 === 6 ? 12 : 0,
      extrasCalories: index % 10 === 6 ? 190 : 0,
      notes: index % 9 === 4 ? 'Lunch was smaller than planned.' : index % 7 === 4 ? 'Shake skipped.' : '',
      updatedAt: `${date}T20:00:00.000Z`,
      completedAt: `${date}T20:00:00.000Z`,
    })
  }
  return entries
}

function result(exerciseId: string, weightKg: number | number[], reps: number[], decision: ProgressionDecision, limitingFactor = '', formNotes = ''): ExerciseResult {
  const weights = Array.isArray(weightKg) ? weightKg : reps.map(() => weightKg)
  return {
    exerciseId,
    sets: reps.map((setReps, index) => ({ weightKg: weights[index] ?? weights.at(-1) ?? 0, reps: setReps })),
    decision,
    limitingFactor,
    formNotes,
  }
}

function session(id: string, date: string, workout: WorkoutCode, results: ExerciseResult[], notes = ''): WorkoutSession {
  return { id, date, workout, results, sessionNotes: notes, completedAt: `${date}T18:30:00.000Z` }
}

function makeWorkouts(): WorkoutSession[] {
  return [
    session('demo-a1', '2026-07-13', 'A', [result('incline-press', 12, [12, 12, 12], 'Increase'), result('pec-deck', 30, [12, 12, 12], 'Repeat'), result('lateral-raise', 5, [12, 12, 18], 'Repeat')]),
    session('demo-b1', '2026-07-15', 'B', [result('shoulder-press', 12.5, [8, 8, 8], 'Repeat'), result('leg-extension', 15, [15, 15, 15], 'Increase'), result('triceps', 10, [15, 15, 15], 'Increase')]),
    session('demo-c1', '2026-07-18', 'C', [result('pulldown', 40, [10, 10, 10], 'Increase'), result('supported-row', 35, [10, 11, 12], 'Repeat'), result('biceps', 10, [8, 8, 7], 'Repeat', 'Grip fatigue')]),
    session('demo-a2', '2026-07-22', 'A', [result('incline-press', 14, [10, 10, 9], 'Repeat', 'Right-wrist stability'), result('pec-deck', 32.5, [12, 12, 12], 'Repeat'), result('cable-fly', 12.5, [12, 12, 12], 'Repeat')]),
    session('demo-b2', '2026-07-25', 'B', [result('shoulder-press', 12.5, [9, 8, 8], 'Repeat'), result('rdl', 10, [10, 10, 10], 'Technique focus', 'Technique confidence'), result('triceps', 12.5, [12, 10, 10], 'Repeat', 'Triceps fatigue')]),
    session('demo-c2', '2026-07-28', 'C', [result('pulldown', 42.5, [10, 8, 8], 'Deload', 'Fatigue and shortened range'), result('supported-row', 37.5, [12, 11, 11], 'Repeat'), result('one-arm-row', 16, [15, 15, 15], 'Technique focus', 'Rear delts dominated')]),
    session('demo-a3', '2026-08-01', 'A', [result('incline-press', 14, [11, 10, 10], 'Repeat', 'Right-wrist stability'), result('pec-deck', 32.5, [13, 13, 13], 'Increase'), result('lateral-raise', [6, 6, 4], [12, 11, 18], 'Repeat')]),
    session('demo-b3', '2026-08-04', 'B', [result('shoulder-press', 12.5, [9, 9, 8], 'Repeat', 'Right-hand stability'), result('leg-extension', 17.5, [15, 15, 15], 'Technique focus', 'Shin-pad discomfort'), result('rdl', 10, [10, 10, 10], 'Technique focus')]),
    session('demo-c3', '2026-08-07', 'C', [result('pulldown', 40, [10, 10, 10], 'Repeat'), result('supported-row', 37.5, [12, 12, 11], 'Repeat', 'General fatigue'), result('one-arm-row', 16, [15, 15, 15], 'Technique focus', 'Rear delts dominated'), result('biceps', [10, 8, 8], [10, 12, 12], 'Repeat', 'Grip fatigue', 'Back-off sets at 8 kg.')]),
  ]
}

export function createSyntheticState(): FitnessState {
  const progressions = syntheticProgressions.map((progression) => ({ ...progression }))
  const state: FitnessState = {
    profile: {
      name: 'Demo Athlete',
      timezone: 'Asia/Calcutta',
      startingWeightKg: 66.8,
      currentWeightKg: 67.6,
      goalWeightKg: 72,
      proteinFloorMultiplier: 1.4,
      proteinTargetMultiplier: 1.6,
      weeklyGainMin: 0.0025,
      weeklyGainMax: 0.005,
      calorieAdjustment: 225,
      allergen: 'Egg and egg-derived ingredients',
    },
    mealPresets: syntheticMealPresets.map((preset) => ({ ...preset, slots: preset.slots.map((slot) => ({ ...slot })) })),
    foodLibrary: syntheticFoodLibrary.map((item) => ({ ...item })),
    checkIns: makeCheckIns(),
    exercises: syntheticExercises.map((exercise) => ({ ...exercise, repRange: { ...exercise.repRange }, targetReps: [...exercise.targetReps] })),
    progressionBaselines: progressions.map((progression) => ({ ...progression })),
    progressions,
    workouts: makeWorkouts(),
  }
  return recomputeProgressions(state, state.exercises.map((exercise) => exercise.id))
}

export function createPersonalState(timezone = getSystemTimeZone()): FitnessState {
  const progressions = syntheticProgressions.map((progression) => ({
    ...progression,
    currentWeightKg: 0,
    lastResult: 'No result yet',
    nextTarget: 'Choose a starting load; aim for 8 / 8 / 8',
    limitingFactor: '',
    decision: 'Repeat' as const,
    notes: '',
  }))
  return {
    profile: {
      name: 'Athlete',
      timezone,
      startingWeightKg: 70,
      currentWeightKg: 70,
      goalWeightKg: 75,
      proteinFloorMultiplier: 1.4,
      proteinTargetMultiplier: 1.6,
      weeklyGainMin: 0.0025,
      weeklyGainMax: 0.005,
      calorieAdjustment: 225,
      allergen: 'Set your strict allergen exclusion',
    },
    mealPresets: syntheticMealPresets.map((preset) => ({ ...preset, slots: preset.slots.map((slot) => ({ ...slot })) })),
    foodLibrary: syntheticFoodLibrary.map((item) => ({ ...item })),
    checkIns: [],
    exercises: syntheticExercises.map((exercise) => ({ ...exercise, repRange: { ...exercise.repRange }, targetReps: [...exercise.targetReps] })),
    progressionBaselines: progressions.map((progression) => ({ ...progression })),
    progressions,
    workouts: [],
  }
}
