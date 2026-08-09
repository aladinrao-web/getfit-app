import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CloudConflictPanel } from './CloudConflictPanel'

const conflict = {
  cloudRevision: 7,
  cloudUpdatedAt: '2026-08-09T10:00:00.000Z',
  deviceUpdatedAt: '2026-08-09T09:30:00.000Z',
  cloudSummary: {
    checkIns: 12,
    workouts: 8,
    progressionTargets: 6,
    hasWorkoutDraft: false,
  },
}

describe('CloudConflictPanel', () => {
  it('compares both copies and exposes explicit whole-copy choices', () => {
    const markup = renderToStaticMarkup(<CloudConflictPanel
      conflict={conflict}
      deviceSummary={{ checkIns: 11, workouts: 9, progressionTargets: 6, hasWorkoutDraft: true }}
      resolutionBusy={false}
      onResolve={vi.fn()}
    />)

    expect(markup).toContain('Choose which complete copy becomes current')
    expect(markup).toContain('Nothing will be merged automatically')
    expect(markup).toContain('11 check-ins')
    expect(markup).toContain('12 check-ins')
    expect(markup).toContain('Revision 7')
    expect(markup).toContain('Use cloud version')
    expect(markup).toContain('Keep this device')
  })

  it('locks both choices while a resolution is running', () => {
    const markup = renderToStaticMarkup(<CloudConflictPanel
      conflict={conflict}
      deviceSummary={{ checkIns: 11, workouts: 9, progressionTargets: 6, hasWorkoutDraft: true }}
      resolutionBusy
      onResolve={vi.fn()}
    />)

    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })
})
