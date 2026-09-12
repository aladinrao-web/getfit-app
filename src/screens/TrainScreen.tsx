import { useEffect, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Clock3, Dumbbell, Flag, ListPlus, Pencil, Plus, RefreshCcw, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { formatLongDate, formatShortDate } from '../domain/calculations'
import { correctWorkoutSession, formatExerciseResult, getNextWorkoutCode, hasCompleteWorkingSets, progressionDecisionFor } from '../domain/workout'
import { formatRepTargets, getNextTargetReps } from '../domain/progression'
import type { ExerciseResult, MuscleGroup, WorkoutCode, WorkoutSession } from '../domain/types'
import { hasIncompleteStartedSet } from '../domain/exerciseSets'
import { muscleLabel } from '../domain/muscles'
import { useFitness } from '../store/FitnessContext'
import { Button, Card, Field, PageHeader, SectionHeading, StatusPill } from '../components/ui'

const workoutNames: Record<WorkoutCode, string> = { A: 'Push & chest', B: 'Shoulders, legs & triceps', C: 'Pull & biceps' }
const limiters = ['', 'General fatigue', 'Form breakdown', 'Stability', 'Pain / discomfort', 'Exercise order', 'Grip fatigue']

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
        <div className="train-hero-copy"><p className="eyebrow">Recommended next</p><h2>{workoutNames[nextWorkout]}</h2><p>{state.exercises.filter((exercise) => exercise.workout === nextWorkout && exercise.isDefault !== false).map((exercise) => exercise.name).join(' · ')}</p></div>
        <Button onClick={() => startWorkout(nextWorkout)}><Dumbbell size={18} />Start workout {nextWorkout}</Button>
      </Card>

      <SectionHeading title="Workout plans" />
      <div className="workout-plan-grid">
        {(['A', 'B', 'C'] as WorkoutCode[]).map((code) => {
          const exercises = state.exercises.filter((exercise) => exercise.workout === code && exercise.isDefault !== false).sort((a, b) => a.order - b.order)
          return (
            <Card className={code === nextWorkout ? 'workout-plan-card recommended' : 'workout-plan-card'} key={code}>
              <div className="plan-card-head"><span className="workout-letter small">{code}</span>{code === nextWorkout && <span className="recommended-label">Up next</span>}</div>
              <h3>{workoutNames[code]}</h3>
              <ol>{exercises.map((exercise) => <li key={exercise.id}><span>{exercise.name}</span><small>{exercise.repRange.min}–{exercise.repRange.max} reps × {exercise.targetReps.length}</small></li>)}</ol>
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
  const [adjustingExercises, setAdjustingExercises] = useState(false)
  const draft = state.draftWorkout!
  const completed = draft.results.filter((result) => {
    const exercise = state.exercises.find((item) => item.id === result.exerciseId)
    return !result.skipped && Boolean(exercise && hasCompleteWorkingSets(result, exercise))
  })
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

      <div className="draft-notice workout-adjust-notice">
        <AlertCircle size={18} />
        <span>Nothing updates your history or progression until you finish and confirm.</span>
        <Button variant="ghost" className="compact-adjust-button" onClick={() => setAdjustingExercises(true)}><ListPlus size={16} />Adjust exercises</Button>
      </div>

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
                <div className="target-strip"><div><span>Last result</span><strong>{progression.lastResult}</strong></div><div><span>Today’s target</span><strong>{formatRepTargets(getNextTargetReps(progression, exercise))}</strong></div><div><span>Range</span><strong>{exercise.repRange.min}–{exercise.repRange.max} reps</strong></div><div><span>Warm-up</span><strong>{exercise.warmup}</strong></div></div>
                <div className="set-log" aria-label={`${exercise.name} sets`}>
                  <div className="set-log-header"><span>Set</span><span>Weight</span><span>Reps</span></div>
                  {result.sets.map((set, index) => <div className="set-log-row" key={index}>
                    <div className="set-number"><strong>{index + 1}</strong><span>Target {getNextTargetReps(progression, exercise)[index] ?? '—'}</span></div>
                    <div className="unit-input compact"><input aria-label={`${exercise.name} set ${index + 1} weight`} type="number" min="0" step="0.5" value={set.weightKg ?? ''} onChange={(event) => updateSet(result, index, 'weightKg', event.target.value)} /><span>kg</span></div>
                    <div className="unit-input compact"><input aria-label={`${exercise.name} set ${index + 1} reps`} inputMode="numeric" type="number" min="0" step="1" value={set.reps ?? ''} placeholder={`${getNextTargetReps(progression, exercise)[index] ?? '—'}`} onChange={(event) => updateSet(result, index, 'reps', event.target.value)} /><span>reps</span></div>
                  </div>)}
                </div>
                <details className="exercise-details">
                  <summary>Context & progression <ChevronDown size={17} /></summary>
                  <div className="detail-fields">
                    <Field label="What limited the set?"><select value={result.limitingFactor} onChange={(event) => updateDraftResult(result.exerciseId, { limitingFactor: event.target.value })}>{limiters.map((limiter) => <option value={limiter} key={limiter}>{limiter || 'Nothing notable'}</option>)}</select></Field>
                    <Field label="Form note"><textarea rows={2} value={result.formNotes} placeholder="Only if something changed." onChange={(event) => updateDraftResult(result.exerciseId, { formNotes: event.target.value })} /></Field>
                  </div>
                </details>
              </>}
            </Card>
          )
        })}
      </div>

      <Card className="session-note-card"><Field label="Session note" hint="Optional. Keep it short."><textarea rows={3} value={draft.sessionNotes} placeholder="Example: shortened session; legs moved to next time." onChange={(event) => updateDraftNotes(event.target.value)} /></Field></Card>

      <div className="finish-bar"><div><strong>{completed.length}</strong><span>of {draft.results.length} exercises have all working sets logged</span>{hasIncompleteSets && <small>Finish or clear sets missing weight or reps.</small>}</div><Button disabled={!completed.length || hasIncompleteSets} onClick={() => setReviewing(true)}><Flag size={18} />Review & finish</Button></div>

      {reviewing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Review workout">
          <Card className="review-modal">
            <div className="modal-head"><div><p className="eyebrow">Final review</p><h2>Commit Workout {draft.workout}?</h2></div><button className="icon-button" onClick={() => setReviewing(false)} aria-label="Close review"><X size={21} /></button></div>
            <p>Only these completed exercises will be added. Their matching progression cards will update at the same time.</p>
            <div className="review-list">
              {completed.map((result) => {
                const exercise = state.exercises.find((item) => item.id === result.exerciseId)!
                return <div key={result.exerciseId}><div><strong>{exercise.name}</strong><span>{formatExerciseResult(result)}</span></div><StatusPill status={progressionDecisionFor(result, exercise)} /></div>
              })}
            </div>
            <div className="review-warning"><RotateCcw size={17} />Confirming twice updates the same session; it never creates duplicates.</div>
            <div className="modal-actions"><Button variant="secondary" onClick={() => setReviewing(false)}><ArrowLeft size={17} />Keep editing</Button><Button onClick={handleComplete}><Check size={18} />Finish workout</Button></div>
          </Card>
        </div>
      )}

      {adjustingExercises && <ExerciseEditor onClose={() => setAdjustingExercises(false)} />}
    </div>
  )
}

