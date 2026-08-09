import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createPersonalBackup, parsePersonalState, serializePersonalBackup } from '../domain/backup'
import type { AppMode, FitnessState } from '../domain/types'
import { loadModeStateUpdatedAt, normalizeState, savePreChangeBackup, SCHEMA_VERSION } from '../store/persistence'
import { cloudConfigured, supabase } from './client'
import type { Json } from './database.types'
import {
  type ConflictResolutionChoice,
  type FitnessStateSummary,
  decideSync,
  loadCloudSyncMetadata,
  planConflictResolution,
  saveCloudSyncMetadata,
  stateHash,
  summarizeFitnessState,
} from './sync'

export type CloudAuthStatus = 'unavailable' | 'loading' | 'signed-out' | 'signed-in'
export type CloudSyncStatus = 'unconfigured' | 'local-only' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error'

export interface PersonalCloudConflict {
  cloudRevision: number
  cloudUpdatedAt: string
  deviceUpdatedAt: string | null
  cloudSummary: FitnessStateSummary
}

export interface PersonalCloudValue {
  configured: boolean
  authStatus: CloudAuthStatus
  authBusy: boolean
  userEmail: string | null
  syncStatus: CloudSyncStatus
  message: string
  lastSyncedAt: string | null
  conflict: PersonalCloudConflict | null
  resolutionBusy: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  resolveConflict: (choice: ConflictResolutionChoice) => Promise<void>
}

interface PersonalCloudOptions {
  mode: AppMode
  state: FitnessState
  onRemoteState: (state: FitnessState) => void
}

interface ConflictContext extends PersonalCloudConflict {
  cloudState: FitnessState
}

interface RemoteSnapshot {
  state: Json
  schema_version: number
  revision: number
  updated_at: string
}

function isConflict(error: { code?: string; message?: string }) {
  return error.code === '40001' || error.message?.includes('fitness_snapshot_conflict')
}

function parseRemoteSnapshot(remote: RemoteSnapshot) {
  if (remote.schema_version > SCHEMA_VERSION) {
    throw new Error('The cloud data was created by a newer getFit build.')
  }
  return normalizeState(parsePersonalState(remote.state), 'personal')
}

function archiveSafetyCopy(state: FitnessState) {
  savePreChangeBackup(window.localStorage, serializePersonalBackup(createPersonalBackup(state)))
}

