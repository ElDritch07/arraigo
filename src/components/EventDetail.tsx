import { Accessibility, CalendarCheck, Clock, HandHeart, MapPin, Store, User, Users } from 'lucide-react'
import { useT } from '../i18n'
import { POINTS } from '../lib/plants'
import { eventTitle, useApp } from '../state/app'
import { useRequireAccount } from '../state/hooks'
import { useUi } from '../state/ui'
import { EventActions } from './EventActions'
import { EventBoard } from './EventBoard'
import { Modal } from './Modal'
import { eventPlace } from './screens/EventsScreen'
import { StatusTrack } from './StatusTrack'
import { Button, Chip, StatusBadge } from './ui'

// Aviso de "pendiente" o "confirmado". Los puntos solo llegan cuando el organizador confirma la asistencia.
export function ConfirmNote({ confirmed, onDemo }: { confirmed: boolean; onDemo: () => void }) {
  const { t } = useT()
  return confirmed ? (
    <p className="rounded-control bg-accent-soft px-3 py-2 text-base font-medium text-accent-strong">{t('ev.confirmed')}</p>
  ) : (
    <div className="space-y-2 rounded-control border border-line px-3 py-2">
      <p className="text-base text-muted">{t('ev.pending')}</p>
      <Button variant="secondary" className="w-full" onClick={onDemo}>
        {t('ev.demoConfirm')}
      </Button>
    </div>
  )
}

export function EventDetail({ id }: { id: string }) {
  const { t, td, fullDate } = useT()
  const {
    events,
    volunteering,
    byId,
    hasJoinedEvent,
    joinEvent,
    hasJoinedVol,
    joinVol,
    hasConfirmed,
    confirmMe,
    demoAttendeeCount,
    addDemoAttendees,
    isAttendeeConfirmed,
    confirmAttendee,
  } = useApp()
  const { closeModal, showToast } = useUi()
  const requireAccount = useRequireAccount()
  const event = events.find((e) => e.id === id)

  if (!event) return null
  const barrio = byId.get(event.barrioId)?.name ?? ''
  const vol = volunteering.find((v) => v.eventId === event.id)
  const joined = hasJoinedEvent(event.id)
  const volJoined = vol ? hasJoinedVol(vol.id) : false
  const description = event.description ?? (event.descKey ? td(event.descKey) : t('ev.noDesc'))
  const organizer = event.organizer ?? (event.organizerKey ? td(event.organizerKey) : '')
  const finished = event.status === 'finished'
  const attendees = demoAttendeeCount(event.id)

  return (
    <Modal title={eventTitle(event, td)} onClose={closeModal}>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <Chip>{td(`kind.${event.kind}`)}</Chip>
          {event.mine && <Chip tone="outline">{t('common.mine')}</Chip>}
        </div>

        {event.sponsor && (
          <p className="flex items-start gap-2 rounded-control border-2 border-accent bg-accent-soft p-3 text-base">
            <Store size={20} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden />
            <span>
              <span className="font-semibold">
                {t('sp.badge')} <span className="font-normal text-muted">({t('sp.ad')})</span>
              </span>
              <br />
              {t('sp.detail', { name: event.sponsor })}
            </span>
          </p>
        )}

        <EventActions event={event} />

        <StatusTrack status={event.status} />

        <ul className="space-y-2 text-base">
          <li className="flex items-center gap-2">
            <Clock size={18} className="shrink-0 text-accent" aria-hidden />
            {t('ev.when', { date: fullDate(event.date), time: event.time })}
          </li>
          <li className="flex items-center gap-2">
            <MapPin size={18} className="shrink-0 text-accent" aria-hidden />
            {eventPlace(event, td, barrio)}, {byId.get(event.barrioId)?.municipio}
          </li>
          <li className="flex items-start gap-2">
            <Accessibility size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <span>
              <span className="font-medium">{t('ev.access')}: </span>
              {event.accessible ? t('ev.accessible.long') : t('ev.accessible.unknown')}
            </span>
          </li>
          {organizer && (
            <li className="flex items-center gap-2">
              <User size={18} className="shrink-0 text-accent" aria-hidden />
              {t('ev.by', { name: organizer })}
            </li>
          )}
          <li className="flex items-center gap-2">
            <Users size={18} className="shrink-0 text-accent" aria-hidden />
            {t('ev.attendees', { n: event.attendees })}
          </li>
        </ul>

        <section>
          <h3 className="mb-1 text-base font-semibold">{t('ev.about')}</h3>
          <p className="text-base text-muted">{description}</p>
        </section>

        {event.mine ? (
          <section aria-labelledby="att-h" className="space-y-3 rounded-control border border-line p-3">
            <h3 id="att-h" className="text-base font-semibold">
              {t('ev.attendeesTitle')}
            </h3>
            <p className="text-sm text-muted">{t('ev.attendees.hint')}</p>
            {attendees === 0 ? (
              <p className="text-base text-muted">{t('ev.attendees.none')}</p>
            ) : (
              <ul className="space-y-2">
                {Array.from({ length: attendees }, (_, i) => {
                  const done = isAttendeeConfirmed(event.id, i)
                  return (
                    <li key={i} className="flex items-center justify-between gap-3 text-base">
                      <span>{t('ev.person', { n: i + 1 })}</span>
                      <Button
                        variant={done ? 'secondary' : 'primary'}
                        disabled={done}
                        className="!px-3"
                        onClick={() => confirmAttendee(event.id, i)}
                      >
                        {done ? t('ev.attendees.done') : `${t('ev.attendees.confirm')} (+${POINTS.confirm})`}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Button variant="secondary" className="w-full" onClick={() => addDemoAttendees(event.id)}>
              {t('ev.attendees.add')}
            </Button>
          </section>
        ) : (
          !finished && (
            <div className="space-y-3">
              <Button
                className="w-full"
                variant={joined ? 'secondary' : 'primary'}
                aria-pressed={joined}
                onClick={() =>
                  requireAccount(() => {
                    joinEvent(event.id)
                    if (!joined) showToast(t('toast.joined'))
                  })
                }
              >
                <CalendarCheck size={20} aria-hidden />
                {joined ? t('ev.joined') : t('ev.join')}
              </Button>
              {joined && <ConfirmNote confirmed={hasConfirmed(event.id)} onDemo={() => confirmMe(event.id, 'join')} />}
              {vol && event.volunteersNeeded > 0 && (
                <div className="space-y-2 rounded-control border border-line p-3">
                  <p className="flex items-center gap-2 text-base font-medium">
                    <HandHeart size={18} className="text-accent" aria-hidden />
                    {t('ev.needsVol', { n: event.volunteersNeeded })}
                  </p>
                  <Button
                    className="w-full"
                    variant={volJoined ? 'secondary' : 'primary'}
                    aria-pressed={volJoined}
                    onClick={() =>
                      requireAccount(() => {
                        joinVol(vol.id)
                        if (!volJoined) showToast(t('toast.joined'))
                      })
                    }
                  >
                    {volJoined ? t('vol.joined') : t('ev.helpEvent')}
                  </Button>
                  {volJoined && <ConfirmNote confirmed={hasConfirmed(vol.id)} onDemo={() => confirmMe(vol.id, 'vol')} />}
                </div>
              )}
            </div>
          )
        )}

        <EventBoard eventId={event.id} />
      </div>
    </Modal>
  )
}
