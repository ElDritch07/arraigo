import { Accessibility, Bookmark, ChevronDown, Clock, MapPin, Plus, SlidersHorizontal, Store, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { Fragment, useMemo, useState } from 'react'
import { useT } from '../../i18n'
import type { CommunityEvent, EventKind, EventStatus } from '../../lib/types'
import { eventTitle, useApp } from '../../state/app'
import { useInScope, useRequireAccount } from '../../state/hooks'
import { useUi } from '../../state/ui'
import { EventActions } from '../EventActions'
import { Button, EmptyState, Field, ScreenTitle, SectionTitle, StatusBadge, fieldClass } from '../ui'

const STATUSES: EventStatus[] = ['presented', 'review', 'approved', 'ongoing', 'finished']
const KINDS: EventKind[] = ['fiesta', 'voluntariado', 'deporte', 'cultura', 'taller', 'otro']
const MAX = 50

export function eventPlace(e: CommunityEvent, td: (k: string, p?: Record<string, string>) => string, barrio: string) {
  return e.place || (e.placeKey ? td(e.placeKey, { barrio }) : '')
}

export function EventsScreen() {
  const { t, td, dayMonth, fullDate } = useT()
  const { events, byId, likesOf, hasSaved } = useApp()
  const { openModal } = useUi()
  const inScope = useInScope()
  const requireAccount = useRequireAccount()
  const [status, setStatus] = useState<EventStatus | 'all'>('all')
  const [kind, setKind] = useState<EventKind | 'all'>('all')
  const [onlyAccessible, setOnlyAccessible] = useState(false)
  const [onlySaved, setOnlySaved] = useState(false)
  const [sort, setSort] = useState<'date' | 'likes'>('date')

  const list = useMemo(() => {
    const finished = (e: CommunityEvent) => (e.status === 'finished' ? 1 : 0)
    return events
      .filter(
        (e) =>
          inScope(e.barrioId) &&
          (status === 'all' || e.status === status) &&
          (kind === 'all' || e.kind === kind) &&
          (!onlyAccessible || e.accessible) &&
          (!onlySaved || hasSaved(e.id)),
      )
      .sort(
        (a, b) =>
          finished(a) - finished(b) ||
          (sort === 'likes' ? likesOf(b.id) - likesOf(a.id) : 0) ||
          (finished(a) ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, inScope, status, kind, onlyAccessible, onlySaved, sort, likesOf, hasSaved])

  // Los eventos con comercio patrocinador salen primero y destacados: así se mantiene la app y se apoya al comercio local.
  const featured = useMemo(
    () =>
      events
        .filter((e) => e.sponsor && inScope(e.barrioId) && e.status !== 'finished')
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [events, inScope],
  )

  const activeFilters =
    Number(kind !== 'all') + Number(onlyAccessible) + Number(onlySaved) + Number(sort !== 'date')

  const chip = (active: boolean) =>
    `min-h-11 shrink-0 rounded-control border px-3 text-base font-medium ${
      active ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink hover:bg-canvas'
    }`

  return (
    <div className="pb-24">
      <ScreenTitle>{t('ev.title')}</ScreenTitle>
      <Button className="mb-4 w-full" onClick={() => requireAccount(() => openModal({ type: 'create' }))}>
        <Plus size={20} aria-hidden />
        {t('ev.create')}
      </Button>

      {featured.length > 0 && (
        <section className="mb-5" aria-labelledby="featured-h">
          <SectionTitle id="featured-h" sub={t('sp.about')}>
            {t('sp.featured')}
          </SectionTitle>
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {featured.map((e) => {
              const { day, month } = dayMonth(e.date)
              return (
                <li key={e.id} className="w-64 shrink-0">
                  <button
                    type="button"
                    onClick={() => openModal({ type: 'event', id: e.id })}
                    className="flex h-full w-full flex-col rounded-control border-2 border-accent bg-accent-soft p-3 text-start"
                  >
                    <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-md bg-accent px-2 py-0.5 text-sm font-medium text-white">
                      <Store size={14} aria-hidden />
                      {t('sp.badge')}
                    </span>
                    <span className="text-lg font-semibold leading-snug">{eventTitle(e, td)}</span>
                    <span className="mt-1 text-sm text-accent-strong">{t('sp.by', { name: e.sponsor ?? '' })}</span>
                    <span className="mt-auto pt-2 text-sm text-muted">
                      {day} {month}, {e.time}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div role="group" aria-label={t('ev.filter.status')} className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        <button type="button" aria-pressed={status === 'all'} className={chip(status === 'all')} onClick={() => setStatus('all')}>
          {t('ev.filter.all')}
        </button>
        {STATUSES.map((s) => (
          <button key={s} type="button" aria-pressed={status === s} className={chip(status === s)} onClick={() => setStatus(s)}>
            {td(`status.${s}`)}
          </button>
        ))}
      </div>

      <details className="group mb-1 rounded-control border border-line bg-surface">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-accent" aria-hidden />
            {t('ev.filters')}
            {activeFilters > 0 && (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-sm font-medium text-white">
                {activeFilters}
              </span>
            )}
          </span>
          <ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t border-line px-3 pb-3 pt-3">
      <Field label={t('ev.filter.kind')}>
        {(p) => (
          <select {...p} className={fieldClass} value={kind} onChange={(e) => setKind(e.target.value as EventKind | 'all')}>
            <option value="all">{t('ev.filter.allKinds')}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {td(`kind.${k}`)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="mt-3">
        <Field label={t('ev.sort')}>
          {(p) => (
            <select {...p} className={fieldClass} value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'likes')}>
              <option value="date">{t('ev.sort.date')}</option>
              <option value="likes">{t('ev.sort.likes')}</option>
            </select>
          )}
        </Field>
      </div>

      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-base">
        <input
          type="checkbox"
          checked={onlySaved}
          onChange={(e) => setOnlySaved(e.target.checked)}
          className="size-5 accent-[var(--color-accent)]"
        />
        <Bookmark size={18} aria-hidden />
        {t('ev.filter.saved')}
      </label>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
        <input
          type="checkbox"
          checked={onlyAccessible}
          onChange={(e) => setOnlyAccessible(e.target.checked)}
          className="size-5 accent-[var(--color-accent)]"
        />
        <Accessibility size={18} aria-hidden />
        {t('ev.filter.accessible')}
      </label>
        </div>
      </details>

      <p className="my-3 text-sm text-muted" aria-live="polite">
        {t('common.results', { n: list.length })}
      </p>

      {list.length === 0 ? (
        <EmptyState>{t('ev.empty')}</EmptyState>
      ) : (
        <motion.ul
          className="space-y-3"
          initial="hidden"
          animate="show"
          key={`${status}-${kind}-${onlyAccessible}-${onlySaved}-${sort}-${list.length}`}
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        >
          {list.slice(0, MAX).map((e, idx) => {
            const { day, month } = dayMonth(e.date)
            const barrio = byId.get(e.barrioId)?.name ?? ''
            return (
              <Fragment key={e.id}>
              <motion.li
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className={`rounded-control border bg-surface ${e.sponsor ? 'border-2 border-accent' : 'border-line'}`}>
                <button
                  type="button"
                  onClick={() => openModal({ type: 'event', id: e.id })}
                  className="flex w-full gap-3 rounded-t-control p-3 text-start hover:bg-canvas"
                >
                  <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-control bg-accent-soft text-accent-strong">
                    <span className="text-xl font-semibold leading-none">{day}</span>
                    <span className="mt-1 text-sm uppercase">{month}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={e.status} />
                      <span className="text-sm text-muted">{td(`kind.${e.kind}`)}</span>
                      {e.sponsor && (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong">
                          <Store size={14} aria-hidden />
                          {t('sp.badge')}
                        </span>
                      )}
                    </span>
                    <span className="block text-lg font-semibold leading-snug">{eventTitle(e, td)}</span>
                    <span className="mt-1.5 block space-y-0.5 text-sm text-muted">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} aria-hidden />
                        {t('ev.when', { date: fullDate(e.date), time: e.time })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} aria-hidden />
                        <span className="truncate">{eventPlace(e, td, barrio)}</span>
                      </span>
                      {e.accessible && (
                        <span className="flex items-center gap-1.5 font-medium text-accent-strong">
                          <Accessibility size={14} aria-hidden />
                          {t('ev.accessible')}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users size={14} aria-hidden />
                        {t('ev.attendees', { n: e.attendees })}
                        {e.volunteersNeeded > 0 && e.status !== 'finished' && <span>, {t('ev.needsVol', { n: e.volunteersNeeded })}</span>}
                      </span>
                    </span>
                  </span>
                </button>
                <div className="border-t border-line px-3 py-2">
                  <EventActions event={e} />
                </div>
                </div>
              </motion.li>
              {idx === 2 && featured[0] && (
                <li>
                  <button
                    type="button"
                    onClick={() => openModal({ type: 'event', id: featured[0].id })}
                    className="flex w-full flex-col rounded-control border border-dashed border-ink/40 bg-canvas p-3 text-start hover:bg-accent-soft"
                  >
                    <span className="mb-1 inline-flex w-fit items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
                      <Store size={14} aria-hidden />
                      {t('sp.ad')}
                    </span>
                    <span className="text-base font-semibold">{featured[0].sponsor}</span>
                    <span className="text-sm text-muted">{t('sp.ad.text', { name: featured[0].sponsor ?? '' })}</span>
                    <span className="mt-2 text-base font-medium text-accent-strong underline underline-offset-2">
                      {t('sp.ad.cta')}
                    </span>
                  </button>
                </li>
              )}
              </Fragment>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
