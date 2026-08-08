import { useEffect, useState } from 'react'
import { AlertTriangle, CloudOff, Database, FileUp, RotateCcw, Save, Settings2, ShieldCheck, UserRound } from 'lucide-react'
import { parsePersonalPresetBundle } from '../domain/presets'
import { normalizeNumericDraft } from '../domain/numeric'
import type { AppMode, Profile } from '../domain/types'
import { useFitness } from '../store/FitnessContext'
import { Button, Card, Field, PageHeader, SectionHeading } from '../components/ui'

const suggestedTimezones = ['Asia/Calcutta', 'UTC', 'Europe/London', 'America/New_York', 'America/Los_Angeles']
type NumericProfileKey = Exclude<keyof Profile, 'name' | 'timezone' | 'allergen'>

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
  const { mode, state, switchMode, updateProfile, applyPersonalPresets, resetCurrentMode } = useFitness()
  const [form, setForm] = useState<Profile>(state.profile)
  const [saved, setSaved] = useState(false)
  const [presetStatus, setPresetStatus] = useState('')
  const canImportPresets = mode === 'personal' && !state.checkIns.length && !state.workouts.length && !state.draftWorkout

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

      {mode === 'personal' && <div className="personal-readiness-note"><CloudOff size={20} /><div><strong>Safe for testing, not yet for your real history.</strong><span>Your Sheet remains authoritative until cloud sync, recovery, and migration checks pass. This browser copy is disposable.</span></div></div>}

      {mode === 'personal' && <Card className="preset-import-card"><div><p className="eyebrow">Private configuration</p><h2>Personal presets</h2><p>Apply profile, meals, foods, exercises, and progression targets from a local JSON file. Check-ins and workout history are never included.</p>{presetStatus && <span className="preset-status">{presetStatus}</span>}</div><label className={`button button-secondary preset-file-button${canImportPresets ? '' : ' disabled'}`}><FileUp size={18} />Import preset file<input type="file" accept="application/json,.json" disabled={!canImportPresets} onChange={(event) => { void handlePresetFile(event.target.files?.[0]); event.target.value = '' }} /></label></Card>}

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
            <p className="eyebrow">Data source</p><h2>{mode === 'demo' ? 'Synthetic fixtures' : 'Local test data'}</h2>
            <p>{mode === 'demo' ? 'A fictional athlete, deterministic dates, and sample workout history. No personal Sheet data is included.' : 'An isolated browser dataset for proving the workflow before cloud-backed Personal use.'}</p>
            <ul><li>{state.checkIns.length} check-ins</li><li>{state.workouts.length} completed workouts</li><li>{state.progressions.length} exercise targets</li></ul>
          </Card>
          <Card className="danger-card">
            <div><AlertTriangle size={20} /><h3>Reset {mode === 'demo' ? 'demo' : 'Personal test data'}</h3></div>
            <p>{mode === 'demo' ? 'Restore the original synthetic fixtures.' : 'Clear this local Personal workspace and restore its starter plan. Demo data stays untouched.'}</p>
            <Button variant="danger" onClick={handleReset}><RotateCcw size={18} />Reset {mode === 'demo' ? 'demo data' : 'Personal test data'}</Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}
