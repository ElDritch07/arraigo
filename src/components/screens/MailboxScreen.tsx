import { AlertCircle, Camera, Lightbulb, Megaphone, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { readPhoto } from '../../lib/photo'
import type { ReportKind } from '../../lib/types'
import { eventTitle, useApp } from '../../state/app'
import { useInScope, useRequireAccount } from '../../state/hooks'
import { useUi } from '../../state/ui'
import { BarrioSelect } from '../BarrioSelect'
import { Button, EmptyState, Field, ScreenTitle, fieldClass } from '../ui'

const KINDS: ReportKind[] = ['queja', 'sugerencia']

export function MailboxScreen() {
  const { t, td } = useT()
  const { reports, user, byId, hasBacked, toggleBack, addReport } = useApp()
  const { scope, showToast } = useUi()
  const inScope = useInScope()
  const requireAccount = useRequireAccount()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ReportKind>('queja')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [barrioId, setBarrioId] = useState(scope.barrioId ?? user?.barrioId ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photo, setPhoto] = useState<string | undefined>()
  const [photoError, setPhotoError] = useState(false)

  const list = useMemo(
    () =>
      reports
        .filter((r) => inScope(r.barrioId))
        .sort((a, b) => Number(!!b.mine) - Number(!!a.mine) || b.backs - a.backs),
    [reports, inScope],
  )

  const submit = () =>
    requireAccount(() => {
      const e: Record<string, string> = {}
      if (title.trim().length < 5) e.title = t('mb.err.summary')
      if (!barrioId) e.barrio = t('mb.err.barrio')
      setErrors(e)
      if (Object.keys(e).length) return
      addReport({ barrioId, kind, title, description: details, photo })
      showToast(t('toast.sent'))
      setTitle('')
      setDetails('')
      setPhoto(undefined)
      setOpen(false)
    })

  return (
    <div className="pb-24">
      <ScreenTitle sub={t('mb.intro')}>{t('mb.title')}</ScreenTitle>

      {!open ? (
        <Button className="mb-4 w-full" onClick={() => requireAccount(() => setOpen(true))}>
          <Send size={18} aria-hidden />
          {t('mb.new')}
        </Button>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="mb-5 space-y-4 rounded-control border border-accent/50 bg-accent-soft/40 p-4"
        >
          <fieldset>
            <legend className="mb-1.5 text-base font-medium">{t('mb.kind')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <label
                  key={k}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-3 text-base font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                    kind === k ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink'
                  }`}
                >
                  <input type="radio" name="report-kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                  {k === 'queja' ? t('mb.complaint') : t('mb.suggestion')}
                </label>
              ))}
            </div>
          </fieldset>
          <BarrioSelect value={barrioId} onChange={setBarrioId} error={errors.barrio} />
          <Field label={t('mb.summary')} error={errors.title}>
            {(p) => (
              <input
                {...p}
                className={fieldClass}
                value={title}
                maxLength={120}
                placeholder={kind === 'queja' ? t('mb.ph.complaint') : t('mb.ph.suggestion')}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('mb.details')} optional={t('common.optional')}>
            {(p) => (
              <textarea {...p} rows={3} className={`${fieldClass} resize-none`} value={details} maxLength={400} onChange={(e) => setDetails(e.target.value)} />
            )}
          </Field>
          <div>
            <p className="mb-1 text-base font-medium">
              {t('mb.photo')} <span className="font-normal text-muted">({t('common.optional')})</span>
            </p>
            <p className="mb-2 text-sm text-muted">{t('mb.photo.hint')}</p>
            {photo && <img src={photo} alt={t('mb.photo.alt')} className="mb-2 max-h-48 w-full rounded-control object-cover" />}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-base font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent">
                <Camera size={18} aria-hidden />
                {photo ? t('mb.photo.change') : t('mb.photo')}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      setPhoto(await readPhoto(file))
                      setPhotoError(false)
                    } catch {
                      setPhotoError(true)
                    }
                    e.target.value = ''
                  }}
                />
              </label>
              {photo && (
                <Button variant="ghost" onClick={() => setPhoto(undefined)}>
                  {t('mb.photo.remove')}
                </Button>
              )}
            </div>
            {photoError && (
              <p role="alert" className="mt-1.5 text-sm font-medium text-red-800">
                {t('mb.photo.err')}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1">
              {t('common.send')}
            </Button>
          </div>
        </motion.form>
      )}

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {t('common.results', { n: list.length })}
      </p>

      {list.length === 0 ? (
        <EmptyState>{t('mb.empty')}</EmptyState>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {list.slice(0, 40).map((r) => {
              const backed = hasBacked(r.id)
              const Icon = r.kind === 'queja' ? AlertCircle : Lightbulb
              return (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="rounded-control border border-line bg-surface p-3"
                >
                  <p className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-0.5 font-medium text-accent-strong">
                      <Icon size={14} aria-hidden />
                      {r.kind === 'queja' ? t('mb.complaint') : t('mb.suggestion')}
                    </span>
                    <span className="text-muted">{byId.get(r.barrioId)?.name}</span>
                  </p>
                  <h2 className="text-base font-semibold leading-snug">{eventTitle(r, td)}</h2>
                  {(r.description || r.titleKey) && (
                    <p className="mt-1 text-sm text-muted">{r.description ?? t('seed.rep.desc')}</p>
                  )}
                  {r.photo && <img src={r.photo} alt={t('mb.photo.alt')} className="mt-2 max-h-48 w-full rounded-control object-cover" />}
                  <Button
                    variant={backed ? 'primary' : 'secondary'}
                    aria-pressed={backed}
                    className="mt-3 w-full"
                    onClick={() => requireAccount(() => toggleBack(r.id))}
                  >
                    <Megaphone size={18} aria-hidden />
                    {backed ? t('mb.alsoDone') : t('mb.also')}
                    <span className="tabular-nums opacity-80">{r.backs}</span>
                  </Button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
