import { Play } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useT } from '../../i18n'
import { MAX_STAGE, POINTS, pointsToNext, progressInStage, stageOf } from '../../lib/plants'
import { useApp } from '../../state/app'
import { useTour } from '../../state/tour'
import { useUi } from '../../state/ui'
import { LanguageChips } from '../LanguageChips'
import { Plant } from '../Plant'
import { Button, Field, ScreenTitle, fieldClass } from '../ui'

export function ProfileScreen() {
  const { t, td } = useT()
  const { user, byId, events, volunteering, reports, logout, resetDemo } = useApp()
  const { openModal, showToast } = useUi()
  const tour = useTour()
  const [message, setMessage] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const stage = user ? stageOf(user.points) : 0
  const mineEvents = events.filter((e) => e.mine).length
  const mineReports = reports.filter((r) => r.mine).length
  const joined = volunteering.filter((v) => v.mine).length

  const send = () => {
    if (!message.trim()) return
    setMessage('')
    showToast(t('pf.support.sent'))
  }

  return (
    <div className="pb-24">
      <ScreenTitle>{t('pf.title')}</ScreenTitle>

      {user ? (
        <section className="mb-5 rounded-card bg-accent-soft p-4 text-center" aria-labelledby="plant-h">
          <h2 id="plant-h" className="sr-only">
            {t('pf.plant')}
          </h2>
          <div className="flex justify-center">
            <Plant species={user.plant} stage={stage} size={150} idle label={`${td(`plant.${user.plant}`)}: ${td(`stage.${stage}`)}`} />
          </div>
          <p className="mt-1 text-lg font-semibold">{user.name}</p>
          <p className="text-base text-muted">
            {td(`plant.${user.plant}`)}, {td(`stage.${stage}`).toLowerCase()}
          </p>
          <div
            className="mx-auto mt-3 h-3 max-w-xs overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressInStage(user.points) * 100)}
            aria-label={t('pf.points', { n: user.points })}
          >
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: `${progressInStage(user.points) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          <p className="mt-2 text-base font-medium">{t('pf.points', { n: user.points })}</p>
          <p className="text-sm text-muted">
            {stage >= MAX_STAGE ? t('pf.max') : t('pf.next', { n: pointsToNext(user.points) })}
          </p>
          <p className="mt-2 text-sm text-muted">
            {t('pf.barrio')}: {byId.get(user.barrioId)?.name}, {byId.get(user.barrioId)?.municipio}
          </p>
        </section>
      ) : (
        <section className="mb-5 rounded-card bg-accent-soft p-5">
          <h2 className="text-lg font-semibold">{t('pf.guest.title')}</h2>
          <p className="mb-3 mt-1 text-base text-muted">{t('pf.guest.text')}</p>
          <Button className="w-full" onClick={() => openModal({ type: 'auth' })}>
            {t('common.needAccount.cta')}
          </Button>
        </section>
      )}

      <section className="mb-5" aria-labelledby="how-h">
        <h2 id="how-h" className="mb-2 text-base font-semibold">
          {t('pf.how')}
        </h2>
        <ul className="divide-y divide-line rounded-control border border-line bg-surface">
          {(
            [
              ['pf.rule.event', POINTS.event],
              ['pf.rule.join', POINTS.join],
              ['pf.rule.vol', POINTS.vol],
              ['pf.rule.confirm', POINTS.confirm],
              ['pf.rule.report', POINTS.report],
            ] as const
          ).map(([key, n]) => (
            <li key={key} className="flex items-center justify-between gap-3 px-3 py-2.5 text-base">
              <span>{t(key)}</span>
              <span className="shrink-0 font-semibold text-accent-strong">{t('pf.plus', { n })}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">{t('pf.rule.note')}</p>
      </section>

      {user && (
        <section className="mb-5" aria-labelledby="act-h">
          <h2 id="act-h" className="mb-2 text-base font-semibold">
            {t('pf.activity')}
          </h2>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              [t('pf.stat.events'), mineEvents],
              [t('pf.stat.joined'), joined],
              [t('pf.stat.reports'), mineReports],
            ].map(([label, n]) => (
              <div key={String(label)} className="rounded-control border border-line bg-surface px-2 py-3">
                <dd className="text-xl font-semibold">{n}</dd>
                <dt className="text-sm text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mb-5" aria-labelledby="lang-h">
        <h2 id="lang-h" className="mb-2 text-base font-semibold">
          {t('pf.language')}
        </h2>
        <LanguageChips />
      </section>

      <section className="mb-5" aria-labelledby="sup-h">
        <h2 id="sup-h" className="mb-1 text-base font-semibold">
          {t('pf.support')}
        </h2>
        <p className="mb-3 text-base text-muted">{t('pf.support.text')}</p>
        <Field label={t('pf.support.msg')}>
          {(p) => (
            <textarea {...p} rows={3} className={`${fieldClass} resize-none`} value={message} onChange={(e) => setMessage(e.target.value)} />
          )}
        </Field>
        <Button className="mt-3 w-full" variant="secondary" onClick={send} disabled={!message.trim()}>
          {t('pf.support.send')}
        </Button>
      </section>

      <details className="mb-5 rounded-control border border-line bg-surface">
        <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-base font-semibold">{t('pf.access')}</summary>
        <p className="px-3 pb-3 text-base text-muted">{t('pf.access.text')}</p>
      </details>

      <section className="mb-5 rounded-control border border-line bg-surface p-3">
        <p className="mb-2 text-base text-muted">{t('tour.start.hint')}</p>
        <Button variant="secondary" className="w-full" onClick={() => tour.start()}>
          <Play size={18} aria-hidden />
          {t('tour.start')}
        </Button>
      </section>

      <div className="space-y-3">
        {user && (
          <Button variant="secondary" className="w-full" onClick={logout}>
            {t('pf.logout')}
          </Button>
        )}
        {confirmReset ? (
          <div className="rounded-control border border-line p-3">
            <p className="mb-3 text-base">{t('pf.reset.confirm')}</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={resetDemo}>
                {t('pf.reset.yes')}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirmReset(true)}>
            {t('pf.reset')}
          </Button>
        )}
      </div>
    </div>
  )
}
