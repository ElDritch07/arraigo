import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EXTRA_LANGS, useT, type ExtraLang } from '../i18n'
import { es, type Dict } from '../i18n/es'
import { normalize } from '../state/hooks'
import { Modal } from './Modal'
import { fieldClass } from './ui'

interface TranslatorInstance {
  translate: (text: string) => Promise<string>
}
interface TranslatorStatic {
  availability: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<string>
  create: (o: {
    sourceLanguage: string
    targetLanguage: string
    monitor?: (m: EventTarget) => void
  }) => Promise<TranslatorInstance>
}

const REQUESTS_KEY = 'participa-gc:lang-requests'

// Algunos navegadores no responden nunca: se corta la espera y se trata como no disponible.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        window.clearTimeout(id)
        resolve(v)
      },
      (e) => {
        window.clearTimeout(id)
        reject(e)
      },
    )
  })
}

function readRequests(): string[] {
  try {
    return JSON.parse(localStorage.getItem(REQUESTS_KEY) ?? '[]')
  } catch {
    return []
  }
}

// Protege los marcadores {n} para que el traductor no los cambie.
function protect(text: string) {
  const tokens: string[] = []
  const safe = text.replace(/\{[a-zA-Z]+\}/g, (m) => {
    tokens.push(m)
    return `X${tokens.length - 1}X`
  })
  return { safe, tokens }
}
function restore(text: string, tokens: string[]) {
  let out = text
  for (let i = 0; i < tokens.length; i++) out = out.split(`X${i}X`).join(tokens[i])
  return tokens.every((t) => out.includes(t)) ? out : null
}

// Con el traductor del navegador (en el propio dispositivo) cualquier idioma disponible se añade al momento.
export function MoreLanguages({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang, customCodes, addCustomLanguage } = useT()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [requested, setRequested] = useState<string[]>(readRequests)

  const list = useMemo(() => {
    const q = normalize(query.trim())
    return EXTRA_LANGS.filter((l) => !q || normalize(l.label).includes(q) || l.code.includes(q))
  }, [query])

  const request = (l: ExtraLang) => {
    const next = [...new Set([...requested, l.code])]
    setRequested(next)
    try {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(next))
    } catch {
      // sin almacenamiento
    }
    setMessage(t('lang.more.unavailable'))
  }

  const choose = async (l: ExtraLang) => {
    if (customCodes.includes(l.code)) {
      setLang(l.code)
      onClose()
      return
    }
    const T = (window as unknown as { Translator?: TranslatorStatic }).Translator
    if (!l.translatable || !T) return request(l)
    setBusy(l.code)
    setProgress(0)
    setMessage('')
    try {
      const status = await withTimeout(T.availability({ sourceLanguage: 'es', targetLanguage: l.code }), 4000)
      if (status === 'unavailable') {
        setBusy(null)
        return request(l)
      }
      const translator = await withTimeout(T.create({ sourceLanguage: 'es', targetLanguage: l.code }), 20000)
      const entries = Object.entries(es as Record<string, string>)
      const out: Record<string, string> = {}
      let done = 0
      for (let i = 0; i < entries.length; i += 6) {
        await Promise.all(
          entries.slice(i, i + 6).map(async ([key, text]) => {
            const { safe, tokens } = protect(text)
            try {
              const translated = await withTimeout(translator.translate(safe), 8000)
              out[key] = restore(translated, tokens) ?? text
            } catch {
              out[key] = text
            }
            done += 1
            setProgress(Math.round((done / entries.length) * 100))
          }),
        )
      }
      addCustomLanguage(l.code, out as unknown as Dict)
      setLang(l.code)
      setBusy(null)
      onClose()
    } catch {
      setBusy(null)
      request(l)
    }
  }

  return (
    <Modal title={t('lang.more.title')} onClose={onClose}>
      <div className="p-5">
        <p className="mb-3 text-base text-muted">{t('lang.more.text')}</p>
        <label className="relative mb-3 block">
          <span className="sr-only">{t('lang.more.search')}</span>
          <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('lang.more.search')}
            className={`${fieldClass} ps-10`}
          />
        </label>
        <p role="status" className="mb-2 min-h-6 text-sm font-medium text-accent-strong">
          {busy ? t('lang.more.translating', { n: progress }) : message}
        </p>
        {list.length === 0 ? (
          <p className="py-4 text-center text-base text-muted">{t('lang.more.none')}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {list.map((l) => {
              const added = customCodes.includes(l.code)
              const asked = requested.includes(l.code)
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    lang={l.code}
                    dir={l.rtl ? 'rtl' : 'ltr'}
                    disabled={busy !== null}
                    onClick={() => choose(l)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-control border border-line px-4 text-start text-base font-medium hover:bg-canvas disabled:opacity-60"
                  >
                    <span>{l.label}</span>
                    <span className="flex items-center gap-1 text-sm font-normal text-muted">
                      {lang.code === l.code && <Check size={16} aria-hidden />}
                      {asked && !added ? t('lang.more.requested') : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted">{t('lang.more.auto')}</p>
      </div>
    </Modal>
  )
}
