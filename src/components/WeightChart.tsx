import type { WeightPoint } from '../domain/calculations'

export function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) return <div className="chart-empty">Log at least two weights to see a trend.</div>

  const width = 720
  const height = 260
  const padding = 26
  const weights = points.flatMap((point) => [point.weight, point.rollingAverage])
  const min = Math.floor((Math.min(...weights) - 0.25) * 2) / 2
  const max = Math.ceil((Math.max(...weights) + 0.25) * 2) / 2
  const range = max - min || 1
  const x = (index: number) => padding + (index / (points.length - 1)) * (width - padding * 2)
  const y = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2)
  const rawPath = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.weight)}`).join(' ')
  const averagePath = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.rollingAverage)}`).join(' ')

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Weight chart from ${points[0].weight.toFixed(1)} to ${points.at(-1)!.weight.toFixed(1)} kilograms`}>
        {[0, 0.5, 1].map((ratio) => {
          const value = min + range * ratio
          const lineY = y(value)
          return <g key={ratio}><line x1={padding} y1={lineY} x2={width - padding} y2={lineY} className="chart-grid" /><text x={padding} y={lineY - 7} className="chart-label">{value.toFixed(1)}</text></g>
        })}
        <path d={rawPath} className="chart-raw" />
        <path d={averagePath} className="chart-average" />
        <circle cx={x(points.length - 1)} cy={y(points.at(-1)!.rollingAverage)} r="6" className="chart-dot" />
      </svg>
      <div className="chart-legend"><span><i className="legend-raw" />Daily weight</span><span><i className="legend-average" />7-day average</span></div>
    </div>
  )
}
