import { getWeightSummary } from './calculations'
import { completedExerciseSets } from './exerciseSets'
import { MUSCLE_TARGETS } from './muscles'
import type { Exercise, FitnessState, MuscleGroup, WorkoutSession } from './types'

const DAY_MS = 86_400_000
const WINDOW_DAYS = 28
const SESSION_GOAL = 12
const SESSION_FLOOR = 8
const EXPOSURE_GOAL = 8

export type MuscleCoverageStatus = 'No data' | 'Neglected' | 'Building' | 'On target' | 'High'

export interface MuscleExerciseContribution {
  exerciseId: string
  exerciseName: string
  role: 'Primary' | 'Secondary'
  effectiveSets: number
}

export interface MuscleCoverageItem {
  muscle: MuscleGroup
  label: string
  effectiveSets: number
  previousEffectiveSets: number
  exposures: number
  weeklyMin: number
  weeklyMax: number
  targetMin: number
  targetMax: number
  status: MuscleCoverageStatus
  exercises: MuscleExerciseContribution[]
}

export interface MuscleCoverageSummary {
  windowDays: typeof WINDOW_DAYS
  sessionCount: number
  sessionGoal: typeof SESSION_GOAL
  completionRate: number | null
  muscles: MuscleCoverageItem[]
}

export interface HomeFocus {
  kind: 'consistency' | 'frequency' | 'workload' | 'coverage' | 'nutrition' | 'progression'
  eyebrow: string
  title: string
  detail: string
}

function dateMs(date: string) {
  return Date.parse(`${date}T00:00:00Z`)
}

function windowBounds(today: string, previous = false) {
  const end = dateMs(today) - (previous ? WINDOW_DAYS * DAY_MS : 0)
  return { start: end - (WINDOW_DAYS - 1) * DAY_MS, end }
}

function sessionsInWindow(workouts: WorkoutSession[], today: string, previous = false) {
  const { start, end } = windowBounds(today, previous)
  return workouts.filter((session) => {
    const time = dateMs(session.date)
    return time >= start && time <= end
  })
}

function resultContribution(exercise: Exercise, setCount: number, muscle: MuscleGroup) {
  if (exercise.primaryMuscle === muscle) return setCount
  return exercise.secondaryMuscles.includes(muscle) ? setCount * 0.5 : 0
}

function contributionsFor(muscle: MuscleGroup, sessions: WorkoutSession[], exercises: Map<string, Exercise>) {
  const byExercise = new Map<string, MuscleExerciseContribution>()
  const perSession = sessions.map((session) => session.results.reduce((total, result) => {
    const exercise = exercises.get(result.exerciseId)
    if (!exercise) return total
    const contribution = resultContribution(exercise, completedExerciseSets(result).length, muscle)
    if (!contribution) return total
    const role = exercise.primaryMuscle === muscle ? 'Primary' : 'Secondary'
    const current = byExercise.get(exercise.id)
    byExercise.set(exercise.id, {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      role,
      effectiveSets: (current?.effectiveSets ?? 0) + contribution,
    })
    return total + contribution
  }, 0))

  return {
    effectiveSets: perSession.reduce((total, sets) => total + sets, 0),
    exposures: perSession.filter((sets) => sets >= 2).length,
    exercises: [...byExercise.values()].sort((left, right) => right.effectiveSets - left.effectiveSets || left.exerciseName.localeCompare(right.exerciseName)),
  }
}

function effectiveSetsFor(muscle: MuscleGroup, sessions: WorkoutSession[], exercises: Map<string, Exercise>) {
  return sessions.reduce((total, session) => total + session.results.reduce((sessionTotal, result) => {
    const exercise = exercises.get(result.exerciseId)
    return sessionTotal + (exercise ? resultContribution(exercise, completedExerciseSets(result).length, muscle) : 0)
  }, 0), 0)
}

function coverageStatus(effectiveSets: number, targetMin: number, targetMax: number, sessionCount: number): MuscleCoverageStatus {
  if (!sessionCount) return 'No data'
  if (effectiveSets < targetMin * 0.5) return 'Neglected'
  if (effectiveSets < targetMin) return 'Building'
  if (effectiveSets <= targetMax) return 'On target'
  return 'High'
}

