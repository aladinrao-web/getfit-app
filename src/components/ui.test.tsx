import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ui'

describe('ProgressBar', () => {
  it('caps the visual fill while announcing and marking an over-target value', () => {
    const markup = renderToStaticMarkup(
      <ProgressBar value={130} max={108} label="Planned protein versus target" />,
    )

    expect(markup).toContain('class="progress-wrap progress-over-target"')
    expect(markup).toContain('style="width:100%"')
    expect(markup).toContain('class="progress-overflow-marker"')
    expect(markup).toContain('aria-valuenow="100"')
    expect(markup).toContain('aria-valuetext="120%"')
    expect(markup).toContain('Planned protein versus target: 120%')
  })

  it('does not show the overflow marker at or below the target', () => {
    const markup = renderToStaticMarkup(
      <ProgressBar value={95} max={108} label="Protein target completion" />,
    )

    expect(markup).not.toContain('progress-overflow-marker')
    expect(markup).toContain('aria-valuetext="88%"')
  })
})
