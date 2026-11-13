import { Clock, MapPin } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useT } from '../../i18n'
import { eventTitle, useApp } from '../../state/app'
import { useInScope, useRequireAccount } from '../../state/hooks'
import { useUi } from '../../state/ui'
import { ConfirmNote } from '../EventDetail'
import { Button, EmptyState, ScreenTitle } from '../ui'

export function VolunteerScreen() {
  const { t, td, fullDate } = useT()
  const { volunteering, events, byId, hasJoinedVol, joinVol, hasConfirmed, confirmMe } = useApp()
  const { showToast } = useUi()
  const inScope = useInScope()
  const requireAccount = useRequireAccount()

  const list = useMemo(
    () => volunteering.filter((v) => inScope(v.barrioId)).sort((a, b) => a.date.localeCompare(b.date)),
    [volunteering, inScope],
  )

  return (
    <div className="pb-24">
      <ScreenTitle sub={t('vol.intro')}>{t('vol.title')}</ScreenTitle>
      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {t('common.results', { n: list.length })}
      </p>
      {list.length === 0 ? (
        <EmptyState>{t('vol.empty')}</EmptyState>
      ) : (
        <motion.ul
          className="space-y-3"
          initial="hidden"
          animate="show"
          key={list.length}
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        >
          {list.slice(0, 50).map((v) => {
            const joined = hasJoinedVol(v.id)
            const free = Math.max(0, v.spots - v.joined)
            const barrio = byId.get(v.barrioId)
            const share = Math.min(1, v.joined / v.spots)
            return (
              <motion.li
                key={v.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="rounded-control border border-line bg-surface p-3"
              >
                <h2 className="text-lg font-semibold leading-snug">{eventTitle(v, td)}</h2>
                <ul className="mt-1.5 space-y-0.5 text-sm text-muted">
                  <li className="flex items-center gap-1.5">
                    <Clock size={14} aria-hidden />
                    {t('ev.when', { date: fullDate(v.date), time: v.time })}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <MapPin size={14} aria-hidden />
                    {barrio?.name}, {barrio?.municipio}
                  </li>
                  {v.eventId && (
                    <li>{t('vol.forEvent', { name: eventTitle(events.find((e) => e.id === v.eventId) ?? v, td) })}</li>
                  )}
                </ul>
                <div className="mt-3">
                  <div
                    className="h-2 overflow-hidden rounded-full bg-map-0"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={v.spots}
                    aria-valuenow={Math.min(v.joined, v.spots)}
                    aria-label={t('vol.spots', { n: free })}
                  >
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${share * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    />
                  </div>
                  <p className="mt-1.5 text-sm font-medium">{free > 0 ? t('vol.spots', { n: free }) : t('vol.full')}</p>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant={joined ? 'secondary' : 'primary'}
                  aria-pressed={joined}
                  disabled={!joined && free === 0}
                  onClick={() =>
                    requireAccount(() => {
                      joinVol(v.id)
                      if (!joined) showToast(t('toast.joined'))
                    })
                  }
                >
                  {joined ? t('vol.joined') : t('vol.join')}
                </Button>
                {joined && (
                  <div className="mt-3">
                    <ConfirmNote confirmed={hasConfirmed(v.id)} onDemo={() => confirmMe(v.id, 'vol')} />
                  </div>
                )}
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
