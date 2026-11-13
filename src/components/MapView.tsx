import type { FeatureCollection, Point } from 'geojson'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { mergeBbox } from '../lib/geo'
import type { Tree } from '../lib/forest'
import { treeImage } from '../lib/treeImages'
import type { LabelCollection, Scope, Territory, TerritoryCollection } from '../lib/types'

// El worker es un archivo aparte: se importa como recurso para que la compilación lo incluya.
maplibregl.setWorkerUrl(new URL(workerUrl, window.location.href).href)

// Estilo base libre de OpenFreeMap (datos de OpenStreetMap). Alternativas: 'bright', 'liberty'.
const BASE_STYLE = 'https://tiles.openfreemap.org/styles/positron'

export interface PointMarker {
  id: string
  coordinates: [number, number]
}

interface Props {
  municipios: TerritoryCollection
  barrios: TerritoryCollection
  muniLabels: LabelCollection
  barrioLabels: LabelCollection
  territories: Map<string, Territory>
  selection: Scope
  bottomInset: number
  plantsMuni: Record<string, number>
  plantsBarrio: Record<string, number>
  markers: PointMarker[]
  showMarkers: boolean
  trees: Tree[]
  pulse: { id: string; coordinates: [number, number] } | null
  ariaLabel: string
  loadingLabel: string
  onSelectMunicipio: (id: string) => void
  onSelectBarrio: (id: string) => void
  onSelectMarker: (id: string) => void
}

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function padding(bottomInset: number) {
  const desktop = window.innerWidth >= 768
  return desktop
    ? { top: 70, bottom: 70, left: 480, right: 70 }
    : { top: 70, bottom: bottomInset + 16, left: 24, right: 24 }
}

const normalize = (values: Record<string, number>) => {
  const max = Math.max(1, ...Object.values(values))
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v / max]))
}

