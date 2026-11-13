import { Check, Eye, EyeOff, Play, Sprout } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { MAX_STAGE, SPECIES } from '../lib/plants'
import type { Species } from '../lib/types'
import { useApp } from '../state/app'
import { useTour } from '../state/tour'
import { useUi } from '../state/ui'
import { BarrioSelect } from './BarrioSelect'
import { IdButtons, IdFlow } from './IdAccess'
import { LanguageChips } from './LanguageChips'
import { Modal } from './Modal'
import { Plant } from './Plant'
import { Button, Field, fieldClass } from './ui'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const LOGIN = 10
const CERT = 20
const CLAVE = 21
const DNI = 22

// La planta de la bienvenida crece sola, de semilla a flor, y pasa por las cuatro especies.
function GrowingPlant() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1100)
    return () => window.clearInterval(id)
  }, [])
  const cycle = MAX_STAGE + 3
  const stage = Math.min(tick % cycle, MAX_STAGE)
  const species = SPECIES[Math.floor(tick / cycle) % SPECIES.length]
  return <Plant key={species} species={species} stage={stage} size={170} />
}

function Steps({ step }: { step: number }) {
  const { t } = useT()
  return (
    <>
      <p className="mb-1 text-sm font-medium text-muted">{t('auth.step', { n: step, total: 3 })}</p>
      <div className="mb-5 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <motion.span
            key={n}
            className="h-1.5 flex-1 rounded-full bg-line"
            animate={{ backgroundColor: n <= step ? 'var(--color-accent)' : 'var(--color-line)' }}
          />
        ))}
      </div>
    </>
  )
}

// Contraseña con botón para verla: no se bloquea pegar y se avisa de la longitud mínima (WCAG 3.3.8).
export function PasswordField({
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string | null
  hint?: string
  autoComplete: 'new-password' | 'current-password'
}) {
  const { t } = useT()
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <div className="relative">
          <input
            {...p}
            type={show ? 'text' : 'password'}
            className={`${fieldClass} pe-12`}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="button"
            aria-label={show ? t('auth.password.hide') : t('auth.password.show')}
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
            className="absolute end-0 top-0 flex size-11 items-center justify-center text-muted"
          >
            {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  )
}

