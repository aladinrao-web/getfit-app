import { useEffect, useState } from 'react'
import { AlertTriangle, Database, RotateCcw, Save, Settings2, ShieldCheck } from 'lucide-react'
import type { Profile } from '../domain/types'
import { useFitness } from '../store/FitnessContext'
import { Button, Card, Field, PageHeader, SectionHeading } from '../components/ui'

export function SettingsScreen() {
  const { state, updateProfile, resetDemo } = useFitness()
  const [form, setForm] = useState<Profile>(state.profile)
  const [saved, setSaved] = useState(false)

  useEffect(() => setForm(state.profile), [state.profile])

  function numberField(key: keyof Profile, value: string) {
    setSaved(false)
    setForm((current) => ({ ...current, [key]: Number(value) }))
  }

  function handleSave() {
    updateProfile(form)
    setSaved(true)
  }

  function handleReset() {
    if (!window.confirm('Reset all check-ins, workouts, and settings to the synthetic demo?')) return
    resetDemo()
    setSaved(false)
  }

  return (
    <div className="page settings-page">
      <PageHeader eyebrow="Demo configuration" title="Settings" detail="Adjust the decision rules without adding tracking friction." />

      <div className="settings-layout">
        <div>
          <Card>
            <SectionHeading title="Profile & goals" action={<Settings2 size={20} />} />
            <div className="settings-grid">
              <Field label="Display name"><input value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setSaved(false) }} /></Field>
              <Field label="Current weight"><div className="unit-input"><input type="number" step="0.1" value={form.currentWeightKg} onChange={(event) => numberField('currentWeightKg', event.target.value)} /><span>kg</span></div></Field>
              <Field label="Goal weight"><div className="unit-input"><input type="number" step="0.1" value={form.goalWeightKg} onChange={(event) => numberField('goalWeightKg', event.target.value)} /><span>kg</span></div></Field>
              <Field label="Strict allergen exclusion"><input value={form.allergen} onChange={(event) => { setForm((current) => ({ ...current, allergen: event.target.value })); setSaved(false) }} /></Field>
            </div>
          </Card>

          <Card>
            <SectionHeading title="Nutrition rules" />
            <div className="settings-grid">
              <Field label="Protein floor"><div className="unit-input"><input type="number" step="0.1" value={form.proteinFloorMultiplier} onChange={(event) => numberField('proteinFloorMultiplier', event.target.value)} /><span>g/kg</span></div></Field>
              <Field label="Protein target"><div className="unit-input"><input type="number" step="0.1" value={form.proteinTargetMultiplier} onChange={(event) => numberField('proteinTargetMultiplier', event.target.value)} /><span>g/kg</span></div></Field>
              <Field label="Calorie adjustment"><div className="unit-input"><input type="number" step="25" value={form.calorieAdjustment} onChange={(event) => numberField('calorieAdjustment', event.target.value)} /><span>kcal</span></div></Field>
            </div>
          </Card>

          <Card>
            <SectionHeading title="Weekly gain band" />
            <div className="settings-grid">
              <Field label="Minimum"><div className="unit-input"><input type="number" step="0.05" value={form.weeklyGainMin * 100} onChange={(event) => numberField('weeklyGainMin', String(Number(event.target.value) / 100))} /><span>%</span></div></Field>
              <Field label="Maximum"><div className="unit-input"><input type="number" step="0.05" value={form.weeklyGainMax * 100} onChange={(event) => numberField('weeklyGainMax', String(Number(event.target.value) / 100))} /><span>%</span></div></Field>
            </div>
            <div className="info-note"><ShieldCheck size={17} /><p>Guidance uses seven-day averages and waits for enough observations before recommending a change.</p></div>
          </Card>

          <Button onClick={handleSave}><Save size={18} />{saved ? 'Settings saved' : 'Save settings'}</Button>
        </div>

        <aside>
          <Card className="demo-data-card">
            <div className="icon-tile blue"><Database size={22} /></div>
            <p className="eyebrow">Data source</p><h2>Synthetic fixtures</h2><p>This build contains a fictional athlete, deterministic dates, and sample workout history. It does not sync personal Sheet data.</p>
            <ul><li>{state.checkIns.length} demo check-ins</li><li>{state.workouts.length} completed workouts</li><li>{state.progressions.length} exercise targets</li></ul>
          </Card>
          <Card className="danger-card">
            <div><AlertTriangle size={20} /><h3>Reset demo</h3></div><p>Restore the original sample check-ins, trends, workouts, and progression decisions.</p>
            <Button variant="danger" onClick={handleReset}><RotateCcw size={18} />Reset all demo data</Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}
