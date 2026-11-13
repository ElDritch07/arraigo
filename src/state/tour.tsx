import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import type { Key } from '../i18n/es'
import { useApp } from './app'
import { useUi } from './ui'

const LAS_PALMAS = 'las-palmas-de-gran-canaria'
const VEGUETA = 'las-palmas-de-gran-canaria-vegueta'

type App = ReturnType<typeof useApp>
type Ui = ReturnType<typeof useUi>

interface Ctx {
  app: App
  ui: Ui
  setLang: (code: string) => void
  original: string
}

interface Step {
  key: Key
  ms: number
  run: (c: Ctx) => void
}

// Guion del recorrido: cada paso mueve la app y deja unos segundos para que se vea y se explique.
const STEPS: Step[] = [
  {
    key: 'tour.s1',
    ms: 6500,
    run: ({ ui }) => {
      ui.closeModal()
      ui.clearScope()
      ui.setTab('events')
    },
  },
  { key: 'tour.s2', ms: 4500, run: ({ ui }) => ui.selectMunicipio(LAS_PALMAS) },
  {
    key: 'tour.s3',
    ms: 6500,
    run: ({ ui }) => {
      ui.selectBarrio(VEGUETA, LAS_PALMAS)
      ui.setTab('events')
    },
  },
  {
    key: 'tour.s13',
    ms: 8000,
    run: ({ app, ui }) => {
      const open = (e: { id: string } | undefined) => e && ui.openModal({ type: 'event', id: e.id })
      const here = app.events.filter((e) => e.barrioId === VEGUETA && e.status !== 'finished')
      open(here.find((e) => e.sponsor) ?? here[0] ?? app.events.find((e) => e.sponsor && e.status !== 'finished'))
    },
  },
  {
    key: 'tour.s4',
    ms: 8000,
    run: ({ ui, setLang, original }) => {
      ui.closeModal()
      setLang('en')
      window.setTimeout(() => setLang('ar'), 2600)
      window.setTimeout(() => setLang(original), 5200)
    },
  },
  { key: 'tour.s5', ms: 12500, run: ({ ui }) => ui.openModal({ type: 'create', demo: true }) },
  { key: 'tour.s6', ms: 9000, run: () => undefined },
  {
    key: 'tour.s7',
    ms: 6000,
    run: ({ ui }) => {
      ui.closeModal()
      ui.selectBarrio(VEGUETA, LAS_PALMAS)
      ui.setTab('volunteer')
    },
  },
  { key: 'tour.s8', ms: 7500, run: ({ app }) => app.demoAward(10, 'join') },
  { key: 'tour.s9', ms: 5500, run: ({ ui }) => ui.setTab('mailbox') },
  { key: 'tour.s10', ms: 5500, run: ({ ui }) => ui.setTab('points') },
  { key: 'tour.s11', ms: 9500, run: ({ ui }) => ui.openModal({ type: 'assistant', demo: true }) },
  {
    key: 'tour.s12',
    ms: 7000,
    run: ({ ui }) => {
      ui.closeModal()
      ui.setTab('profile')
    },
  },
]

interface TourApi {
  running: boolean
  paused: boolean
  step: number
  total: number
  caption: string
  start: () => void
  stop: () => void
  togglePause: () => void
}

const TourCtx = createContext<TourApi | null>(null)
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

export function TourProvider({ children }: { children: ReactNode }) {
  const app = useApp()
  const ui = useUi()
  const { t, setLang, lang } = useT()
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [step, setStep] = useState(0)
  const ctx = useRef<Ctx>({ app, ui, setLang, original: lang.code })
  ctx.current = { app, ui, setLang, original: ctx.current.original }
  const runId = useRef(0)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  const wait = useCallback(async (ms: number, id: number) => {
    let elapsed = 0
    while (elapsed < ms && runId.current === id) {
      await sleep(100)
      if (!pausedRef.current) elapsed += 100
    }
  }, [])

  const stop = useCallback(() => {
    runId.current++
    setRunning(false)
    setPaused(false)
    ctx.current.ui.closeModal()
    ctx.current.setLang(ctx.current.original)
  }, [])

  const start = useCallback(async () => {
    const id = ++runId.current
    ctx.current.original = lang.code
    setRunning(true)
    setPaused(false)
    setStep(0)
    if (!ctx.current.app.user) {
      await ctx.current.app.signUp({
        name: 'Demo',
        email: 'demo@arraigo.demo',
        barrioId: VEGUETA,
        plant: 'palmera',
        password: 'arraigo-demo',
      })
      await sleep(1200)
    }
    while (runId.current === id) {
      for (let i = 0; i < STEPS.length; i++) {
        if (runId.current !== id) return
        setStep(i)
        STEPS[i].run(ctx.current)
        await wait(STEPS[i].ms, id)
      }
    }
  }, [lang.code, wait])

  // Con ?demo=1 en el enlace el recorrido arranca solo, útil para enseñarlo sin tocar nada.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('demo') !== '1') return
    const id = window.setTimeout(() => start(), 2500)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sin panel encima: el recorrido se detiene cuando alguien toca la pantalla o pulsa una tecla.
  useEffect(() => {
    if (!running) return
    const halt = () => stop()
    window.addEventListener('pointerdown', halt, true)
    window.addEventListener('keydown', halt, true)
    return () => {
      window.removeEventListener('pointerdown', halt, true)
      window.removeEventListener('keydown', halt, true)
    }
  }, [running, stop])

  const api = useMemo<TourApi>(
    () => ({
      running,
      paused,
      step,
      total: STEPS.length,
      caption: t(STEPS[step]?.key ?? 'tour.s1'),
      start,
      stop,
      togglePause: () => setPaused((p) => !p),
    }),
    [running, paused, step, t, start, stop],
  )

  return <TourCtx.Provider value={api}>{children}</TourCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTour() {
  const ctx = useContext(TourCtx)
  if (!ctx) throw new Error('useTour fuera del proveedor')
  return ctx
}
