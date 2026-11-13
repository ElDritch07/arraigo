import { Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useT } from '../i18n'
import { useTheme } from '../state/theme'

// Cambia entre modo claro y oscuro con un toque. El icono muestra el modo al que se va a pasar.
export function ThemeButton({ className = '' }: { className?: string }) {
  const { t } = useT()
  const { resolved, toggle } = useTheme()
  const toDark = resolved === 'light'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={toDark ? t('theme.toDark') : t('theme.toLight')}
      className={`pointer-events-auto inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface text-ink shadow-card ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={toDark ? 'moon' : 'sun'}
          initial={{ rotate: -80, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 80, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="flex"
        >
          {toDark ? <Moon size={20} aria-hidden /> : <Sun size={20} aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
