import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { baseCount } from '../lib/forest'
import { hash, isoDate } from '../lib/hash'
import { MAX_STAGE, POINTS, stageOf } from '../lib/plants'
import type {
  CommunityEvent,
  EventKind,
  EventStatus,
  MeetingPoint,
  Post,
  PostKind,
  PointType,
  Report,
  ReportKind,
  Species,
  Territory,
  User,
  Volunteering,
} from '../lib/types'
import { useT } from '../i18n'
import { useUi } from './ui'

const STORAGE_KEY = 'participa-gc:v3'

interface Account {
  user: User
  salt: string
  hash: string
}

interface Persisted {
  account: Account | null
  session: boolean
  guest: boolean
  myEvents: CommunityEvent[]
  myVols: Volunteering[]
  myReports: Report[]
  myPosts: Post[]
  joinedEvents: string[]
  joinedVols: string[]
  confirmedMe: string[]
  demoAttendees: Record<string, number>
  confirmedOthers: string[]
  backed: string[]
  likedEvents: string[]
  savedEvents: string[]
  statusOverrides: Record<string, EventStatus>
}

const EMPTY: Persisted = {
  account: null,
  session: false,
  guest: false,
  myEvents: [],
  myVols: [],
  myReports: [],
  myPosts: [],
  joinedEvents: [],
  joinedVols: [],
  confirmedMe: [],
  demoAttendees: {},
  confirmedOthers: [],
  backed: [],
  likedEvents: [],
  savedEvents: [],
  statusOverrides: {},
}

export type GrowthReason = 'event' | 'join' | 'vol' | 'report' | 'welcome' | 'confirm'

export interface Growth {
  id: number
  from: number
  to: number
  points: number
  reason: GrowthReason
}

export interface NewEvent {
  barrioId: string
  title: string
  kind: EventKind
  date: string
  time: string
  place: string
  description: string
  volunteersNeeded: number
  accessible: boolean
  sponsor: string
}

export type LoginResult = 'ok' | 'bad' | 'none'

interface AppApi {
  user: User | null
  entered: boolean
  signUp: (data: { name: string; email: string; barrioId: string; plant: Species; password: string }) => Promise<void>
  login: (email: string, password: string) => Promise<LoginResult>
  hasAccount: boolean
  loginSimulated: () => boolean
  continueAsGuest: () => void
  logout: () => void
  resetDemo: () => void
  municipios: Territory[]
  barrios: Territory[]
  byId: Map<string, Territory>
  events: CommunityEvent[]
  volunteering: Volunteering[]
  reports: Report[]
  meetingPoints: MeetingPoint[]
  plantsByBarrio: Record<string, number>
  plantsByMuni: Record<string, number>
  saplings: { id: string; barrioId: string }[]
  hasJoinedEvent: (id: string) => boolean
  joinEvent: (id: string) => void
  hasJoinedVol: (id: string) => boolean
  joinVol: (id: string) => void
  hasConfirmed: (id: string) => boolean
  confirmMe: (id: string, kind: 'join' | 'vol') => void
  demoAttendeeCount: (eventId: string) => number
  addDemoAttendees: (eventId: string) => void
  isAttendeeConfirmed: (eventId: string, index: number) => boolean
  confirmAttendee: (eventId: string, index: number) => void
  hasBacked: (id: string) => boolean
  toggleBack: (id: string) => void
  likesOf: (id: string) => number
  hasLiked: (id: string) => boolean
  toggleLike: (id: string) => void
  hasSaved: (id: string) => boolean
  toggleSave: (id: string) => void
  createEvent: (data: NewEvent) => string
  addReport: (data: { barrioId: string; kind: ReportKind; title: string; description: string; photo?: string }) => void
  postsFor: (eventId: string) => Post[]
  addPost: (eventId: string, text: string, kind: PostKind, replyTo?: string) => void
  demoAward: (points: number, reason: GrowthReason) => void
  growth: Growth | null
  dismissGrowth: () => void
}

const Ctx = createContext<AppApi | null>(null)

