import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { ProgressionDecision, ProteinStatus } from '../domain/types'

export function PageHeader({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {detail && <p className="page-detail">{detail}</p>}
      </div>
      {action}
    </div>
  )
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function ProgressBar({ value, max = 1, label }: { value: number; max?: number; label?: string }) {
  const actualPercentage = Math.max(0, max > 0 ? (value / max) * 100 : 0)
  const visualPercentage = Math.min(100, actualPercentage)
  const exceedsTarget = actualPercentage > 100
  const roundedPercentage = Math.round(actualPercentage)
  return (
    <div
      className={`progress-wrap${exceedsTarget ? ' progress-over-target' : ''}`}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(visualPercentage) : undefined}
      aria-valuetext={label ? `${roundedPercentage}%` : undefined}
    >
      <div className="progress-track">
        <span className="progress-fill" style={{ width: `${visualPercentage}%` }} />
        {exceedsTarget && <span className="progress-overflow-marker" aria-hidden="true">★</span>}
      </div>
      {label && <span className="sr-only">{label}: {roundedPercentage}%</span>}
    </div>
  )
}

export function StatusPill({ status }: { status: ProteinStatus | ProgressionDecision | string }) {
  const tone =
    status === 'Target met' || status === 'Increase' ? 'green'
      : status === 'Below floor' || status === 'Deload' ? 'red'
        : status === 'In line' || status === 'Repeat' ? 'amber'
          : status === 'Technique focus' ? 'blue' : 'neutral'
  return <span className={`status-pill status-${tone}`}>{status}</span>
}

export function Metric({ label, value, suffix, hint }: { label: string; value: string | number; suffix?: string; hint?: string }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <strong>{value}{suffix && <small>{suffix}</small>}</strong>
      {hint && <span className="metric-hint">{hint}</span>}
    </div>
  )
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="section-heading"><h2>{title}</h2>{action}</div>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
