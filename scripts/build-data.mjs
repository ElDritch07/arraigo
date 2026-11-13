import fs from 'node:fs'
import path from 'node:path'
import osmtogeojson from 'osmtogeojson'
import * as turf from '@turf/turf'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const CACHE = path.resolve('scripts/.cache')
fs.mkdirSync(CACHE, { recursive: true })

const AREA = 'area["name"="Gran Canaria"]["place"="island"]->.gc;'
const QUERIES = {
  admin: `[out:json][timeout:180];${AREA}
    relation(area.gc)["boundary"="administrative"]["admin_level"~"^(8|9)$"];
    out geom;`,
  places: `[out:json][timeout:120];${AREA}
    node(area.gc)["place"~"^(suburb|neighbourhood|quarter|village|hamlet|town|city)$"]["name"];
    out;`,
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchOverpass(key) {
  const file = path.join(CACHE, `${key}.json`)
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  let wait = 8000
  for (let i = 0; i < 8; i++) {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: {
        'User-Agent': 'demo-participacion-ciudadana/0.1',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'data=' + encodeURIComponent(QUERIES[key]),
    })
    const text = await res.text()
    if (res.ok && text.trimStart().startsWith('{')) {
      fs.writeFileSync(file, text)
      return JSON.parse(text)
    }
    console.log(`${key}: intento ${i + 1} fallido (${res.status}), espero ${wait / 1000}s`)
    await sleep(wait)
    wait *= 2
  }
  throw new Error(`Overpass no responde para ${key}`)
}

const slug = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const round = (fc) => turf.truncate(fc, { precision: 5, mutate: true })

const simplify = (f) => turf.simplify(f, { tolerance: 0.0002, highQuality: true })

function polygonal(f) {
  return f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
}

const admin = osmtogeojson(await fetchOverpass('admin'))
const places = await fetchOverpass('places')

const municipios = admin.features
  .filter((f) => f.properties.admin_level === '8' && polygonal(f))
  .map((f) => ({
    type: 'Feature',
    id: slug(f.properties.name),
    properties: {
      id: slug(f.properties.name),
      name: f.properties.name,
      population: Number(f.properties.population) || null,
    },
    geometry: f.geometry,
  }))

const lpgcId = 'las-palmas-de-gran-canaria'
const realBarrios = admin.features
  .filter((f) => f.properties.admin_level === '9' && polygonal(f))
  .map((f) => ({
    type: 'Feature',
    properties: {
      id: `${lpgcId}-${slug(f.properties.name)}`,
      name: f.properties.name,
      municipioId: lpgcId,
      municipio: 'Las Palmas de Gran Canaria',
      approx: false,
    },
    geometry: f.geometry,
  }))

const pts = places.elements.map((e) =>
  turf.point([e.lon, e.lat], { name: e.tags.name, place: e.tags.place }),
)

function dedupe(points) {
  const seen = new Set()
  return points.filter((p) => {
    const k = slug(p.properties.name)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function clip(cell, area) {
  try {
    const r = turf.intersect(turf.featureCollection([cell, area]))
    return r && polygonal(r) ? r : null
  } catch {
    return null
  }
}

function approxBarrios(muni, area, exclude) {
  const inside = dedupe(pts.filter((p) => turf.booleanPointInPolygon(p, area)))
  const alreadyCovered = (p) => exclude.some((b) => turf.booleanPointInPolygon(p, b))
  let candidates = inside.filter((p) => !alreadyCovered(p) && p.properties.place !== 'hamlet')
  if (candidates.length < 3) candidates = inside.filter((p) => !alreadyCovered(p))
  if (candidates.length === 0) return []
  if (candidates.length === 1) {
    return [feature(muni, candidates[0].properties.name, area)]
  }
  const bbox = turf.bbox(area)
  const pad = 0.05
  const vor = turf.voronoi(turf.featureCollection(candidates), {
    bbox: [bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad],
  })
  const out = []
  vor.features.forEach((cell, i) => {
    const clipped = clip(cell, area)
    if (clipped) out.push(feature(muni, candidates[i].properties.name, clipped))
  })
  return out
}

function feature(muni, name, geometryFeature) {
  return {
    type: 'Feature',
    properties: {
      id: `${muni.properties.id}-${slug(name)}`,
      name,
      municipioId: muni.properties.id,
      municipio: muni.properties.name,
      approx: true,
    },
    geometry: geometryFeature.geometry,
  }
}

const barrios = []
for (const muni of municipios) {
  if (muni.properties.id === lpgcId) {
    barrios.push(...realBarrios)
    let rest = muni
    for (const b of realBarrios) {
      try {
        const d = turf.difference(turf.featureCollection([rest, b]))
        if (d) rest = d
      } catch {}
    }
    const restFeature = { ...rest, properties: muni.properties }
    barrios.push(...approxBarrios(muni, restFeature, realBarrios))
  } else {
    barrios.push(...approxBarrios(muni, muni, []))
  }
}

const unique = new Map()
for (const b of barrios) if (!unique.has(b.properties.id)) unique.set(b.properties.id, b)

const write = (name, features) => {
  const fc = round(turf.featureCollection(features.map(simplify)))
  const file = path.resolve('public/data', name)
  fs.writeFileSync(file, JSON.stringify(fc))
  console.log(name, features.length, 'features,', (fs.statSync(file).size / 1024).toFixed(0), 'KB')
}

write('municipios.geojson', municipios)
write('barrios.geojson', [...unique.values()])

// Un único punto de etiqueta por territorio (en su polígono más grande) para evitar nombres repetidos.
const writeLabels = (name, features) => {
  const points = features.map((f) => {
    let poly = f
    if (f.geometry.type === 'MultiPolygon') {
      const parts = f.geometry.coordinates.map((c) => turf.polygon(c))
      poly = parts.reduce((a, b) => (turf.area(b) > turf.area(a) ? b : a))
    }
    const p = turf.pointOnFeature(poly)
    p.properties = { ...f.properties }
    return p
  })
  fs.writeFileSync(path.resolve('public/data', name), JSON.stringify(round(turf.featureCollection(points))))
  console.log(name, points.length, 'puntos')
}

writeLabels('municipios-labels.geojson', municipios)
writeLabels('barrios-labels.geojson', [...unique.values()])