const STREETS = ['Mayor', 'Real', 'Nueva', 'del Pino', 'de la Plaza', 'Los Almendros', 'La Paz', 'del Mar']
const POINT_TYPES: PointType[] = ['civic', 'library', 'youth', 'assoc']
const EVENT_KINDS: EventKind[] = ['fiesta', 'voluntariado', 'deporte', 'cultura', 'taller', 'otro']
const TIMES = ['11:00', '17:30', '18:00', '19:30', '20:00']
// Comercios de ejemplo para enseñar cómo salen los eventos patrocinados. No son negocios reales.
const SPONSORS = ['Panadería La Esquina', 'Ferretería El Muelle', 'Librería Plaza Mayor', 'Bicicletas La Isleta', 'Frutería Las Palmeras', 'Café del Barrio']

function pickStatus(h: number): EventStatus {
  const r = h % 10
  return r < 7 ? 'approved' : r < 9 ? 'review' : 'presented'
}

async function digest(text: string) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return String(hash(text))
}

function seedData(barrios: Territory[], municipios: Territory[]) {
  const events: CommunityEvent[] = []
  const vols: Volunteering[] = []
  const reports: Report[] = []

  for (const b of barrios) {
    const nEv = hash(`${b.id}:ev`) % 3
    for (let i = 0; i < nEv; i++) {
      const h = hash(`${b.id}:ev:${i}`)
      const kind = EVENT_KINDS[h % EVENT_KINDS.length]
      const offset = -25 + ((h >>> 4) % 61)
      const status: EventStatus = offset < 0 ? 'finished' : offset === 0 ? 'ongoing' : pickStatus(h >>> 9)
      const needed = h % 4 === 0 ? 3 + ((h >>> 13) % 6) : 0
      const id = `seed-ev:${b.id}:${i}`
      events.push({
        id,
        barrioId: b.id,
        kind,
        titleKey: `seed.ev.${kind}.${(h >>> 3) % 2}`,
        placeKey: 'seed.place',
        descKey: 'seed.ev.desc',
        organizerKey: `seed.org.${(h >>> 7) % 3}`,
        date: isoDate(offset),
        time: TIMES[(h >>> 11) % TIMES.length],
        status,
        attendees: 4 + ((h >>> 15) % 60),
        volunteersNeeded: needed,
        accessible: (h >>> 19) % 3 !== 0,
        sponsor: status !== 'finished' && (h >>> 21) % 6 === 0 ? SPONSORS[(h >>> 24) % SPONSORS.length] : undefined,
      })
      if (needed > 0 && status !== 'finished') {
        vols.push({
          id: `seed-vl-ev:${b.id}:${i}`,
          barrioId: b.id,
          eventId: id,
          titleKey: `seed.ev.${kind}.${(h >>> 3) % 2}`,
          organizerKey: `seed.org.${(h >>> 7) % 3}`,
          date: isoDate(offset),
          time: TIMES[(h >>> 11) % TIMES.length],
          spots: needed,
          joined: (h >>> 17) % needed,
        })
      }
    }

    const nVl = hash(`${b.id}:vl`) % 2
    for (let i = 0; i < nVl; i++) {
      const h = hash(`${b.id}:vl:${i}`)
      const spots = 4 + (h % 9)
      vols.push({
        id: `seed-vl:${b.id}:${i}`,
        barrioId: b.id,
        titleKey: `seed.vol.${(h >>> 3) % 5}`,
        organizerKey: `seed.org.${(h >>> 7) % 3}`,
        date: isoDate(1 + ((h >>> 5) % 30)),
        time: TIMES[(h >>> 11) % TIMES.length],
        spots,
        joined: (h >>> 13) % (spots + 1),
      })
    }

    const nRp = hash(`${b.id}:rp`) % 3
    for (let i = 0; i < nRp; i++) {
      const h = hash(`${b.id}:rp:${i}`)
      const n = h % 6
      reports.push({
        id: `seed-rp:${b.id}:${i}`,
        barrioId: b.id,
        kind: n < 3 ? 'queja' : 'sugerencia',
        titleKey: `seed.rep.${n}`,
        backs: 1 + ((h >>> 5) % 35),
      })
    }
  }

  const points: MeetingPoint[] = []
  for (const m of municipios) {
    const own = barrios
      .filter((b) => b.municipioId === m.id)
      .sort((a, b) => hash(`${m.id}:${a.id}`) - hash(`${m.id}:${b.id}`))
      .slice(0, 3)
    own.forEach((b, i) => {
      const h = hash(`${b.id}:pt`)
      points.push({
        id: `pt:${b.id}`,
        municipioId: m.id,
        barrioId: b.id,
        type: POINT_TYPES[(h + i) % POINT_TYPES.length],
        address: `C/ ${STREETS[h % STREETS.length]}, ${1 + ((h >>> 4) % 40)}`,
        phone: `928 ${100 + ((h >>> 3) % 899)} ${100 + ((h >>> 9) % 899)}`,
        from: '9:00',
        to: i === 0 ? '20:00' : '14:00',
      })
    })
  }

  return { events, vols, reports, points }
}

