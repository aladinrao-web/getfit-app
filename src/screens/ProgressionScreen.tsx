import { useState } from 'react'
import { ArrowUpRight, Dumbbell, Focus, Gauge, Target } from 'lucide-react'
import type { WorkoutCode } from '../domain/types'
import { useFitness } from '../store/FitnessContext'
import { Card, PageHeader, SectionHeading, StatusPill } from '../components/ui'

type Filter = 'All' | WorkoutCode

export function ProgressionScreen() {
  const { state } = useFitness()
  const [filter, setFilter] = useState<Filter>('All')
  const visible = state.progressions.filter((progression) => {
    const exercise = state.exercises.find((item) => item.id === progression.exerciseId)
    return filter === 'All' || exercise?.workout === filter
  })
  const counts = {
    Increase: state.progressions.filter((item) => item.decision === 'Increase').length,
    Repeat: state.progressions.filter((item) => item.decision === 'Repeat').length,
    Technique: state.progressions.filter((item) => item.decision === 'Technique focus').length,
  }

  return (
    <div className="page progression-page">
      <PageHeader eyebrow="Current exercise state" title="Progression" detail="The next useful step—not simply more weight." />

      <div className="progress-summary-grid">
        <Card><div className="icon-tile lime"><ArrowUpRight size={21} /></div><strong>{counts.Increase}</strong><span>Ready to increase</span></Card>
        <Card><div className="icon-tile cream"><Gauge size={21} /></div><strong>{counts.Repeat}</strong><span>Building clean reps</span></Card>
        <Card><div className="icon-tile blue"><Focus size={21} /></div><strong>{counts.Technique}</strong><span>Technique priorities</span></Card>
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
              <div className="next-target"><Target size={19} /><div><span>Next target</span><strong>{progression.nextTarget}</strong></div></div>
              {progression.limitingFactor && <div className="limiter"><span>Watch</span>{progression.limitingFactor}</div>}
              <p className="progress-note">{progression.notes}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
