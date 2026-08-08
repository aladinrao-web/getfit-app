import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Info, Scale, Sparkles } from 'lucide-react'
import { DEMO_TODAY } from '../data/seed'
import { calculateMealTotals, formatLongDate, getPresetForDate, proteinTargets } from '../domain/calculations'
import type { Adherence, DailyCheckIn, MealSlotKey } from '../domain/types'
import { useFitness } from '../store/FitnessContext'
import { Button, Card, Field, PageHeader, ProgressBar, StatusPill } from '../components/ui'

const adherenceOptions: Array<{ value: Adherence; label: string }> = [
  { value: 0, label: 'Skipped' },
  { value: 0.5, label: 'Half' },
  { value: 0.75, label: 'Most' },
  { value: 1, label: 'All' },
]

export function CheckInScreen({ onDone }: { onDone: () => void }) {
  const { state, saveCheckIn } = useFitness()
  const existing = state.checkIns.find((entry) => entry.date === DEMO_TODAY)
  const preset = getPresetForDate(state.mealPresets, DEMO_TODAY)
  const [weight, setWeight] = useState(existing?.weightKg?.toString() ?? '')
  const [adherence, setAdherence] = useState<Record<MealSlotKey, Adherence>>(existing?.adherence ?? { breakfast: 1, lunch: 1, dinner: 1, shake: 1 })
  const [extrasProtein, setExtrasProtein] = useState(existing?.extrasProteinG.toString() ?? '0')
  const [extrasCalories, setExtrasCalories] = useState(existing?.extrasCalories.toString() ?? '0')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saved, setSaved] = useState(false)

  const draft: DailyCheckIn = useMemo(() => ({
    date: DEMO_TODAY,
    weightKg: weight ? Number(weight) : undefined,
    adherence,
    extrasProteinG: Number(extrasProtein) || 0,
    extrasCalories: Number(extrasCalories) || 0,
    notes,
  }), [weight, adherence, extrasProtein, extrasCalories, notes])
  const totals = calculateMealTotals(draft, preset, state.profile)
  const targets = proteinTargets(state.profile)

  function updateAdherence(key: MealSlotKey, value: Adherence) {
    setAdherence((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    saveCheckIn(draft)
    setSaved(true)
  }

  return (
    <div className="page checkin-page">
      <button className="back-button" onClick={onDone}><ArrowLeft size={18} />Back to Today</button>
      <PageHeader eyebrow={formatLongDate(DEMO_TODAY)} title="Daily check-in" detail="Tap what happened. Note only the exception." />

      <div className="checkin-layout">
        <div className="checkin-form">
          <Card className="weight-entry-card">
            <div className="icon-tile green"><Scale size={22} /></div>
            <Field label="Morning weight" hint="Optional — use the same conditions when possible.">
              <div className="unit-input"><input inputMode="decimal" type="number" min="30" max="250" step="0.1" placeholder="67.6" value={weight} onChange={(event) => { setWeight(event.target.value); setSaved(false) }} /><span>kg</span></div>
            </Field>
          </Card>

          <div className="meal-checkin-list">
            {preset.slots.map((slot) => (
              <Card className="meal-checkin-card" key={slot.key}>
                <div className="meal-checkin-head"><div><p className="eyebrow">{slot.label}</p><h3>{slot.description}</h3><p>{slot.proteinG} g protein · {slot.calories} kcal planned</p></div><strong>{Math.round(slot.proteinG * adherence[slot.key])}<small> g</small></strong></div>
                <div className="segmented-control" aria-label={`${slot.label} completion`}>
                  {adherenceOptions.map((option) => <button key={option.value} className={adherence[slot.key] === option.value ? 'active' : ''} onClick={() => updateAdherence(slot.key, option.value)}>{option.label}</button>)}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <h3>Anything different?</h3>
            <p className="muted-copy">Only add extras or a short note when the preset wasn’t enough.</p>
            <div className="two-fields">
              <Field label="Extra protein"><div className="unit-input"><input type="number" min="0" value={extrasProtein} onChange={(event) => { setExtrasProtein(event.target.value); setSaved(false) }} /><span>g</span></div></Field>
              <Field label="Extra energy"><div className="unit-input"><input type="number" min="0" value={extrasCalories} onChange={(event) => { setExtrasCalories(event.target.value); setSaved(false) }} /><span>kcal</span></div></Field>
            </div>
            <Field label="Deviation note"><textarea rows={3} placeholder="Example: shake skipped; smaller lunch." value={notes} onChange={(event) => { setNotes(event.target.value); setSaved(false) }} /></Field>
          </Card>
        </div>

        <aside className="checkin-summary">
          <Card className="summary-card sticky-card">
            <div className="summary-top"><div><p className="eyebrow">Estimated today</p><strong>{Math.round(totals.actualProtein ?? 0)}<small>g protein</small></strong></div><StatusPill status={totals.status} /></div>
            <ProgressBar value={totals.actualProtein ?? 0} max={targets.target} label="Protein target completion" />
            <div className="target-labels"><span>{targets.floor} g floor</span><span>{targets.target} g target</span></div>
            <div className="summary-facts"><div><span>Energy</span><strong>{Math.round(totals.actualCalories ?? 0)} kcal</strong></div><div><span>Preset coverage</span><strong>{Math.round((totals.coverage ?? 0) * 100)}%</strong></div></div>
            <div className="info-note"><Info size={17} /><p>Estimates are intentionally rounded. Product labels and allergen checks take priority.</p></div>
            <Button onClick={handleSave}>{saved ? <><Check size={18} />Saved</> : <>Save check-in <Sparkles size={18} /></>}</Button>
            {saved && <button className="text-button centered" onClick={onDone}>Return to Today</button>}
          </Card>
        </aside>
      </div>
    </div>
  )
}
