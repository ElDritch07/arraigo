import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { useUi } from '../state/ui'

function ToastInner() {
  const { toast } = useUi()
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[55] flex justify-center md:bottom-8"
    >
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast}
            className="max-w-sm rounded-control bg-ink px-4 py-3 text-center text-base font-medium text-white shadow-card"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Toast() {
  const root = document.getElementById('modal-root')
  return root ? createPortal(<ToastInner />, root) : null
}
