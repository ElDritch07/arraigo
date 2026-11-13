import type { Geometry } from 'geojson'
import { hash } from './hash'
import { SPECIES } from './plants'
import type { Bbox, Species, TerritoryCollection } from './types'
import { bboxOf } from './geo'

export interface Tree {
  id: string
  barrioId: string
  coordinates: [number, number]
  species: Species
  /** Fase de crecimiento: 0 semilla, 1 brote ... 5 en flor. */
  stage: number
  mine?: boolean
  sapling?: boolean
}

type Ring = number[][]

/** Árboles de ejemplo (otras personas) que hay en un barrio. */
export const baseCount = (barrioId: string) => hash(`${barrioId}:pl`) % 9

// Mezcla de fases para que el bosque tenga árboles de todas las edades.
const STAGES = [1, 2, 2, 3, 3, 4, 4, 5]

function polygonsOf(g: Geometry): Ring[][] {
  if (g.type === 'Polygon') return [g.coordinates as Ring[]]
  if (g.type === 'MultiPolygon') return g.coordinates as Ring[][]
  return []
}

function inRing(x: number, y: number, ring: Ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function rng(seed: string) {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Shape {
  polys: Ring[][]
  bbox: Bbox
}

export function makeForest(barrios: TerritoryCollection) {
  const shapes = new Map<string, Shape>()
  for (const f of barrios.features) shapes.set(f.properties.id, { polys: polygonsOf(f.geometry), bbox: bboxOf(f.geometry) })

  // Un punto repetible dentro del barrio, para que cada árbol se quede siempre en su sitio.
  const pointFor = (barrioId: string, key: string): [number, number] => {
    const shape = shapes.get(barrioId)
    if (!shape) return [0, 0]
    const rand = rng(`${barrioId}:${key}`)
    const [x0, y0, x1, y1] = shape.bbox
    for (let i = 0; i < 80; i++) {
      const x = x0 + rand() * (x1 - x0)
      const y = y0 + rand() * (y1 - y0)
      const hit = shape.polys.some((rings) => inRing(x, y, rings[0]) && !rings.slice(1).some((h) => inRing(x, y, h)))
      if (hit) return [x, y]
    }
    return [(x0 + x1) / 2, (y0 + y1) / 2]
  }

  const base: Tree[] = []
  for (const id of shapes.keys()) {
    const n = baseCount(id)
    for (let i = 0; i < n; i++) {
      const h = hash(`${id}:tree:${i}`)
      base.push({
        id: `tree:${id}:${i}`,
        barrioId: id,
        coordinates: pointFor(id, `t${i}`),
        species: SPECIES[h % SPECIES.length],
        stage: STAGES[(h >>> 4) % STAGES.length],
      })
    }
  }
  return { pointFor, base }
}
