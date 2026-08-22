import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, Check, ChevronDown, Clock3, Dumbbell, Flag, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { formatLongDate, formatShortDate } from '../domain/calculations'
import { correctWorkoutSession, formatExerciseResult, getNextWorkoutCode } from '../domain/workout'
import type { ExerciseResult, ProgressionDecision, WorkoutCode, WorkoutSession } from '../domain/types'
import { hasCompletedExerciseSet, hasIncompleteStartedSet } from '../domain/exerciseSets'
import { useFitness } from '../store/FitnessContext'
import { Button, Card, Field, PageHeader, SectionHeading, StatusPill } from '../components/ui'

const workoutNames: Record<WorkoutCode, string> = { A: 'Push & chest', B: 'Shoulders, legs & triceps', C: 'Pull & biceps' }
const limiters = ['', 'General fatigue', 'Form breakdown', 'Stability', 'Pain / discomfort', 'Exercise order', 'Grip fatigue']
const decisions: ProgressionDecision[] = ['Increase', 'Repeat', 'Deload', 'Technique focus']

export function TrainScreen() {
  const { mode, state, startWorkout, correctWorkout, deleteWorkout } = useFitness()
  const [completedMessage, setCompletedMessage] = useState('')
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)

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
          {sessions.slice(0, showAllHistory ? sessions.length : 6).map((session) => (
            <button className="session-row" onClick={() => setSelectedSession(session)} key={session.id}>
              <span className="workout-letter tiny">{session.workout}</span>
              <div><strong>{workoutNames[session.workout]}</strong><span>{formatShortDate(session.date)} · {session.results.length} exercises</span></div>
              <div className="session-decisions">{session.results.slice(0, 3).map((result, index) => <i className={`decision-dot decision-${result.decision.toLowerCase().replace(' ', '-')}`} key={`${result.exerciseId}-${index}`} title={result.decision} />)}</div>
              <ChevronDown size={18} />
            </button>
          ))}
        </div>
        {sessions.length > 6 && <Button variant="ghost" onClick={() => setShowAllHistory((current) => !current)}>{showAllHistory ? 'Show recent only' : `Show all ${sessions.length} sessions`}</Button>}
      </Card>

      {selectedSession && <SessionDetail
        session={selectedSession}
        canCorrect={mode === 'personal'}
        onClose={() => setSelectedSession(null)}
        onCorrect={(session) => {
          correctWorkout(session)
          setSelectedSession(null)
          setCompletedMessage('Workout corrected. A safety copy was saved and affected progression targets were recomputed.')
        }}
        onDelete={(sessionId) => {
          deleteWorkout(sessionId)
          setSelectedSession(null)
          setCompletedMessage('Workout deleted. A safety copy was saved and affected progression targets were recomputed.')
        }}
      />}
    </div>
  )
}

