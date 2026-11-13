import type { FeatureCollection, Geometry, Point } from 'geojson'

export interface TerritoryProps {
  id: string
  name: string
  population?: number | null
  municipioId?: string
  municipio?: string
  approx?: boolean
}

export type TerritoryCollection = FeatureCollection<Geometry, TerritoryProps>
export type LabelCollection = FeatureCollection<Point, TerritoryProps>

export type Bbox = [number, number, number, number]

export interface Territory {
  id: string
  name: string
  population?: number | null
  municipioId?: string
  municipio?: string
  bbox: Bbox
}

export type EventKind = 'fiesta' | 'voluntariado' | 'deporte' | 'cultura' | 'taller' | 'otro'
export type EventStatus = 'presented' | 'review' | 'approved' | 'ongoing' | 'finished'

export interface CommunityEvent {
  id: string
  barrioId: string
  kind: EventKind
  title?: string
  titleKey?: string
  place?: string
  placeKey?: string
  description?: string
  descKey?: string
  organizer?: string
  organizerKey?: string
  date: string
  time: string
  status: EventStatus
  attendees: number
  volunteersNeeded: number
  accessible?: boolean
  sponsor?: string
  mine?: boolean
}

export interface Volunteering {
  id: string
  barrioId: string
  eventId?: string
  title?: string
  titleKey?: string
  organizer?: string
  organizerKey?: string
  date: string
  time: string
  spots: number
  joined: number
  mine?: boolean
}

export type ReportKind = 'sugerencia' | 'queja'

export interface Report {
  id: string
  barrioId: string
  kind: ReportKind
  title?: string
  titleKey?: string
  description?: string
  photo?: string
  backs: number
  mine?: boolean
}

export type PostKind = 'question' | 'comment'

export interface Post {
  id: string
  eventId: string
  kind: PostKind
  author?: string
  authorKey?: string
  text?: string
  textKey?: string
  createdAt: string
  replyTo?: string
  organizer?: boolean
  mine?: boolean
}

export type PointType = 'civic' | 'library' | 'youth' | 'assoc'

export interface MeetingPoint {
  id: string
  municipioId: string
  barrioId: string
  type: PointType
  address: string
  phone: string
  from: string
  to: string
}

export type Species = 'drago' | 'pino' | 'palmera' | 'tajinaste'

export interface User {
  name: string
  email: string
  barrioId: string
  plant: Species
  points: number
}

export type Tab = 'events' | 'volunteer' | 'mailbox' | 'points' | 'profile'

export interface Scope {
  municipioId: string | null
  barrioId: string | null
}
