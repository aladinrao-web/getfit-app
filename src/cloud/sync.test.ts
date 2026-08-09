import { describe, expect, it } from 'vitest'
import { decideSync, loadCloudSyncMetadata, saveCloudSyncMetadata, type CloudSyncMetadata } from './sync'

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
})
