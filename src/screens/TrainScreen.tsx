import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, Check, ChevronDown, Clock3, Dumbbell, Flag, RotateCcw, X } from 'lucide-react'
import { DEMO_TODAY } from '../data/seed'
import { formatLongDate, formatShortDate } from '../domain/calculations'
import { formatExerciseResult, getNextWorkoutCode } from '../domain/workout'
import type { ExerciseResult, ProgressionDecision, WorkoutCode, WorkoutSession } from '../domain/types'
import { useFitness } from '../store/FitnessContext'
import { Button, Card, Field, PageHeader, SectionHeading, StatusPill } from '../components/ui'

const workoutNames: Record<WorkoutCode, string> = { A: 'Push & chest', B: 'Shoulders, legs & triceps', C: 'Pull & biceps' }
const limiters = ['', 'General fatigue', 'Form breakdown', 'Stability', 'Pain / discomfort', 'Exercise order', 'Grip fatigue']
const decisions: ProgressionDecision[] = ['Increase', 'Repeat', 'Deload', 'Technique focus']

export function TrainScreen() {
  const { state, startWorkout } = useFitness()
  const [completedMessage, setCompletedMessage] = useState('')
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [state.draftWorkout?.id])

  if (state.draftWorkout) return <ActiveWorkout onCompleted={() => setCompletedMessage('Workout committed. Progression is up to date.')} />

  const nextWorkout = getNextWorkoutCode(state)
  const sessions = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="page train-page">
      <PageHeader eyebrow="Deliberate progression" title="Train" detail="Targets are ready. You bring the reps." />
      {completedMessage && <div className="success-banner"><Check size={19} />{completedMessage}<button onClick={() => setCompletedMessage('')} aria-label="Dismiss"><X size={18} /></button></div>}

      <Card className="train-hero">
        <div className="workout-letter large">{nextWorkout}</div>
        <div className="train-hero-copy"><p className="eyebrow">Recommended next</p><h2>{workoutNames[nextWorkout]}</h2><p>{state.exercises.filter((exercise) => exercise.workout === nextWorkout).map((exercise) => exercise.name).join(' · ')}</p></div>
        <Button onClick={() => startWorkout(nextWorkout)}><Dumbbell size={18} />Start workout {nextWorkout}</Button>
      </Card>

      <SectionHeading title="Workout plans" />
      <div className="workout-plan-grid">
        {(['A', 'B', 'C'] as WorkoutCode[]).map((code) => {
          const exercises = state.exercises.filter((exercise) => exercise.workout === code).sort((a, b) => a.order - b.order)
          return (
            <Card className={code === nextWorkout ? 'workout-plan-card recommended' : 'workout-plan-card'} key={code}>
              <div className="plan-card-head"><span className="workout-letter small">{code}</span>{code === nextWorkout && <span className="recommended-label">Up next</span>}</div>
              <h3>{workoutNames[code]}</h3>
              <ol>{exercises.map((exercise) => <li key={exercise.id}><span>{exercise.name}</span><small>{exercise.targetReps.join(' / ')}</small></li>)}</ol>
              <Button variant="secondary" onClick={() => startWorkout(code)}>Start {code}</Button>
            </Card>
          )
        })}
      </div>

      <Card className="history-card">
        <SectionHeading title="Workout history" action={<span className="muted-label">{sessions.length} sessions</span>} />
        <div className="session-list">
          {sessions.slice(0, 6).map((session) => (
            <button className="session-row" onClick={() => setSelectedSession(session)} key={session.id}>
              <span className="workout-letter tiny">{session.workout}</span>
              <div><strong>{workoutNames[session.workout]}</strong><span>{formatShortDate(session.date)} · {session.results.length} exercises</span></div>
              <div className="session-decisions">{session.results.slice(0, 3).map((result, index) => <i className={`decision-dot decision-${result.decision.toLowerCase().replace(' ', '-')}`} key={`${result.exerciseId}-${index}`} title={result.decision} />)}</div>
              <ChevronDown size={18} />
            </button>
          ))}
        </div>
      </Card>

      {selectedSession && <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  )
}

