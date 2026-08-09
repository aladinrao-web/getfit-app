import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, ArchiveRestore, Cloud, CloudOff, Database, FileDown, FileUp, LogIn, LogOut, RefreshCw, RotateCcw, Save, Settings2, ShieldCheck, UserRound, X } from 'lucide-react'
import { createPersonalBackup, parsePersonalBackup, serializePersonalBackup, type PersonalBackup } from '../domain/backup'
import { parsePersonalPresetBundle } from '../domain/presets'
import { normalizeNumericDraft } from '../domain/numeric'
import type { AppMode, Profile } from '../domain/types'
import { useFitness } from '../store/FitnessContext'
import { loadPreChangeBackup } from '../store/persistence'
import { Button, Card, Field, PageHeader, SectionHeading } from '../components/ui'
import { CloudConflictPanel } from '../components/CloudConflictPanel'

const suggestedTimezones = ['Asia/Calcutta', 'UTC', 'Europe/London', 'America/New_York', 'America/Los_Angeles']
type NumericProfileKey = Exclude<keyof Profile, 'name' | 'timezone' | 'allergen'>

function downloadJson(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function backupFilename(prefix: string, exportedAt: string) {
  return `getfit-${prefix}-${exportedAt.slice(0, 19).replaceAll(':', '-')}.json`
}

function NumberInput({ value, onValueChange, step, min, max }: { value: number; onValueChange: (value: number) => void; step?: number; min?: number; max?: number }) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])

  function handleChange(next: string) {
    const normalized = normalizeNumericDraft(next)
    setDraft(normalized)
    if (normalized.trim() === '') return
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) onValueChange(parsed)
  }

  function handleBlur() {
    if (draft.trim() === '' || !Number.isFinite(Number(draft))) {
      setDraft(String(value))
      return
    }
    setDraft(String(Number(draft)))
  }

  return <input inputMode="decimal" type="number" step={step} min={min} max={max} value={draft} onChange={(event) => handleChange(event.target.value)} onBlur={handleBlur} />
}

