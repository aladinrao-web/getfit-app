import { useEffect, useState } from 'react'
import { Apple, BarChart3, Dumbbell, Gauge, LineChart, Settings, UserRound, UtensilsCrossed } from 'lucide-react'
import { DashboardScreen } from './screens/DashboardScreen'
import { CheckInScreen } from './screens/CheckInScreen'
import { TrainScreen } from './screens/TrainScreen'
import { ProgressionScreen } from './screens/ProgressionScreen'
import { NutritionScreen } from './screens/NutritionScreen'
import { TrendsScreen } from './screens/TrendsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { useFitness } from './store/FitnessContext'

export type AppView = 'dashboard' | 'check-in' | 'train' | 'progression' | 'nutrition' | 'trends' | 'settings'

const navItems = [
  { id: 'dashboard' as const, label: 'Today', icon: Gauge },
  { id: 'train' as const, label: 'Train', icon: Dumbbell },
  { id: 'progression' as const, label: 'Progress', icon: BarChart3 },
  { id: 'nutrition' as const, label: 'Nutrition', icon: UtensilsCrossed },
  { id: 'trends' as const, label: 'Trends', icon: LineChart },
]

export default function App() {
  const [view, setView] = useState<AppView>('dashboard')
  const { mode, cloud } = useFitness()
  const personalCloudLabel = cloud.syncStatus === 'synced' ? 'Synced' : cloud.syncStatus === 'syncing' ? 'Syncing' : cloud.syncStatus === 'conflict' ? 'Needs review' : cloud.syncStatus === 'offline' ? 'Offline-safe' : 'Local only'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const content = {
    dashboard: <DashboardScreen navigate={setView} />,
    'check-in': <CheckInScreen onDone={() => setView('dashboard')} />,
    train: <TrainScreen />,
    progression: <ProgressionScreen />,
    nutrition: <NutritionScreen />,
    trends: <TrendsScreen />,
    settings: <SettingsScreen />,
  }[view]

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <button className="brand" onClick={() => setView('dashboard')} aria-label="Go to Today">
          <span className="brand-mark"><Dumbbell size={21} /></span>
          <span>getFit<small>Lean gain, kept simple</small></span>
        </button>
        <nav aria-label="Primary navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={20} />{label}</button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={`mode-chip ${mode}`}>{mode === 'demo' ? <><Apple size={16} />Synthetic demo data</> : <><UserRound size={16} />Personal · {personalCloudLabel}</>}</div>
          <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Settings size={20} />Settings</button>
        </div>
      </aside>

      <div className="app-content">
        <header className="mobile-header">
          <button className="brand compact" onClick={() => setView('dashboard')} aria-label="Go to Today"><span className="brand-mark"><Dumbbell size={19} /></span><span>getFit</span></button>
          <button className="icon-button mobile-settings-button" onClick={() => setView('settings')} aria-label={mode === 'personal' ? `Settings. Personal cloud status: ${personalCloudLabel}` : 'Settings'}><Settings size={21} />{mode === 'personal' && <span className={`cloud-status-dot ${cloud.syncStatus}`} aria-hidden="true" />}</button>
        </header>
        <main>{content}</main>
      </div>

      <nav className="mobile-nav" aria-label="Primary navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={21} /><span>{label}</span></button>
        ))}
      </nav>
    </div>
  )
}
