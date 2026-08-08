import { ArrowRight, Check, ChevronRight, Dumbbell, Flame, Scale, Sparkles, UtensilsCrossed } from 'lucide-react'
import type { AppView } from '../App'
import { DEMO_TODAY } from '../data/seed'
import { calculateMealTotals, formatLongDate, getFourteenDayNutrition, getPresetForDate, getWeightSummary, proteinTargets } from '../domain/calculations'
import { getNextWorkoutCode } from '../domain/workout'
import { useFitness } from '../store/FitnessContext'
import { Button, Card, Metric, PageHeader, ProgressBar, SectionHeading, StatusPill } from '../components/ui'

export function DashboardScreen({ navigate }: { navigate: (view: AppView) => void }) {
  const { state, startWorkout } = useFitness()
  const todayCheckIn = state.checkIns.find((entry) => entry.date === DEMO_TODAY)
  const preset = getPresetForDate(state.mealPresets, DEMO_TODAY)
  const todayMeals = calculateMealTotals(todayCheckIn, preset, state.profile)
  const targets = proteinTargets(state.profile)
  const weight = getWeightSummary(state.checkIns, state.profile)
  const nutrition = getFourteenDayNutrition(state.checkIns, state.mealPresets, state.profile)
  const hasWorkoutDraft = Boolean(state.draftWorkout)
  const displayedWorkout = state.draftWorkout?.workout ?? getNextWorkoutCode(state)
  const displayedExercises = state.exercises.filter((exercise) => exercise.workout === displayedWorkout).sort((a, b) => a.order - b.order)
  const progressPercent = ((weight.average ?? state.profile.currentWeightKg) - 66.8) / (state.profile.goalWeightKg - 66.8)
  const attention = state.progressions.filter((item) => item.decision !== 'Repeat').slice(0, 3)

  function beginWorkout() {
    if (!hasWorkoutDraft) startWorkout(displayedWorkout)
    navigate('train')
  }

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow={formatLongDate(DEMO_TODAY)}
        title={`Good morning, ${state.profile.name.split(' ')[0]}.`}
        detail="One check-in. One clear next step."
        action={<span className="demo-badge">Demo mode</span>}
      />

      <div className="dashboard-hero-grid">
        <Card className="hero-card hero-primary">
          <div className="hero-card-top"><div className="icon-tile lime"><Scale size={22} /></div><span>Lean-gain trajectory</span></div>
          <div className="weight-hero">
            <div><strong>{(weight.average ?? state.profile.currentWeightKg).toFixed(1)}</strong><span>kg 7-day avg</span></div>
            <div className="goal-ring" style={{ '--progress': `${Math.round(Math.max(0, Math.min(1, progressPercent)) * 100)}%` } as React.CSSProperties}>
              <span>{state.profile.goalWeightKg}<small>kg goal</small></span>
            </div>
          </div>
          <ProgressBar value={Math.max(0, progressPercent)} label="Progress toward goal weight" />
          <p className="hero-advice"><Sparkles size={17} />{weight.recommendation}</p>
        </Card>

        <Card className="hero-card checkin-card">
          <div className="hero-card-top"><div className="icon-tile cream"><UtensilsCrossed size={22} /></div><StatusPill status={todayMeals.status} /></div>
          <div>
            <p className="eyebrow">Today’s check-in</p>
            <h2>{todayCheckIn ? 'You’re logged.' : 'Thirty seconds. That’s it.'}</h2>
            <p>{todayCheckIn ? `${Math.round(todayMeals.actualProtein ?? 0)} g protein estimated from today’s presets.` : 'Add morning weight, tap meal completion, and mention only what changed.'}</p>
          </div>
          <Button onClick={() => navigate('check-in')}>{todayCheckIn ? <><Check size={18} />Review check-in</> : <>Check in now <ArrowRight size={18} /></>}</Button>
        </Card>
      </div>

      <div className="metric-grid four">
        <Metric label="Current weight" value={weight.latest?.toFixed(1) ?? '—'} suffix=" kg" hint="Latest logged" />
        <Metric label="Weekly change" value={weight.weeklyChange === null ? '—' : `${weight.weeklyChange >= 0 ? '+' : ''}${weight.weeklyChange.toFixed(2)}`} suffix={weight.weeklyChange === null ? '' : ' kg'} hint="7-day averages" />
        <Metric label="Protein target" value={targets.target} suffix=" g" hint={`${targets.floor} g floor`} />
        <Metric label="14-day coverage" value={nutrition.energyCoverage === null ? '—' : Math.round(nutrition.energyCoverage * 100)} suffix={nutrition.energyCoverage === null ? '' : '%'} hint={`${nutrition.proteinTargetDays} target days`} />
      </div>

      <div className="two-column-layout">
        <Card className="next-workout-card">
          <SectionHeading title={hasWorkoutDraft ? 'Workout in progress' : 'Next workout'} action={<button className="text-button" onClick={() => navigate('train')}>{hasWorkoutDraft ? 'View draft' : 'View plan'} <ChevronRight size={17} /></button>} />
          <div className="workout-letter">{displayedWorkout}</div>
          <div className="next-workout-copy"><p className="eyebrow">{hasWorkoutDraft ? 'Draft autosaved' : 'Strength session'}</p><h3>{displayedWorkout === 'A' ? 'Push & chest' : displayedWorkout === 'B' ? 'Shoulders, legs & triceps' : 'Pull & biceps'}</h3><p>{displayedExercises.map((exercise) => exercise.name).join(' · ')}</p></div>
          <Button onClick={beginWorkout}><Dumbbell size={18} />{hasWorkoutDraft ? 'Resume' : 'Start'} workout {displayedWorkout}</Button>
        </Card>

        <Card>
          <SectionHeading title="Progression pulse" action={<button className="text-button" onClick={() => navigate('progression')}>All exercises <ChevronRight size={17} /></button>} />
          <div className="progression-list compact-list">
            {attention.map((progression) => {
              const exercise = state.exercises.find((item) => item.id === progression.exerciseId)!
              return <div className="progression-row" key={progression.exerciseId}><div><strong>{exercise.name}</strong><span>{progression.nextTarget}</span></div><StatusPill status={progression.decision} /></div>
            })}
          </div>
        </Card>
      </div>

      <Card className="weekly-strip">
        <div className="weekly-icon"><Flame size={24} /></div>
        <div><p className="eyebrow">This week’s focus</p><h3>Quality reps before heavier reps</h3><p>Three exercises need technique or load attention. Keep the next sessions deliberate.</p></div>
        <button className="round-arrow" onClick={() => navigate('progression')} aria-label="See progression"><ArrowRight size={20} /></button>
      </Card>
    </div>
  )
}
