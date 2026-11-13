import { Download } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { es } from '../i18n/es'
import { useT } from '../i18n'
import { isoDate } from '../lib/hash'
import { download, makePdf } from '../lib/pdf'
import type { EventKind } from '../lib/types'
import { useApp } from '../state/app'
import { useUi } from '../state/ui'
import { BarrioSelect } from './BarrioSelect'
import { Modal } from './Modal'
import { StatusTrack } from './StatusTrack'
import { Button, Field, StatusBadge, fieldClass } from './ui'

const KINDS: EventKind[] = ['fiesta', 'voluntariado', 'deporte', 'cultura', 'taller', 'otro']

type DocId = 'communication' | 'space' | 'insurance' | 'safety' | 'minors'

interface Draft {
  title: string
  kind: EventKind
  date: string
  time: string
  place: string
  description: string
  barrioId: string
  isPublic: boolean
  large: boolean
  minors: boolean
  needVol: boolean
  volN: number
  accessible: boolean
  hasSponsor: boolean
  sponsor: string
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line px-3 py-2 text-base has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-[var(--color-accent)]"
      />
      <span>{children}</span>
    </label>
  )
}

export function CreateEventFlow() {
  const { t, td } = useT()
  const { user, createEvent, events, byId } = useApp()
  const { scope, closeModal, setTab, modal } = useUi()
  const demo = modal?.type === 'create' && !!modal.demo
  const [step, setStep] = useState(1)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [ready, setReady] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const heading = useRef<HTMLHeadingElement>(null)
  const [d, setD] = useState<Draft>({
    title: demo ? 'Jornada de limpieza de la playa' : '',
    kind: demo ? 'voluntariado' : 'fiesta',
    date: isoDate(14),
    time: '18:00',
    place: demo ? 'Playa de Las Alcaravaneras' : '',
    description: '',
    barrioId: scope.barrioId ?? user?.barrioId ?? '',
    isPublic: true,
    large: false,
    minors: false,
    needVol: demo,
    volN: 5,
    accessible: true,
    hasSponsor: demo,
    sponsor: demo ? 'Panadería La Esquina' : '',
  })
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    heading.current?.focus()
  }, [step, createdId])

  const docs = useMemo<DocId[]>(() => {
    const list: DocId[] = ['communication']
    if (d.isPublic) list.push('space')
    list.push('insurance')
    if (d.large) list.push('safety')
    if (d.minors) list.push('minors')
    return list
  }, [d.isPublic, d.large, d.minors])

  const done = docs.filter((x) => ready[x]).length
  const barrio = byId.get(d.barrioId)

  const goStep2 = () => {
    const e: Record<string, string> = {}
    if (d.title.trim().length < 5) e.title = t('cr.err.name')
    if (!d.date) e.date = t('cr.err.date')
    if (!d.barrioId) e.barrio = t('cr.err.barrio')
    setErrors(e)
    if (Object.keys(e).length === 0) setStep(2)
  }

  const downloadDoc = (id: DocId) => {
    // Los modelos administrativos se generan siempre en español, que es el idioma del trámite.
    const name = es[`doc.${id}` as const]
    const desc = es[`doc.${id}.desc` as const]
    const lines = [
      desc,
      '',
      'DATOS DE LA PERSONA ORGANIZADORA',
      `Nombre: ${user?.name ?? '______________________'}`,
      `Correo electrónico: ${user?.email ?? '______________________'}`,
      '',
      'DATOS DEL EVENTO',
      `Nombre del evento: ${d.title || '______________________'}`,
      `Fecha y hora: ${d.date} ${d.time}`,
      `Lugar: ${d.place || '______________________'}`,
      `Barrio y municipio: ${barrio ? `${barrio.name}, ${barrio.municipio}` : '______________________'}`,
      '',
      'DECLARACIÓN',
      '____________________________________________________________',
      '____________________________________________________________',
      '',
      'Firma: ______________________     Fecha: ______________',
      '',
      'Modelo de ejemplo generado por la plataforma. Demostración sin valor administrativo.',
    ]
    download(makePdf(name, lines), `${id}.pdf`)
  }

  const submit = () => {
    if (d.hasSponsor && !d.sponsor.trim()) {
      setErrors({ sponsor: t('sp.err') })
      return
    }
    const id = createEvent({
      barrioId: d.barrioId,
      title: d.title,
      kind: d.kind,
      date: d.date,
      time: d.time,
      place: d.place,
      description: d.description,
      volunteersNeeded: d.needVol ? d.volN : 0,
      accessible: d.accessible,
      sponsor: d.hasSponsor ? d.sponsor : '',
    })
    setCreatedId(id)
  }

  const submitRef = useRef(submit)
  submitRef.current = submit

  // En el modo presentación el formulario se rellena y avanza solo.
  useEffect(() => {
    if (!demo) return
    const timers = [
      window.setTimeout(() => setStep(2), 2600),
      window.setTimeout(() => setReady({ communication: true, space: true, insurance: true }), 4200),
      window.setTimeout(() => setStep(3), 5600),
      window.setTimeout(() => submitRef.current(), 8800),
    ]
    return () => timers.forEach((id) => window.clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])

  const created = createdId ? events.find((e) => e.id === createdId) : null
  const titles = [t('cr.step1'), t('cr.step2'), t('cr.step3')]

  return (
    <Modal title={t('cr.title')} onClose={closeModal} variant="full">
      <div className="p-5">
        <AnimatePresence mode="wait" initial={false}>
          {created ? (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <h3 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
                {t('cr.ok.title')}
              </h3>
              <p className="text-base text-muted">{t('cr.ok.text')}</p>
              <div className="rounded-control border border-line p-4">
                <p className="mb-3 text-base font-semibold">{created.title}</p>
                <div className="mb-4">
                  <StatusBadge status={created.status} />
                </div>
                <StatusTrack status={created.status} />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setTab('events')
                  closeModal()
                }}
              >
                {t('cr.ok.done')}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <p className="mb-1 text-sm font-medium text-muted">{t('auth.step', { n: step, total: 3 })}</p>
              <div className="mb-4 flex gap-1.5" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <motion.span
                    key={n}
                    className="h-1.5 flex-1 rounded-full bg-line"
                    animate={{ backgroundColor: n <= step ? 'var(--color-accent)' : 'var(--color-line)' }}
                  />
                ))}
              </div>
              <h3 ref={heading} tabIndex={-1} className="mb-4 text-xl font-semibold outline-none">
                {titles[step - 1]}
              </h3>

              {step === 1 && (
                <div className="space-y-4">
                  <Field label={t('cr.name')} error={errors.title}>
                    {(p) => <input {...p} className={fieldClass} value={d.title} maxLength={100} onChange={(e) => set('title', e.target.value)} />}
                  </Field>
                  <Field label={t('cr.kind')}>
                    {(p) => (
                      <select {...p} className={fieldClass} value={d.kind} onChange={(e) => set('kind', e.target.value as EventKind)}>
                        {KINDS.map((k) => (
                          <option key={k} value={k}>
                            {td(`kind.${k}`)}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('cr.date')} error={errors.date}>
                      {(p) => <input {...p} type="date" className={fieldClass} value={d.date} min={isoDate(0)} onChange={(e) => set('date', e.target.value)} />}
                    </Field>
                    <Field label={t('cr.time')}>
                      {(p) => <input {...p} type="time" className={fieldClass} value={d.time} onChange={(e) => set('time', e.target.value)} />}
                    </Field>
                  </div>
                  <BarrioSelect value={d.barrioId} onChange={(v) => set('barrioId', v)} error={errors.barrio} />
                  <Field label={t('cr.place')} optional={t('common.optional')}>
                    {(p) => <input {...p} className={fieldClass} value={d.place} maxLength={100} onChange={(e) => set('place', e.target.value)} />}
                  </Field>
                  <Check checked={d.accessible} onChange={(v) => set('accessible', v)}>{t('cr.accessible')}</Check>
                  <Field label={t('cr.desc')} optional={t('common.optional')}>
                    {(p) => <textarea {...p} rows={3} className={`${fieldClass} resize-none`} value={d.description} maxLength={400} onChange={(e) => set('description', e.target.value)} />}
                  </Field>
                  <Button className="w-full" onClick={goStep2}>
                    {t('common.next')}
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-base text-muted">{t('cr.docs.intro')}</p>
                  <div className="space-y-2">
                    <Check checked={d.isPublic} onChange={(v) => set('isPublic', v)}>{t('cr.q.public')}</Check>
                    <Check checked={d.large} onChange={(v) => set('large', v)}>{t('cr.q.large')}</Check>
                    <Check checked={d.minors} onChange={(v) => set('minors', v)}>{t('cr.q.minors')}</Check>
                  </div>
                  <p className="text-sm font-medium text-accent-strong" aria-live="polite">
                    {t('cr.docs.count', { done, total: docs.length })}
                  </p>
                  <ul className="space-y-3">
                    <AnimatePresence initial={false}>
                      {docs.map((id) => (
                        <motion.li
                          key={id}
                          layout
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.2 }}
                          className="rounded-control border border-line p-3"
                        >
                          <p className="text-base font-semibold">{td(`doc.${id}`)}</p>
                          <p className="mb-3 text-sm text-muted">{td(`doc.${id}.desc`)}</p>
                          <div className="flex flex-wrap items-center gap-3">
                            <Button variant="secondary" onClick={() => downloadDoc(id)}>
                              <Download size={18} aria-hidden />
                              {t('cr.docs.download')}
                            </Button>
                            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-base">
                              <input
                                type="checkbox"
                                checked={!!ready[id]}
                                onChange={(e) => setReady((r) => ({ ...r, [id]: e.target.checked }))}
                                className="size-5 accent-[var(--color-accent)]"
                              />
                              {t('cr.docs.ready')}
                            </label>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                      {t('common.back')}
                    </Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>
                      {t('common.next')}
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <Check checked={d.needVol} onChange={(v) => set('needVol', v)}>{t('cr.vol.q')}</Check>
                  {d.needVol && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                      <Field label={t('cr.vol.n')} hint={t('cr.vol.hint')}>
                        {(p) => (
                          <input
                            {...p}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={50}
                            className={fieldClass}
                            value={d.volN}
                            onChange={(e) => set('volN', Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                          />
                        )}
                      </Field>
                    </motion.div>
                  )}
                  <Check checked={d.hasSponsor} onChange={(v) => set('hasSponsor', v)}>{t('sp.q')}</Check>
                  {d.hasSponsor && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                      <Field label={t('sp.name')} hint={t('sp.hint')} error={errors.sponsor}>
                        {(p) => <input {...p} className={fieldClass} value={d.sponsor} maxLength={60} onChange={(e) => set('sponsor', e.target.value)} />}
                      </Field>
                    </motion.div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>
                      {t('common.back')}
                    </Button>
                    <Button className="flex-1" onClick={submit}>
                      {t('cr.submit')}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}
