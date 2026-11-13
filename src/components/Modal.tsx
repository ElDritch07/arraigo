import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { IconButton } from './ui'

interface Props {
  title: string
  onClose: () => void
  variant?: 'sheet' | 'full'
  children: ReactNode
  hideHeader?: boolean
}

// Diálogo accesible: el fondo queda inerte (lo marca el Shell), Escape cierra y el foco vuelve a donde estaba.
export function Modal({ title, onClose, variant = 'sheet', children, hideHeader }: Props) {
  const { t } = useT()
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const target = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current
    target?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  const root = document.getElementById('modal-root')
  if (!root) return null

  const panelClass =
    variant === 'full'
      ? 'h-full w-full md:h-[92dvh] md:max-w-[34rem] md:rounded-card'
      : 'max-h-[92dvh] w-full rounded-t-card md:max-w-[30rem] md:rounded-card'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <motion.div
        className="absolute inset-0 bg-ink/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex flex-col overflow-hidden bg-surface shadow-card outline-none ${panelClass}`}
        initial={{ y: '100%', opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        {!hideHeader && (
          <div className="flex items-center justify-between gap-2 border-b border-line ps-5 pe-2 py-1.5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <IconButton label={t('common.close')} onClick={onClose} data-autofocus>
              <X size={22} aria-hidden />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </motion.div>
    </div>,
    root,
  )
}
