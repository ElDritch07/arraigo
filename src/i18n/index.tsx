import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ar } from './ar'
import { de } from './de'
import { en } from './en'
import { es, type Dict, type Key } from './es'
import { fr } from './fr'
import { hi } from './hi'
import { zh } from './zh'

export type Lang = 'es' | 'en' | 'ar' | 'fr' | 'de' | 'zh' | 'hi'

export interface LangInfo {
  code: string
  label: string
  dir: 'ltr' | 'rtl'
  speech: string
  intl: string
}

// Nombres en su propio idioma. Se eligen lenguas de las comunidades con más presencia en la isla.
export const LANGS: LangInfo[] = [
  { code: 'es', label: 'Español', dir: 'ltr', speech: 'es-ES', intl: 'es-ES' },
  { code: 'en', label: 'English', dir: 'ltr', speech: 'en-GB', intl: 'en-GB' },
  { code: 'ar', label: 'العربية', dir: 'rtl', speech: 'ar-SA', intl: 'ar' },
  { code: 'fr', label: 'Français', dir: 'ltr', speech: 'fr-FR', intl: 'fr-FR' },
  { code: 'de', label: 'Deutsch', dir: 'ltr', speech: 'de-DE', intl: 'de-DE' },
  { code: 'zh', label: '中文', dir: 'ltr', speech: 'zh-CN', intl: 'zh-CN' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr', speech: 'hi-IN', intl: 'hi-IN' },
]

export interface ExtraLang {
  code: string
  label: string
  rtl?: boolean
  /** Falso si el traductor del navegador no la ofrece: solo se puede pedir. */
  translatable: boolean
}

// Idiomas que se pueden añadir con el botón "+". Los marcados como no traducibles quedan como petición.
export const EXTRA_LANGS: ExtraLang[] = [
  { code: 'it', label: 'Italiano', translatable: true },
  { code: 'pt', label: 'Português', translatable: true },
  { code: 'ro', label: 'Română', translatable: true },
  { code: 'ru', label: 'Русский', translatable: true },
  { code: 'uk', label: 'Українська', translatable: true },
  { code: 'nl', label: 'Nederlands', translatable: true },
  { code: 'pl', label: 'Polski', translatable: true },
  { code: 'tr', label: 'Türkçe', translatable: true },
  { code: 'ja', label: '日本語', translatable: true },
  { code: 'ko', label: '한국어', translatable: true },
  { code: 'bn', label: 'বাংলা', translatable: true },
  { code: 'vi', label: 'Tiếng Việt', translatable: true },
  { code: 'th', label: 'ไทย', translatable: true },
  { code: 'el', label: 'Ελληνικά', translatable: true },
  { code: 'wo', label: 'Wolof', translatable: false },
  { code: 'zgh', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ (Tamazight)', translatable: false },
  { code: 'ur', label: 'اردو', rtl: true, translatable: false },
  { code: 'fa', label: 'فارسی', rtl: true, translatable: false },
]

const DICTS: Record<Lang, Dict> = { es, en, ar, fr, de, zh, hi }
const STORAGE_KEY = 'participa-gc:lang'
const CUSTOM_KEY = 'participa-gc:lang-custom'

export type Params = Record<string, string | number>

interface I18nApi {
  lang: LangInfo
  setLang: (code: string) => void
  /** Idiomas añadidos con traducción automática en este dispositivo. */
  customCodes: string[]
  addCustomLanguage: (code: string, dict: Dict) => void
  t: (key: Key, params?: Params) => string
  /** Texto a partir de una clave dinámica (por ejemplo 'status.review'). */
  td: (key: string, params?: Params) => string
  fullDate: (iso: string) => string
  dayMonth: (iso: string) => { day: number; month: string }
}

const Ctx = createContext<I18nApi | null>(null)

function loadCustom(): Record<string, Dict> {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // sin almacenamiento
  }
  return {}
}

function initialLang(custom: Record<string, Dict>): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (saved in DICTS || saved in custom)) return saved
  } catch {
    // sin almacenamiento
  }
  return 'es'
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function infoFor(code: string): LangInfo {
  const base = LANGS.find((l) => l.code === code)
  if (base) return base
  const extra = EXTRA_LANGS.find((l) => l.code === code)
  return {
    code,
    label: extra?.label ?? code,
    dir: extra?.rtl ? 'rtl' : 'ltr',
    speech: code,
    intl: code,
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [custom, setCustom] = useState<Record<string, Dict>>(loadCustom)
  const [code, setCode] = useState<string>(() => initialLang(loadCustom()))
  const lang = useMemo(() => infoFor(code), [code])

  useEffect(() => {
    document.documentElement.lang = lang.code
    document.documentElement.dir = lang.dir
    try {
      localStorage.setItem(STORAGE_KEY, lang.code)
    } catch {
      // sin almacenamiento
    }
  }, [lang])

  const td = useCallback(
    (key: string, params?: Params) => {
      const dict = ((DICTS as Record<string, Dict>)[code] ?? custom[code] ?? es) as Record<string, string>
      let text = dict[key] ?? (es as Record<string, string>)[key] ?? key
      if (params) for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v))
      return text
    },
    [code, custom],
  )

  const addCustomLanguage = useCallback((c: string, dict: Dict) => {
    setCustom((prev) => {
      const next = { ...prev, [c]: dict }
      try {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(next))
      } catch {
        // sin almacenamiento
      }
      return next
    })
  }, [])

  const api = useMemo<I18nApi>(() => {
    const locale = `${lang.intl}-u-nu-latn`
    let full: Intl.DateTimeFormat
    let month: Intl.DateTimeFormat
    try {
      full = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' })
      month = new Intl.DateTimeFormat(locale, { month: 'short' })
    } catch {
      full = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
      month = new Intl.DateTimeFormat('es-ES', { month: 'short' })
    }
    return {
      lang,
      setLang: setCode,
      customCodes: Object.keys(custom),
      addCustomLanguage,
      t: td as I18nApi['t'],
      td,
      fullDate: (iso) => full.format(parseIso(iso)),
      dayMonth: (iso) => ({ day: parseIso(iso).getDate(), month: month.format(parseIso(iso)) }),
    }
  }, [lang, td, custom, addCustomLanguage])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useT fuera del proveedor')
  return ctx
}
