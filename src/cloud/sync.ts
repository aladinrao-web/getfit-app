import type { FitnessState } from '../domain/types'

export const CLOUD_SYNC_METADATA_KEY = 'getfit-personal-cloud-sync-v1'

export interface CloudSyncMetadata {
  userId: string
  baseRevision: number
  lastSyncedAt: string
  lastSyncedHash: string
}

export type SyncDecision = 'create-cloud' | 'push-local' | 'pull-cloud' | 'synced' | 'conflict'
export type ConflictResolutionChoice = 'use-cloud' | 'keep-device'

export interface FitnessStateSummary {
  checkIns: number
  workouts: number
  progressionTargets: number
  hasWorkoutDraft: boolean
}

export interface ConflictResolutionPlan {
  stateToArchive: FitnessState
  stateToApplyOnDevice: FitnessState | null
  stateToWriteToCloud: FitnessState | null
  expectedCloudRevision: number | null
}

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

export function stateHash(state: FitnessState) {
  return JSON.stringify(state)
}

export function decideSync(
  remoteRevision: number | null,
  metadata: CloudSyncMetadata | null,
  localHash: string,
): SyncDecision {
  if (remoteRevision === null) return 'create-cloud'
  if (!metadata) return 'pull-cloud'
  if (remoteRevision < metadata.baseRevision) return 'conflict'

  const localChanged = localHash !== metadata.lastSyncedHash
  if (remoteRevision > metadata.baseRevision) return localChanged ? 'conflict' : 'pull-cloud'
  return localChanged ? 'push-local' : 'synced'
}

export function summarizeFitnessState(state: FitnessState): FitnessStateSummary {
  return {
    checkIns: state.checkIns.length,
    workouts: state.workouts.length,
    progressionTargets: state.progressions.length,
    hasWorkoutDraft: Boolean(state.draftWorkout),
  }
}

export function planConflictResolution(
  choice: ConflictResolutionChoice,
  deviceState: FitnessState,
  cloudState: FitnessState,
  cloudRevision: number,
): ConflictResolutionPlan {
  if (choice === 'use-cloud') {
    return {
      stateToArchive: deviceState,
      stateToApplyOnDevice: cloudState,
      stateToWriteToCloud: null,
      expectedCloudRevision: null,
    }
  }

  return {
    stateToArchive: cloudState,
    stateToApplyOnDevice: null,
    stateToWriteToCloud: deviceState,
    expectedCloudRevision: cloudRevision,
  }
}

function readMetadataMap(storage: StorageAdapter): Record<string, CloudSyncMetadata> {
  try {
    const value = JSON.parse(storage.getItem(CLOUD_SYNC_METADATA_KEY) ?? '{}') as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value as Record<string, CloudSyncMetadata>
  } catch {
    return {}
  }
}

export function loadCloudSyncMetadata(storage: StorageAdapter, userId: string): CloudSyncMetadata | null {
  const metadata = readMetadataMap(storage)[userId]
  if (!metadata
    || metadata.userId !== userId
    || !Number.isInteger(metadata.baseRevision)
    || metadata.baseRevision < 1
    || typeof metadata.lastSyncedAt !== 'string'
    || typeof metadata.lastSyncedHash !== 'string') return null
  return metadata
}

export function saveCloudSyncMetadata(storage: StorageAdapter, metadata: CloudSyncMetadata) {
  storage.setItem(CLOUD_SYNC_METADATA_KEY, JSON.stringify({
    ...readMetadataMap(storage),
    [metadata.userId]: metadata,
  }))
}
