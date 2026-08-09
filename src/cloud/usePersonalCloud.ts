import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { parsePersonalState } from '../domain/backup'
import type { AppMode, FitnessState } from '../domain/types'
import { normalizeState, SCHEMA_VERSION } from '../store/persistence'
import { cloudConfigured, supabase } from './client'
import type { Json } from './database.types'
import {
  decideSync,
  loadCloudSyncMetadata,
  saveCloudSyncMetadata,
  stateHash,
} from './sync'

export type CloudAuthStatus = 'unavailable' | 'loading' | 'signed-out' | 'signed-in'
export type CloudSyncStatus = 'unconfigured' | 'local-only' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error'

export interface PersonalCloudValue {
  configured: boolean
  authStatus: CloudAuthStatus
  authBusy: boolean
  userEmail: string | null
  syncStatus: CloudSyncStatus
  message: string
  lastSyncedAt: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  resendConfirmation: (email: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

interface PersonalCloudOptions {
  mode: AppMode
  state: FitnessState
  onRemoteState: (state: FitnessState) => void
}

function isConflict(error: { code?: string; message?: string }) {
  return error.code === '40001' || error.message?.includes('fitness_snapshot_conflict')
}

export function usePersonalCloud({ mode, state, onRemoteState }: PersonalCloudOptions): PersonalCloudValue {
  const [user, setUser] = useState<User | null>(null)
  const [authStatus, setAuthStatus] = useState<CloudAuthStatus>(cloudConfigured ? 'loading' : 'unavailable')
  const [authBusy, setAuthBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(cloudConfigured ? 'local-only' : 'unconfigured')
  const [message, setMessage] = useState(cloudConfigured ? 'Sign in to sync your Personal workspace.' : 'Cloud configuration is not available in this build.')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const stateRef = useRef(state)
  const modeRef = useRef(mode)
  const hydratedUserRef = useRef<string | null>(null)
  const remoteStateHashRef = useRef<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const syncInFlightRef = useRef<Promise<void> | null>(null)
  const syncRequestedRef = useRef(false)

  stateRef.current = state
  modeRef.current = mode

  const runSync = useCallback(async (userId: string) => {
    if (!supabase || modeRef.current !== 'personal') return
    const client = supabase
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
            setSyncStatus('conflict')
            setMessage('This device and the cloud both changed. Your local copy was preserved; export a backup before resolving the conflict.')
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
        hydratedUserRef.current = userId
        setLastSyncedAt(metadata?.lastSyncedAt ?? null)
        setSyncStatus('conflict')
        setMessage('This device and the cloud both changed. Your local copy was preserved; export a backup before resolving the conflict.')
        return
      }

      if (decision === 'pull-cloud' && remote) {
        try {
          if (remote.schema_version > SCHEMA_VERSION) {
            throw new Error('The cloud data was created by a newer getFit build.')
          }
          const remoteState = normalizeState(parsePersonalState(remote.state), 'personal')
          const remoteHash = stateHash(remoteState)
          saveCloudSyncMetadata(window.localStorage, {
            userId,
            baseRevision: remote.revision,
            lastSyncedAt: remote.updated_at,
            lastSyncedHash: remoteHash,
          })
          remoteStateHashRef.current = remoteHash
          stateRef.current = remoteState
          onRemoteState(remoteState)
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
  }, [onRemoteState])

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
      setSyncStatus('local-only')
      setMessage(user ? 'Cloud sync is paused while Demo mode is active.' : 'Sign in from Personal mode to enable cloud sync.')
      return
    }
    if (!user) {
      setSyncStatus('local-only')
      setMessage(authStatus === 'loading' ? 'Checking your cloud session…' : 'Sign in to sync your Personal workspace.')
      setLastSyncedAt(null)
      return
    }

    const metadata = loadCloudSyncMetadata(window.localStorage, user.id)
    setLastSyncedAt(metadata?.lastSyncedAt ?? null)
    void runSync(user.id)
  }, [authStatus, mode, runSync, user])

  useEffect(() => {
    if (!user || mode !== 'personal' || hydratedUserRef.current !== user.id) return
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
        ? 'Confirm your email before signing in, or resend the confirmation below.'
        : `Sign-in failed: ${error.message}`)
    }
  }

  async function signUp(email: string, password: string) {
    if (!supabase) return
    setAuthBusy(true)
    setMessage('Creating your account…')
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    setAuthBusy(false)
    if (error) {
      setSyncStatus('error')
      setMessage(`Account creation failed: ${error.message}`)
      return
    }
    if (!data.session) {
      setSyncStatus('local-only')
      setMessage('Account created. Confirm the email from Supabase, then return here to sign in.')
    }
  }

  async function resendConfirmation(email: string) {
    if (!supabase || !email.trim()) return
    setAuthBusy(true)
    setMessage('Sending a fresh confirmation email…')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    })
    setAuthBusy(false)
    if (error) {
      setSyncStatus('error')
      setMessage(error.code === 'over_email_send_rate_limit'
        ? 'Please wait a minute before requesting another confirmation email.'
        : `Confirmation email failed: ${error.message}`)
      return
    }
    setSyncStatus('local-only')
    setMessage('Confirmation email sent. Check your inbox and spam folder, then return here to sign in.')
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
    setLastSyncedAt(null)
    setSyncStatus('local-only')
    setMessage('Signed out. Personal data remains available locally on this device.')
  }

  async function syncNow() {
    if (!user || mode !== 'personal') return
    await runSync(user.id)
  }

  return {
    configured: cloudConfigured,
    authStatus,
    authBusy,
    userEmail: user?.email ?? null,
    syncStatus,
    message,
    lastSyncedAt,
    signIn,
    signUp,
    resendConfirmation,
    signOut,
    syncNow,
  }
}
