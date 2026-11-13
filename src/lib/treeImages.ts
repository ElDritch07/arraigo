import type { Species } from './types'

export interface TreeColors {
  leaf: string
  leafDark: string
  trunk: string
  bloom: string
  berry: string
}

export const W = 120
export const H = 112

const TRUNK = [0, 0, 0.55, 0.7, 0.85, 1]

// Iconos del mapa: cada especie en cada fase de crecimiento (0 semilla ... 5 en flor), con las mismas formas que Plant.tsx.
export function treeImage(species: Species, stage: number, c: TreeColors): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const fill = (d: string, color: string) => {
    ctx.fillStyle = color
    ctx.fill(new Path2D(d))
  }
  const dot = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const line = (x0: number, y0: number, x1: number, y1: number, color: string, w: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
  // Dibuja algo que crece hacia arriba desde el suelo escalándolo en vertical.
  const grow = (s: number, baseY: number, draw: () => void) => {
    ctx.save()
    ctx.translate(0, baseY)
    ctx.scale(1, s)
    ctx.translate(0, -baseY)
    draw()
    ctx.restore()
  }
  const lift = (dy: number, draw: () => void) => {
    ctx.save()
    ctx.translate(0, dy)
    draw()
    ctx.restore()
  }

  ctx.fillStyle = 'rgba(23,35,28,0.22)'
  ctx.beginPath()
  ctx.ellipse(60, 105, 28, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  if (stage === 0) {
    ctx.fillStyle = c.trunk
    ctx.beginPath()
    ctx.ellipse(60, 102, 7, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()
    return ctx.getImageData(0, 0, W, H)
  }
  if (stage === 1) {
    line(60, 104, 60, 86, c.leafDark, 2.4)
    fill('M60 94 C50 92 46 86 48 80 C56 82 60 88 60 94Z', c.leaf)
    fill('M60 91 C70 89 74 83 72 77 C64 79 60 85 60 91Z', c.leafDark)
    return ctx.getImageData(0, 0, W, H)
  }

  if (species === 'drago') {
    const s = TRUNK[stage]
    const dy = 38 * (1 - s)
    grow(s, 104, () => fill('M54 104 C56 90 55 76 56 66 L64 66 C65 76 64 90 66 104Z', c.trunk))
    lift(dy, () => {
      if (stage >= 3) {
        line(57, 72, 46, 62, c.trunk, 3)
        fill('M46 62 C34 62 30 52 36 46 C40 52 44 52 46 50 C48 52 52 52 56 46 C60 52 58 62 46 62Z', c.leafDark)
      }
      if (stage >= 4) {
        line(63, 72, 74, 62, c.trunk, 3)
        fill('M74 62 C86 62 90 52 84 46 C80 52 76 52 74 50 C72 52 68 52 64 46 C60 52 62 62 74 62Z', c.leafDark)
      }
      fill('M60 68 C40 66 32 54 40 44 C46 52 54 52 60 46 C66 52 74 52 80 44 C88 54 80 66 60 68Z', c.leaf)
      if (stage >= 5) for (const [x, y] of [[52, 52], [68, 52], [60, 43], [41, 50], [80, 50]]) dot(x, y, 3.2, c.berry)
    })
  } else if (species === 'pino') {
    grow(TRUNK[stage] > 0 ? [0, 0, 0.55, 0.75, 0.9, 1][stage] : 0, 104, () => fill('M57.5 104 L58 34 L62 34 L62.5 104Z', c.trunk))
    fill('M60 62 C48 72 38 84 30 98 C44 95 52 94 60 94 C68 94 76 95 90 98 C82 84 72 72 60 62Z', c.leafDark)
    if (stage >= 3) fill('M60 46 C50 56 42 66 36 78 C46 76 53 75 60 75 C67 75 74 76 84 78 C78 66 70 56 60 46Z', c.leaf)
    if (stage >= 4) fill('M60 30 C53 40 47 48 43 58 C50 57 55 56 60 56 C65 56 70 57 77 58 C73 48 67 40 60 30Z', c.leafDark)
    if (stage >= 5) for (const [x, y] of [[49, 90], [72, 88], [55, 72], [66, 70]]) {
      ctx.fillStyle = c.trunk
      ctx.beginPath()
      ctx.ellipse(x, y, 3, 4.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (species === 'palmera') {
    const s = TRUNK[stage]
    const dy = 46 * (1 - s)
    grow(s, 104, () => fill('M56 104 C58 88 54 74 58 58 L64 58 C60 76 64 90 66 104Z', c.trunk))
    lift(dy, () => {
      if (stage >= 4) {
        fill('M61 58 C46 56 34 64 30 76 C40 68 52 64 61 58Z', c.leafDark)
        fill('M61 58 C76 56 88 64 92 76 C82 68 70 64 61 58Z', c.leafDark)
      }
      fill('M61 58 C50 44 34 44 24 56 C38 50 50 54 61 58Z', c.leaf)
      fill('M61 58 C72 44 88 44 98 56 C84 50 72 54 61 58Z', c.leaf)
      if (stage >= 3) fill('M61 58 C56 44 58 32 62 24 C66 32 68 44 61 58Z', c.leafDark)
      if (stage >= 5) for (const [x, y] of [[57, 62], [63, 64], [60, 69]]) dot(x, y, 3.4, c.berry)
    })
  } else {
    fill('M60 104 C48 98 34 98 24 106 C38 108 52 108 60 104Z', c.leafDark)
    fill('M60 104 C72 98 86 98 96 106 C82 108 68 108 60 104Z', c.leafDark)
    fill('M60 104 C50 92 40 88 32 92 C40 100 52 104 60 104Z', c.leaf)
    fill('M60 104 C70 92 80 88 88 92 C80 100 68 104 60 104Z', c.leaf)
    const s = [0, 0, 0, 0.45, 0.8, 1][stage]
    if (stage >= 3) grow(s, 102, () => fill('M58.5 102 L59 52 L61 52 L61.5 102Z', c.leafDark))
    if (stage >= 4) lift(50 * (1 - s), () => fill('M60 36 C51 48 52 66 56 76 L64 76 C68 66 69 48 60 36Z', c.bloom))
    if (stage >= 5) for (const [x, y] of [[57, 52], [63, 58], [58, 64]]) dot(x, y, 2, c.berry)
  }
  return ctx.getImageData(0, 0, W, H)
}
