import { AlertCircle, CheckCircle2, CircleDot, FileText, Flag, Hourglass } from 'lucide-react'
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useT } from '../i18n'
import type { EventStatus } from '../lib/types'

export const fieldClass =
  'block w-full min-h-11 rounded-control border border-ink/40 bg-surface px-3 py-2 text-base text-ink placeholder:text-muted aria-[invalid=true]:border-red-800'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
  ghost: 'text-ink hover:bg-canvas',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-base font-medium transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink hover:bg-canvas ${className}`}
    >
      {children}
    </button>
  )
}

interface FieldChildProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

export function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  optional?: string
  children: (props: FieldChildProps) => ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-base font-medium">
        {label}
        {optional && <span className="ms-1 font-normal text-muted">({optional})</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

export function Chip({ children, tone = 'soft' }: { children: ReactNode; tone?: 'soft' | 'outline' }) {
  const cls = tone === 'soft' ? 'bg-accent-soft text-accent-strong' : 'border border-line text-muted'
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium ${cls}`}>{children}</span>
}

const STATUS: Record<EventStatus, { icon: typeof FileText; cls: string }> = {
  presented: { icon: FileText, cls: 'bg-st-presented-bg text-st-presented-fg' },
  review: { icon: Hourglass, cls: 'bg-st-review-bg text-st-review-fg' },
  approved: { icon: CheckCircle2, cls: 'bg-st-approved-bg text-st-approved-fg' },
  ongoing: { icon: CircleDot, cls: 'bg-st-ongoing-bg text-st-ongoing-fg' },
  finished: { icon: Flag, cls: 'bg-st-finished-bg text-st-finished-fg' },
}

export function StatusBadge({ status }: { status: EventStatus }) {
  const { t, td } = useT()
  const { icon: Icon, cls } = STATUS[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-medium ${cls}`}
      aria-label={t('ev.statusLabel', { status: td(`status.${status}`) })}
    >
      <Icon size={14} aria-hidden />
      {td(`status.${status}`)}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-control border border-dashed border-ink/30 px-4 py-8 text-center text-base text-muted">
      {children}
    </p>
  )
}

export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold leading-tight tracking-tight">{children}</h1>
      {sub && <p className="mt-1.5 text-base text-muted">{sub}</p>}
    </header>
  )
}

// Título de sección: un escalón por debajo del de pantalla y por encima del de tarjeta.
export function SectionTitle({ id, children, sub }: { id?: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="text-lg font-semibold leading-snug">
        {children}
      </h2>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </div>
  )
}