export function SettingsScreen() {
  const { mode, state, cloud, switchMode, updateProfile, applyPersonalPresets, restorePersonalBackup, resetCurrentMode } = useFitness()
  const [form, setForm] = useState<Profile>(state.profile)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [presetStatus, setPresetStatus] = useState('')
  const [restoreStatus, setRestoreStatus] = useState('')
  const [pendingBackup, setPendingBackup] = useState<PersonalBackup | null>(null)
  const [hasSafetyBackup, setHasSafetyBackup] = useState(() => Boolean(loadPreChangeBackup(window.localStorage)))
  const canImportPresets = mode === 'personal' && !state.checkIns.length && !state.workouts.length && !state.draftWorkout
  const cloudConnected = cloud.authStatus === 'signed-in'
  const cloudStatusLabel = {
    unconfigured: 'Not configured',
    'local-only': 'Local only',
    syncing: 'Syncing',
    synced: 'Synced',
    offline: 'Offline-safe',
    conflict: 'Needs review',
    error: 'Action needed',
  }[cloud.syncStatus]

  useEffect(() => {
    setForm(state.profile)
    setSaved(false)
  }, [mode, state.profile])

  function numberField(key: NumericProfileKey, value: number) {
    setSaved(false)
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSave() {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: form.timezone }).format()
    } catch {
      window.alert('Enter a valid IANA timezone, such as Asia/Calcutta or Europe/London.')
      return
    }
    updateProfile(form)
    setSaved(true)
  }

  function handleModeChange(nextMode: AppMode) {
    if (nextMode === mode) return
    switchMode(nextMode)
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) return
    await cloud.signIn(email, password)
    setPassword('')
  }

  function handleReset() {
    const label = mode === 'demo' ? 'synthetic demo' : 'Personal test workspace'
    if (!window.confirm(`Reset all check-ins, workouts, drafts, and settings in the ${label}? The other mode will not change.`)) return
    resetCurrentMode()
    setSaved(false)
  }

  async function handlePresetFile(file: File | undefined) {
    if (!file || !canImportPresets) return
    try {
      applyPersonalPresets(parsePersonalPresetBundle(await file.text()))
      setPresetStatus('Personal presets applied locally. No history was imported.')
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : 'The Personal preset file could not be applied.')
    }
  }

  function handleExport() {
    const backup = createPersonalBackup(state)
    downloadJson(serializePersonalBackup(backup), backupFilename('personal-backup', backup.exportedAt))
    setRestoreStatus('Personal backup downloaded.')
  }

  async function handleRestoreFile(file: File | undefined) {
    if (!file) return
    try {
      setPendingBackup(parsePersonalBackup(await file.text()))
      setRestoreStatus('')
    } catch (error) {
      setRestoreStatus(error instanceof Error ? error.message : 'The backup could not be read.')
    }
  }

  function handleConfirmRestore() {
    if (!pendingBackup) return
    const beforeRestore = createPersonalBackup(state)
    downloadJson(serializePersonalBackup(beforeRestore), backupFilename('before-restore', beforeRestore.exportedAt))
    restorePersonalBackup(pendingBackup)
    setPendingBackup(null)
    setHasSafetyBackup(true)
    setRestoreStatus('Backup restored. The previous workspace was downloaded and retained as your latest safety copy.')
  }

  function handleDownloadSafetyBackup() {
    const serialized = loadPreChangeBackup(window.localStorage)
    if (!serialized) return
    try {
      const backup = parsePersonalBackup(serialized)
      downloadJson(serialized, backupFilename('safety-backup', backup.exportedAt))
    } catch {
      setRestoreStatus('The browser safety copy is unavailable or invalid.')
    }
  }

  async function handleConflictResolution(choice: 'use-cloud' | 'keep-device') {
    const confirmed = choice === 'use-cloud'
      ? window.confirm('Replace this device workspace with the latest cloud version? The current device copy will be retained as your latest browser safety copy.')
      : window.confirm('Replace the cloud workspace with this device version? The current cloud copy will be retained as your latest browser safety copy.')
    if (!confirmed) return
    await cloud.resolveConflict(choice)
    setHasSafetyBackup(Boolean(loadPreChangeBackup(window.localStorage)))
  }

  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow={mode === 'demo' ? 'Demo configuration' : 'Personal test workspace'}
        title="Settings"
        detail="Keep Demo and Personal data separate while sharing the same fitness workflow."
      />

      <Card className="mode-switch-card">
        <div><p className="eyebrow">Active workspace</p><h2>{mode === 'demo' ? 'Synthetic Demo' : 'Personal test workspace'}</h2><p>Switching changes which isolated dataset you can view and edit.</p></div>
        <div className="mode-switch" role="tablist" aria-label="Data mode">
          <button role="tab" aria-selected={mode === 'demo'} className={mode === 'demo' ? 'active' : ''} onClick={() => handleModeChange('demo')}><Database size={18} />Demo</button>
          <button role="tab" aria-selected={mode === 'personal'} className={mode === 'personal' ? 'active' : ''} onClick={() => handleModeChange('personal')}><UserRound size={18} />Personal</button>
        </div>
      </Card>

      {mode === 'personal' && <div className={`personal-readiness-note${cloud.syncStatus === 'synced' ? ' connected' : ''}`}>{cloud.syncStatus === 'synced' ? <Cloud size={20} /> : <CloudOff size={20} />}<div><strong>{cloud.syncStatus === 'synced' ? 'Cloud persistence is connected.' : 'Local-first Personal workspace.'}</strong><span>{cloud.syncStatus === 'synced' ? 'Your app data can now follow you across devices. The Sheet remains authoritative until the one-time history import and cutover checks pass.' : 'This device keeps working locally. Sign in below to add cross-device sync before importing real history.'}</span></div></div>}

      {mode === 'personal' && <Card className={`cloud-sync-card status-${cloud.syncStatus}`}>
        <div className="cloud-sync-copy">
          <div className="cloud-sync-heading"><span className="icon-tile green">{cloudConnected ? <Cloud size={21} /> : <CloudOff size={21} />}</span><div><p className="eyebrow">Personal cloud</p><h2>{cloudConnected ? cloud.userEmail : 'Connect this workspace'}</h2></div><span className={`cloud-status-badge ${cloud.syncStatus}`}>{cloudStatusLabel}</span></div>
          <p aria-live="polite">{cloud.message}</p>
          {cloud.lastSyncedAt && <small>Last cloud revision received {new Date(cloud.lastSyncedAt).toLocaleString()}</small>}
        </div>
        {!cloud.configured ? <p className="cloud-config-note">Add the Supabase project URL and publishable key to this deployment.</p> : cloudConnected ? <div className="cloud-sync-actions"><Button variant="secondary" disabled={cloud.syncStatus === 'syncing' || Boolean(cloud.conflict)} onClick={() => void cloud.syncNow()}><RefreshCw size={18} />Sync now</Button><Button variant="ghost" disabled={cloud.authBusy || cloud.resolutionBusy} onClick={() => void cloud.signOut()}><LogOut size={18} />Sign out</Button></div> : <form className="cloud-auth-form" onSubmit={(event) => void handleSignIn(event)}><Field label="Email"><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label="Password"><input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></Field><div><Button type="submit" disabled={cloud.authBusy || cloud.authStatus === 'loading'}><LogIn size={18} />Sign in</Button></div><small>Personal access is limited to the existing account; this public app does not create new accounts.</small></form>}
        {cloud.conflict && <CloudConflictPanel conflict={cloud.conflict} deviceSummary={{ checkIns: state.checkIns.length, workouts: state.workouts.length, progressionTargets: state.progressions.length, hasWorkoutDraft: Boolean(state.draftWorkout) }} resolutionBusy={cloud.resolutionBusy} onResolve={(choice) => void handleConflictResolution(choice)} />}
      </Card>}

      {mode === 'personal' && <Card className="preset-import-card"><div><p className="eyebrow">Private configuration</p><h2>Personal presets</h2><p>Apply profile, meals, foods, exercises, and progression targets from a local JSON file. Check-ins and workout history are never included.</p>{presetStatus && <span className="preset-status">{presetStatus}</span>}</div><label className={`button button-secondary preset-file-button${canImportPresets ? '' : ' disabled'}`}><FileUp size={18} />Import preset file<input type="file" accept="application/json,.json" disabled={!canImportPresets} onChange={(event) => { void handlePresetFile(event.target.files?.[0]); event.target.value = '' }} /></label></Card>}

      {mode === 'personal' && <Card className="data-safety-card">
        <div><p className="eyebrow">Data safety</p><h2>Backup & recovery</h2><p>Export your full local workspace, or replace it from a verified getFit backup. Restore never merges records.</p>{restoreStatus && <span className="preset-status">{restoreStatus}</span>}</div>
        <div className="data-safety-actions">
          <Button variant="secondary" onClick={handleExport}><FileDown size={18} />Export backup</Button>
          <label className="button button-secondary preset-file-button"><ArchiveRestore size={18} />Restore backup<input type="file" accept="application/json,.json" onChange={(event) => { void handleRestoreFile(event.target.files?.[0]); event.target.value = '' }} /></label>
          {hasSafetyBackup && <Button variant="ghost" onClick={handleDownloadSafetyBackup}><FileDown size={18} />Latest safety copy</Button>}
        </div>
      </Card>}

      <div className="settings-layout">
        <div>
          <Card>
            <SectionHeading title="Profile & goals" action={<Settings2 size={20} />} />
            <div className="settings-grid">
              <Field label="Display name"><input value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setSaved(false) }} /></Field>
              <Field label="Timezone" hint="Controls the Personal daily boundary."><input list="timezone-options" value={form.timezone} onChange={(event) => { setForm((current) => ({ ...current, timezone: event.target.value })); setSaved(false) }} /><datalist id="timezone-options">{suggestedTimezones.map((timezone) => <option value={timezone} key={timezone} />)}</datalist></Field>
              <Field label="Starting weight"><div className="unit-input"><NumberInput value={form.startingWeightKg} min={30} max={250} step={0.1} onValueChange={(value) => numberField('startingWeightKg', value)} /><span>kg</span></div></Field>
              <Field label="Current weight"><div className="unit-input"><NumberInput value={form.currentWeightKg} min={30} max={250} step={0.1} onValueChange={(value) => numberField('currentWeightKg', value)} /><span>kg</span></div></Field>
              <Field label="Goal weight"><div className="unit-input"><NumberInput value={form.goalWeightKg} min={30} max={250} step={0.1} onValueChange={(value) => numberField('goalWeightKg', value)} /><span>kg</span></div></Field>
              <Field label="Strict allergen exclusion"><input value={form.allergen} onChange={(event) => { setForm((current) => ({ ...current, allergen: event.target.value })); setSaved(false) }} /></Field>
            </div>
          </Card>

          <Card>
            <SectionHeading title="Nutrition rules" />
            <div className="settings-grid">
              <Field label="Protein floor"><div className="unit-input"><NumberInput value={form.proteinFloorMultiplier} min={0} step={0.1} onValueChange={(value) => numberField('proteinFloorMultiplier', value)} /><span>g/kg</span></div></Field>
              <Field label="Protein target"><div className="unit-input"><NumberInput value={form.proteinTargetMultiplier} min={0} step={0.1} onValueChange={(value) => numberField('proteinTargetMultiplier', value)} /><span>g/kg</span></div></Field>
              <Field label="Calorie adjustment"><div className="unit-input"><NumberInput value={form.calorieAdjustment} min={0} step={25} onValueChange={(value) => numberField('calorieAdjustment', value)} /><span>kcal</span></div></Field>
            </div>
          </Card>

          <Card>
            <SectionHeading title="Weekly gain band" />
            <div className="settings-grid">
              <Field label="Minimum"><div className="unit-input"><NumberInput value={form.weeklyGainMin * 100} min={0} step={0.05} onValueChange={(value) => numberField('weeklyGainMin', value / 100)} /><span>%</span></div></Field>
              <Field label="Maximum"><div className="unit-input"><NumberInput value={form.weeklyGainMax * 100} min={0} step={0.05} onValueChange={(value) => numberField('weeklyGainMax', value / 100)} /><span>%</span></div></Field>
            </div>
            <div className="info-note"><ShieldCheck size={17} /><p>Guidance uses seven-day averages and waits for enough observations before recommending a change.</p></div>
          </Card>

          <Button onClick={handleSave}><Save size={18} />{saved ? 'Settings saved' : 'Save settings'}</Button>
        </div>

        <aside>
          <Card className="demo-data-card">
            <div className={`icon-tile ${mode === 'demo' ? 'blue' : 'green'}`}>{mode === 'demo' ? <Database size={22} /> : <UserRound size={22} />}</div>
            <p className="eyebrow">Data source</p><h2>{mode === 'demo' ? 'Synthetic fixtures' : cloudConnected ? 'Local-first + Supabase' : 'Local test data'}</h2>
            <p>{mode === 'demo' ? 'A fictional athlete, deterministic dates, and sample workout history. No personal Sheet data is included.' : cloudConnected ? 'Fast local saves with authenticated, revision-checked cloud persistence for cross-device use.' : 'An isolated browser dataset that can be connected to your Personal cloud account.'}</p>
            <ul><li>{state.checkIns.length} check-ins</li><li>{state.workouts.length} completed workouts</li><li>{state.progressions.length} exercise targets</li></ul>
          </Card>
          <Card className="danger-card">
            <div><AlertTriangle size={20} /><h3>Reset {mode === 'demo' ? 'demo' : 'Personal test data'}</h3></div>
            <p>{mode === 'demo' ? 'Restore the original synthetic fixtures.' : 'Clear this local Personal workspace and restore its starter plan. A browser safety copy is saved first; Demo data stays untouched.'}</p>
            <Button variant="danger" onClick={handleReset}><RotateCcw size={18} />Reset {mode === 'demo' ? 'demo data' : 'Personal test data'}</Button>
          </Card>
        </aside>
      </div>

      {pendingBackup && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Review backup restore">
        <Card className="review-modal restore-modal">
          <div className="modal-head"><div><p className="eyebrow">Replace-only restore</p><h2>Review backup</h2></div><button className="icon-button" onClick={() => setPendingBackup(null)} aria-label="Close restore review"><X size={21} /></button></div>
          <p>This will replace the entire Personal workspace. Your current workspace will be downloaded and kept in this browser before the restore.</p>
          <dl className="backup-summary">
            <div><dt>Exported</dt><dd>{new Date(pendingBackup.exportedAt).toLocaleString()}</dd></div>
            <div><dt>Check-ins</dt><dd>{pendingBackup.recordCounts.checkIns}</dd></div>
            <div><dt>Workouts</dt><dd>{pendingBackup.recordCounts.workouts}</dd></div>
            <div><dt>Exercise targets</dt><dd>{pendingBackup.recordCounts.progressions}</dd></div>
            <div><dt>Workout draft</dt><dd>{pendingBackup.recordCounts.draftWorkout ? 'Included' : 'None'}</dd></div>
          </dl>
          <div className="modal-actions"><Button variant="secondary" onClick={() => setPendingBackup(null)}>Cancel</Button><Button variant="danger" onClick={handleConfirmRestore}><ArchiveRestore size={18} />Replace Personal data</Button></div>
        </Card>
      </div>}
    </div>
  )
}
