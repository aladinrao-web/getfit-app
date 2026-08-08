import { describe, expect, it } from 'vitest'
import { normalizeNumericDraft } from './numeric'

describe('numeric input normalization', () => {
  it('removes redundant leading zeros', () => {
    expect(normalizeNumericDraft('066')).toBe('66')
    expect(normalizeNumericDraft('000')).toBe('0')
    expect(normalizeNumericDraft('-006')).toBe('-6')
  })

  it('preserves valid leading decimals and editable blanks', () => {
    expect(normalizeNumericDraft('0.6')).toBe('0.6')
    expect(normalizeNumericDraft('00.6')).toBe('0.6')
    expect(normalizeNumericDraft('')).toBe('')
  })
})