// Mensajes de ejemplo del tablón: hay preguntas de vecinas y vecinos y la respuesta del organizador.
function seedPosts(eventId: string): Post[] {
  const n = hash(`${eventId}:posts`) % 4
  const out: Post[] = []
  for (let i = 0; i < n; i++) {
    const h = hash(`${eventId}:post:${i}`)
    const q = h % 6
    const isQuestion = q === 0 || q === 1 || q === 3 || q === 5
    const id = `seed-po:${eventId}:${i}`
    out.push({
      id,
      eventId,
      kind: isQuestion ? 'question' : 'comment',
      authorKey: `seed.author.${(h >>> 4) % 4}`,
      textKey: `seed.post.${q}`,
      createdAt: isoDate(-1 - ((h >>> 8) % 9)),
    })
    if (isQuestion) {
      out.push({
        id: `${id}:r`,
        eventId,
        kind: 'comment',
        authorKey: 'bd.organizer',
        textKey: `seed.reply.${q % 3}`,
        createdAt: isoDate(-((h >>> 8) % 8)),
        replyTo: id,
        organizer: true,
      })
    }
  }
  return out
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    // sin almacenamiento: la demo funciona igual
  }
  return EMPTY
}

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}

export function AppProvider({
  municipios,
  barrios,
  children,
}: {
  municipios: Territory[]
  barrios: Territory[]
  children: ReactNode
}) {
  const { td } = useT()
  const { showToast } = useUi()
  const [p, setP] = useState<Persisted>(load)
  const [growth, setGrowth] = useState<Growth | null>(null)
  const ref = useRef(p)
  ref.current = p

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    } catch {
      // sin almacenamiento
    }
  }, [p])

  const seeds = useMemo(() => seedData(barrios, municipios), [barrios, municipios])
  const byId = useMemo(() => new Map([...municipios, ...barrios].map((t) => [t.id, t])), [municipios, barrios])

  // Los eventos propios avanzan solos de estado para poder enseñar el seguimiento en la demo.
  const statusKey = p.myEvents.map((e) => `${e.id}:${p.statusOverrides[e.id] ?? e.status}`).join('|')
  useEffect(() => {
    const timers: number[] = []
    for (const e of ref.current.myEvents) {
      const current = ref.current.statusOverrides[e.id] ?? e.status
      const next: EventStatus | null = current === 'presented' ? 'review' : current === 'review' ? 'approved' : null
      if (!next) continue
      timers.push(
        window.setTimeout(
          () => {
            setP((s) => ({ ...s, statusOverrides: { ...s.statusOverrides, [e.id]: next } }))
            showToast(td('toast.status', { status: td(`status.${next}`) }))
          },
          current === 'presented' ? 5000 : 6000,
        ),
      )
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [statusKey, showToast, td])

  const award = useCallback((amount: number, reason: GrowthReason) => {
    const user = ref.current.account?.user
    if (!user || !ref.current.session) return
    const from = stageOf(user.points)
    const total = Math.min(user.points + amount, 9999)
    setP((s) => (s.account ? { ...s, account: { ...s.account, user: { ...s.account.user, points: total } } } : s))
    setGrowth({ id: Date.now(), from, to: Math.min(stageOf(total), MAX_STAGE), points: amount, reason })
  }, [])

  const api = useMemo<AppApi>(() => {
    const user = p.session ? (p.account?.user ?? null) : null
    const joinedE = new Set(p.joinedEvents)
    const joinedV = new Set(p.joinedVols)
    const backed = new Set(p.backed)
    const confirmedMe = new Set(p.confirmedMe)
    const confirmedOthers = new Set(p.confirmedOthers)
    const liked = new Set(p.likedEvents)
    const saved = new Set(p.savedEvents)

    const events = [...p.myEvents, ...seeds.events].map((e) => ({
      ...e,
      status: p.statusOverrides[e.id] ?? e.status,
      attendees: e.attendees + (joinedE.has(e.id) ? 1 : 0),
    }))
    const volunteering = [...p.myVols, ...seeds.vols].map((v) => ({ ...v, joined: v.joined + (joinedV.has(v.id) ? 1 : 0) }))
    const reports = [...p.myReports, ...seeds.reports].map((r) => ({ ...r, backs: r.backs + (backed.has(r.id) ? 1 : 0) }))

    // Un árbol pequeño nace cuando la colaboración está confirmada o se crea algo en el barrio.
    const barrioOf = (list: { id: string; barrioId: string }[], id: string) => list.find((x) => x.id === id)?.barrioId
    const saplings = [
      ...p.confirmedMe.map((id) => ({ id: `s-m:${id}`, barrioId: barrioOf(events, id) ?? barrioOf(volunteering, id) })),
      ...p.confirmedOthers.map((key) => ({ id: `s-o:${key}`, barrioId: barrioOf(events, key.split('|')[0]) })),
      ...p.myEvents.map((e) => ({ id: `s-c:${e.id}`, barrioId: e.barrioId })),
      ...p.myReports.map((r) => ({ id: `s-r:${r.id}`, barrioId: r.barrioId })),
    ].filter((s): s is { id: string; barrioId: string } => !!s.barrioId)
    const saplingsIn: Record<string, number> = {}
    for (const s of saplings) saplingsIn[s.barrioId] = (saplingsIn[s.barrioId] ?? 0) + 1

    const plantsByBarrio: Record<string, number> = {}
    const plantsByMuni: Record<string, number> = {}
    for (const b of barrios) {
      const n = baseCount(b.id) + (user?.barrioId === b.id ? 1 : 0) + (saplingsIn[b.id] ?? 0)
      plantsByBarrio[b.id] = n
      if (b.municipioId) plantsByMuni[b.municipioId] = (plantsByMuni[b.municipioId] ?? 0) + n
    }

    return {
      user,
      entered: p.session || p.guest,
      signUp: async (data) => {
        const salt = Math.random().toString(36).slice(2)
        const h = await digest(`${salt}:${data.password}`)
        const { password: _password, ...rest } = data
        void _password
        setP((s) => ({ ...EMPTY, ...s, account: { user: { ...rest, points: 0 }, salt, hash: h }, session: true, guest: false }))
        setGrowth({ id: Date.now(), from: 0, to: 0, points: 0, reason: 'welcome' })
      },
      login: async (email, password) => {
        const acc = ref.current.account
        if (!acc) return 'none'
        const h = await digest(`${acc.salt}:${password}`)
        if (acc.user.email.toLowerCase() !== email.trim().toLowerCase() || h !== acc.hash) return 'bad'
        setP((s) => ({ ...s, session: true, guest: false }))
        return 'ok'
      },
      hasAccount: !!p.account,
      // Acceso simulado con certificado o Cl@ve PIN: si ya hay cuenta en este navegador, se entra en ella.
      loginSimulated: () => {
        if (!ref.current.account) return false
        setP((s) => ({ ...s, session: true, guest: false }))
        return true
      },
      continueAsGuest: () => setP((s) => ({ ...s, guest: true })),
      logout: () => setP((s) => ({ ...s, session: false, guest: false })),
      resetDemo: () => {
        setGrowth(null)
        setP(EMPTY)
      },
      municipios,
      barrios,
      byId,
      events,
      volunteering,
      reports,
      meetingPoints: seeds.points,
      plantsByBarrio,
      plantsByMuni,
      saplings,
      hasJoinedEvent: (id) => joinedE.has(id),
      joinEvent: (id) => setP((s) => ({ ...s, joinedEvents: toggle(s.joinedEvents, id) })),
      hasJoinedVol: (id) => joinedV.has(id),
      joinVol: (id) => setP((s) => ({ ...s, joinedVols: toggle(s.joinedVols, id) })),
      hasConfirmed: (id) => confirmedMe.has(id),
      confirmMe: (id, kind) => {
        if (ref.current.confirmedMe.includes(id)) return
        setP((s) => ({ ...s, confirmedMe: [...s.confirmedMe, id] }))
        award(kind === 'join' ? POINTS.join : POINTS.vol, kind)
      },
      demoAttendeeCount: (eventId) => p.demoAttendees[eventId] ?? 0,
      addDemoAttendees: (eventId) =>
        setP((s) => ({ ...s, demoAttendees: { ...s.demoAttendees, [eventId]: (s.demoAttendees[eventId] ?? 0) + 4 } })),
      isAttendeeConfirmed: (eventId, index) => confirmedOthers.has(`${eventId}|${index}`),
      confirmAttendee: (eventId, index) => {
        const key = `${eventId}|${index}`
        if (ref.current.confirmedOthers.includes(key)) return
        setP((s) => ({ ...s, confirmedOthers: [...s.confirmedOthers, key] }))
        award(POINTS.confirm, 'confirm')
      },
      hasBacked: (id) => backed.has(id),
      toggleBack: (id) => setP((s) => ({ ...s, backed: toggle(s.backed, id) })),
      likesOf: (id) => (id.startsWith('mine') ? 0 : hash(`${id}:likes`) % 70) + (liked.has(id) ? 1 : 0),
      hasLiked: (id) => liked.has(id),
      toggleLike: (id) => setP((s) => ({ ...s, likedEvents: toggle(s.likedEvents, id) })),
      hasSaved: (id) => saved.has(id),
      toggleSave: (id) => setP((s) => ({ ...s, savedEvents: toggle(s.savedEvents, id) })),
      createEvent: (d) => {
        const id = `mine-ev:${Date.now()}`
        const name = ref.current.account?.user.name
        const ev: CommunityEvent = {
          id,
          barrioId: d.barrioId,
          kind: d.kind,
          title: d.title.trim(),
          place: d.place.trim(),
          description: d.description.trim(),
          organizer: name,
          date: d.date,
          time: d.time,
          status: 'presented',
          attendees: 0,
          volunteersNeeded: d.volunteersNeeded,
          accessible: d.accessible,
          sponsor: d.sponsor.trim() || undefined,
          mine: true,
        }
        const vol: Volunteering | null =
          d.volunteersNeeded > 0
            ? {
                id: `mine-vl:${Date.now()}`,
                barrioId: d.barrioId,
                eventId: id,
                title: d.title.trim(),
                organizer: name,
                date: d.date,
                time: d.time,
                spots: d.volunteersNeeded,
                joined: 0,
                mine: true,
              }
            : null
        setP((s) => ({ ...s, myEvents: [ev, ...s.myEvents], myVols: vol ? [vol, ...s.myVols] : s.myVols }))
        award(POINTS.event, 'event')
        return id
      },
      addReport: (d) => {
        setP((s) => ({
          ...s,
          myReports: [
            {
              id: `mine-rp:${Date.now()}`,
              barrioId: d.barrioId,
              kind: d.kind,
              title: d.title.trim(),
              description: d.description.trim(),
              photo: d.photo,
              backs: 0,
              mine: true,
            },
            ...s.myReports,
          ],
        }))
        award(POINTS.report, 'report')
      },
      postsFor: (eventId) => {
        const mine = p.myPosts.filter((x) => x.eventId === eventId)
        return [...seedPosts(eventId), ...mine].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      },
      addPost: (eventId, text, kind, replyTo) => {
        const name = ref.current.account?.user.name
        const isOrganizer = ref.current.myEvents.some((e) => e.id === eventId)
        setP((s) => ({
          ...s,
          myPosts: [
            ...s.myPosts,
            {
              id: `mine-po:${Date.now()}`,
              eventId,
              kind,
              author: name,
              text: text.trim(),
              createdAt: isoDate(0),
              replyTo,
              organizer: isOrganizer,
              mine: true,
            },
          ],
        }))
      },
      demoAward: (points, reason) => award(points, reason),
      growth,
      dismissGrowth: () => setGrowth(null),
    }
  }, [p, seeds, municipios, barrios, byId, award, growth])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp fuera del proveedor')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function eventTitle(e: { title?: string; titleKey?: string }, td: (k: string) => string) {
  return e.title ?? (e.titleKey ? td(e.titleKey) : '')
}
