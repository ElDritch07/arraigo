import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useT } from '../i18n'
import type { EventStatus } from '../lib/types'

const ORDER: EventStatus[] = ['presented', 'review', 'approved', 'ongoing', 'finished']

// Seguimiento del estado: cada paso hecho se rellena con animación y el actual queda marcado con texto y anillo.
export function StatusTrack({ status }: { status: EventStatus }) {
  const { td } = useT()
  const current = ORDER.indexOf(status)
  return (
    <ol className="flex items-start">
      {ORDER.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s} aria-current={active ? 'step' : undefined} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
            {i < ORDER.length - 1 && (
              <span className="absolute start-1/2 top-3 h-0.5 w-full bg-line" aria-hidden="true">
                <motion.span
                  className="block h-full origin-left bg-accent rtl:origin-right"
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                />
              </span>
            )}
            <motion.span
              className={`relative z-10 flex size-6 items-center justify-center rounded-full border-2 text-white ${
                done || active ? 'border-accent bg-accent' : 'border-ink/30 bg-surface'
              } ${active ? 'ring-4 ring-accent-soft' : ''}`}
              initial={false}
              animate={{ scale: active ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              {done && <Check size={14} aria-hidden />}
            </motion.span>
            <span className={`text-[13px] leading-tight ${active ? 'font-semibold text-ink' : 'text-muted'}`}>
              {td(`status.${s}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
