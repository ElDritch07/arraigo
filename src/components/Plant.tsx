import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Species } from '../lib/types'

const SPRING = { type: 'spring', stiffness: 150, damping: 13 } as const

interface PartProps {
  show: boolean
  delay?: number
  origin?: string
  y?: number
  children: ReactNode
}

// Cada pieza de la planta aparece con un resorte desde su base, lo que da la sensación de brotar.
function Part({ show, delay = 0, origin = '50% 100%', y = 0, children }: PartProps) {
  return (
    <motion.g
      initial={false}
      animate={{ scale: show ? 1 : 0, opacity: show ? 1 : 0, y }}
      transition={{ ...SPRING, delay }}
      style={{ transformBox: 'fill-box', transformOrigin: origin }}
    >
      {children}
    </motion.g>
  )
}

function Grow({ scale, children, d, className }: { scale: number; children?: ReactNode; d: string; className: string }) {
  return (
    <motion.path
      d={d}
      className={className}
      initial={false}
      animate={{ scaleY: scale }}
      transition={SPRING}
      style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
    >
      {children}
    </motion.path>
  )
}

const TRUNK_SCALE = [0, 0, 0.55, 0.7, 0.85, 1]

function Drago({ stage }: { stage: number }) {
  const s = TRUNK_SCALE[stage]
  const dy = 38 * (1 - s)
  return (
    <>
      <Grow d="M54 104 C56 90 55 76 56 66 L64 66 C65 76 64 90 66 104Z" className="fill-trunk" scale={stage >= 2 ? s : 0} />
      <Part show={stage >= 2} y={dy}>
        <path
          d="M60 68 C40 66 32 54 40 44 C46 52 54 52 60 46 C66 52 74 52 80 44 C88 54 80 66 60 68Z"
          className="fill-leaf"
        />
      </Part>
      <Part show={stage >= 3} y={dy} delay={0.1}>
        <path d="M57 72 L46 62" className="stroke-trunk" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path
          d="M46 62 C34 62 30 52 36 46 C40 52 44 52 46 50 C48 52 52 52 56 46 C60 52 58 62 46 62Z"
          className="fill-leaf-dark"
        />
      </Part>
      <Part show={stage >= 4} y={dy} delay={0.2}>
        <path d="M63 72 L74 62" className="stroke-trunk" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path
          d="M74 62 C86 62 90 52 84 46 C80 52 76 52 74 50 C72 52 68 52 64 46 C60 52 62 62 74 62Z"
          className="fill-leaf-dark"
        />
      </Part>
      <Part show={stage >= 5} y={dy} delay={0.3} origin="50% 50%">
        {[
          [52, 52],
          [68, 52],
          [60, 43],
          [41, 50],
          [80, 50],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" className="fill-berry" />
        ))}
      </Part>
    </>
  )
}

function Pino({ stage }: { stage: number }) {
  const trunk = [0, 0, 0.55, 0.75, 0.9, 1][stage]
  return (
    <>
      <Grow d="M57.5 104 L58 34 L62 34 L62.5 104Z" className="fill-trunk" scale={stage >= 2 ? trunk : 0} />
      <Part show={stage >= 2}>
        <path
          d="M60 62 C48 72 38 84 30 98 C44 95 52 94 60 94 C68 94 76 95 90 98 C82 84 72 72 60 62Z"
          className="fill-leaf-dark"
        />
      </Part>
      <Part show={stage >= 3} delay={0.1}>
        <path
          d="M60 46 C50 56 42 66 36 78 C46 76 53 75 60 75 C67 75 74 76 84 78 C78 66 70 56 60 46Z"
          className="fill-leaf"
        />
      </Part>
      <Part show={stage >= 4} delay={0.2}>
        <path
          d="M60 30 C53 40 47 48 43 58 C50 57 55 56 60 56 C65 56 70 57 77 58 C73 48 67 40 60 30Z"
          className="fill-leaf-dark"
        />
      </Part>
      <Part show={stage >= 5} delay={0.3} origin="50% 50%">
        {[
          [49, 90],
          [72, 88],
          [55, 72],
          [66, 70],
        ].map(([cx, cy]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="3" ry="4.5" className="fill-trunk" />
        ))}
      </Part>
    </>
  )
}

