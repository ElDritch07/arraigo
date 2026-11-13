import { Check, Plus } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { LANGS, EXTRA_LANGS, useT } from '../i18n'
import { MoreLanguages } from './MoreLanguages'

// Cada idioma se muestra en su propia lengua para que quien no lee español pueda encontrarlo.
export function LanguageChips() {
  const { lang, setLang, customCodes, t } = useT()
  const [more, setMore] = useState(false)
  const customs = customCodes.map((c) => EXTRA_LANGS.find((l) => l.code === c)).filter((l) => !!l)

  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-2 rounded-control border px-4 text-base font-medium transition-colors ${
      active ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink hover:bg-canvas'
    }`

  return (
    <>
      <div role="radiogroup" aria-label="Idioma / Language" className="flex flex-wrap gap-2">
        {LANGS.map((l) => {
          const active = l.code === lang.code
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={active}
              lang={l.code}
              dir={l.dir}
              onClick={() => setLang(l.code)}
              className={chip(active)}
            >
              {active && <Check size={16} aria-hidden />}
              {l.label}
            </button>
          )
        })}
        {customs.map((l) => {
          const active = l.code === lang.code
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={active}
              lang={l.code}
              dir={l.rtl ? 'rtl' : 'ltr'}
              onClick={() => setLang(l.code)}
              className={chip(active)}
            >
              {active && <Check size={16} aria-hidden />}
              {l.label}
            </button>
          )
        })}
        <button type="button" onClick={() => setMore(true)} className={`${chip(false)} px-3`} aria-label={t('lang.more')}>
          <Plus size={20} aria-hidden />
        </button>
      </div>
      <AnimatePresence>{more && <MoreLanguages key="more" onClose={() => setMore(false)} />}</AnimatePresence>
    </>
  )
}
