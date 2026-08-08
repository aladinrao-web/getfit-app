import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronRight, Search, ShieldCheck } from 'lucide-react'
import { getDayName, proteinTargets } from '../domain/calculations'
import { useFitness } from '../store/FitnessContext'
import { Card, PageHeader, ProgressBar, SectionHeading } from '../components/ui'

export function NutritionScreen() {
  const { state, today } = useFitness()
  const todayName = getDayName(today)
  const [selectedDay, setSelectedDay] = useState(todayName)
  const [query, setQuery] = useState('')
  const preset = state.mealPresets.find((item) => item.day === selectedDay) ?? state.mealPresets[0]
  const targets = proteinTargets(state.profile)
  const plannedProtein = preset.slots.reduce((sum, slot) => sum + slot.proteinG, 0)
  const plannedCalories = preset.slots.reduce((sum, slot) => sum + slot.calories, 0)
  const foodItems = state.foodLibrary.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => setSelectedDay(todayName), [todayName])

  return (
    <div className="page nutrition-page">
      <PageHeader eyebrow="Preset-based, not gram-by-gram" title="Nutrition" detail="Know the plan. Log only what changed." />

      <div className="day-tabs" role="tablist" aria-label="Meal plan day">
        {state.mealPresets.map((item) => <button role="tab" aria-selected={selectedDay === item.day} className={selectedDay === item.day ? 'active' : ''} onClick={() => setSelectedDay(item.day)} key={item.day}><span>{item.day.slice(0, 3)}</span><small>{item.day === todayName ? 'Today' : ''}</small></button>)}
      </div>

      <div className="nutrition-layout">
        <div>
          <Card className="nutrition-target-card">
            <div><p className="eyebrow">{selectedDay} plan</p><h2>{plannedProtein} g protein</h2><p>Across four simple anchors · {plannedCalories} kcal estimated</p></div>
            <div><ProgressBar value={plannedProtein} max={targets.target} label="Planned protein versus target" /><span className="target-overline">{Math.round((plannedProtein / targets.target) * 100)}% of target planned</span></div>
          </Card>

          <div className="preset-meals">
            {preset.slots.map((slot, index) => (
              <Card className="preset-meal" key={slot.key}>
                <span className="meal-number">0{index + 1}</span>
                <div><p className="eyebrow">{slot.label}</p><h3>{slot.description}</h3><p>{slot.proteinG} g protein · {slot.calories} kcal</p></div>
                <ChevronRight size={19} />
              </Card>
            ))}
          </div>
        </div>

        <aside>
          <Card className="allergen-card">
            <div className="icon-tile warning"><AlertTriangle size={21} /></div>
            <div><p className="eyebrow">Strict exclusion</p><h3>{state.profile.allergen}</h3><p>Generic nutrition estimates are not allergen clearance. Check processed-food labels every time.</p></div>
          </Card>
          <Card className="protein-rules-card">
            <SectionHeading title="Protein guide" />
            <div className="rule-row"><span>Daily floor</span><strong>{targets.floor} g</strong></div>
            <div className="rule-row"><span>Main target</span><strong>{targets.target} g</strong></div>
            <div className="rule-row"><span>Tracking style</span><strong>Rounded</strong></div>
            <div className="safe-note"><ShieldCheck size={17} />Presets keep this useful without turning it into a chore.</div>
          </Card>
        </aside>
      </div>

      <Card className="food-library-card">
        <SectionHeading title="Quick food reference" />
        <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search foods" /></div>
        <div className="food-table" role="table">
          {foodItems.map((item) => <div className="food-row" role="row" key={item.id}><div><strong>{item.name}</strong><span>{item.serving}</span></div><span>{item.proteinG} g</span><span>{item.calories} kcal</span><small>{item.allergenStatus}</small></div>)}
        </div>
      </Card>
    </div>
  )
}
