import { ChevronLeft, MapPin } from 'lucide-react'
import { useT } from '../i18n'
import { useApp } from '../state/app'
import { useZoneName } from '../state/hooks'
import { useUi } from '../state/ui'
import { Button, IconButton } from './ui'

// Barra de zona: dice dónde estás filtrando y permite subir de nivel o cambiar de zona sin usar el mapa.
export function ScopeBar() {
  const { t } = useT()
  const { byId, plantsByBarrio, plantsByMuni } = useApp()
  const { scope, selectMunicipio, clearScope, openModal } = useUi()
  const zone = useZoneName()

  const plants = scope.barrioId
    ? plantsByBarrio[scope.barrioId]
    : scope.municipioId
      ? plantsByMuni[scope.municipioId]
      : Object.values(plantsByMuni).reduce((a, b) => a + b, 0)

  const up = () => {
    if (scope.barrioId) selectMunicipio(byId.get(scope.barrioId)?.municipioId ?? '')
    else clearScope()
  }

  return (
    <div className="flex items-center gap-1 border-b border-line px-3 py-2">
      {scope.municipioId && (
        <IconButton label={t('common.back')} onClick={up}>
          <ChevronLeft size={22} className="rtl:rotate-180" aria-hidden />
        </IconButton>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 ps-1">
        <MapPin size={20} className="shrink-0 text-accent" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight">{zone}</p>
          <p className="text-sm leading-tight text-muted">{t('common.plants', { n: plants })}</p>
        </div>
      </div>
      <Button variant="secondary" className="shrink-0 !px-3" onClick={() => openModal({ type: 'scope' })}>
        {t('scope.change')}
      </Button>
    </div>
  )
}