function ActiveWorkout({ onCompleted }: { onCompleted: () => void }) {
  const { state, updateDraftResult, updateDraftNotes, discardDraft, completeWorkout } = useFitness()
  const [reviewing, setReviewing] = useState(false)
  const draft = state.draftWorkout!
  const completed = draft.results.filter((result) => !result.skipped && result.reps.some((rep) => rep !== null))

  function updateRep(result: ExerciseResult, index: number, value: string) {
    const reps = [...result.reps]
    reps[index] = value === '' ? null : Number(value)
    updateDraftResult(result.exerciseId, { reps })
  }

  function handleDiscard() {
    if (window.confirm('Discard this workout draft?')) discardDraft()
  }

  function handleComplete() {
    completeWorkout()
    setReviewing(false)
    onCompleted()
  }

  return (
    <div className="page active-workout-page">
      <div className="active-workout-header">
        <div><p className="eyebrow">{formatLongDate(draft.date)}</p><h1>Workout {draft.workout}</h1><p>{workoutNames[draft.workout]} · draft autosaved</p></div>
        <div className="active-workout-actions"><span><Clock3 size={17} />In progress</span><Button variant="ghost" onClick={handleDiscard}><X size={18} />Discard</Button></div>
      </div>

      <div className="draft-notice"><AlertCircle size={18} /><span>Nothing updates your history or progression until you finish and confirm.</span></div>

      <div className="active-exercise-list">
        {draft.results.map((result, exerciseIndex) => {
          const exercise = state.exercises.find((item) => item.id === result.exerciseId)!
          const progression = state.progressions.find((item) => item.exerciseId === result.exerciseId)!
          return (
            <Card className={result.skipped ? 'active-exercise skipped' : 'active-exercise'} key={result.exerciseId}>
              <div className="exercise-title-row">
                <span className="exercise-index">{String(exerciseIndex + 1).padStart(2, '0')}</span>
                <div><h2>{exercise.name}</h2><p>{exercise.coachingCue}</p></div>
                <label className="skip-toggle"><input type="checkbox" checked={Boolean(result.skipped)} onChange={(event) => updateDraftResult(result.exerciseId, { skipped: event.target.checked })} /><span>Skip</span></label>
              </div>
              {!result.skipped && <>
                <div className="target-strip"><div><span>Last result</span><strong>{progression.lastResult}</strong></div><div><span>Today’s target</span><strong>{progression.nextTarget}</strong></div><div><span>Warm-up</span><strong>{exercise.warmup}</strong></div></div>
                <div className="set-entry-grid">
                  <Field label="Weight"><div className="unit-input compact"><input type="number" step="0.5" value={result.weightKg} onChange={(event) => updateDraftResult(result.exerciseId, { weightKg: Number(event.target.value) })} /><span>kg</span></div></Field>
                  {result.reps.map((rep, index) => <Field key={index} label={`Set ${index + 1}`}><div className="unit-input compact"><input inputMode="numeric" type="number" min="0" value={rep ?? ''} placeholder={`${exercise.targetReps[index] ?? '—'}`} onChange={(event) => updateRep(result, index, event.target.value)} /><span>reps</span></div></Field>)}
                </div>
                <details className="exercise-details">
                  <summary>Context & progression <ChevronDown size={17} /></summary>
                  <div className="detail-fields">
                    <Field label="What limited the set?"><select value={result.limitingFactor} onChange={(event) => updateDraftResult(result.exerciseId, { limitingFactor: event.target.value })}>{limiters.map((limiter) => <option value={limiter} key={limiter}>{limiter || 'Nothing notable'}</option>)}</select></Field>
                    <Field label="Progression decision"><select value={result.decision} onChange={(event) => updateDraftResult(result.exerciseId, { decision: event.target.value as ProgressionDecision })}>{decisions.map((decision) => <option key={decision}>{decision}</option>)}</select></Field>
                    <Field label="Form note"><textarea rows={2} value={result.formNotes} placeholder="Only if something changed." onChange={(event) => updateDraftResult(result.exerciseId, { formNotes: event.target.value })} /></Field>
                  </div>
                </details>
              </>}
            </Card>
          )
        })}
      </div>

      <Card className="session-note-card"><Field label="Session note" hint="Optional. Keep it short."><textarea rows={3} value={draft.sessionNotes} placeholder="Example: shortened session; legs moved to next time." onChange={(event) => updateDraftNotes(event.target.value)} /></Field></Card>

      <div className="finish-bar"><div><strong>{completed.length}</strong><span>of {draft.results.length} exercises have recorded reps</span></div><Button disabled={!completed.length} onClick={() => setReviewing(true)}><Flag size={18} />Review & finish</Button></div>

      {reviewing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Review workout">
          <Card className="review-modal">
            <div className="modal-head"><div><p className="eyebrow">Final review</p><h2>Commit Workout {draft.workout}?</h2></div><button className="icon-button" onClick={() => setReviewing(false)} aria-label="Close review"><X size={21} /></button></div>
            <p>Only these completed exercises will be added. Their matching progression cards will update at the same time.</p>
            <div className="review-list">
              {completed.map((result) => {
                const exercise = state.exercises.find((item) => item.id === result.exerciseId)!
                return <div key={result.exerciseId}><div><strong>{exercise.name}</strong><span>{formatExerciseResult(result)}</span></div><StatusPill status={result.decision} /></div>
              })}
            </div>
            <div className="review-warning"><RotateCcw size={17} />Confirming twice updates the same session; it never creates duplicates.</div>
            <div className="modal-actions"><Button variant="secondary" onClick={() => setReviewing(false)}><ArrowLeft size={17} />Keep editing</Button><Button onClick={handleComplete}><Check size={18} />Finish workout</Button></div>
          </Card>
        </div>
      )}
    </div>
  )
}

function SessionDetail({ session, onClose }: { session: WorkoutSession; onClose: () => void }) {
  const { state } = useFitness()
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Workout details">
      <Card className="review-modal session-modal">
        <div className="modal-head"><div><p className="eyebrow">{formatLongDate(session.date)}</p><h2>Workout {session.workout}</h2><p>{workoutNames[session.workout]}</p></div><button className="icon-button" onClick={onClose} aria-label="Close workout details"><X size={21} /></button></div>
        <div className="review-list detail-list">
          {session.results.map((result) => <div key={result.exerciseId}><div><strong>{state.exercises.find((exercise) => exercise.id === result.exerciseId)?.name}</strong><span>{formatExerciseResult(result)}{result.limitingFactor ? ` · ${result.limitingFactor}` : ''}</span></div><StatusPill status={result.decision} /></div>)}
        </div>
        {session.sessionNotes && <p className="session-note"><strong>Session note</strong>{session.sessionNotes}</p>}
        <Button onClick={onClose}>Done</Button>
      </Card>
    </div>
  )
}