export function usePersonalCloud({ mode, state, onRemoteState }: PersonalCloudOptions): PersonalCloudValue {
  const [user, setUser] = useState<User | null>(null)
  const [authStatus, setAuthStatus] = useState<CloudAuthStatus>(cloudConfigured ? 'loading' : 'unavailable')
  const [authBusy, setAuthBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(cloudConfigured ? 'local-only' : 'unconfigured')
  const [message, setMessage] = useState(cloudConfigured ? 'Sign in to sync your Personal workspace.' : 'Cloud configuration is not available in this build.')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [conflict, setConflict] = useState<PersonalCloudConflict | null>(null)
  const [resolutionBusy, setResolutionBusy] = useState(false)
  const stateRef = useRef(state)
  const modeRef = useRef(mode)
  const hydratedUserRef = useRef<string | null>(null)
  const remoteStateHashRef = useRef<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const syncInFlightRef = useRef<Promise<void> | null>(null)
  const syncRequestedRef = useRef(false)
  const conflictRef = useRef<ConflictContext | null>(null)
  const resolutionInFlightRef = useRef(false)

  stateRef.current = state
  modeRef.current = mode

  const clearConflict = useCallback(() => {
    conflictRef.current = null
    setConflict(null)
  }, [])

  const rememberConflict = useCallback((remote: RemoteSnapshot) => {
    const cloudState = parseRemoteSnapshot(remote)
    const nextConflict: ConflictContext = {
      cloudRevision: remote.revision,
      cloudUpdatedAt: remote.updated_at,
      deviceUpdatedAt: loadModeStateUpdatedAt(window.localStorage, 'personal'),
      cloudSummary: summarizeFitnessState(cloudState),
      cloudState,
    }
    conflictRef.current = nextConflict
    setConflict({
      cloudRevision: nextConflict.cloudRevision,
      cloudUpdatedAt: nextConflict.cloudUpdatedAt,
      deviceUpdatedAt: nextConflict.deviceUpdatedAt,
      cloudSummary: nextConflict.cloudSummary,
    })
  }, [])

  const runSync = useCallback(async (userId: string) => {
    if (!supabase || modeRef.current !== 'personal') return
    const client = supabase
    if (resolutionInFlightRef.current) {
      syncRequestedRef.current = true
      return
    }
    if (syncInFlightRef.current) {
      syncRequestedRef.current = true
      return syncInFlightRef.current
    }

    const task = (async () => {
      setSyncStatus('syncing')
      setMessage('Checking the latest Personal workspace…')

      const { data: remote, error: readError } = await client
        .from('fitness_snapshots')
        .select('state, schema_version, revision, updated_at')
        .eq('user_id', userId)
        .maybeSingle()

      if (readError) {
        setSyncStatus(navigator.onLine ? 'error' : 'offline')
        setMessage(navigator.onLine ? `Cloud read failed: ${readError.message}` : 'You are offline. Local changes are safe and will retry when you reconnect.')
        return
      }
      if (modeRef.current !== 'personal') return

      const localState = stateRef.current
      const localHash = stateHash(localState)
      const metadata = loadCloudSyncMetadata(window.localStorage, userId)
      const decision = decideSync(remote?.revision ?? null, metadata, localHash)

      async function saveSnapshot(expectedRevision: number) {
        const { data, error } = await client.rpc('save_fitness_snapshot', {
          p_expected_revision: expectedRevision,
          p_schema_version: SCHEMA_VERSION,
          p_state: localState as unknown as Json,
        })

        if (error) {
          if (isConflict(error)) {
            setSyncStatus('syncing')
            setMessage('The cloud changed while this device was saving. Refreshing both copies…')
            syncRequestedRef.current = true
          } else {
            setSyncStatus(navigator.onLine ? 'error' : 'offline')
            setMessage(navigator.onLine ? `Cloud save failed: ${error.message}` : 'You are offline. Local changes are safe and will retry when you reconnect.')
          }
          return false
        }

        const saved = data?.[0]
        if (!saved) {
          setSyncStatus('error')
          setMessage('The cloud save completed without returning a revision. Local data was preserved.')
          return false
        }

        saveCloudSyncMetadata(window.localStorage, {
          userId,
          baseRevision: saved.revision,
          lastSyncedAt: saved.updated_at,
          lastSyncedHash: localHash,
        })
        clearConflict()
        hydratedUserRef.current = userId
        setLastSyncedAt(saved.updated_at)
        setSyncStatus('synced')
        setMessage('Personal workspace is up to date on this device and in the cloud.')
        return true
      }

      if (decision === 'create-cloud') {
        await saveSnapshot(0)
        return
      }

      if (decision === 'push-local') {
        await saveSnapshot(metadata!.baseRevision)
        return
      }

      if (decision === 'conflict') {
        try {
          if (!remote) throw new Error('The conflicting cloud snapshot is unavailable.')
          rememberConflict(remote)
          hydratedUserRef.current = userId
          setLastSyncedAt(metadata?.lastSyncedAt ?? null)
          setSyncStatus('conflict')
          setMessage('This device and the cloud both changed. Choose which complete copy should become current.')
        } catch (error) {
          clearConflict()
          setSyncStatus('error')
          setMessage(error instanceof Error ? error.message : 'The conflicting cloud snapshot could not be validated. Local data was preserved.')
        }
        return
      }

      if (decision === 'pull-cloud' && remote) {
        try {
          const remoteState = parseRemoteSnapshot(remote)
          const remoteHash = stateHash(remoteState)
          archiveSafetyCopy(localState)
          saveCloudSyncMetadata(window.localStorage, {
            userId,
            baseRevision: remote.revision,
            lastSyncedAt: remote.updated_at,
            lastSyncedHash: remoteHash,
          })
          remoteStateHashRef.current = remoteHash
          stateRef.current = remoteState
          onRemoteState(remoteState)
          clearConflict()
          hydratedUserRef.current = userId
          setLastSyncedAt(remote.updated_at)
          setSyncStatus('synced')
          setMessage('Cloud changes were loaded after preserving a local safety copy.')
        } catch (error) {
          setSyncStatus('error')
          setMessage(error instanceof Error ? error.message : 'The cloud snapshot could not be validated. Local data was preserved.')
        }
        return
      }

      hydratedUserRef.current = userId
      clearConflict()
      setLastSyncedAt(remote?.updated_at ?? metadata?.lastSyncedAt ?? null)
      setSyncStatus('synced')
      setMessage('Personal workspace is up to date on this device and in the cloud.')
    })().finally(() => {
      syncInFlightRef.current = null
      if (syncRequestedRef.current && modeRef.current === 'personal') {
        syncRequestedRef.current = false
        window.setTimeout(() => void runSync(userId), 0)
      }
    })

    syncInFlightRef.current = task
    return task
  }, [clearConflict, onRemoteState, rememberConflict])

  useEffect(() => {
    if (!supabase) return
    let active = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setAuthStatus('signed-out')
        setSyncStatus('error')
        setMessage(`Session check failed: ${error.message}`)
        return
      }
      const nextUser = data.session?.user ?? null
      setUser(nextUser)
      setAuthStatus(nextUser ? 'signed-in' : 'signed-out')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setAuthStatus(nextUser ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    hydratedUserRef.current = null

    if (!cloudConfigured) return
    if (mode !== 'personal') {
      clearConflict()
      setSyncStatus('local-only')
      setMessage(user ? 'Cloud sync is paused while Demo mode is active.' : 'Sign in from Personal mode to enable cloud sync.')
      return
    }
    if (!user) {
      clearConflict()
      setSyncStatus('local-only')
      setMessage(authStatus === 'loading' ? 'Checking your cloud session…' : 'Sign in to sync your Personal workspace.')
      setLastSyncedAt(null)
      return
    }

    const metadata = loadCloudSyncMetadata(window.localStorage, user.id)
    setLastSyncedAt(metadata?.lastSyncedAt ?? null)
    void runSync(user.id)
  }, [authStatus, clearConflict, mode, runSync, user])

  useEffect(() => {
    if (!user || mode !== 'personal' || hydratedUserRef.current !== user.id) return
    if (conflictRef.current) return
    const localHash = stateHash(state)
    if (remoteStateHashRef.current === localHash) {
      remoteStateHashRef.current = null
      return
    }

    const metadata = loadCloudSyncMetadata(window.localStorage, user.id)
    if (metadata?.lastSyncedHash === localHash) return
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    setSyncStatus('syncing')
    setMessage('Saving local changes…')
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      void runSync(user.id)
    }, 800)

    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    }
  }, [mode, runSync, state, user])

  useEffect(() => {
    if (!user) return
    const retry = () => {
      if (modeRef.current === 'personal') void runSync(user.id)
    }
    const checkVisible = () => {
      if (document.visibilityState === 'visible') retry()
    }
    window.addEventListener('online', retry)
    window.addEventListener('focus', retry)
    document.addEventListener('visibilitychange', checkVisible)
    return () => {
      window.removeEventListener('online', retry)
      window.removeEventListener('focus', retry)
      document.removeEventListener('visibilitychange', checkVisible)
    }
  }, [runSync, user])

  async function signIn(email: string, password: string) {
    if (!supabase) return
    setAuthBusy(true)
    setMessage('Signing in…')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setAuthBusy(false)
    if (error) {
      setSyncStatus('error')
      setMessage(error.code === 'email_not_confirmed'
        ? 'This Personal account must be confirmed in Supabase before signing in.'
        : `Sign-in failed: ${error.message}`)
    }
  }

  async function signOut() {
    if (!supabase) return
    setAuthBusy(true)
    const { error } = await supabase.auth.signOut()
    setAuthBusy(false)
    if (error) {
      setSyncStatus('error')
      setMessage(`Sign-out failed: ${error.message}`)
      return
    }
    hydratedUserRef.current = null
    clearConflict()
    setLastSyncedAt(null)
    setSyncStatus('local-only')
    setMessage('Signed out. Personal data remains available locally on this device.')
  }

  async function syncNow() {
    if (!user || mode !== 'personal') return
    await runSync(user.id)
  }

  async function resolveConflict(choice: ConflictResolutionChoice) {
    if (!supabase || !user || modeRef.current !== 'personal' || resolutionInFlightRef.current) return
    const activeConflict = conflictRef.current
    if (!activeConflict) return

    const client = supabase
    resolutionInFlightRef.current = true
    setResolutionBusy(true)
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    try {
      if (choice === 'use-cloud') {
        setSyncStatus('syncing')
        setMessage('Loading the latest cloud copy…')
        const { data: latestRemote, error } = await client
          .from('fitness_snapshots')
          .select('state, schema_version, revision, updated_at')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          setSyncStatus(navigator.onLine ? 'error' : 'offline')
          setMessage(navigator.onLine ? `Cloud read failed: ${error.message}` : 'You are offline. Both copies remain unchanged; reconnect before resolving the conflict.')
          return
        }
        if (!latestRemote) {
          setSyncStatus('error')
          setMessage('The cloud copy is no longer available. Your device copy was preserved.')
          return
        }

        const latestCloudState = parseRemoteSnapshot(latestRemote)
        const plan = planConflictResolution('use-cloud', stateRef.current, latestCloudState, latestRemote.revision)
        archiveSafetyCopy(plan.stateToArchive)
        const selectedState = plan.stateToApplyOnDevice!
        const selectedHash = stateHash(selectedState)
        saveCloudSyncMetadata(window.localStorage, {
          userId: user.id,
          baseRevision: latestRemote.revision,
          lastSyncedAt: latestRemote.updated_at,
          lastSyncedHash: selectedHash,
        })
        remoteStateHashRef.current = selectedHash
        stateRef.current = selectedState
        onRemoteState(selectedState)
        clearConflict()
        hydratedUserRef.current = user.id
        setLastSyncedAt(latestRemote.updated_at)
        setSyncStatus('synced')
        setMessage('Cloud version applied. The replaced device copy is available as your latest safety copy.')
        return
      }

      setSyncStatus('syncing')
      setMessage('Saving this device copy over the reviewed cloud revision…')
      const plan = planConflictResolution('keep-device', stateRef.current, activeConflict.cloudState, activeConflict.cloudRevision)
      archiveSafetyCopy(plan.stateToArchive)
      const deviceState = plan.stateToWriteToCloud!
      const deviceHash = stateHash(deviceState)
      const { data, error } = await client.rpc('save_fitness_snapshot', {
        p_expected_revision: plan.expectedCloudRevision!,
        p_schema_version: SCHEMA_VERSION,
        p_state: deviceState as unknown as Json,
      })

      if (error) {
        if (isConflict(error)) {
          setSyncStatus('syncing')
          setMessage('The cloud changed again before replacement. Refreshing the comparison without discarding either copy…')
          syncRequestedRef.current = true
        } else {
          setSyncStatus(navigator.onLine ? 'error' : 'offline')
          setMessage(navigator.onLine ? `Cloud save failed: ${error.message}` : 'You are offline. Both copies remain unchanged; reconnect before resolving the conflict.')
        }
        return
      }

      const saved = data?.[0]
      if (!saved) {
        setSyncStatus('error')
        setMessage('The cloud save completed without returning a revision. Both safety copies were preserved.')
        return
      }

      saveCloudSyncMetadata(window.localStorage, {
        userId: user.id,
        baseRevision: saved.revision,
        lastSyncedAt: saved.updated_at,
        lastSyncedHash: deviceHash,
      })
      clearConflict()
      hydratedUserRef.current = user.id
      setLastSyncedAt(saved.updated_at)
      setSyncStatus('synced')
      setMessage('Device version saved to the cloud. The replaced cloud copy is available as your latest safety copy.')
    } catch (error) {
      setSyncStatus('error')
      setMessage(error instanceof Error ? error.message : 'The conflict could not be resolved. Both copies were preserved.')
    } finally {
      resolutionInFlightRef.current = false
      setResolutionBusy(false)
      if (syncRequestedRef.current && modeRef.current === 'personal') {
        syncRequestedRef.current = false
        window.setTimeout(() => void runSync(user.id), 0)
      }
    }
  }

  return {
    configured: cloudConfigured,
    authStatus,
    authBusy,
    userEmail: user?.email ?? null,
    syncStatus,
    message,
    lastSyncedAt,
    conflict,
    resolutionBusy,
    signIn,
    signOut,
    syncNow,
    resolveConflict,
  }
}
