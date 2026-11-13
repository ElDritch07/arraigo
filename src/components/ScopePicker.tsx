import { Home, MapPin, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useApp } from '../state/app'
import { normalize } from '../state/hooks'
import { useUi } from '../state/ui'
import { Modal } from './Modal'
import { fieldClass } from './ui'

function Item({ onClick, title, sub, icon }: { onClick: () => void; title: string; sub?: string; icon?: 'home' | 'pin' }) {
  const Icon = icon === 'home' ? Home : MapPin
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 py-2 text-start hover:bg-canvas"
      >
        <Icon size={20} className="shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium">{title}</span>
          {sub && <span className="block truncate text-sm text-muted">{sub}</span>}
        </span>
      </button>
    </li>
  )
}

// Alternativa al mapa para elegir zona: se puede buscar por nombre y usar solo con teclado o lector de pantalla.
export function ScopePicker() {
  const { t } = useT()
  const { municipios, barrios, user, byId } = useApp()
  const { scope, selectMunicipio, selectBarrio, clearScope, closeModal } = useUi()
  const [query, setQuery] = useState('')

  const sortedMunis = useMemo(() => [...municipios].sort((a, b) => a.name.localeCompare(b.name, 'es')), [municipios])
  const q = normalize(query.trim())

  const results = useMemo(() => {
    if (!q) return null
    return {
      munis: municipios.filter((m) => normalize(m.name).includes(q)),
      barrios: barrios.filter((b) => normalize(b.name).includes(q)).slice(0, 40),
    }
  }, [q, municipios, barrios])

  const pickMuni = (id: string) => {
    selectMunicipio(id)
    closeModal()
  }
  const pickBarrio = (id: string, muni: string) => {
    selectBarrio(id, muni)
    closeModal()
  }

  const own = user ? byId.get(user.barrioId) : null
  const inMuni = scope.municipioId
    ? barrios.filter((b) => b.municipioId === scope.municipioId).sort((a, b) => a.name.localeCompare(b.name, 'es'))
    : []

  return (
    <Modal title={t('scope.title')} onClose={closeModal} variant="full">
      <div className="p-4">
        <label className="relative mb-3 block">
          <span className="sr-only">{t('scope.search')}</span>
          <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('scope.search')}
            className={`${fieldClass} ps-10`}
          />
        </label>

        {results ? (
          results.munis.length + results.barrios.length ? (
            <ul>
              {results.munis.map((m) => (
                <Item key={m.id} title={m.name} sub={t('common.municipio')} onClick={() => pickMuni(m.id)} />
              ))}
              {results.barrios.map((b) => (
                <Item key={b.id} title={b.name} sub={b.municipio} onClick={() => pickBarrio(b.id, b.municipioId ?? '')} />
              ))}
            </ul>
          ) : (
            <p className="px-2 py-6 text-center text-base text-muted">{t('scope.none')}</p>
          )
        ) : (
          <>
            <ul>
              <Item
                icon="home"
                title={t('scope.island')}
                onClick={() => {
                  clearScope()
                  closeModal()
                }}
              />
              {own && (
                <Item
                  title={t('scope.mine')}
                  sub={`${own.name}, ${own.municipio}`}
                  onClick={() => pickBarrio(own.id, own.municipioId ?? '')}
                />
              )}
            </ul>
            {inMuni.length > 0 && (
              <>
                <h3 className="mb-1 mt-4 px-3 text-sm font-semibold text-muted">{t('scope.barrios')}</h3>
                <ul>
                  {inMuni.map((b) => (
                    <Item key={b.id} title={b.name} onClick={() => pickBarrio(b.id, b.municipioId ?? '')} />
                  ))}
                </ul>
              </>
            )}
            <h3 className="mb-1 mt-4 px-3 text-sm font-semibold text-muted">{t('scope.municipios')}</h3>
            <ul>
              {sortedMunis.map((m) => (
                <Item key={m.id} title={m.name} onClick={() => pickMuni(m.id)} />
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  )
}
