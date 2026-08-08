import { describe, expect, it } from 'vitest'
import { formatDateInTimeZone, getSystemTimeZone } from './date'

describe('timezone date boundary', () => {
  it('uses the configured timezone instead of the device UTC date', () => {
    const instant = new Date('2026-08-08T23:30:00.000Z')
    expect(formatDateInTimeZone(instant, 'UTC')).toBe('2026-08-08')
    expect(formatDateInTimeZone(instant, 'Asia/Calcutta')).toBe('2026-08-09')
    expect(formatDateInTimeZone(instant, 'America/Los_Angeles')).toBe('2026-08-08')
  })

  it('falls back safely when persisted timezone data is invalid', () => {
    const instant = new Date('2026-08-08T23:30:00.000Z')
    expect(formatDateInTimeZone(instant, 'Not/A_Zone')).toBe(formatDateInTimeZone(instant, getSystemTimeZone()))
  })
})
