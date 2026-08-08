import { describe, expect, it } from 'vitest'
import type { DailyCheckIn } from './types'
import { canCompleteCheckIn, getAnsweredMealCount, hasCheckInProgress } from './checkIn'

function checkIn(adherence: DailyCheckIn['adherence'] = {}): DailyCheckIn {
  return { id: 'personal-checkin-2026-08-08', date: '2026-08-08', adherence, extrasProteinG: 0, extrasCalories: 0, notes: '', updatedAt: '2026-08-08T08:00:00.000Z' }
}

describe('staged daily check-in', () => {
  it('distinguishes unanswered meals from skipped meals', () => {
    const staged = checkIn({ breakfast: 0 })
    expect(getAnsweredMealCount(staged)).toBe(1)
    expect(hasCheckInProgress(staged)).toBe(true)
    expect(canCompleteCheckIn(staged)).toBe(false)
  })

  it('allows completion only after every meal has an explicit answer', () => {
    const complete = checkIn({ breakfast: 1, lunch: 0.75, dinner: 0.5, shake: 0 })
    expect(getAnsweredMealCount(complete)).toBe(4)
    expect(canCompleteCheckIn(complete)).toBe(true)
  })

  it('treats a weight-only record as meaningful progress', () => {
    const staged = { ...checkIn(), weightKg: 66 }
    expect(hasCheckInProgress(staged)).toBe(true)
  })
})
