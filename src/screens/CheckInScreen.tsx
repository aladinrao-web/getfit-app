import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Clock3, Info, Save, Scale, Sparkles } from 'lucide-react'
import { calculateMealTotals, formatLongDate, getPresetForDate, proteinTargets } from '../domain/calculations'
import { canCompleteCheckIn, getAnsweredMealCount, hasCheckInProgress } from '../domain/checkIn'
import type { Adherence, DailyCheckIn, MealSlotKey } from '../domain/types'
import { useFitness } from '../store/FitnessContext'
import { Button, Card, Field, PageHeader, ProgressBar, StatusPill } from '../components/ui'

const adherenceOptions: Array<{ value: Adherence; label: string }> = [
  { value: 0, label: 'Skipped' },
  { value: 0.5, label: 'Half' },
  { value: 0.75, label: 'Most' },
  { value: 1, label: 'All' },
]

type SaveStatus = 'idle' | 'saving' | 'saved'

export function CheckInScreen({ onDone }: { onDone: () => void }) {
  const { mode, state, saveCheckIn, completeCheckIn, today } = useFitness()
  const existing = state.checkIns.find((entry) => entry.date === today)
  const preset = getPresetForDate(state.mealPresets, today)
  const [weight, setWeight] = useState(existing?.weightKg?.toString() ?? '')
  const [adherence, setAdherence] = useState<DailyCheckIn['adherence']>(existing?.adherence ?? {})
  const [extrasProtein, setExtrasProtein] = useState(existing?.extrasProteinG.toString() ?? '0')
  const [extrasCalories, setExtrasCalories] = useState(existing?.extrasCalories.toString() ?? '0')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [draftStartedAt] = useState(() => existing?.updatedAt ?? new Date().toISOString())
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(existing ? 'saved' : 'idle')
  const saveCheckInRef = useRef(saveCheckIn)

  useEffect(() => {
    saveCheckInRef.current = saveCheckIn
  }, [saveCheckIn])

  const draft: DailyCheckIn = useMemo(() => ({
    id: existing?.id ?? `${mode}-checkin-${today}`,
    date: today,
    weightKg: weight ? Number(weight) : undefined,
    adherence,
    extrasProteinG: Number(extrasProtein) || 0,
    extrasCalories: Number(extrasCalories) || 0,
    notes,
    updatedAt: draftStartedAt,
    completedAt: existing?.completedAt,
  }), [existing?.id, existing?.completedAt, mode, today, weight, adherence, extrasProtein, extrasCalories, notes, draftStartedAt])

  const totals = calculateMealTotals(draft, preset, state.profile)
  const targets = proteinTargets(state.profile)
  const answeredMeals = getAnsweredMealCount(draft)
  const hasProgress = hasCheckInProgress(draft)
  const isComplete = Boolean(existing?.completedAt)
  const readyToComplete = canCompleteCheckIn(draft)

  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(() => {
      saveCheckInRef.current({ ...draft, updatedAt: new Date().toISOString() })
      setDirty(false)
      setSaveStatus('saved')
    }, 350)
    return () => window.clearTimeout(timer)
  }, [dirty, draft])

  function markDirty() {
    setDirty(true)
    setSaveStatus('saving')
  }

  function updateAdherence(key: MealSlotKey, value: Adherence) {
    setAdherence((current) => ({ ...current, [key]: value }))
    markDirty()
  }

  function persistDraft() {
    if (hasProgress || existing) saveCheckIn({ ...draft, updatedAt: new Date().toISOString() })
    setDirty(false)
    setSaveStatus('saved')
  }

  function handleLeave() {
    persistDraft()
    onDone()
  }

  function handleComplete() {
    if (!readyToComplete) return
    setDirty(false)
    completeCheckIn({ ...draft, updatedAt: new Date().toISOString() })
    onDone()
  }

  return (
    <div className="page checkin-page">
      <button className="back-button" onClick={handleLeave}><ArrowLeft size={18} />Back to Today</button>
      <PageHeader eyebrow={formatLongDate(today)} title="Daily check-in" detail="Start with weight, add meals when they happen, and complete the day when you’re ready." />

      <div className="checkin-layout">
        <div className="checkin-form">
          <Card className="checkin-stage-card">
            <div><Clock3 size={18} /><span>Complete this in stages</span></div>
            <p>Every change is saved locally. Unanswered meals stay open—they are never treated as skipped.</p>
          </Card>

          <Card className="weight-entry-card">
            <div className="icon-tile green"><Scale size={22} /></div>
            <Field label="Morning weight" hint="Optional — saved immediately and included in your weight trend.">
              <div className="unit-input"><input inputMode="decimal" type="number" min="30" max="250" step="0.1" placeholder="67.6" value={weight} onChange={(event) => { setWeight(event.target.value); markDirty() }} /><span>kg</span></div>
            </Field>
          </Card>

          <div className="meal-checkin-list">
            {preset.slots.map((slot) => {
              const answer = adherence[slot.key]
              return (
                <Card className={`meal-checkin-card${typeof answer === 'number' ? '' : ' unanswered'}`} key={slot.key}>
                  <div className="meal-checkin-head">
                    <div><p className="eyebrow">{slot.label}</p><h3>{slot.description}</h3><p>{slot.proteinG} g protein · {slot.calories} kcal planned</p></div>
                    <strong>{typeof answer === 'number' ? Math.round(slot.proteinG * answer) : '—'}<small>{typeof answer === 'number' ? ' g' : ' open'}</small></strong>
                  </div>
                  <div className="segmented-control" aria-label={`${slot.label} completion`}>
                    {adherenceOptions.map((option) => <button type="button" key={option.value} className={answer === option.value ? 'active' : ''} onClick={() => updateAdherence(slot.key, option.value)}>{option.label}</button>)}
                  </div>
                </Card>
              )
            })}
          </div>

          <Card>
            <h3>Anything different?</h3>
            <p className="muted-copy">Only add extras or a short note when the preset wasn’t enough.</p>
            <div className="two-fields">
              <Field label="Extra protein"><div className="unit-input"><input type="number" min="0" value={extrasProtein} onChange={(event) => { setExtrasProtein(event.target.value); markDirty() }} /><span>g</span></div></Field>
              <Field label="Extra energy"><div className="unit-input"><input type="number" min="0" value={extrasCalories} onChange={(event) => { setExtrasCalories(event.target.value); markDirty() }} /><span>kcal</span></div></Field>
            </div>
            <Field label="Deviation note"><textarea rows={3} placeholder="Example: shake skipped; smaller lunch." value={notes} onChange={(event) => { setNotes(event.target.value); markDirty() }} /></Field>
          </Card>
        </div>

        <aside className="checkin-summary">
          <Card className="summary-card sticky-card">
            <div className="checkin-save-state" aria-live="polite">
              {saveStatus === 'saving' ? <><Clock3 size={15} />Saving changes…</> : saveStatus === 'saved' ? <><Check size={15} />Saved for later</> : <><Save size={15} />Changes autosave</>}
            </div>
            <div className="summary-top"><div><p className="eyebrow">{isComplete ? 'Estimated today' : 'Estimated so far'}</p><strong>{totals.actualProtein === null ? '—' : Math.round(totals.actualProtein)}<small>{totals.actualProtein === null ? 'add a meal answer' : 'g protein'}</small></strong></div><StatusPill status={totals.status} /></div>
            <ProgressBar value={totals.actualProtein ?? 0} max={targets.target} label="Protein target completion" />
            <div className="target-labels"><span>{targets.floor} g floor</span><span>{targets.target} g target</span></div>
            <div className="summary-facts"><div><span>Energy so far</span><strong>{totals.actualCalories === null ? '—' : `${Math.round(totals.actualCalories)} kcal`}</strong></div><div><span>Meals answered</span><strong>{answeredMeals} of 4</strong></div></div>
            <div className="info-note"><Info size={17} /><p>{readyToComplete ? 'All meals are answered. Complete the check-in when today’s entries are final.' : `${4 - answeredMeals} meal${4 - answeredMeals === 1 ? '' : 's'} still open. Choose “Skipped” when a meal did not happen.`}</p></div>
            <div className="checkin-actions">
              <Button variant="secondary" disabled={!hasProgress && !existing} onClick={handleLeave}><Save size={18} />Save & leave</Button>
              <Button disabled={!readyToComplete} onClick={handleComplete}>{isComplete ? <><Check size={18} />Update completed</> : <>Complete check-in <Sparkles size={18} /></>}</Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
