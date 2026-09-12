import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronDown, Dumbbell, Gauge, Layers3, Target } from 'lucide-react'
import { formatRepTargets, getMaximumRepTargets, getNextTargetReps } from '../domain/progression'
import type { WorkoutCode } from '../domain/types'
import { useFitness } from '../store/FitnessContext'
import { Card, PageHeader, ProgressBar, SectionHeading, StatusPill } from '../components/ui'
import { getHomeFocus, getMuscleCoverage } from '../domain/muscleCoverage'

type Filter = 'All' | WorkoutCode

export function ProgressionScreen() {
  const { state, today } = useFitness()
  const [filter, setFilter] = useState<Filter>('All')
  const coverage = getMuscleCoverage(state, today)
  const focus = getHomeFocus(state, today, coverage)
  const onTargetCount = coverage.muscles.filter((muscle) => muscle.status === 'On target').length
  const visible = state.progressions.filter((progression) => {
    const exercise = state.exercises.find((item) => item.id === progression.exerciseId)
    return filter === 'All' || exercise?.workout === filter
  })
  const counts = {
    Increase: state.progressions.filter((item) => item.decision === 'Increase').length,
    Repeat: state.progressions.filter((item) => item.decision === 'Repeat').length,
    Deload: state.progressions.filter((item) => item.decision === 'Deload').length,
  }

  return (
    <div className="page progression-page">
      <PageHeader eyebrow="Current exercise state" title="Progress" detail="See your 28-day muscle coverage, then act on the next useful step." />

      <Card className={`coverage-focus-card focus-${focus.kind}`}>
        <div className="icon-tile lime"><Layers3 size={21} /></div>
        <div><p className="eyebrow">{focus.eyebrow}</p><h2>{focus.title}</h2><p>{focus.detail}</p></div>
        <div className="coverage-focus-stats">
          <strong>{coverage.sessionCount}<small> / {coverage.sessionGoal}</small></strong>
          <span>workouts in 28 days</span>
          <b>{onTargetCount} muscle group{onTargetCount === 1 ? '' : 's'} on target</b>
        </div>
      </Card>

      <SectionHeading title="Muscle coverage" action={<span className="muted-label">Primary sets 1× · secondary 0.5×</span>} />
      <div className="muscle-coverage-grid">
        {coverage.muscles.map((muscle) => {
          const change = muscle.effectiveSets - muscle.previousEffectiveSets
          const available = state.exercises.filter((exercise) => exercise.primaryMuscle === muscle.muscle)
          return (
            <Card className="muscle-coverage-card" key={muscle.muscle}>
              <div className="muscle-card-head"><div><h3>{muscle.label}</h3><span>{muscle.weeklyMin}–{muscle.weeklyMax} effective sets/week</span></div><StatusPill status={muscle.status} /></div>
              <div className="muscle-set-total"><strong>{muscle.effectiveSets % 1 ? muscle.effectiveSets.toFixed(1) : muscle.effectiveSets}</strong><span>of {muscle.targetMin}–{muscle.targetMax} sets over 28 days</span></div>
              <ProgressBar value={muscle.effectiveSets} max={muscle.targetMin} label={`${muscle.label} minimum coverage`} />
              <div className="muscle-card-meta">
                <span><strong>{muscle.exposures}</strong> meaningful exposures</span>
                <span className={change > 0 ? 'coverage-up' : change < 0 ? 'coverage-down' : ''}>{change > 0 ? '+' : ''}{change % 1 ? change.toFixed(1) : change} sets vs prior 28 days</span>
              </div>
              <details className="muscle-details">
                <summary>Exercise breakdown <ChevronDown size={15} /></summary>
                <div>
                  {muscle.exercises.length
                    ? muscle.exercises.map((exercise) => <p key={exercise.exerciseId}><span>{exercise.exerciseName}<small>{exercise.role}</small></span><strong>{exercise.effectiveSets % 1 ? exercise.effectiveSets.toFixed(1) : exercise.effectiveSets}</strong></p>)
                    : <p className="muscle-empty">No completed sets in this period.</p>}
                  <div className="available-exercises"><span>Available primary exercises</span><strong>{available.length ? available.map((exercise) => exercise.name).join(' · ') : 'None in the current library'}</strong></div>
                </div>
              </details>
            </Card>
          )
        })}
      </div>

      <SectionHeading title="Exercise progression" action={<span className="muted-label">Automatic 8–12 rep progression</span>} />
      <div className="progress-summary-grid">
        <Card><div className="icon-tile lime"><ArrowUpRight size={21} /></div><strong>{counts.Increase}</strong><span>Load increases</span></Card>
        <Card><div className="icon-tile cream"><Gauge size={21} /></div><strong>{counts.Repeat}</strong><span>Building reps</span></Card>
        <Card><div className="icon-tile blue"><ArrowDownRight size={21} /></div><strong>{counts.Deload}</strong><span>Deloads</span></Card>
      </div>

      <div className="filter-bar">
        {(['All', 'A', 'B', 'C'] as Filter[]).map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item === 'All' ? 'All exercises' : `Workout ${item}`}</button>)}
      </div>

      <SectionHeading title={filter === 'All' ? 'All exercise targets' : `Workout ${filter} targets`} action={<span className="muted-label">{visible.length} exercises</span>} />
      <div className="progression-card-grid">
        {visible.map((progression) => {
          const exercise = state.exercises.find((item) => item.id === progression.exerciseId)!
          return (
            <Card className="progression-card" key={progression.exerciseId}>
              <div className="progression-card-head"><div className="exercise-code"><span>{exercise.workout}</span><Dumbbell size={18} /></div><StatusPill status={progression.decision} /></div>
              <h2>{exercise.name}</h2>
              <div className="current-load"><span>Current working load</span><strong>{progression.currentWeightKg}<small>kg</small></strong></div>
              <div className="progression-detail"><span>Last result</span><strong>{progression.lastResult}</strong></div>
              <div className="next-target"><Target size={19} /><div><span>Next target</span><strong>{formatRepTargets(getNextTargetReps(progression, exercise))}</strong><small>{exercise.repRange.min}–{exercise.repRange.max} reps × {exercise.targetReps.length}</small></div></div>
              {progression.rebuildGoalReps?.length && <div className="progression-detail"><span>Rebuild goal</span><strong>{formatRepTargets(progression.rebuildGoalReps)} at {progression.currentWeightKg} kg</strong></div>}
              {progression.limitingFactor && <div className="limiter"><span>Watch</span>{progression.limitingFactor}</div>}
              <p className="progress-note">{progression.notes}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
