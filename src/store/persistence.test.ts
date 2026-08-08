import { describe, expect, it } from 'vitest'
import { createSyntheticState } from '../data/seed'
import {
  ACTIVE_MODE_KEY,
  LEGACY_DEMO_KEY,
  MODE_STORAGE_KEYS,
  SCHEMA_VERSION,
  loadActiveMode,
  loadModeState,
  saveActiveMode,
  saveModeState,
} from './persistence'

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private values = new Map<string, string>()

  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('mode persistence', () => {
  it('keeps Demo and Personal state in separate versioned envelopes', () => {
    const storage = new MemoryStorage()
    const demo = createSyntheticState()
    const personal = loadModeState(storage, 'personal')
    personal.profile.name = 'Local test athlete'

    saveModeState(storage, 'demo', demo, new Date('2026-08-08T10:00:00.000Z'))
    saveModeState(storage, 'personal', personal, new Date('2026-08-08T10:01:00.000Z'))

    expect(JSON.parse(storage.getItem(MODE_STORAGE_KEYS.demo)!).schemaVersion).toBe(SCHEMA_VERSION)
    expect(JSON.parse(storage.getItem(MODE_STORAGE_KEYS.personal)!).mode).toBe('personal')
    expect(loadModeState(storage, 'demo').profile.name).toBe('Demo Athlete')
    expect(loadModeState(storage, 'personal').profile.name).toBe('Local test athlete')
  })

  it('persists the active mode independently from either dataset', () => {
    const storage = new MemoryStorage()
    expect(loadActiveMode(storage)).toBe('demo')
    saveActiveMode(storage, 'personal')
    expect(storage.getItem(ACTIVE_MODE_KEY)).toBe('personal')
    expect(loadActiveMode(storage)).toBe('personal')
  })

  it('migrates the legacy demo blob and assigns stable check-in IDs', () => {
    const storage = new MemoryStorage()
    const legacy = createSyntheticState()
    const legacyWithoutNewFields = {
      ...legacy,
      profile: { ...legacy.profile, timezone: undefined },
      checkIns: legacy.checkIns.map(({ id: _id, ...entry }) => entry),
    }
    storage.setItem(LEGACY_DEMO_KEY, JSON.stringify(legacyWithoutNewFields))

    const migrated = loadModeState(storage, 'demo')

    expect(migrated.profile.timezone).toBe('Asia/Calcutta')
    expect(migrated.checkIns[0].id).toBe(`demo-checkin-${migrated.checkIns[0].date}`)
    expect(storage.getItem(LEGACY_DEMO_KEY)).toBeNull()
    expect(storage.getItem(MODE_STORAGE_KEYS.demo)).not.toBeNull()
  })

  it('migrates schema-one completed check-ins without losing their completion state', () => {
    const storage = new MemoryStorage()
    const legacy = createSyntheticState()
    const state = {
      ...legacy,
      checkIns: legacy.checkIns.map(({ updatedAt: _updatedAt, completedAt: _completedAt, ...entry }) => entry),
    }
    storage.setItem(MODE_STORAGE_KEYS.demo, JSON.stringify({ schemaVersion: 1, mode: 'demo', createdAt: '2026-08-08T10:00:00.000Z', updatedAt: '2026-08-08T10:00:00.000Z', state }))

    const migrated = loadModeState(storage, 'demo')

    expect(migrated.checkIns[0].updatedAt).toBeTruthy()
    expect(migrated.checkIns[0].completedAt).toBeTruthy()
  })

  it('creates correction baselines when loading a pre-schema-three workspace', () => {
    const storage = new MemoryStorage()
    const current = createSyntheticState()
    const { progressionBaselines: _progressionBaselines, ...state } = current
    storage.setItem(MODE_STORAGE_KEYS.demo, JSON.stringify({ schemaVersion: 2, mode: 'demo', createdAt: '2026-08-08T10:00:00.000Z', updatedAt: '2026-08-08T10:00:00.000Z', state }))

    const migrated = loadModeState(storage, 'demo')

    expect(migrated.progressionBaselines).toEqual(migrated.progressions)
    expect(migrated.progressionBaselines).not.toBe(migrated.progressions)
  })
})
