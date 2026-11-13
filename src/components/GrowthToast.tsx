import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { useApp } from '../state/app'
import { Plant } from './Plant'
import { Button } from './ui'

function Drop({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.svg
      viewBox="0 0 12 16"
      width="14"
      height="18"
      aria-hidden="true"
      className="absolute top-0"
      style={{ insetInlineStart: `${x}%` }}
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: [-10, 70], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.1, delay, repeat: 1, repeatDelay: 0.3, ease: 'easeIn' }}
    >
      <path d="M6 1 C6 1 1 7 1 10 A5 5 0 0 0 11 10 C11 7 6 1 6 1Z" className="fill-water" />
    </motion.svg>
  )
}

// Celebración al ganar puntos: caen gotas, la planta crece de una fase a otra y sube el contador.
function GrowthInner() {
  const { growth, user, dismissGrowth } = useApp()
  const { t, td } = useT()
  const [stage, setStage] = useState(0)
  const id = growth?.id

  useEffect(() => {
    if (!growth) return
    setStage(growth.from)
    const grow = window.setTimeout(() => setStage(growth.to), 1300)
    const close = window.setTimeout(dismissGrowth, 5600)
    return () => {
      window.clearTimeout(grow)
      window.clearTimeout(close)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const grew = growth ? growth.to > growth.from : false
  const title = !growth
    ? ''
    : growth.reason === 'welcome'
      ? t('gr.title.start')
      : grew
        ? t('gr.title.grow')
        : t('gr.title.water')

  return (
    <AnimatePresence>
      {growth && user && (
        <motion.div
          key={growth.id}
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 top-[14%] z-[60] mx-auto max-w-sm rounded-card bg-surface p-5 text-center shadow-card"
          initial={{ opacity: 0, y: -24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className="relative mx-auto h-40 w-40">
            {growth.reason !== 'welcome' && (
              <>
                <Drop delay={0} x={30} />
                <Drop delay={0.25} x={50} />
                <Drop delay={0.5} x={70} />
              </>
            )}
            {grew && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-6 bottom-4 top-10 rounded-full bg-accent-soft"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.25], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1, delay: 1.3 }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-center">
              <Plant species={user.plant} stage={stage} size={138} />
            </div>
          </div>
          <h2 className="mt-2 text-xl font-semibold">{title}</h2>
          {growth.reason === 'welcome' ? (
            <p className="mt-1 text-base text-muted">{t('gr.r.welcome')}</p>
          ) : (
            <>
              <motion.p
                className="mt-2 inline-block rounded-md bg-accent-soft px-3 py-1 text-base font-semibold text-accent-strong"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.5 }}
              >
                {t('gr.points', { n: growth.points })} {td(`gr.r.${growth.reason}`)}
              </motion.p>
              {grew && (
                <motion.p
                  className="mt-2 text-base text-muted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                >
                  {t('gr.stage', { stage: td(`stage.${growth.to}`) })}
                </motion.p>
              )}
            </>
          )}
          <Button variant="secondary" className="mt-4 w-full" onClick={dismissGrowth}>
            {t('gr.close')}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function GrowthToast() {
  const root = document.getElementById('modal-root')
  return root ? createPortal(<GrowthInner />, root) : null
}
