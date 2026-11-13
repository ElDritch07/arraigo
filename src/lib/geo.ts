import type { Geometry } from 'geojson'
import type { Bbox, LabelCollection, Territory, TerritoryCollection } from './types'

export function bboxOf(geometry: Geometry): Bbox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === 'number') {
      const [x, y] = c as number[]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    } else {
      for (const child of c as unknown[]) walk(child)
    }
  }
  if ('coordinates' in geometry) walk(geometry.coordinates)
  return [minX, minY, maxX, maxY]
}

export function mergeBbox(boxes: Bbox[]): Bbox {
  return boxes.reduce<Bbox>(
    (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])],
    [Infinity, Infinity, -Infinity, -Infinity],
  )
}

export function toTerritories(fc: TerritoryCollection): Territory[] {
  return fc.features.map((f) => ({
    id: f.properties.id,
    name: f.properties.name,
    population: f.properties.population,
    municipioId: f.properties.municipioId,
    municipio: f.properties.municipio,
    bbox: bboxOf(f.geometry),
  }))
}

export async function loadJson<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}.geojson`)
  if (!res.ok) throw new Error(`No se pudo cargar ${name}`)
  return res.json()
}

export const loadCollection = (name: string) => loadJson<TerritoryCollection>(name)
export const loadLabels = (name: string) => loadJson<LabelCollection>(name)
