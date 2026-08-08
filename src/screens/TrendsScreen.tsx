import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CalendarDays, Scale, Sparkles, Target } from 'lucide-react'
import { buildWeightPoints, formatShortDate, getWeightSummary } from '../domain/calculations'
import { useFitness } from '../store/FitnessContext'
import { WeightChart } from '../components/WeightChart'
import { Card, Metric, PageHeader, SectionHeading } from '../components/ui'

export function TrendsScreen() {
  const { state } = useFitness()
  const [range, setRange] = useState<28 | 42>(28)
  const allPoints = buildWeightPoints(state.checkIns)
  const points = allPoints.slice(-range)
  const summary = getWeightSummary(state.checkIns, state.profile)
  const targetGainMin = state.profile.currentWeightKg * state.profile.weeklyGainMin
  const targetGainMax = state.profile.currentWeightKg * state.profile.weeklyGainMax

  return (
    <div className="page trends-page">
      <PageHeader eyebrow="Signal over noise" title="Weight trends" detail="The seven-day average makes the decision—not one morning." />

      <div className="metric-grid four">
        <Metric label="Latest weight" value={summary.latest?.toFixed(1) ?? '—'} suffix=" kg" hint="Most recent entry" />
        <Metric label="7-day average" value={summary.average?.toFixed(2) ?? '—'} suffix=" kg" hint="Smoothed trend" />
        <Metric label="Weekly change" value={summary.weeklyChange === null ? '—' : `${summary.weeklyChange >= 0 ? '+' : ''}${summary.weeklyChange.toFixed(2)}`} suffix={summary.weeklyChange === null ? '' : ' kg'} hint="Average vs prior week" />
        <Metric label="Goal weight" value={state.profile.goalWeightKg.toFixed(1)} suffix=" kg" hint={`${(state.profile.goalWeightKg - (summary.average ?? state.profile.currentWeightKg)).toFixed(1)} kg remaining`} />
      </div>

      <Card className="weight-chart-card">
        <div className="chart-card-head"><div><p className="eyebrow">Body weight</p><h2>Daily readings & moving average</h2></div><div className="range-toggle"><button className={range === 28 ? 'active' : ''} onClick={() => setRange(28)}>4 weeks</button><button className={range === 42 ? 'active' : ''} onClick={() => setRange(42)}>6 weeks</button></div></div>
        <WeightChart points={points} />
      </Card>

      <div className="trends-bottom-grid">
        <Card className="trend-action-card">
          <div className="icon-tile lime"><Sparkles size={22} /></div>
          <p className="eyebrow">Next action</p>
          <h2>{summary.recommendation}</h2>
          <p>Your target gain band is {targetGainMin.toFixed(2)}–{targetGainMax.toFixed(2)} kg per week. Review it weekly, not daily.</p>
          <div className="gain-band"><span>Slow</span><div><i /><b /></div><span>Fast</span></div>
        </Card>

        <Card>
          <SectionHeading title="Recent weigh-ins" action={<CalendarDays size={19} />} />
          <div className="weighin-list">
            {[...points].reverse().slice(0, 6).map((point, index, list) => {
              const previous = list[index + 1]
              const change = previous ? point.weight - previous.weight : 0
              return <div key={point.date}><span className="scale-icon"><Scale size={17} /></span><div><strong>{formatShortDate(point.date)}</strong><span>7-day avg {point.rollingAverage.toFixed(2)} kg</span></div><strong>{point.weight.toFixed(1)} kg</strong><span className={change >= 0 ? 'change-up' : 'change-down'}>{change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{Math.abs(change).toFixed(1)}</span></div>
            })}
          </div>
        </Card>
      </div>

      <Card className="trajectory-card">
        <div className="icon-tile cream"><Target size={22} /></div><div><p className="eyebrow">Goal trajectory</p><h3>Steady gain beats rushed gain</h3><p>At the current target band, each week adds a small amount while strength and form remain the guardrails.</p></div>
      </Card>
    </div>
  )
}