function Content({ welcome, onDone }: { welcome: boolean; onDone: () => void }) {
  const { t, td } = useT()
  const { signUp, login, continueAsGuest, hasAccount, loginSimulated } = useApp()
  const tour = useTour()
  const [step, setStep] = useState(welcome ? 0 : 1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [barrioId, setBarrioId] = useState('')
  const [plant, setPlant] = useState<Species>('drago')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [step])

  const next1 = () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = t('auth.err.name')
    if (!EMAIL.test(email.trim())) e.email = t('auth.err.email')
    if (password.length < 8) e.password = t('auth.err.password')
    setErrors(e)
    if (!Object.keys(e).length) setStep(2)
  }
  const next2 = () => {
    if (!barrioId) {
      setErrors({ barrio: t('auth.err.barrio') })
      return
    }
    setErrors({})
    setStep(3)
  }
  const finish = async () => {
    setBusy(true)
    await signUp({ name: name.trim(), email: email.trim(), barrioId, plant, password })
    setBusy(false)
    onDone()
  }
  // Tras una identificación simulada: si ya hay cuenta se entra; si no, se sigue con el alta (barrio y planta).
  const verified = () => {
    if (hasAccount && loginSimulated()) {
      onDone()
      return
    }
    const random = typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36)).join('')
      : Math.random().toString(36).slice(2)
    setName((n) => n || 'Persona de ejemplo')
    setEmail((m) => m || 'identidad@arraigo.demo')
    setPassword(random)
    setStep(2)
  }
  const submitLogin = async () => {
    setBusy(true)
    const result = await login(email, password)
    setBusy(false)
    if (result === 'ok') onDone()
    else setErrors({ login: result === 'none' ? t('auth.err.noaccount') : t('auth.err.login') })
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -28 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className={step === 0 ? 'w-full' : 'mx-auto w-full md:max-w-md'}
      >
        {step === 0 && (
          // En ordenador la bienvenida se reparte en dos columnas: presentación a la izquierda y accesos a la derecha.
          <div className="text-center md:grid md:grid-cols-2 md:items-center md:gap-16 md:text-start">
            <div>
              <div className="mx-auto flex h-48 items-end justify-center md:mx-0 md:h-56 md:justify-start">
                <GrowingPlant />
              </div>
              <p className="mt-2 flex items-center justify-center gap-2 text-base font-semibold text-accent-strong md:justify-start">
                <Sprout size={20} aria-hidden />
                {t('app.name')}
              </p>
              <h1 ref={heading} tabIndex={-1} className="mt-2 text-3xl font-semibold leading-tight outline-none md:text-4xl">
                {t('auth.welcome.title')}
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-lg text-muted md:mx-0 md:max-w-md">{t('auth.welcome.text')}</p>
              <div className="mt-6 text-start">
                <h2 className="mb-2 text-base font-semibold">{t('auth.language')}</h2>
                <LanguageChips />
              </div>
            </div>
            <div className="mt-6 space-y-3 md:mt-0">
              <Button className="w-full" onClick={() => setStep(1)}>
                {t('auth.create')}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setStep(LOGIN)}>
                {t('auth.login')}
              </Button>
              <div className="pt-2">
                <IdButtons onPick={(k) => setStep(k === 'cert' ? CERT : k === 'clave' ? CLAVE : DNI)} />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  continueAsGuest()
                  onDone()
                }}
              >
                {t('auth.guest')}
              </Button>
              <p className="text-sm text-muted">{t('auth.guest.note')}</p>
              <Button variant="ghost" className="w-full" onClick={() => tour.start()}>
                <Play size={18} aria-hidden />
                {t('tour.start')}
              </Button>
            </div>
          </div>
        )}

        {step === LOGIN && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              submitLogin()
            }}
          >
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
              {t('auth.login.title')}
            </h1>
            <Field label={t('auth.email')}>
              {(p) => (
                <input {...p} type="email" className={fieldClass} autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
            <PasswordField label={t('auth.password')} value={password} onChange={setPassword} autoComplete="current-password" error={errors.login} />
            <Button type="submit" className="w-full" disabled={busy}>
              {t('auth.login.submit')}
            </Button>
            <IdButtons onPick={(k) => setStep(k === 'cert' ? CERT : k === 'clave' ? CLAVE : DNI)} />
            {welcome && (
              <Button variant="secondary" className="w-full" onClick={() => setStep(0)}>
                {t('common.back')}
              </Button>
            )}
          </form>
        )}

        {(step === CERT || step === CLAVE || step === DNI) && (
          <IdFlow
            kind={step === CERT ? 'cert' : step === CLAVE ? 'clave' : 'dni'}
            onBack={() => setStep(welcome ? 0 : 1)}
            onVerified={verified}
          />
        )}

        {step === 1 && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              next1()
            }}
          >
            <Steps step={1} />
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
              {t('auth.signup.title')}
            </h1>
            <Field label={t('auth.name')} error={errors.name}>
              {(p) => <input {...p} className={fieldClass} autoComplete="nickname" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label={t('auth.email')} hint={t('auth.email.hint')} error={errors.email}>
              {(p) => <input {...p} type="email" className={fieldClass} autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
            </Field>
            <PasswordField
              label={t('auth.password')}
              hint={t('auth.password.hint')}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              error={errors.password}
            />
            <Button type="submit" className="w-full">
              {t('common.next')}
            </Button>
            <p className="text-sm text-muted">{t('auth.demo.pass')}</p>
            {welcome && (
              <Button variant="ghost" className="w-full" onClick={() => setStep(0)}>
                {t('common.back')}
              </Button>
            )}
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Steps step={2} />
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
              {t('auth.barrio.title')}
            </h1>
            <p className="text-base text-muted">{t('auth.barrio.text')}</p>
            <BarrioSelect value={barrioId} onChange={setBarrioId} error={errors.barrio} />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                {t('common.back')}
              </Button>
              <Button className="flex-1" onClick={next2}>
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Steps step={3} />
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
              {t('auth.plant.title')}
            </h1>
            <p className="text-base text-muted">{t('auth.plant.text')}</p>
            <div role="radiogroup" aria-label={t('auth.plant.title')} className="grid grid-cols-2 gap-3">
              {SPECIES.map((s) => {
                const active = plant === s
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPlant(s)}
                    className={`relative flex flex-col items-center rounded-control border-2 p-3 text-center transition-colors ${
                      active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-canvas'
                    }`}
                  >
                    {active && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-accent text-white"
                      >
                        <Check size={14} aria-hidden />
                      </motion.span>
                    )}
                    <Plant species={s} stage={4} size={84} idle={active} />
                    <span className="mt-1 text-base font-semibold">{td(`plant.${s}`)}</span>
                    <span className="text-sm text-muted">{td(`plant.${s}.desc`)}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>
                {t('common.back')}
              </Button>
              <Button className="flex-1" onClick={finish} disabled={busy}>
                {t('auth.submit')}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// Primera pantalla de la app.
export function AuthScreen() {
  return (
    <main className="h-dvh overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-md items-center px-5 py-8 md:max-w-5xl md:px-10">
        <Content welcome onDone={() => undefined} />
      </div>
    </main>
  )
}

// Alta rápida cuando una persona sin cuenta intenta crear algo.
export function AuthModal() {
  const { t } = useT()
  const { closeModal } = useUi()
  return (
    <Modal title={t('common.needAccount.title')} onClose={closeModal} variant="full">
      <div className="p-5">
        <p className="mb-5 text-base text-muted">{t('common.needAccount.text')}</p>
        <Content welcome={false} onDone={closeModal} />
      </div>
    </Modal>
  )
}