export function MapView(props: Props) {
  const { territories, selection, bottomInset, plantsMuni, plantsBarrio, markers, showMarkers, trees, pulse } = props
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)
  const [painted, setPainted] = useState(false)
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [resizeTick, setResizeTick] = useState(0)
  const cb = useRef(props)
  cb.current = props

  const badgeData = useMemo<FeatureCollection<Point>>(() => {
    const feature = (f: LabelCollection['features'][number], kind: 'm' | 'b', count: number) => ({
      ...f,
      properties: { ...f.properties, kind, count },
    })
    return {
      type: 'FeatureCollection',
      features: [
        ...props.muniLabels.features.map((f) => feature(f, 'm', plantsMuni[f.properties.id] ?? 0)),
        ...props.barrioLabels.features.map((f) => feature(f, 'b', plantsBarrio[f.properties.id] ?? 0)),
      ],
    }
  }, [props.muniLabels, props.barrioLabels, plantsMuni, plantsBarrio])

  useEffect(() => {
    if (!container.current) return
    const map = new maplibregl.Map({
      container: container.current,
      style: BASE_STYLE,
      center: [-15.6, 27.95],
      zoom: 9,
      minZoom: 7,
      maxPitch: 0,
      attributionControl: { compact: true },
    })
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      if (mapRef.current !== map) return
      const c = [0, 1, 2, 3, 4].map((i) => token(`--color-map-${i}`))
      // El mapa mantiene su estilo claro también en modo oscuro, así que sus textos usan una tinta fija.
      const ink = '#17231c'
      const accent = token('--color-accent')
      const accentStrong = token('--color-accent-strong')
      const ramp = [
        'interpolate',
        ['linear'],
        ['coalesce', ['feature-state', 'activity'], 0],
        0, c[0], 0.25, c[1], 0.5, c[2], 0.75, c[3], 1, c[4],
      ] as maplibregl.ExpressionSpecification

      // Se ocultan las etiquetas del estilo base salvo los nombres de calles; los territorios llevan las suyas.
      const layers = map.getStyle().layers
      for (const l of layers) {
        if (l.type === 'symbol' && !('source-layer' in l && l['source-layer'] === 'transportation_name')) {
          map.setLayoutProperty(l.id, 'visibility', 'none')
        }
      }
      // Los rellenos van por debajo de calles y edificios para que se sigan viendo.
      const before = layers.find(
        (l) => 'source-layer' in l && /^(transportation|building|aeroway)/.test(String(l['source-layer'])),
      )?.id

      map.addSource('municipios', { type: 'geojson', data: cb.current.municipios, promoteId: 'id' })
      map.addSource('barrios', { type: 'geojson', data: cb.current.barrios, promoteId: 'id' })
      map.addSource('badges', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addSource('points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

      map.addLayer(
        {
          id: 'municipios-fill',
          type: 'fill',
          source: 'municipios',
          paint: { 'fill-color': ramp, 'fill-opacity': 0.72 },
        },
        before,
      )
      map.addLayer({
        id: 'municipios-line',
        type: 'line',
        source: 'municipios',
        paint: {
          'line-color': '#ffffff',
          'line-opacity': 0.8,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 12, 1.2],
        },
      })
      map.addLayer(
        {
          id: 'barrios-fill',
          type: 'fill',
          source: 'barrios',
          filter: ['==', ['get', 'municipioId'], ''],
          paint: {
            'fill-color': ramp,
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              11,
              ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.82],
              15,
              ['case', ['boolean', ['feature-state', 'hover'], false], 0.7, 0.5],
            ],
          },
        },
        before,
      )
      map.addLayer({
        id: 'barrios-line',
        type: 'line',
        source: 'barrios',
        filter: ['==', ['get', 'municipioId'], ''],
        paint: {
          'line-color': '#ffffff',
          'line-opacity': 0.9,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 14, 1.3],
        },
      })
      map.addLayer({
        id: 'barrios-selected',
        type: 'line',
        source: 'barrios',
        filter: ['==', ['get', 'id'], ''],
        paint: { 'line-color': accentStrong, 'line-width': 3 },
      })

      const visible: maplibregl.ExpressionSpecification = [
        'any',
        ['all', ['==', ['get', 'kind'], 'm'], ['!=', ['get', 'id'], '']],
        ['all', ['==', ['get', 'kind'], 'b'], ['==', ['get', 'municipioId'], '']],
      ]
      const isBarrio = ['==', ['get', 'kind'], 'b'] as maplibregl.ExpressionSpecification
      map.addLayer({
        id: 'labels-name',
        type: 'symbol',
        source: 'badges',
        filter: visible,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 13, 14],
          'text-max-width': 7,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.1],
        },
        paint: { 'text-color': ink, 'text-halo-color': '#ffffff', 'text-halo-width': 1.8 },
      })
      map.addLayer({
        id: 'labels-badge',
        type: 'circle',
        source: 'badges',
        filter: visible,
        paint: {
          // Los contadores de barrio solo aparecen al acercar el zoom, para no tapar el bosque.
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            8, ['case', isBarrio, 0, 8],
            11, ['case', isBarrio, 0, 9],
            11.8, ['case', isBarrio, 10, 10],
            14, 12,
          ],
          'circle-color': accent,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, ['case', isBarrio, 0, 2], 11.8, 2],
          'circle-translate': [0, 14],
        },
      })
      map.addLayer({
        id: 'labels-count',
        type: 'symbol',
        source: 'badges',
        filter: visible,
        layout: {
          'text-field': ['to-string', ['get', 'count']],
          'text-font': ['Noto Sans Bold'],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            8, ['case', isBarrio, 0, 10],
            11, ['case', isBarrio, 0, 11],
            11.8, ['case', isBarrio, 11, 11],
            14, 13,
          ],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff', 'text-translate': [0, 14] },
      })
      const treeColors = {
        leaf: token('--color-leaf'),
        leafDark: token('--color-leaf-dark'),
        trunk: token('--color-trunk'),
        bloom: token('--color-bloom'),
        berry: token('--color-berry'),
      }
      for (const sp of ['drago', 'pino', 'palmera', 'tajinaste'] as const) {
        for (let st = 0; st <= 5; st++) map.addImage(`tree-${sp}-${st}`, treeImage(sp, st, treeColors), { pixelRatio: 2 })
      }
      map.addSource('trees', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addSource('pulse', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      const size = (n: number) => ['*', n, ['get', 'scale']]
      // Un aro verde marca tu árbol; el resto del bosque son otras personas y las colaboraciones nuevas.
      map.addLayer(
        {
          id: 'trees-halo',
          type: 'circle',
          source: 'trees',
          filter: ['==', ['get', 'mine'], true],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 9, 11, 14, 14, 30, 17, 44],
            'circle-color': token('--color-accent-soft'),
            'circle-opacity': 0.95,
            'circle-stroke-color': accent,
            'circle-stroke-width': 3,
            'circle-translate': [0, -10],
          },
        },
        'labels-name',
      )
      map.addLayer(
        {
          id: 'trees',
          type: 'symbol',
          source: 'trees',
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 8, size(0.22), 11, size(0.42), 14, size(0.9), 17, size(1.3)],
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'symbol-sort-key': ['get', 'sort'],
          } as unknown as maplibregl.SymbolLayerSpecification['layout'],
        },
        'labels-name',
      )
      map.addLayer({
        id: 'pulse',
        type: 'circle',
        source: 'pulse',
        paint: {
          'circle-radius': 0,
          'circle-color': accent,
          'circle-opacity': 0,
          'circle-translate': [0, -10],
        },
      })
      map.addLayer({
        id: 'points-outer',
        type: 'circle',
        source: 'points',
        layout: { visibility: 'none' },
        paint: { 'circle-radius': 12, 'circle-color': ink, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 },
      })
      map.addLayer({
        id: 'points-inner',
        type: 'circle',
        source: 'points',
        layout: { visibility: 'none' },
        paint: { 'circle-radius': 4.5, 'circle-color': '#ffffff' },
      })

      let hovered: { source: string; id: string } | null = null
      const setHover = (next: typeof hovered) => {
        if (hovered && (!next || next.id !== hovered.id || next.source !== hovered.source)) {
          map.setFeatureState(hovered, { hover: false })
        }
        if (next) map.setFeatureState(next, { hover: true })
        hovered = next
      }

      const pick = (point: maplibregl.PointLike) => {
        if (map.getLayoutProperty('points-outer', 'visibility') === 'visible') {
          const pt = map.queryRenderedFeatures(point, { layers: ['points-outer'] })[0]
          if (pt) return { source: 'points', f: pt }
        }
        const b = map.queryRenderedFeatures(point, { layers: ['barrios-fill'] })[0]
        if (b) return { source: 'barrios', f: b }
        const m = map.queryRenderedFeatures(point, { layers: ['municipios-fill'] })[0]
        return m ? { source: 'municipios', f: m } : null
      }

      map.on('mousemove', (e) => {
        const hit = pick(e.point)
        map.getCanvas().style.cursor = hit ? 'pointer' : ''
        if (!hit || hit.source === 'points') {
          setHover(null)
          setTip(null)
          return
        }
        setHover({ source: hit.source, id: String(hit.f.properties.id) })
        setTip({ x: e.point.x, y: e.point.y, text: String(hit.f.properties.name) })
      })
      map.on('mouseout', () => {
        setHover(null)
        setTip(null)
      })
      map.on('click', (e) => {
        const hit = pick(e.point)
        if (!hit) return
        const id = String(hit.f.properties.id)
        if (hit.source === 'points') cb.current.onSelectMarker(id)
        else if (hit.source === 'barrios') cb.current.onSelectBarrio(id)
        else cb.current.onSelectMunicipio(id)
      })

      const all = mergeBbox([...cb.current.territories.values()].filter((t) => !t.municipioId).map((t) => t.bbox))
      map.fitBounds(
        [
          [all[0], all[1]],
          [all[2], all[3]],
        ],
        { padding: padding(cb.current.bottomInset), animate: false },
      )
      setReady(true)
      // Cuando el mapa termina de pintar las primeras teselas se quita el aviso de carga.
      map.once('idle', () => setPainted(true))
    })

    return () => {
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    let timer: number
    const onResize = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setResizeTick((t) => t + 1), 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getLayer('points-inner')) return
    ;(map.getSource('badges') as maplibregl.GeoJSONSource).setData(badgeData)
  }, [ready, badgeData])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getLayer('points-inner')) return
    const data: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: markers.map((m) => ({
        type: 'Feature',
        properties: { id: m.id },
        geometry: { type: 'Point', coordinates: m.coordinates },
      })),
    }
    ;(map.getSource('points') as maplibregl.GeoJSONSource).setData(data)
  }, [ready, markers])

  const treeData = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: trees.map((t) => ({
        type: 'Feature',
        properties: {
          id: t.id,
          icon: `tree-${t.species}-${t.stage}`,
          scale: [0.75, 0.75, 0.8, 0.9, 1, 1.1][t.stage] * (t.mine ? 1.35 : 1),
          mine: !!t.mine,
          sort: -t.coordinates[1],
        },
        geometry: { type: 'Point', coordinates: t.coordinates },
      })),
    }),
    [trees],
  )

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getLayer('points-inner')) return
    ;(map.getSource('trees') as maplibregl.GeoJSONSource).setData(treeData)
  }, [ready, treeData])

  const pulseId = pulse?.id
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !pulse || !map.getLayer('pulse')) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ;(map.getSource('pulse') as maplibregl.GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: pulse.coordinates },
    })
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1200)
      map.setPaintProperty('pulse', 'circle-radius', 8 + k * 56)
      map.setPaintProperty('pulse', 'circle-opacity', 0.5 * (1 - k))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pulseId])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getLayer('points-inner')) return
    const v = showMarkers ? 'visible' : 'none'
    map.setLayoutProperty('points-outer', 'visibility', v)
    map.setLayoutProperty('points-inner', 'visibility', v)
  }, [ready, showMarkers])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getLayer('points-inner')) return
    const m = normalize(plantsMuni)
    for (const [id, v] of Object.entries(m)) map.setFeatureState({ source: 'municipios', id }, { activity: v })
    const b = normalize(plantsBarrio)
    for (const [id, v] of Object.entries(b)) map.setFeatureState({ source: 'barrios', id }, { activity: v })
  }, [ready, plantsMuni, plantsBarrio])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getLayer('points-inner')) return
    const muni = selection.municipioId ?? ''
    const inMuni: maplibregl.ExpressionSpecification = ['==', ['get', 'municipioId'], muni]
    map.setFilter('barrios-fill', inMuni)
    map.setFilter('barrios-line', inMuni)
    map.setFilter('barrios-selected', ['==', ['get', 'id'], selection.barrioId ?? ''])
    const visible: maplibregl.ExpressionSpecification = [
      'any',
      ['all', ['==', ['get', 'kind'], 'm'], ['!=', ['get', 'id'], muni]],
      ['all', ['==', ['get', 'kind'], 'b'], inMuni],
    ]
    for (const id of ['labels-name', 'labels-badge', 'labels-count']) map.setFilter(id, visible)
    map.setPaintProperty('municipios-fill', 'fill-opacity', [
      'case',
      ['==', ['get', 'id'], muni],
      0,
      ['boolean', ['feature-state', 'hover'], false],
      0.92,
      muni ? 0.35 : 0.75,
    ])

    const target = territories.get(selection.barrioId ?? '') ?? territories.get(muni)
    const box =
      target?.bbox ?? mergeBbox([...territories.values()].filter((t) => !t.municipioId).map((t) => t.bbox))
    map.fitBounds(
      [
        [box[0], box[1]],
        [box[2], box[3]],
      ],
      { padding: padding(bottomInset), duration: resizeTick ? 0 : 900, maxZoom: selection.barrioId ? 15.5 : 13 },
    )
  }, [ready, selection, territories, bottomInset, resizeTick])

  return (
    <div className="absolute inset-0" role="region" aria-label={props.ariaLabel}>
      <div ref={container} className="h-full w-full" />
      <AnimatePresence>
        {!painted && (
          <motion.div
            role="status"
            className="pointer-events-none absolute inset-x-0 top-[28%] flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="flex items-center gap-3 rounded-control bg-surface px-4 py-3 text-base font-medium shadow-card">
              <span
                className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
                aria-hidden="true"
              />
              {props.loadingLabel}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-control bg-ink px-2.5 py-1 text-sm font-medium text-on-ink shadow-card"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
    </div>
  )
}
