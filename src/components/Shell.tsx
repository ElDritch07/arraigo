import { ChevronUp, Globe, Sprout } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../i18n'
import { makeForest, type Tree } from '../lib/forest'
import { hash } from '../lib/hash'
import { SPECIES, stageOf } from '../lib/plants'
import type { LabelCollection, TerritoryCollection } from '../lib/types'
import { useApp } from '../state/app'
import { useViewport } from '../state/hooks'
import { useUi, type SheetState } from '../state/ui'
import { Assistant } from './Assistant'
import { AuthModal } from './Auth'
import { BottomNav } from './BottomNav'
import { CreateEventFlow } from './CreateEventFlow'
import { DropletIcon } from './DropletIcon'
import { EventDetail } from './EventDetail'
import { LanguageDialog } from './LanguageDialog'
import { MapView } from './MapView'
import { ScopeBar } from './ScopeBar'
import { ScopePicker } from './ScopePicker'
import { EventsScreen } from './screens/EventsScreen'
import { MailboxScreen } from './screens/MailboxScreen'
import { PointsScreen, PrintSheet } from './screens/PointsScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { VolunteerScreen } from './screens/VolunteerScreen'

export interface MapData {
  municipios: TerritoryCollection
  barrios: TerritoryCollection
  muniLabels: LabelCollection
  barrioLabels: LabelCollection
}

const ORDER: SheetState[] = ['peek', 'half', 'full']
const LEGEND = ['bg-map-0', 'bg-map-1', 'bg-map-2', 'bg-map-3', 'bg-map-4']

const SCREENS = {
  events: EventsScreen,
  volunteer: VolunteerScreen,
  mailbox: MailboxScreen,
  points: PointsScreen,
  profile: ProfileScreen,
}

