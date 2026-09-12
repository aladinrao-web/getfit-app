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

function libraryExercise(exercise: Omit<Exercise, 'isDefault'>): Exercise {
  return { ...exercise, isDefault: false }
}

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
  libraryExercise({ id: 'flat-db-press', workout: 'A', order: 5, name: 'Flat DB Press', primaryMuscle: 'chest', secondaryMuscles: ['front-shoulders', 'triceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Two lighter ramp-up sets', coachingCue: 'Keep shoulders set and wrists stacked.' }),
  libraryExercise({ id: 'machine-chest-press', workout: 'A', order: 6, name: 'Machine Chest Press', primaryMuscle: 'chest', secondaryMuscles: ['front-shoulders', 'triceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Set the seat so handles meet mid-chest.' }),
  libraryExercise({ id: 'push-up', workout: 'A', order: 7, name: 'Push-up', primaryMuscle: 'chest', secondaryMuscles: ['front-shoulders', 'triceps', 'core'], repRange: { min: 8, max: 15 }, targetReps: [8, 8, 8], warmup: 'A few controlled reps', coachingCue: 'Keep a straight line from head to heels.' }),
  libraryExercise({ id: 'low-to-high-cable-fly', workout: 'A', order: 8, name: 'Low-to-high Cable Fly', primaryMuscle: 'chest', secondaryMuscles: ['front-shoulders'], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Bring hands upward and together without shrugging.' }),
  libraryExercise({ id: 'machine-shoulder-press', workout: 'B', order: 5, name: 'Machine Shoulder Press', primaryMuscle: 'front-shoulders', secondaryMuscles: ['side-shoulders', 'triceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Keep ribs down and press in a smooth arc.' }),
  libraryExercise({ id: 'landmine-press', workout: 'B', order: 6, name: 'Landmine Press', primaryMuscle: 'front-shoulders', secondaryMuscles: ['chest', 'triceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Empty bar × 10 each side', coachingCue: 'Press forward and up without leaning back.' }),
  libraryExercise({ id: 'arnold-press', workout: 'B', order: 7, name: 'Arnold Press', primaryMuscle: 'front-shoulders', secondaryMuscles: ['side-shoulders', 'triceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Rotate smoothly and avoid arching.' }),
  libraryExercise({ id: 'cable-lateral-raise', workout: 'A', order: 9, name: 'Cable Lateral Raise', primaryMuscle: 'side-shoulders', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Lead with the elbow and keep tension continuous.' }),
  libraryExercise({ id: 'machine-lateral-raise', workout: 'A', order: 10, name: 'Machine Lateral Raise', primaryMuscle: 'side-shoulders', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'One light set', coachingCue: 'Raise with control and pause before lowering.' }),
  libraryExercise({ id: 'lean-away-lateral-raise', workout: 'A', order: 11, name: 'Lean-away DB Lateral Raise', primaryMuscle: 'side-shoulders', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'One very light set', coachingCue: 'Use a stable support and avoid swinging.' }),
  libraryExercise({ id: 'reverse-pec-deck', workout: 'C', order: 5, name: 'Reverse Pec Deck', primaryMuscle: 'rear-shoulders', secondaryMuscles: ['upper-back'], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Keep chest supported and move from the rear delts.' }),
  libraryExercise({ id: 'cable-rear-delt-fly', workout: 'C', order: 6, name: 'Cable Rear-delt Fly', primaryMuscle: 'rear-shoulders', secondaryMuscles: ['upper-back'], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Keep arms softly bent and avoid shrugging.' }),
  libraryExercise({ id: 'incline-rear-delt-fly', workout: 'C', order: 7, name: 'Incline DB Rear-delt Fly', primaryMuscle: 'rear-shoulders', secondaryMuscles: ['upper-back'], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'One light set', coachingCue: 'Use a light load and move slowly.' }),
  libraryExercise({ id: 'overhead-cable-triceps-extension', workout: 'B', order: 8, name: 'Overhead Cable Triceps Extension', primaryMuscle: 'triceps', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Keep elbows pointed forward and steady.' }),
  libraryExercise({ id: 'single-arm-cable-pushdown', workout: 'B', order: 9, name: 'Single-arm Cable Pushdown', primaryMuscle: 'triceps', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12 each side', coachingCue: 'Keep your elbow pinned to your side.' }),
  libraryExercise({ id: 'db-overhead-triceps-extension', workout: 'B', order: 10, name: 'DB Overhead Triceps Extension', primaryMuscle: 'triceps', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'One light set', coachingCue: 'Keep elbows narrow and ribs down.' }),
  libraryExercise({ id: 'hammer-curl', workout: 'C', order: 8, name: 'Hammer Curl', primaryMuscle: 'biceps', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Keep palms facing in and avoid swinging.' }),
  libraryExercise({ id: 'incline-db-curl', workout: 'C', order: 9, name: 'Incline DB Curl', primaryMuscle: 'biceps', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Keep upper arms behind the torso and control the stretch.' }),
  libraryExercise({ id: 'cable-curl', workout: 'C', order: 10, name: 'Cable Curl', primaryMuscle: 'biceps', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Keep elbows still and squeeze at the top.' }),
  libraryExercise({ id: 'assisted-pull-up', workout: 'C', order: 11, name: 'Assisted Pull-up', primaryMuscle: 'back-lats', secondaryMuscles: ['biceps', 'upper-back'], repRange: { min: 6, max: 10 }, targetReps: [6, 6, 6], warmup: 'Choose assistance for easy controlled reps', coachingCue: 'Pull elbows toward ribs without kicking.' }),
  libraryExercise({ id: 'neutral-grip-pulldown', workout: 'C', order: 12, name: 'Neutral-grip Lat Pulldown', primaryMuscle: 'back-lats', secondaryMuscles: ['biceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Light stack × 10', coachingCue: 'Keep chest tall and pull elbows down.' }),
  libraryExercise({ id: 'straight-arm-pulldown', workout: 'C', order: 13, name: 'Straight-arm Cable Pulldown', primaryMuscle: 'back-lats', secondaryMuscles: ['triceps'], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Keep arms nearly straight and sweep toward thighs.' }),
  libraryExercise({ id: 'seated-cable-row', workout: 'C', order: 14, name: 'Seated Cable Row', primaryMuscle: 'upper-back', secondaryMuscles: ['back-lats', 'rear-shoulders', 'biceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Light stack × 10', coachingCue: 'Reach forward with control, then pull elbows back.' }),
  libraryExercise({ id: 'machine-row', workout: 'C', order: 15, name: 'Machine Row', primaryMuscle: 'upper-back', secondaryMuscles: ['back-lats', 'rear-shoulders', 'biceps'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Keep chest supported and do not shrug.' }),
  libraryExercise({ id: 'single-arm-cable-row', workout: 'C', order: 16, name: 'Single-arm Cable Row', primaryMuscle: 'upper-back', secondaryMuscles: ['back-lats', 'rear-shoulders', 'biceps'], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 10 each side', coachingCue: 'Keep torso stable and pull elbow toward your hip.' }),
  libraryExercise({ id: 'leg-press', workout: 'B', order: 11, name: 'Leg Press', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Two light ramp-up sets', coachingCue: 'Keep lower back against the pad and knees tracking toes.' }),
  libraryExercise({ id: 'goblet-squat', workout: 'B', order: 12, name: 'Goblet Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'core'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Bodyweight × 10, then light load', coachingCue: 'Stay upright and let knees track over toes.' }),
  libraryExercise({ id: 'hack-or-smith-squat', workout: 'B', order: 13, name: 'Hack Squat / Smith Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Two light ramp-up sets', coachingCue: 'Use the version that lets you squat deeply with control.' }),
  libraryExercise({ id: 'seated-leg-curl', workout: 'B', order: 14, name: 'Seated Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Keep hips down and squeeze through the curl.' }),
  libraryExercise({ id: 'lying-leg-curl', workout: 'B', order: 15, name: 'Lying Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Keep hips pressed into the pad.' }),
  libraryExercise({ id: 'db-rdl', workout: 'B', order: 16, name: 'DB Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One light set', coachingCue: 'Keep dumbbells close and hinge at the hips.' }),
  libraryExercise({ id: 'hip-thrust', workout: 'B', order: 17, name: 'Hip Thrust', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Bodyweight × 10, then light load', coachingCue: 'Pause at the top without overextending the lower back.' }),
  libraryExercise({ id: 'glute-bridge', workout: 'B', order: 18, name: 'Glute Bridge', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Bodyweight × 12', coachingCue: 'Keep ribs down and squeeze at the top.' }),
  libraryExercise({ id: 'cable-pull-through', workout: 'B', order: 19, name: 'Cable Pull-through', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Hinge back, then finish by squeezing the glutes.' }),
  libraryExercise({ id: 'standing-calf-raise', workout: 'B', order: 20, name: 'Standing Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Bodyweight × 15', coachingCue: 'Use a full stretch and pause at the top.' }),
  libraryExercise({ id: 'seated-calf-raise', workout: 'B', order: 21, name: 'Seated Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'One light set', coachingCue: 'Control the bottom stretch and avoid bouncing.' }),
  libraryExercise({ id: 'leg-press-calf-raise', workout: 'B', order: 22, name: 'Leg-press Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light sled × 15', coachingCue: 'Move only through the ankles with knees soft.' }),
  libraryExercise({ id: 'cable-crunch', workout: 'B', order: 23, name: 'Cable Crunch', primaryMuscle: 'core', secondaryMuscles: [], repRange: { min: 10, max: 15 }, targetReps: [10, 10, 10], warmup: 'Light stack × 12', coachingCue: 'Curl ribs toward hips instead of pulling with arms.' }),
  libraryExercise({ id: 'hanging-knee-raise', workout: 'B', order: 24, name: 'Hanging Knee Raise', primaryMuscle: 'core', secondaryMuscles: [], repRange: { min: 8, max: 15 }, targetReps: [8, 8, 8], warmup: 'A few controlled reps', coachingCue: 'Avoid swinging and curl the pelvis upward.' }),
  libraryExercise({ id: 'dead-bug', workout: 'B', order: 25, name: 'Dead Bug', primaryMuscle: 'core', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'One easy set each side', coachingCue: 'Keep the lower back gently pressed into the floor.' }),
  libraryExercise({ id: 'pallof-press', workout: 'B', order: 26, name: 'Pallof Press', primaryMuscle: 'core', secondaryMuscles: [], repRange: { min: 8, max: 12 }, targetReps: [8, 8, 8], warmup: 'Light stack × 10 each side', coachingCue: 'Press straight out and resist rotation.' }),
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

function unstartedProgression(exercise: Exercise): ExerciseProgression {
  const nextTargetReps = [...exercise.targetReps]
  return {
    exerciseId: exercise.id,
    currentWeightKg: 0,
    lastResult: 'No result yet',
    nextTarget: `Choose a starting load; aim for ${nextTargetReps.join(' / ')}`,
    nextTargetReps,
    limitingFactor: '',
    decision: 'Repeat',
    notes: '',
    incrementKg: 2.5,
  }
}

const seededProgressionIds = new Set(progressionSeed.map(([exerciseId]) => exerciseId))

export const syntheticProgressions: ExerciseProgression[] = [
  ...progressionSeed.map(
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
  ),
  ...syntheticExercises.filter((exercise) => !seededProgressionIds.has(exercise.id)).map(unstartedProgression),
]

function cloneExercise(exercise: Exercise): Exercise {
  return { ...exercise, repRange: { ...exercise.repRange }, targetReps: [...exercise.targetReps], secondaryMuscles: [...exercise.secondaryMuscles] }
}

/** Adds catalogue entries to existing workspaces without changing their default A/B/C plans or workout history. */
export function mergeExerciseLibrary(state: FitnessState): FitnessState {
  const existingExerciseIds = new Set(state.exercises.map((exercise) => exercise.id))
  const addedExercises = syntheticExercises.filter((exercise) => !existingExerciseIds.has(exercise.id)).map(cloneExercise)
  if (!addedExercises.length) return state

  const ensureProgressions = (progressions: ExerciseProgression[]) => {
    const existingIds = new Set(progressions.map((progression) => progression.exerciseId))
    return [...progressions, ...addedExercises.filter((exercise) => !existingIds.has(exercise.id)).map(unstartedProgression)]
  }

  return {
    ...state,
    exercises: [...state.exercises, ...addedExercises],
    progressions: ensureProgressions(state.progressions),
    progressionBaselines: ensureProgressions(state.progressionBaselines),
  }
}

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
