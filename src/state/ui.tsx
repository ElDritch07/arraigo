import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Scope, Tab } from '../lib/types'

export type SheetState = 'peek' | 'half' | 'full'

export type ModalState =
  | null
  | { type: 'auth' }
  | { type: 'create'; demo?: boolean }
  | { type: 'event'; id: string }
  | { type: 'scope' }
  | { type: 'lang' }
  | { type: 'assistant'; demo?: boolean }

interface UiApi {
  tab: Tab
  setTab: (tab: Tab) => void
  scope: Scope
  selectMunicipio: (id: string) => void
  selectBarrio: (id: string, municipioId: string) => void
  clearScope: () => void
  sheet: SheetState
  setSheet: (s: SheetState) => void
  modal: ModalState
  openModal: (m: Exclude<ModalState, null>) => void
  closeModal: () => void
  toast: string | null
  showToast: (message: string) => void
}

const Ctx = createContext<UiApi | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('events')
  const [scope, setScope] = useState<Scope>({ municipioId: null, barrioId: null })
  const [sheet, setSheet] = useState<SheetState>('half')
  const [modal, setModal] = useState<ModalState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number>(0)

  const setTab = useCallback((next: Tab) => {
    setTabState(next)
    setSheet(next === 'mailbox' || next === 'profile' ? 'full' : 'half')
  }, [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 3500)
  }, [])

  const api = useMemo<UiApi>(
    () => ({
      tab,
      setTab,
      scope,
      selectMunicipio: (id) => setScope({ municipioId: id, barrioId: null }),
      selectBarrio: (id, municipioId) => setScope({ municipioId, barrioId: id }),
      clearScope: () => setScope({ municipioId: null, barrioId: null }),
      sheet,
      setSheet,
      modal,
      openModal: setModal,
      closeModal: () => setModal(null),
      toast,
      showToast,
    }),
    [tab, setTab, scope, sheet, modal, toast, showToast],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUi() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUi fuera del proveedor')
  return ctx
}
