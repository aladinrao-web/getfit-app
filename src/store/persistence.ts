import { createPersonalState, createSyntheticState } from '../data/seed'
import { getSystemTimeZone } from '../domain/date'
import { canCompleteCheckIn } from '../domain/checkIn'
import type { AppMode, FitnessState } from '../domain/types'

export const SCHEMA_VERSION = 3
export const ACTIVE_MODE_KEY = 'getfit-active-mode-v1'
export const LEGACY_DEMO_KEY = 'getfit-demo-state-v1'
export const PRE_CHANGE_BACKUP_KEY = 'getfit-personal-pre-change-backup-v1'
export const MODE_STORAGE_KEYS: Record<AppMode, string> = {
  demo: 'getfit-demo-state-v2',
  personal: 'getfit-personal-state-v1',
}

export interface PersistedFitnessState {
  schemaVersion: typeof SCHEMA_VERSION
  mode: AppMode
  createdAt: string
  updatedAt: string
  state: FitnessState
}

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function initialState(mode: AppMode) {
  return mode === 'demo' ? createSyntheticState() : createPersonalState()
}

export function normalizeState(state: FitnessState, mode: AppMode, inferLegacyCompletion = false): FitnessState {
  const timezone = state.profile.timezone || (mode === 'demo' ? 'Asia/Calcutta' : getSystemTimeZone())
  const progressionBaselines = state.progressionBaselines?.length
    ? state.progressionBaselines
    : state.progressions.map((progression) => ({ ...progression }))
  return {
    ...state,
    profile: {
      ...state.profile,
      timezone,
      startingWeightKg: state.profile.startingWeightKg ?? (mode === 'demo' ? 66.8 : state.profile.currentWeightKg),
    },
    checkIns: state.checkIns.map((entry) => {
      const normalized = {
        ...entry,
        id: entry.id || `${mode}-checkin-${entry.date}`,
        adherence: entry.adherence ?? {},
        updatedAt: entry.updatedAt || `${entry.date}T20:00:00.000Z`,
      }
      return {
        ...normalized,
        completedAt: entry.completedAt || (inferLegacyCompletion && canCompleteCheckIn(normalized) ? `${entry.date}T20:00:00.000Z` : undefined),
      }
    }),
    progressionBaselines: progressionBaselines.map((progression) => ({ ...progression })),
  }
}

function readEnvelope(storage: StorageAdapter, mode: AppMode): PersistedFitnessState | null {
  const raw = storage.getItem(MODE_STORAGE_KEYS[mode])
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PersistedFitnessState & { schemaVersion: number }
    if (parsed.schemaVersion < 1 || parsed.schemaVersion > SCHEMA_VERSION || parsed.mode !== mode || !parsed.state) return null
    return { ...parsed, schemaVersion: SCHEMA_VERSION, state: normalizeState(parsed.state, mode, parsed.schemaVersion < 2) }
  } catch {
    return null
  }
}

function migrateLegacyDemo(storage: StorageAdapter) {
  const raw = storage.getItem(LEGACY_DEMO_KEY)
  if (!raw) return null
  try {
    const state = normalizeState(JSON.parse(raw) as FitnessState, 'demo', true)
    saveModeState(storage, 'demo', state)
    storage.removeItem(LEGACY_DEMO_KEY)
    return state
  } catch {
    return null
  }
}

export function loadActiveMode(storage: StorageAdapter): AppMode {
  return storage.getItem(ACTIVE_MODE_KEY) === 'personal' ? 'personal' : 'demo'
}

export function saveActiveMode(storage: StorageAdapter, mode: AppMode) {
  storage.setItem(ACTIVE_MODE_KEY, mode)
}

export function loadModeState(storage: StorageAdapter, mode: AppMode) {
  const envelope = readEnvelope(storage, mode)
  if (envelope) return envelope.state
  if (mode === 'demo') {
    const migrated = migrateLegacyDemo(storage)
    if (migrated) return migrated
  }
  return initialState(mode)
}

export function saveModeState(storage: StorageAdapter, mode: AppMode, state: FitnessState, now = new Date()) {
  const existing = readEnvelope(storage, mode)
  const timestamp = now.toISOString()
  const envelope: PersistedFitnessState = {
    schemaVersion: SCHEMA_VERSION,
    mode,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    state: normalizeState(state, mode),
  }
  storage.setItem(MODE_STORAGE_KEYS[mode], JSON.stringify(envelope))
}

export function resetModeState(storage: StorageAdapter, mode: AppMode) {
  storage.removeItem(MODE_STORAGE_KEYS[mode])
  return initialState(mode)
}

export function savePreChangeBackup(storage: StorageAdapter, serializedBackup: string) {
  storage.setItem(PRE_CHANGE_BACKUP_KEY, serializedBackup)
}

export function loadPreChangeBackup(storage: StorageAdapter) {
  return storage.getItem(PRE_CHANGE_BACKUP_KEY)
}