export function Shell({ data }: { data: MapData }) {
  const { t, lang } = useT()
  const { byId, plantsByBarrio, plantsByMuni, meetingPoints, user, saplings } = useApp()
  const { tab, scope, sheet, setSheet, modal, selectMunicipio, selectBarrio, openModal } = useUi()
  const vp = useViewport()
  const scroller = useRef<HTMLDivElement>(null)

  const heights: Record<SheetState, number> = {
    peek: 176,
    half: Math.round(vp.height * 0.55),
    full: vp.height - 64,
  }

  const forest = useMemo(() => makeForest(data.barrios), [data.barrios])
  const trees = useMemo<Tree[]>(() => {
    const planted: Tree[] = saplings.map((s) => ({
      id: s.id,
      barrioId: s.barrioId,
      coordinates: forest.pointFor(s.barrioId, s.id),
      species: SPECIES[hash(s.id) % SPECIES.length],
      stage: 1,
      sapling: true,
    }))
    const mine: Tree[] = user
      ? [
          {
            id: 'mine',
            barrioId: user.barrioId,
            coordinates: forest.pointFor(user.barrioId, 'mine'),
            species: user.plant,
            stage: stageOf(user.points),
            mine: true,
          },
        ]
      : []
    return [...forest.base, ...planted, ...mine]
  }, [forest, saplings, user])

  // Cuando alguien colabora, un destello marca el árbol nuevo en el mapa.
  const [pulse, setPulse] = useState<{ id: string; coordinates: [number, number] } | null>(null)
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ids = new Set(saplings.map((s) => s.id))
    if (seen.current) {
      const fresh = saplings.filter((s) => !seen.current!.has(s.id)).pop()
      if (fresh) setPulse({ id: fresh.id, coordinates: forest.pointFor(fresh.barrioId, fresh.id) })
    }
    seen.current = ids
  }, [saplings, forest])

  const coords = useMemo(
    () => new Map(data.barrioLabels.features.map((f) => [f.properties.id, f.geometry.coordinates as [number, number]])),
    [data.barrioLabels],
  )
  const markers = useMemo(
    () =>
      meetingPoints.flatMap((p) => {
        const c = coords.get(p.barrioId)
        return c ? [{ id: p.id, coordinates: c }] : []
      }),
    [meetingPoints, coords],
  )

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [tab, scope])

  // Un enlace compartido (?event=ID) abre directamente ese evento.
  const { events } = useApp()
  const deepLinked = useRef(false)
  useEffect(() => {
    if (deepLinked.current) return
    const id = new URLSearchParams(window.location.search).get('event')
    if (!id) return
    deepLinked.current = true
    if (events.some((e) => e.id === id)) openModal({ type: 'event', id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Screen = SCREENS[tab]
  const step = (dir: 1 | -1) => setSheet(ORDER[Math.max(0, Math.min(2, ORDER.indexOf(sheet) + dir))])
  const expanded = sheet === 'full'

  return (
    <>
      <div inert={modal !== null} className="relative h-dvh overflow-hidden">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:text-white"
        >
          {t('a11y.skip')}
        </a>

        <MapView
          municipios={data.municipios}
          barrios={data.barrios}
          muniLabels={data.muniLabels}
          barrioLabels={data.barrioLabels}
          territories={byId}
          selection={scope}
          bottomInset={vp.desktop ? 0 : heights[sheet]}
          plantsMuni={plantsByMuni}
          plantsBarrio={plantsByBarrio}
          markers={markers}
          showMarkers={tab === 'points'}
          trees={trees}
          pulse={pulse}
          ariaLabel={t('a11y.map')}
          onSelectMunicipio={selectMunicipio}
          onSelectBarrio={(id) => selectBarrio(id, byId.get(id)?.municipioId ?? '')}
          onSelectMarker={(id) => {
            const p = meetingPoints.find((x) => x.id === id)
            if (p) selectBarrio(p.barrioId, p.municipioId)
          }}
        />

        <header className="pointer-events-none fixed inset-x-3 top-3 z-10 flex items-center justify-between gap-2 md:start-[28rem]">
          <p className="pointer-events-auto flex min-h-11 min-w-0 items-center gap-2 rounded-control bg-surface px-3 text-base font-semibold shadow-card">
            <Sprout size={20} className="shrink-0 text-accent" aria-hidden />
            <span className="truncate">{t('app.name')}</span>
          </p>
          <button
            type="button"
            onClick={() => openModal({ type: 'lang' })}
            aria-label={t('a11y.lang')}
            className="pointer-events-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-surface px-3 text-base font-semibold shadow-card"
          >
            <Globe size={20} aria-hidden />
            <span className="uppercase">{lang.code}</span>
          </button>
        </header>

        <motion.aside
          className="fixed inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-card bg-surface shadow-card md:inset-x-auto md:bottom-4 md:start-4 md:top-4 md:w-[26rem] md:rounded-card"
          initial={false}
          animate={vp.desktop ? undefined : { height: heights[sheet] }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          <motion.div
            className="flex shrink-0 touch-none justify-center md:hidden"
            onPanEnd={(_, info) => {
              if (info.offset.y < -30) step(1)
              else if (info.offset.y > 30) step(-1)
            }}
          >
            <button
              type="button"
              onClick={() => (expanded ? setSheet('half') : step(1))}
              aria-label={expanded ? t('sheet.collapse') : t('sheet.expand')}
              className="flex h-8 w-full items-center justify-center text-muted"
            >
              <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
                <ChevronUp size={22} aria-hidden />
              </motion.span>
            </button>
          </motion.div>

          {tab !== 'profile' && <ScopeBar />}

          <div ref={scroller} id="content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 outline-none">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              >
                <Screen />
              </motion.div>
            </AnimatePresence>
          </div>

          <BottomNav />
        </motion.aside>

        <motion.button
          type="button"
          onClick={() => openModal({ type: 'assistant' })}
          className="fixed end-3 z-30 flex min-h-14 items-center gap-1 rounded-control bg-surface py-1 pe-3 ps-1.5 shadow-card md:end-6"
          whileTap={{ scale: 0.95 }}
          initial={false}
          animate={{
            bottom: vp.desktop ? 24 : sheet === 'full' ? 92 : heights[sheet] + 12,
            y: [0, -4, 0],
          }}
          transition={{
            bottom: { type: 'spring', stiffness: 260, damping: 30 },
            y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <DropletIcon size={48} />
          <span className="text-base font-semibold text-water">{t('as.name')}</span>
          <span className="sr-only">{t('as.open')}</span>
        </motion.button>

        <div className="pointer-events-none fixed end-6 z-10 hidden rounded-control bg-surface/95 px-3 py-2 text-sm text-muted shadow-card md:bottom-28 md:block">
          <p className="mb-1 font-medium text-ink">{t('map.legend')}</p>
          <p className="mb-2 max-w-[15rem]">{t('map.forest')}</p>
          <p className="flex items-center gap-2">
            <span>{t('map.less')}</span>
            <span className="flex overflow-hidden rounded-sm" aria-hidden="true">
              {LEGEND.map((c) => (
                <span key={c} className={`h-3 w-5 ${c}`} />
              ))}
            </span>
            <span>{t('map.more')}</span>
          </p>
        </div>
      </div>

      <AnimatePresence>
        {modal?.type === 'scope' && <ScopePicker key="scope" />}
        {modal?.type === 'lang' && <LanguageDialog key="lang" />}
        {modal?.type === 'event' && <EventDetail key={`event-${modal.id}`} id={modal.id} />}
        {modal?.type === 'create' && <CreateEventFlow key="create" />}
        {modal?.type === 'assistant' && <Assistant key="assistant" />}
        {modal?.type === 'auth' && <AuthModal key="auth" />}
      </AnimatePresence>
      <PrintSheet />
    </>
  )
}
