import { Mic, Send, Volume2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useT } from '../i18n'
import type { Key } from '../i18n/es'
import { useApp } from '../state/app'
import { normalize, useZoneName } from '../state/hooks'
import { useUi } from '../state/ui'
import { DropletIcon } from './DropletIcon'
import { Modal } from './Modal'
import { IconButton, fieldClass } from './ui'

type Intent = 'create' | 'events' | 'vol' | 'mail' | 'points' | 'plant'

// 'create' va primero porque "crear un evento" también contiene "evento".
const ORDER: Intent[] = ['create', 'vol', 'mail', 'points', 'plant', 'events']

interface Message {
  id: number
  from: 'bot' | 'user'
  text: string
}

interface Recognition {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function getRecognition(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const CHIPS: { intent: Intent; label: Key }[] = [
  { intent: 'events', label: 'as.q.events' },
  { intent: 'create', label: 'as.q.create' },
  { intent: 'vol', label: 'as.q.vol' },
  { intent: 'mail', label: 'as.q.mail' },
  { intent: 'points', label: 'as.q.points' },
  { intent: 'plant', label: 'as.q.plant' },
]

export function Assistant() {
  const { t, td, lang } = useT()
  const { user, byId } = useApp()
  const { closeModal, openModal, setTab, selectBarrio, modal } = useUi()
  const demo = modal?.type === 'assistant' && !!modal.demo
  const currentZone = useZoneName()
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: 'bot', text: t('as.greeting') }])
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [speakAll, setSpeakAll] = useState(false)
  const [note, setNote] = useState('')
  const recRef = useRef<Recognition | null>(null)
  const log = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)
  const canListen = !!getRecognition()

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => recRef.current?.stop(), [])

  const speak = (message: string) => {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(message)
    u.lang = lang.speech
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  const detect = (input: string): Intent | null => {
    const n = normalize(input)
    for (const intent of ORDER) {
      const words = td(`as.kw.${intent}`)
        .split(',')
        .map((w) => normalize(w.trim()))
        .filter(Boolean)
      if (words.some((w) => n.includes(w))) return intent
    }
    return null
  }

  const run = (intent: Intent, zone: string) => {
    const own = user ? byId.get(user.barrioId) : null
    const goOwn = () => own && selectBarrio(own.id, own.municipioId ?? '')
    const finish = (delay = 1700) => window.setTimeout(closeModal, delay)
    switch (intent) {
      case 'events':
        goOwn()
        setTab('events')
        finish()
        return t('as.a.events', { zone })
      case 'create':
        if (!user) {
          window.setTimeout(() => openModal({ type: 'auth' }), 1700)
          return t('as.a.account')
        }
        window.setTimeout(() => openModal({ type: 'create' }), 1500)
        return t('as.a.create')
      case 'vol':
        goOwn()
        setTab('volunteer')
        finish()
        return t('as.a.vol', { zone })
      case 'mail':
        setTab('mailbox')
        finish()
        return t('as.a.mail')
      case 'points':
        goOwn()
        setTab('points')
        finish()
        return t('as.a.points', { zone })
      case 'plant':
        setTab('profile')
        finish(2600)
        return t('as.a.plant')
    }
  }

  const handle = (input: string, forced?: Intent, viaVoice = false) => {
    const value = input.trim()
    if (!value) return
    const intent = forced ?? detect(value)
    const own = user ? byId.get(user.barrioId)?.name : null
    const zone = own ?? currentZone
    const answer = intent ? run(intent, zone) : /ayuda|help|aide|hilfe|مساعدة|帮助|मदद/i.test(value) ? t('as.a.help') : t('as.a.unknown')
    setMessages((m) => [
      ...m,
      { id: nextId.current++, from: 'user', text: value },
      { id: nextId.current++, from: 'bot', text: answer },
    ])
    if (viaVoice || speakAll) speak(answer)
  }

  const handleRef = useRef(handle)
  handleRef.current = handle

  // En el modo presentación Gotita recibe una pregunta escrita letra a letra, como si alguien la tecleara.
  useEffect(() => {
    if (!demo) return
    const phrase = t('as.q.vol')
    const timers: number[] = []
    for (let i = 1; i <= phrase.length; i++) timers.push(window.setTimeout(() => setText(phrase.slice(0, i)), 1200 + i * 70))
    timers.push(
      window.setTimeout(() => {
        setText('')
        handleRef.current(phrase, 'vol')
      }, 1600 + phrase.length * 70),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    handle(text)
    setText('')
  }

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const Ctor = getRecognition()
    if (!Ctor) {
      setNote(t('as.nomic'))
      return
    }
    const rec = new Ctor()
    rec.lang = lang.speech
    rec.interimResults = false
    rec.onresult = (ev) => handle(ev.results[0][0].transcript, undefined, true)
    rec.onend = () => setListening(false)
    rec.onerror = () => {
      setListening(false)
      setNote(t('as.nomic'))
    }
    recRef.current = rec
    setNote('')
    setListening(true)
    rec.start()
  }

  return (
    <Modal title={t('as.title')} onClose={closeModal}>
      <div className="flex h-[70dvh] flex-col">
        <div ref={log} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              className={`flex items-end gap-2 ${m.from === 'user' ? 'justify-end' : ''}`}
            >
              {m.from === 'bot' && (
                <span className="shrink-0">
                  <DropletIcon size={36} />
                </span>
              )}
              <p
                className={`max-w-[80%] rounded-control px-3 py-2 text-base ${
                  m.from === 'bot' ? 'bg-water-soft text-ink' : 'bg-accent text-white'
                }`}
              >
                <span className="sr-only">{m.from === 'bot' ? `${t('as.name')}: ` : `${t('common.you')}: `}</span>
                {m.text}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="border-t border-line p-3">
          <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3" role="group" aria-label={t('as.title')}>
            {CHIPS.map((c) => (
              <button
                key={c.intent}
                type="button"
                onClick={() => handle(t(c.label), c.intent)}
                className="min-h-11 shrink-0 rounded-control border border-line bg-surface px-3 text-base font-medium hover:bg-canvas"
              >
                {t(c.label)}
              </button>
            ))}
          </div>

          <label className="mb-3 flex min-h-11 cursor-pointer items-center gap-2 text-base">
            <input
              type="checkbox"
              checked={speakAll}
              onChange={(e) => setSpeakAll(e.target.checked)}
              className="size-5 accent-[var(--color-accent)]"
            />
            <Volume2 size={18} aria-hidden />
            {t('as.speak')}
          </label>

          <form onSubmit={submit} className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t('as.placeholder')}</span>
              <input
                className={fieldClass}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={listening ? t('as.listening') : t('as.placeholder')}
                data-autofocus
              />
            </label>
            <IconButton
              label={listening ? t('as.mic.stop') : t('as.mic')}
              aria-pressed={listening}
              onClick={toggleMic}
              className={`border ${listening ? 'border-water bg-water text-white hover:bg-water' : 'border-line'}`}
            >
              <Mic size={22} aria-hidden />
            </IconButton>
            <IconButton label={t('as.send')} type="submit" className="bg-accent text-white hover:bg-accent-strong">
              <Send size={20} className="rtl:-scale-x-100" aria-hidden />
            </IconButton>
          </form>
          {(note || !canListen) && (
            <p role="status" className="mt-2 text-sm text-muted">
              {note || t('as.nomic')}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
