import { Camera, Check, IdCard, KeyRound, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { Button, Field, fieldClass } from './ui'

export type IdKind = 'cert' | 'clave' | 'dni'

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

// Solo comprueba el formato y la letra de control; el número no se guarda ni se envía.
function validDni(value: string) {
  const v = value.trim().toUpperCase()
  const nie = /^[XYZ]\d{7}[A-Z]$/.test(v)
  if (!nie && !/^\d{8}[A-Z]$/.test(v)) return false
  const digits = nie ? String('XYZ'.indexOf(v[0])) + v.slice(1, 8) : v.slice(0, 8)
  return DNI_LETTERS[Number(digits) % 23] === v[v.length - 1]
}

// Accesos con identidad oficial, solo simulados: no se conectan a ningún servicio ni se guardan datos.
export function IdButtons({ onPick }: { onPick: (kind: IdKind) => void }) {
  const { t } = useT()
  const items: { kind: IdKind; icon: typeof ShieldCheck; label: string }[] = [
    { kind: 'cert', icon: ShieldCheck, label: t('auth.id.cert') },
    { kind: 'clave', icon: KeyRound, label: t('auth.id.clave') },
    { kind: 'dni', icon: IdCard, label: t('auth.id.dni') },
  ]
  return (
    <section aria-labelledby="id-h" className="text-start">
      <h2 id="id-h" className="mb-2 text-base font-semibold">
        {t('auth.id.title')}
      </h2>
      <div className="space-y-2">
        {items.map(({ kind, icon: Icon, label }) => (
          <Button key={kind} variant="secondary" className="w-full justify-start" onClick={() => onPick(kind)}>
            <Icon size={20} className="shrink-0 text-accent" aria-hidden />
            {label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{t('auth.id.demo')}</p>
    </section>
  )
}

export function IdFlow({ kind, onBack, onVerified }: { kind: IdKind; onBack: () => void; onVerified: () => void }) {
  const { t } = useT()
  const [phase, setPhase] = useState<'form' | 'checking' | 'ok'>('form')
  const [dni, setDni] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo) : undefined), [photo])

  const titles = { cert: 'auth.id.cert.title', clave: 'auth.id.clave.title', dni: 'auth.id.dni.title' } as const
  const texts = { cert: 'auth.id.cert.text', clave: 'auth.id.clave.text', dni: 'auth.id.dni.text' } as const

  const simulate = () => {
    if (kind === 'dni') {
      const e: Record<string, string> = {}
      if (!validDni(dni)) e.dni = t('auth.id.dni.err')
      if (!photo) e.photo = t('auth.id.photo.err')
      setErrors(e)
      if (Object.keys(e).length) return
    }
    setPhase('checking')
    window.setTimeout(() => setPhase('ok'), 1600)
  }

  return (
    <div className="space-y-4">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        {t(titles[kind])}
      </h1>
      <p className="text-base text-muted">{t(texts[kind])}</p>
      <p className="rounded-control bg-st-review-bg px-3 py-2 text-base font-medium text-st-review-fg">{t('auth.id.demo')}</p>

      {kind === 'cert' && (
        <div className="flex items-center gap-3 rounded-control border-2 border-accent bg-accent-soft p-3">
          <ShieldCheck size={22} className="shrink-0 text-accent-strong" aria-hidden />
          <span className="text-base font-medium">{t('auth.id.cert.sample')}</span>
        </div>
      )}

      {kind === 'clave' && (
        <div className="rounded-control border border-line p-3">
          <p className="text-sm text-muted">{t('auth.id.clave.pin')}</p>
          <p className="text-2xl font-semibold tracking-[0.4em]">••••••</p>
        </div>
      )}

      {kind === 'dni' && (
        <div className="space-y-4">
          <Field label={t('auth.id.dni.number')} hint={t('auth.id.dni.hint')} error={errors.dni}>
            {(p) => (
              <input
                {...p}
                className={fieldClass}
                value={dni}
                maxLength={9}
                autoComplete="off"
                autoCapitalize="characters"
                onChange={(e) => setDni(e.target.value)}
              />
            )}
          </Field>
          <div>
            <p className="mb-1 text-base font-medium">{t('auth.id.photo')}</p>
            <p className="mb-2 text-sm text-muted">{t('auth.id.photo.hint')}</p>
            {photo && <img src={photo} alt={t('auth.id.photo.alt')} className="mb-2 max-h-48 w-full rounded-control object-cover" />}
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-base font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent">
              <Camera size={18} aria-hidden />
              {t('auth.id.photo.take')}
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPhoto(URL.createObjectURL(file))
                }}
              />
            </label>
            {errors.photo && (
              <p role="alert" className="mt-1.5 text-sm font-medium text-red-800">
                {errors.photo}
              </p>
            )}
          </div>
        </div>
      )}

      <div role="status" className="min-h-6 text-base font-medium text-accent-strong">
        {phase === 'checking' && (
          <span className="flex items-center gap-2">
            <span
              className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
            {t('auth.id.checking')}
          </span>
        )}
        {phase === 'ok' && (
          <span className="flex items-center gap-2">
            <Check size={18} aria-hidden />
            {t('auth.id.ok')}
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onBack}>
          {t('common.back')}
        </Button>
        {phase === 'ok' ? (
          <Button className="flex-1" onClick={onVerified}>
            {t('auth.id.continue')}
          </Button>
        ) : (
          <Button className="flex-1" onClick={simulate} disabled={phase === 'checking'}>
            {t('auth.id.simulate')}
          </Button>
        )}
      </div>
    </div>
  )
}