type ExercisePicker = { type: 'add' } | { type: 'replace'; exerciseId: string }

function ExerciseEditor({ onClose }: { onClose: () => void }) {
  const { state, addDraftExercise, replaceDraftExercise, removeDraftExercise, moveDraftExercise } = useFitness()
  const [picker, setPicker] = useState<ExercisePicker | null>(null)
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<'all' | MuscleGroup>('all')
  const draft = state.draftWorkout!
  const currentIds = new Set(draft.results.map((result) => result.exerciseId))
  const replacingExercise = picker?.type === 'replace'
    ? state.exercises.find((exercise) => exercise.id === picker.exerciseId)
    : undefined
  const candidates = state.exercises
    .filter((exercise) => !currentIds.has(exercise.id))
    .filter((exercise) => !replacingExercise || exercise.primaryMuscle === replacingExercise.primaryMuscle)
    .sort((left, right) => Number(right.workout === draft.workout) - Number(left.workout === draft.workout)
      || muscleLabel(left.primaryMuscle).localeCompare(muscleLabel(right.primaryMuscle))
      || left.order - right.order)
  const visibleCandidates = candidates.filter((exercise) => {
    const query = exerciseQuery.trim().toLowerCase()
    return (muscleFilter === 'all' || exercise.primaryMuscle === muscleFilter)
      && (!query || exercise.name.toLowerCase().includes(query) || muscleLabel(exercise.primaryMuscle).toLowerCase().includes(query))
  })

  function hasEnteredReps(exerciseId: string) {
    return draft.results.find((result) => result.exerciseId === exerciseId)?.sets.some((set) => set.reps !== null) ?? false
  }

  function handleRemove(exerciseId: string, exerciseName: string) {
    if (hasEnteredReps(exerciseId) && !window.confirm(`Remove ${exerciseName}? Its entered reps in this draft will be cleared.`)) return
    removeDraftExercise(exerciseId)
  }

  function chooseExercise(exerciseId: string) {
    if (!picker) return
    if (picker.type === 'add') addDraftExercise(exerciseId)
    else {
      const exerciseName = state.exercises.find((exercise) => exercise.id === picker.exerciseId)?.name ?? 'this exercise'
      if (hasEnteredReps(picker.exerciseId) && !window.confirm(`Replace ${exerciseName}? Its entered reps in this draft will be cleared.`)) return
      replaceDraftExercise(picker.exerciseId, exerciseId)
    }
    setPicker(null)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Adjust workout exercises">
      <Card className="review-modal exercise-editor-modal">
        <div className="modal-head">
          <div><p className="eyebrow">Workout {draft.workout} override</p><h2>Adjust exercises</h2><p>Changes apply only to this workout.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close exercise editor"><X size={21} /></button>
        </div>

        {!picker && <>
          <div className="draft-exercise-editor-list">
            {draft.results.map((result, index) => {
              const exercise = state.exercises.find((item) => item.id === result.exerciseId)!
              const replacements = state.exercises.filter((item) => item.id !== exercise.id && !currentIds.has(item.id) && item.primaryMuscle === exercise.primaryMuscle)
              return (
                <div className="draft-exercise-editor-row" key={result.exerciseId}>
                  <span className="exercise-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="draft-exercise-editor-copy"><strong>{exercise.name}</strong><span>{muscleLabel(exercise.primaryMuscle)} · {exercise.repRange.min}–{exercise.repRange.max} reps × {exercise.targetReps.length}</span></div>
                  <div className="draft-exercise-editor-actions">
                    <button className="mini-icon-button" disabled={index === 0} onClick={() => moveDraftExercise(exercise.id, -1)} aria-label={`Move ${exercise.name} up`}><ArrowUp size={15} /></button>
                    <button className="mini-icon-button" disabled={index === draft.results.length - 1} onClick={() => moveDraftExercise(exercise.id, 1)} aria-label={`Move ${exercise.name} down`}><ArrowDown size={15} /></button>
                    <button className="mini-text-button" disabled={!replacements.length} onClick={() => setPicker({ type: 'replace', exerciseId: exercise.id })}><RefreshCcw size={14} />Replace</button>
                    <button className="mini-icon-button danger" disabled={draft.results.length === 1} onClick={() => handleRemove(exercise.id, exercise.name)} aria-label={`Remove ${exercise.name}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="exercise-editor-footer">
            <Button variant="secondary" disabled={!candidates.length} onClick={() => { setExerciseQuery(''); setMuscleFilter('all'); setPicker({ type: 'add' }) }}><Plus size={17} />Add exercise</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </>}

        {picker && <div className="exercise-picker">
          <button className="picker-back" onClick={() => setPicker(null)}><ArrowLeft size={16} />Back to workout</button>
          <div className="exercise-picker-heading">
            <h3>{picker.type === 'add' ? 'Add an exercise' : `Replace ${replacingExercise?.name}`}</h3>
            <p>{picker.type === 'add' ? 'Choose any unused library exercise. Cross-theme additions are allowed.' : `Only unused ${muscleLabel(replacingExercise!.primaryMuscle)} exercises are shown.`}</p>
          </div>
          <div className="exercise-picker-filters">
            <input aria-label="Search exercises" value={exerciseQuery} onChange={(event) => setExerciseQuery(event.target.value)} placeholder="Search exercises" />
            {picker.type === 'add' && <select aria-label="Filter exercises by muscle group" value={muscleFilter} onChange={(event) => setMuscleFilter(event.target.value as 'all' | MuscleGroup)}>
              <option value="all">All muscle groups</option>
              {['chest', 'front-shoulders', 'side-shoulders', 'rear-shoulders', 'triceps', 'biceps', 'back-lats', 'upper-back', 'quads', 'hamstrings', 'glutes', 'calves', 'core'].map((muscle) => <option key={muscle} value={muscle}>{muscleLabel(muscle as MuscleGroup)}</option>)}
            </select>}
          </div>
          <div className="exercise-picker-list">
            {visibleCandidates.map((exercise) => {
              const progression = state.progressions.find((item) => item.exerciseId === exercise.id)
              return <button className="exercise-picker-option" onClick={() => chooseExercise(exercise.id)} key={exercise.id}>
                <span className="workout-letter tiny">{exercise.workout}</span>
                <span><strong>{exercise.name}</strong><small>Primary: {muscleLabel(exercise.primaryMuscle)}{exercise.secondaryMuscles.length ? ` · Secondary: ${exercise.secondaryMuscles.map(muscleLabel).join(', ')}` : ''}</small></span>
                <span><strong>{progression?.currentWeightKg ?? 0} kg</strong><small>{exercise.repRange.min}–{exercise.repRange.max} reps × {exercise.targetReps.length}</small></span>
              </button>
            })}
            {!visibleCandidates.length && <div className="exercise-picker-empty">No unused exercise matches this search or filter.</div>}
          </div>
        </div>}
      </Card>
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
                  <Field label="Form note"><textarea rows={2} value={result.formNotes} onChange={(event) => updateResult(result.exerciseId, { formNotes: event.target.value })} /></Field>
                </div>
              </div>
            })}
            <Field label="Session note"><textarea rows={2} value={draft.sessionNotes} onChange={(event) => setDraft((current) => ({ ...current, sessionNotes: event.target.value }))} /></Field>
          </div>
          <div className="correction-note"><RotateCcw size={17} /><div><strong>Progression impact after saving</strong><span>This session keeps its ID; later results still win.</span><ul>{progressionPreview.map(({ exerciseId, exercise, progression }) => <li key={exerciseId}><span>{exercise?.name ?? exerciseId}</span><strong>{progression?.nextTarget ?? 'No target change'}</strong></li>)}</ul></div></div>
          <div className="modal-actions"><Button variant="secondary" onClick={() => { setDraft(structuredClone(session)); setEditing(false) }}><ArrowLeft size={17} />Cancel</Button><Button disabled={!draft.date || !draft.results.length || draft.results.some((result) => {
            const exercise = state.exercises.find((item) => item.id === result.exerciseId)
            return !exercise || !hasCompleteWorkingSets(result, exercise) || hasIncompleteStartedSet(result)
          })} onClick={() => onCorrect(draft)}><Save size={17} />Save correction</Button></div>
        </>}
      </Card>
    </div>
  )
}