function workoutCompletionRate(state: FitnessState, sessions: WorkoutSession[]) {
  if (!sessions.length) return null
  const ratios = sessions.map((session) => {
    const planned = state.exercises.filter((exercise) => exercise.workout === session.workout).length
    return planned ? Math.min(1, session.results.length / planned) : 1
  })
  return ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length
}

export function getMuscleCoverage(state: FitnessState, today: string): MuscleCoverageSummary {
  const exercises = new Map(state.exercises.map((exercise) => [exercise.id, exercise]))
  const currentSessions = sessionsInWindow(state.workouts, today)
  const previousSessions = sessionsInWindow(state.workouts, today, true)
  const muscles = MUSCLE_TARGETS.map((target): MuscleCoverageItem => {
    const current = contributionsFor(target.id, currentSessions, exercises)
    const previousEffectiveSets = effectiveSetsFor(target.id, previousSessions, exercises)
    const targetMin = target.weeklyMin * 4
    const targetMax = target.weeklyMax * 4
    return {
      muscle: target.id,
      label: target.label,
      effectiveSets: current.effectiveSets,
      previousEffectiveSets,
      exposures: current.exposures,
      weeklyMin: target.weeklyMin,
      weeklyMax: target.weeklyMax,
      targetMin,
      targetMax,
      status: coverageStatus(current.effectiveSets, targetMin, targetMax, currentSessions.length),
      exercises: current.exercises,
    }
  })

  return {
    windowDays: WINDOW_DAYS,
    sessionCount: currentSessions.length,
    sessionGoal: SESSION_GOAL,
    completionRate: workoutCompletionRate(state, currentSessions),
    muscles,
  }
}

function mostUnderTarget(muscles: MuscleCoverageItem[]) {
  return [...muscles]
    .filter((muscle) => muscle.effectiveSets < muscle.targetMin)
    .sort((left, right) => (left.effectiveSets / left.targetMin) - (right.effectiveSets / right.targetMin) || right.targetMin - left.targetMin)[0]
}

export function getHomeFocus(state: FitnessState, today: string, summary = getMuscleCoverage(state, today)): HomeFocus {
  if (summary.sessionCount < SESSION_FLOOR) {
    return {
      kind: 'consistency',
      eyebrow: '28-day training focus',
      title: 'Build workout consistency first',
      detail: `${summary.sessionCount} workouts completed. Do the next A/B/C session before changing exercises.`,
    }
  }
  if (summary.sessionCount < SESSION_GOAL) {
    return {
      kind: 'frequency',
      eyebrow: '28-day training focus',
      title: 'Move toward three workouts a week',
      detail: `${summary.sessionCount} of ${SESSION_GOAL} guideline sessions completed. Frequency is the highest-value next step.`,
    }
  }
  if (summary.completionRate !== null && summary.completionRate < 0.75) {
    return {
      kind: 'workload',
      eyebrow: '28-day training focus',
      title: 'Complete more of the current workouts',
      detail: `About ${Math.round(summary.completionRate * 100)}% of planned exercises were completed. Add workload before changing the plan.`,
    }
  }

  const lowMuscle = mostUnderTarget(summary.muscles)
  if (lowMuscle) {
    const exposureCopy = lowMuscle.exposures < EXPOSURE_GOAL
      ? `It had ${lowMuscle.exposures} meaningful exposures; add a small coverage block on another day.`
      : `It recorded ${lowMuscle.effectiveSets} effective sets; add 2–3 working sets.`
    return {
      kind: 'coverage',
      eyebrow: '28-day muscle focus',
      title: `${lowMuscle.label} needs more coverage`,
      detail: exposureCopy,
    }
  }

  const weight = getWeightSummary(state.checkIns, state.profile)
  if (weight.changeRate !== null && weight.changeRate < state.profile.weeklyGainMin) {
    return {
      kind: 'nutrition',
      eyebrow: 'Goal-weight focus',
      title: 'Training is covered. Review nutrition.',
      detail: `Your muscle workload is on target, but weight gain is below the goal band. Review intake before adding exercise.`,
    }
  }

  return {
    kind: 'progression',
    eyebrow: '28-day training focus',
    title: 'Coverage is in range',
    detail: 'Keep the A/B/C rhythm and focus on progressing weight, reps, and technique.',
  }
}
