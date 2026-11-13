import type { Species } from './types'

export const SPECIES: Species[] = ['drago', 'pino', 'palmera', 'tajinaste']

// Puntos necesarios para llegar a cada fase (0 semilla ... 5 en flor). Valores bajos para que la demo se vea rápido.
export const STAGE_THRESHOLDS = [0, 10, 25, 45, 70, 100]
export const MAX_STAGE = STAGE_THRESHOLDS.length - 1

// Apuntarse no da puntos: llegan cuando el organizador confirma la asistencia.
export const POINTS = { event: 30, join: 10, vol: 20, report: 10, confirm: 5 } as const

export function stageOf(points: number) {
  let stage = 0
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) if (points >= STAGE_THRESHOLDS[i]) stage = i
  return stage
}

export function pointsToNext(points: number) {
  const stage = stageOf(points)
  return stage >= MAX_STAGE ? 0 : STAGE_THRESHOLDS[stage + 1] - points
}

export function progressInStage(points: number) {
  const stage = stageOf(points)
  if (stage >= MAX_STAGE) return 1
  const from = STAGE_THRESHOLDS[stage]
  const to = STAGE_THRESHOLDS[stage + 1]
  return (points - from) / (to - from)
}
