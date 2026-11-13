import { Clock, MapPin, Phone, Printer } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../../i18n'
import { eventTitle, useApp } from '../../state/app'
import { useInScope, useZoneName } from '../../state/hooks'
import { useUi } from '../../state/ui'
import { Button, Chip, EmptyState, ScreenTitle } from '../ui'

export function usePointName() {
  const { t, td } = useT()
  const { byId } = useApp()
  return (type: string, barrioId: string) =>
    t('pt.name', { type: td(`pt.type.${type}`), barrio: byId.get(barrioId)?.name ?? '' })
}

export function PointsScreen() {
  const { t } = useT()
  const { meetingPoints, byId } = useApp()
  const { selectBarrio, setSheet } = useUi()
  const inScope = useInScope()
  const pointName = usePointName()

  const list = useMemo(
    () => meetingPoints.filter((p) => inScope(p.barrioId)),
    [meetingPoints, inScope],
  )

  return (
    <div className="pb-24">
      <ScreenTitle sub={t('pt.intro')}>{t('pt.title')}</ScreenTitle>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={18} aria-hidden />
          {t('pt.print')}
        </Button>
        <Chip tone="outline">{t('pt.sample')}</Chip>
      </div>
      <p className="mb-3 text-base text-muted">{t('pt.help')}</p>

      {list.length === 0 ? (
        <EmptyState>{t('pt.empty')}</EmptyState>
      ) : (
        <motion.ul
          className="space-y-3"
          initial="hidden"
          animate="show"
          key={list.length}
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        >
          {list.slice(0, 40).map((p) => {
            const barrio = byId.get(p.barrioId)
            return (
              <motion.li
                key={p.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="rounded-control border border-line bg-surface p-3"
              >
                <h2 className="text-lg font-semibold leading-snug">{pointName(p.type, p.barrioId)}</h2>
                <p className="text-sm text-muted">{barrio?.municipio}</p>
                <ul className="mt-2 space-y-1 text-base">
                  <li className="flex items-center gap-2">
                    <MapPin size={16} className="shrink-0 text-accent" aria-hidden />
                    {p.address}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock size={16} className="shrink-0 text-accent" aria-hidden />
                    {t('pt.hours', { from: p.from, to: p.to })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone size={16} className="shrink-0 text-accent" aria-hidden />
                    <span dir="ltr">{p.phone}</span>
                  </li>
                </ul>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      selectBarrio(p.barrioId, p.municipioId)
                      setSheet('half')
                    }}
                  >
                    {t('pt.show')}
                  </Button>
                  <a
                    href={`tel:${p.phone.replace(/\s/g, '')}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-accent px-4 py-2 text-base font-medium text-white hover:bg-accent-hover"
                  >
                    <Phone size={18} aria-hidden />
                    {t('pt.call')}
                  </a>
                </div>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}

// Cartelera en papel: se renderiza fuera de la app y solo se ve al imprimir.
export function PrintSheet() {
  const { t, td, fullDate } = useT()
  const { events, meetingPoints, byId } = useApp()
  const inScope = useInScope()
  const zone = useZoneName()
  const pointName = usePointName()
  const root = document.getElementById('print-root')
  if (!root) return null

  const upcoming = events
    .filter((e) => inScope(e.barrioId) && (e.status === 'approved' || e.status === 'ongoing'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20)
  const points = meetingPoints.filter((p) => inScope(p.barrioId)).slice(0, 8)

  return createPortal(
    <div>
      <h1 style={{ fontSize: '24pt', marginBottom: '4mm' }}>{t('pt.print.title', { zone })}</h1>
      <p style={{ marginBottom: '8mm' }}>{t('pt.print.text')}</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {upcoming.map((e) => (
          <li key={e.id} style={{ marginBottom: '5mm', borderBottom: '1px solid #000', paddingBottom: '3mm' }}>
            <strong>{eventTitle(e, td)}</strong>
            <br />
            {t('ev.when', { date: fullDate(e.date), time: e.time })}, {byId.get(e.barrioId)?.name}
          </li>
        ))}
      </ul>
      <h2 style={{ fontSize: '18pt', margin: '8mm 0 3mm' }}>{t('pt.title')}</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {points.map((p) => (
          <li key={p.id} style={{ marginBottom: '3mm' }}>
            <strong>{pointName(p.type, p.barrioId)}</strong>, {p.address}, {p.phone}
          </li>
        ))}
      </ul>
    </div>,
    root,
  )
}