function ActiveWorkout({ onCompleted }: { onCompleted: () => void }) {
  const { state, updateDraftResult, updateDraftNotes, discardDraft, completeWorkout } = useFitness()
  const [reviewing, setReviewing] = useState(false)
  const draft = state.draftWorkout!
  const completed = draft.results.filter((result) => !result.skipped && hasCompletedExerciseSet(result))
  const hasIncompleteSets = draft.results.some((result) => !result.skipped && hasIncompleteStartedSet(result))

  function updateSet(result: ExerciseResult, index: number, field: 'weightKg' | 'reps', value: string) {
    const sets = result.sets.map((set, setIndex) => setIndex === index
      ? { ...set, [field]: value === '' ? null : Number(value) }
      : set)
    updateDraftResult(result.exerciseId, { sets })
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
                <div className="set-log" aria-label={`${exercise.name} sets`}>
                  <div className="set-log-header"><span>Set</span><span>Weight</span><span>Reps</span></div>
                  {result.sets.map((set, index) => <div className="set-log-row" key={index}>
                    <div className="set-number"><strong>{index + 1}</strong><span>Target {exercise.targetReps[index] ?? '—'}</span></div>
                    <div className="unit-input compact"><input aria-label={`${exercise.name} set ${index + 1} weight`} type="number" min="0" step="0.5" value={set.weightKg ?? ''} onChange={(event) => updateSet(result, index, 'weightKg', event.target.value)} /><span>kg</span></div>
                    <div className="unit-input compact"><input aria-label={`${exercise.name} set ${index + 1} reps`} inputMode="numeric" type="number" min="0" value={set.reps ?? ''} placeholder={`${exercise.targetReps[index] ?? '—'}`} onChange={(event) => updateSet(result, index, 'reps', event.target.value)} /><span>reps</span></div>
                  </div>)}
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

      <div className="finish-bar"><div><strong>{completed.length}</strong><span>of {draft.results.length} exercises have complete sets</span>{hasIncompleteSets && <small>Finish or clear sets missing weight or reps.</small>}</div><Button disabled={!completed.length || hasIncompleteSets} onClick={() => setReviewing(true)}><Flag size={18} />Review & finish</Button></div>

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

function SessionReadOnlyDetail({ session, onClose }: { session: WorkoutSession; onClose: () => void }) {
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

function SessionDetail({ session, canCorrect, onClose, onCorrect, onDelete }: { session: WorkoutSession; canCorrect: boolean; onClose: () => void; onCorrect: (session: WorkoutSession) => void; onDelete: (sessionId: string) => void }) {
  const { state } = useFitness()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<WorkoutSession>(() => structuredClone(session))

  if (!canCorrect) return <SessionReadOnlyDetail session={session} onClose={onClose} />

  function updateResult(exerciseId: string, patch: Partial<ExerciseResult>) {
    setDraft((current) => ({
      ...current,
      results: current.results.map((result) => result.exerciseId === exerciseId ? { ...result, ...patch } : result),
    }))
  }

  function updateSet(result: ExerciseResult, index: number, field: 'weightKg' | 'reps', value: string) {
    const sets = result.sets.map((set, setIndex) => setIndex === index
      ? { ...set, [field]: value === '' ? null : Number(value) }
      : set)
    updateResult(result.exerciseId, { sets })
  }

  function handleDelete() {
    if (!window.confirm(`Delete Workout ${session.workout} from ${formatLongDate(session.date)}? A recoverable safety copy will be saved first.`)) return
    onDelete(session.id)
  }

  const previewState = correctWorkoutSession(state, draft)
  const progressionPreview = draft.results.map((result) => ({
    exerciseId: result.exerciseId,
    exercise: state.exercises.find((item) => item.id === result.exerciseId),
    progression: previewState.progressions.find((item) => item.exerciseId === result.exerciseId),
  }))

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Workout details">
      <Card className="review-modal session-modal correction-modal">
        <div className="modal-head"><div><p className="eyebrow">{editing ? 'Correct completed workout' : formatLongDate(session.date)}</p><h2>Workout {session.workout}</h2><p>{workoutNames[session.workout]}</p></div><button className="icon-button" onClick={onClose} aria-label="Close workout details"><X size={21} /></button></div>
        {!editing ? <>
          <div className="review-list detail-list">
            {session.results.map((result) => <div key={result.exerciseId}><div><strong>{state.exercises.find((exercise) => exercise.id === result.exerciseId)?.name}</strong><span>{formatExerciseResult(result)}{result.limitingFactor ? ` · ${result.limitingFactor}` : ''}</span></div><StatusPill status={result.decision} /></div>)}
          </div>
          {session.sessionNotes && <p className="session-note"><strong>Session note</strong>{session.sessionNotes}</p>}
          <div className="modal-actions session-detail-actions">
            <Button variant="danger" onClick={handleDelete}><Trash2 size={17} />Delete</Button>
            <Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={17} />Correct</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </> : <>
          <div className="correction-fields">
            <Field label="Workout date"><input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></Field>
            {draft.results.map((result) => {
              const exercise = state.exercises.find((item) => item.id === result.exerciseId)
              return <div className="correction-exercise" key={result.exerciseId}>
                <div className="correction-exercise-head"><strong>{exercise?.name ?? result.exerciseId}</strong><button className="text-danger-button" onClick={() => setDraft((current) => ({ ...current, results: current.results.filter((item) => item.exerciseId !== result.exerciseId) }))}><Trash2 size={15} />Remove</button></div>
                <div className="set-log correction-set-log">
                  <div className="set-log-header"><span>Set</span><span>Weight</span><span>Reps</span></div>
                  {result.sets.map((set, index) => <div className="set-log-row" key={index}>
                    <div className="set-number"><strong>{index + 1}</strong></div>
                    <div className="unit-input compact"><input aria-label={`${exercise?.name ?? result.exerciseId} set ${index + 1} weight`} type="number" min="0" step="0.5" value={set.weightKg ?? ''} onChange={(event) => updateSet(result, index, 'weightKg', event.target.value)} /><span>kg</span></div>
                    <div className="unit-input compact"><input aria-label={`${exercise?.name ?? result.exerciseId} set ${index + 1} reps`} type="number" min="0" value={set.reps ?? ''} onChange={(event) => updateSet(result, index, 'reps', event.target.value)} /><span>reps</span></div>
                  </div>)}
                </div>
                <div className="detail-fields correction-detail-fields">
                  <Field label="Limiting factor"><select value={result.limitingFactor} onChange={(event) => updateResult(result.exerciseId, { limitingFactor: event.target.value })}>{limiters.map((limiter) => <option value={limiter} key={limiter}>{limiter || 'Nothing notable'}</option>)}</select></Field>
                  <Field label="Progression decision"><select value={result.decision} onChange={(event) => updateResult(result.exerciseId, { decision: event.target.value as ProgressionDecision })}>{decisions.map((decision) => <option key={decision}>{decision}</option>)}</select></Field>
                  <Field label="Form note"><textarea rows={2} value={result.formNotes} onChange={(event) => updateResult(result.exerciseId, { formNotes: event.target.value })} /></Field>
                </div>
              </div>
            })}
            <Field label="Session note"><textarea rows={2} value={draft.sessionNotes} onChange={(event) => setDraft((current) => ({ ...current, sessionNotes: event.target.value }))} /></Field>
          </div>
          <div className="correction-note"><RotateCcw size={17} /><div><strong>Progression impact after saving</strong><span>This session keeps its ID; later results still win.</span><ul>{progressionPreview.map(({ exerciseId, exercise, progression }) => <li key={exerciseId}><span>{exercise?.name ?? exerciseId}</span><strong>{progression?.nextTarget ?? 'No target change'}</strong></li>)}</ul></div></div>
          <div className="modal-actions"><Button variant="secondary" onClick={() => { setDraft(structuredClone(session)); setEditing(false) }}><ArrowLeft size={17} />Cancel</Button><Button disabled={!draft.date || !draft.results.length || draft.results.some((result) => !hasCompletedExerciseSet(result) || hasIncompleteStartedSet(result))} onClick={() => onCorrect(draft)}><Save size={17} />Save correction</Button></div>
        </>}
      </Card>
    </div>
  )
}
