import type { DailyCheckIn, MealSlotKey } from './types'

export const mealSlotKeys: MealSlotKey[] = ['breakfast', 'lunch', 'dinner', 'shake']

export function getAnsweredMealCount(checkIn: DailyCheckIn | undefined) {
  if (!checkIn) return 0
  return mealSlotKeys.filter((key) => typeof checkIn.adherence[key] === 'number').length
}

export function hasCheckInProgress(checkIn: DailyCheckIn | undefined) {
  if (!checkIn) return false
  return typeof checkIn.weightKg === 'number'
    || getAnsweredMealCount(checkIn) > 0
    || checkIn.extrasProteinG > 0
    || checkIn.extrasCalories > 0
    || Boolean(checkIn.notes.trim())
}

export function canCompleteCheckIn(checkIn: DailyCheckIn | undefined) {
  return getAnsweredMealCount(checkIn) === mealSlotKeys.length
}
