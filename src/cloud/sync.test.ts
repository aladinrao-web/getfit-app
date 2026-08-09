import { describe, expect, it } from 'vitest'
import { createPersonalState } from '../data/seed'
import {
  decideSync,
  loadCloudSyncMetadata,
  planConflictResolution,
  saveCloudSyncMetadata,
  summarizeFitnessState,
  type CloudSyncMetadata,
} from './sync'

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const metadata: CloudSyncMetadata = {
  userId: 'user-1',
  baseRevision: 4,
  lastSyncedAt: '2026-08-08T18:00:00.000Z',
  lastSyncedHash: 'same',
}

describe('cloud reconciliation', () => {
  it('seeds an empty cloud from the local Personal workspace', () => {
    expect(decideSync(null, null, 'local')).toBe('create-cloud')
  })

  it('treats cloud as authoritative on a new browser', () => {
    expect(decideSync(4, null, 'local')).toBe('pull-cloud')
  })

  it('pushes a local edit when the cloud revision has not changed', () => {
    expect(decideSync(4, metadata, 'changed')).toBe('push-local')
  })

  it('pulls a remote edit when local state is unchanged', () => {
    expect(decideSync(5, metadata, 'same')).toBe('pull-cloud')
  })

  it('flags concurrent local and remote edits instead of overwriting either', () => {
    expect(decideSync(5, metadata, 'changed')).toBe('conflict')
  })

  it('round-trips revision metadata per user', () => {
    const storage = new MemoryStorage()
    saveCloudSyncMetadata(storage, metadata)
    saveCloudSyncMetadata(storage, { ...metadata, userId: 'user-2' })
    expect(loadCloudSyncMetadata(storage, 'user-1')).toEqual(metadata)
    expect(loadCloudSyncMetadata(storage, 'user-2')?.userId).toBe('user-2')
  })

  it('summarizes the records needed to compare device and cloud copies', () => {
    const state = createPersonalState()
    state.checkIns.push({
      id: 'check-in-1',
      date: '2026-08-09',
      adherence: {},
      extrasProteinG: 0,
      extrasCalories: 0,
      notes: '',
      updatedAt: '2026-08-09T08:00:00.000Z',
    })

    expect(summarizeFitnessState(state)).toEqual({
      checkIns: 1,
      workouts: 0,
      progressionTargets: state.progressions.length,
      hasWorkoutDraft: false,
    })
  })

  it('archives the device copy before applying the cloud copy', () => {
    const deviceState = createPersonalState()
    const cloudState = { ...createPersonalState(), checkIns: [{
      id: 'cloud-check-in',
      date: '2026-08-09',
      adherence: {},
      extrasProteinG: 0,
      extrasCalories: 0,
      notes: '',
      updatedAt: '2026-08-09T09:00:00.000Z',
    }] }

    expect(planConflictResolution('use-cloud', deviceState, cloudState, 7)).toEqual({
      stateToArchive: deviceState,
      stateToApplyOnDevice: cloudState,
      stateToWriteToCloud: null,
      expectedCloudRevision: null,
    })
  })

  it('archives the cloud copy and uses its latest revision before keeping the device copy', () => {
    const deviceState = createPersonalState()
    const cloudState = createPersonalState()

    expect(planConflictResolution('keep-device', deviceState, cloudState, 7)).toEqual({
      stateToArchive: cloudState,
      stateToApplyOnDevice: null,
      stateToWriteToCloud: deviceState,
      expectedCloudRevision: 7,
    })
  })
})
