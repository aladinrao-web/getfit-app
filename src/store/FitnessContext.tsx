import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createSyntheticState, DEMO_TODAY } from '../data/seed'
import { applyWorkoutCompletion, startWorkoutDraft } from '../domain/workout'
import type { DailyCheckIn, ExerciseResult, FitnessState, Profile, WorkoutCode } from '../domain/types'

const STORAGE_KEY = 'getfit-demo-state-v1'

interface FitnessContextValue {
  state: FitnessState
  saveCheckIn: (checkIn: DailyCheckIn) => void
  startWorkout: (code: WorkoutCode) => void
  updateDraftResult: (exerciseId: string, patch: Partial<ExerciseResult>) => void
  updateDraftNotes: (notes: string) => void
  discardDraft: () => void
  completeWorkout: () => void
  updateProfile: (patch: Partial<Profile>) => void
  resetDemo: () => void
}

const FitnessContext = createContext<FitnessContextValue | null>(null)

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as FitnessState) : createSyntheticState()
  } catch {
    return createSyntheticState()
  }
}

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FitnessState>(loadState)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<FitnessContextValue>(() => ({
    state,
    saveCheckIn(checkIn) {
      setState((current) => {
        const index = current.checkIns.findIndex((entry) => entry.date === checkIn.date)
        const checkIns = [...current.checkIns]
        if (index >= 0) checkIns[index] = checkIn
        else checkIns.push(checkIn)
        return {
          ...current,
          checkIns,
          profile: typeof checkIn.weightKg === 'number' ? { ...current.profile, currentWeightKg: checkIn.weightKg } : current.profile,
        }
      })
    },
    startWorkout(code) {
      setState((current) => current.draftWorkout ? current : { ...current, draftWorkout: startWorkoutDraft(current, code, DEMO_TODAY) })
    },
    updateDraftResult(exerciseId, patch) {
      setState((current) => current.draftWorkout ? {
        ...current,
        draftWorkout: {
          ...current.draftWorkout,
          results: current.draftWorkout.results.map((result) => result.exerciseId === exerciseId ? { ...result, ...patch } : result),
        },
      } : current)
    },
    updateDraftNotes(notes) {
      setState((current) => current.draftWorkout ? { ...current, draftWorkout: { ...current.draftWorkout, sessionNotes: notes } } : current)
    },
    discardDraft() {
      setState((current) => ({ ...current, draftWorkout: undefined }))
    },
    completeWorkout() {
      setState((current) => {
        if (!current.draftWorkout) return current
        return applyWorkoutCompletion(current, current.draftWorkout)
      })
    },
    updateProfile(patch) {
      setState((current) => ({ ...current, profile: { ...current.profile, ...patch } }))
    },
    resetDemo() {
      const fresh = createSyntheticState()
      window.localStorage.removeItem(STORAGE_KEY)
      setState(fresh)
    },
  }), [state])

  return <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>
}

export function useFitness() {
  const context = useContext(FitnessContext)
  if (!context) throw new Error('useFitness must be used inside FitnessProvider')
  return context
}
