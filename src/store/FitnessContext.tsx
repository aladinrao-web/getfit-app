import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEMO_TODAY } from '../data/seed'
import { createPersonalBackup, serializePersonalBackup, type PersonalBackup } from '../domain/backup'
import { formatDateInTimeZone } from '../domain/date'
import { createRecordId } from '../domain/ids'
import { applyPersonalPresetBundle, type PersonalPresetBundle } from '../domain/presets'
import { applyWorkoutCompletion, correctWorkoutSession, deleteWorkoutSession, startWorkoutDraft } from '../domain/workout'
import type { AppMode, DailyCheckIn, ExerciseResult, FitnessState, Profile, WorkoutCode, WorkoutSession } from '../domain/types'
import { loadActiveMode, loadModeState, normalizeState, resetModeState, saveActiveMode, saveModeState, savePreChangeBackup } from './persistence'

interface FitnessContextValue {
  mode: AppMode
  state: FitnessState
  today: string
  switchMode: (mode: AppMode) => void
  saveCheckIn: (checkIn: DailyCheckIn) => void
  completeCheckIn: (checkIn: DailyCheckIn) => void
  startWorkout: (code: WorkoutCode) => void
  updateDraftResult: (exerciseId: string, patch: Partial<ExerciseResult>) => void
  updateDraftNotes: (notes: string) => void
  discardDraft: () => void
  completeWorkout: () => void
  correctWorkout: (session: WorkoutSession) => void
  deleteWorkout: (sessionId: string) => void
  updateProfile: (patch: Partial<Profile>) => void
  applyPersonalPresets: (bundle: PersonalPresetBundle) => void
  restorePersonalBackup: (backup: PersonalBackup) => void
  resetCurrentMode: () => void
}

interface Workspace {
  mode: AppMode
  state: FitnessState
}

const FitnessContext = createContext<FitnessContextValue | null>(null)

function upsertCheckIn(state: FitnessState, checkIn: DailyCheckIn): FitnessState {
  const index = state.checkIns.findIndex((entry) => entry.date === checkIn.date)
  const checkIns = [...state.checkIns]
  if (index >= 0) checkIns[index] = { ...checkIn, id: checkIns[index].id }
  else checkIns.push(checkIn)

  return {
    ...state,
    checkIns,
    profile: typeof checkIn.weightKg === 'number'
      ? { ...state.profile, currentWeightKg: checkIn.weightKg }
      : state.profile,
  }
}

function loadWorkspace(): Workspace {
  const mode = loadActiveMode(window.localStorage)
  return { mode, state: loadModeState(window.localStorage, mode) }
}

function archivePersonalState(mode: AppMode, state: FitnessState) {
  if (mode !== 'personal') return
  savePreChangeBackup(window.localStorage, serializePersonalBackup(createPersonalBackup(state)))
}

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(loadWorkspace)
  const [now, setNow] = useState(() => new Date())
  const { mode, state } = workspace
  const today = mode === 'demo' ? DEMO_TODAY : formatDateInTimeZone(now, state.profile.timezone)

  useEffect(() => {
    saveActiveMode(window.localStorage, mode)
    saveModeState(window.localStorage, mode, state)
  }, [mode, state])

  useEffect(() => {
    if (mode === 'demo') return
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [mode])

  const value = useMemo<FitnessContextValue>(() => ({
    mode,
    state,
    today,
    switchMode(nextMode) {
      setWorkspace((current) => current.mode === nextMode ? current : {
        mode: nextMode,
        state: loadModeState(window.localStorage, nextMode),
      })
    },
    saveCheckIn(checkIn) {
      setWorkspace((current) => ({ ...current, state: upsertCheckIn(current.state, checkIn) }))
    },
    completeCheckIn(checkIn) {
      setWorkspace((current) => {
        const existing = current.state.checkIns.find((entry) => entry.date === checkIn.date)
        const timestamp = new Date().toISOString()
        return {
          ...current,
          state: upsertCheckIn(current.state, {
            ...checkIn,
            updatedAt: timestamp,
            completedAt: existing?.completedAt ?? checkIn.completedAt ?? timestamp,
          }),
        }
      })
    },
    startWorkout(code) {
      setWorkspace((current) => current.state.draftWorkout ? current : {
        ...current,
        state: {
          ...current.state,
          draftWorkout: startWorkoutDraft(
            current.state,
            code,
            current.mode === 'demo' ? DEMO_TODAY : formatDateInTimeZone(new Date(), current.state.profile.timezone),
            createRecordId(`${current.mode}-session`),
          ),
        },
      })
    },
    updateDraftResult(exerciseId, patch) {
      setWorkspace((current) => current.state.draftWorkout ? {
        ...current,
        state: {
          ...current.state,
          draftWorkout: {
            ...current.state.draftWorkout,
            results: current.state.draftWorkout.results.map((result) => result.exerciseId === exerciseId ? { ...result, ...patch } : result),
          },
        },
      } : current)
    },
    updateDraftNotes(notes) {
      setWorkspace((current) => current.state.draftWorkout ? {
        ...current,
        state: { ...current.state, draftWorkout: { ...current.state.draftWorkout, sessionNotes: notes } },
      } : current)
    },
    discardDraft() {
      setWorkspace((current) => ({ ...current, state: { ...current.state, draftWorkout: undefined } }))
    },
    completeWorkout() {
      setWorkspace((current) => {
        if (!current.state.draftWorkout) return current
        return { ...current, state: applyWorkoutCompletion(current.state, current.state.draftWorkout) }
      })
    },
    correctWorkout(session) {
      setWorkspace((current) => {
        archivePersonalState(current.mode, current.state)
        return { ...current, state: correctWorkoutSession(current.state, session) }
      })
    },
    deleteWorkout(sessionId) {
      setWorkspace((current) => {
        archivePersonalState(current.mode, current.state)
        return { ...current, state: deleteWorkoutSession(current.state, sessionId) }
      })
    },
    updateProfile(patch) {
      setWorkspace((current) => ({
        ...current,
        state: { ...current.state, profile: { ...current.state.profile, ...patch } },
      }))
    },
    applyPersonalPresets(bundle) {
      setWorkspace((current) => {
        if (current.mode !== 'personal') return current
        return { ...current, state: applyPersonalPresetBundle(current.state, bundle) }
      })
    },
    restorePersonalBackup(backup) {
      setWorkspace((current) => {
        if (current.mode !== 'personal') return current
        archivePersonalState(current.mode, current.state)
        return { ...current, state: normalizeState(backup.state, 'personal') }
      })
    },
    resetCurrentMode() {
      setWorkspace((current) => {
        archivePersonalState(current.mode, current.state)
        return { ...current, state: resetModeState(window.localStorage, current.mode) }
      })
    },
  }), [mode, state, today])

  return <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>
}

export function useFitness() {
  const context = useContext(FitnessContext)
  if (!context) throw new Error('useFitness must be used inside FitnessProvider')
  return context
}