function Palmera({ stage }: { stage: number }) {
  const s = TRUNK_SCALE[stage]
  const dy = 46 * (1 - s)
  return (
    <>
      <Grow d="M56 104 C58 88 54 74 58 58 L64 58 C60 76 64 90 66 104Z" className="fill-trunk" scale={stage >= 2 ? s : 0} />
      <Part show={stage >= 2} y={dy} origin="100% 100%">
        <path d="M61 58 C50 44 34 44 24 56 C38 50 50 54 61 58Z" className="fill-leaf" />
      </Part>
      <Part show={stage >= 2} y={dy} origin="0% 100%" delay={0.05}>
        <path d="M61 58 C72 44 88 44 98 56 C84 50 72 54 61 58Z" className="fill-leaf" />
      </Part>
      <Part show={stage >= 3} y={dy} delay={0.1}>
        <path d="M61 58 C56 44 58 32 62 24 C66 32 68 44 61 58Z" className="fill-leaf-dark" />
      </Part>
      <Part show={stage >= 4} y={dy} origin="100% 0%" delay={0.15}>
        <path d="M61 58 C46 56 34 64 30 76 C40 68 52 64 61 58Z" className="fill-leaf-dark" />
      </Part>
      <Part show={stage >= 4} y={dy} origin="0% 0%" delay={0.2}>
        <path d="M61 58 C76 56 88 64 92 76 C82 68 70 64 61 58Z" className="fill-leaf-dark" />
      </Part>
      <Part show={stage >= 5} y={dy} delay={0.3} origin="50% 50%">
        {[
          [57, 62],
          [63, 64],
          [60, 69],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" className="fill-berry" />
        ))}
      </Part>
    </>
  )
}

function Tajinaste({ stage }: { stage: number }) {
  const s = [0, 0, 0, 0.45, 0.8, 1][stage]
  return (
    <>
      <Part show={stage >= 2} origin="100% 100%">
        <path d="M60 104 C48 98 34 98 24 106 C38 108 52 108 60 104Z" className="fill-leaf-dark" />
      </Part>
      <Part show={stage >= 2} origin="0% 100%" delay={0.05}>
        <path d="M60 104 C72 98 86 98 96 106 C82 108 68 108 60 104Z" className="fill-leaf-dark" />
      </Part>
      <Part show={stage >= 2} origin="100% 100%" delay={0.1}>
        <path d="M60 104 C50 92 40 88 32 92 C40 100 52 104 60 104Z" className="fill-leaf" />
      </Part>
      <Part show={stage >= 2} origin="0% 100%" delay={0.15}>
        <path d="M60 104 C70 92 80 88 88 92 C80 100 68 104 60 104Z" className="fill-leaf" />
      </Part>
      <Grow d="M58.5 102 L59 52 L61 52 L61.5 102Z" className="fill-leaf-dark" scale={stage >= 3 ? s : 0} />
      <Part show={stage >= 4} y={50 * (1 - s)} delay={0.1}>
        <path d="M60 36 C51 48 52 66 56 76 L64 76 C68 66 69 48 60 36Z" className="fill-bloom" />
      </Part>
      <Part show={stage >= 5} y={0} delay={0.3} origin="50% 50%">
        {[
          [57, 52],
          [63, 58],
          [58, 64],
          [62, 46],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" className="fill-berry" />
        ))}
      </Part>
    </>
  )
}

const ART = { drago: Drago, pino: Pino, palmera: Palmera, tajinaste: Tajinaste } as const

export function Plant({
  species,
  stage,
  size = 120,
  idle = false,
  label,
}: {
  species: Species
  stage: number
  size?: number
  idle?: boolean
  label?: string
}) {
  const Art = ART[species]
  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="overflow-visible"
    >
      <ellipse cx="60" cy="107" rx="40" ry="8" className="fill-soil" />
      <ellipse cx="60" cy="105" rx="34" ry="5.5" className="fill-trunk" opacity="0.55" />
      <motion.g
        animate={idle ? { rotate: [-1.6, 1.6, -1.6] } : { rotate: 0 }}
        transition={idle ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{ transformOrigin: '60px 104px' }}
      >
        <Part show={stage === 0} origin="50% 50%">
          <ellipse cx="60" cy="102" rx="7" ry="4.5" className="fill-trunk" />
          <path d="M56 100 C58 98 61 98 63 99" className="stroke-soil" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </Part>
        <Part show={stage === 1}>
          <path d="M60 104 C60 98 60 92 60 86" className="stroke-leaf-dark" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M60 94 C50 92 46 86 48 80 C56 82 60 88 60 94Z" className="fill-leaf" />
          <path d="M60 91 C70 89 74 83 72 77 C64 79 60 85 60 91Z" className="fill-leaf-dark" />
        </Part>
        <Art stage={stage} />
      </motion.g>
    </svg>
  )
}
