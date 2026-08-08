import type { DailyCheckIn, MealPreset, Profile, ProteinStatus } from './types'

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function parseDate(date: string) {
  return new Date(`${date}T00:00:00Z`)
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

export function getDayName(date: string) {
  return dayNames[parseDate(date).getUTCDay()]
}

export function getPresetForDate(presets: MealPreset[], date: string) {
  return presets.find((preset) => preset.day === getDayName(date)) ?? presets[0]
}

export function proteinTargets(profile: Profile) {
  return {
    floor: Math.round(profile.currentWeightKg * profile.proteinFloorMultiplier),
    target: Math.round(profile.currentWeightKg * profile.proteinTargetMultiplier),
  }
}

export function calculateMealTotals(checkIn: DailyCheckIn | undefined, preset: MealPreset, profile: Profile) {
  const plannedProtein = preset.slots.reduce((sum, slot) => sum + slot.proteinG, 0)
  const plannedCalories = preset.slots.reduce((sum, slot) => sum + slot.calories, 0)
  const targets = proteinTargets(profile)

  if (!checkIn) {
    return { plannedProtein, plannedCalories, actualProtein: null, actualCalories: null, coverage: null, status: 'Not logged' as ProteinStatus }
  }

  const actualProtein = preset.slots.reduce((sum, slot) => sum + slot.proteinG * checkIn.adherence[slot.key], checkIn.extrasProteinG)
  const actualCalories = preset.slots.reduce((sum, slot) => sum + slot.calories * checkIn.adherence[slot.key], checkIn.extrasCalories)
  const coverage = plannedCalories ? actualCalories / plannedCalories : null
  let status: ProteinStatus = 'In line'
  if (actualProtein < targets.floor) status = 'Below floor'
  if (actualProtein >= targets.target) status = 'Target met'

  return { plannedProtein, plannedCalories, actualProtein, actualCalories, coverage, status }
}

export interface WeightPoint {
  date: string
  weight: number
  rollingAverage: number
}

export function buildWeightPoints(checkIns: DailyCheckIn[]): WeightPoint[] {
  const values = checkIns
    .filter((entry): entry is DailyCheckIn & { weightKg: number } => typeof entry.weightKg === 'number')
    .sort((a, b) => a.date.localeCompare(b.date))

  return values.map((entry) => {
    const current = parseDate(entry.date).getTime()
    const start = current - 6 * 86_400_000
    const window = values.filter((candidate) => {
      const time = parseDate(candidate.date).getTime()
      return time >= start && time <= current
    })
    return { date: entry.date, weight: entry.weightKg, rollingAverage: mean(window.map((item) => item.weightKg)) ?? entry.weightKg }
  })
}

export function getWeightSummary(checkIns: DailyCheckIn[], profile: Profile) {
  const points = buildWeightPoints(checkIns)
  const latest = points.at(-1)
  if (!latest) return { latest: null, average: null, weeklyChange: null, changeRate: null, recommendation: 'Log a morning weight to start your trend.' }

  const end = parseDate(latest.date).getTime()
  const currentWeights = points.filter((point) => {
    const time = parseDate(point.date).getTime()
    return time >= end - 6 * 86_400_000 && time <= end
  })
  const previousWeights = points.filter((point) => {
    const time = parseDate(point.date).getTime()
    return time >= end - 13 * 86_400_000 && time <= end - 7 * 86_400_000
  })
  const currentAverage = mean(currentWeights.map((point) => point.weight))
  const previousAverage = mean(previousWeights.map((point) => point.weight))
  const weeklyChange = currentAverage !== null && previousAverage !== null ? currentAverage - previousAverage : null
  const changeRate = weeklyChange !== null && previousAverage ? weeklyChange / previousAverage : null

  let recommendation = 'Keep logging to build a reliable baseline.'
  if (currentWeights.length >= 4 && previousWeights.length >= 4 && changeRate !== null) {
    if (changeRate < profile.weeklyGainMin) recommendation = `Trend is flat. Consider adding about ${profile.calorieAdjustment} kcal per day.`
    else if (changeRate > profile.weeklyGainMax) recommendation = 'Gain is above the target band. Hold portions steady and review next week.'
    else recommendation = 'Weight is moving inside the target band. Stay the course.'
  }

  return { latest: latest.weight, average: currentAverage, weeklyChange, changeRate, recommendation }
}

export function getFourteenDayNutrition(checkIns: DailyCheckIn[], presets: MealPreset[], profile: Profile) {
  const recent = [...checkIns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14)
  const totals = recent.map((entry) => calculateMealTotals(entry, getPresetForDate(presets, entry.date), profile))
  const coverages = totals.map((total) => total.coverage).filter((value): value is number => value !== null)
  return {
    daysLogged: recent.length,
    energyCoverage: mean(coverages),
    proteinTargetDays: totals.filter((total) => total.status === 'Target met').length,
  }
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(parseDate(date))
}

export function formatLongDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(parseDate(date))
}
