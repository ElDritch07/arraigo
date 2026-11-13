import { useCallback, useEffect, useState } from 'react'
import { useT } from '../i18n'
import { useApp } from './app'
import { useUi } from './ui'

/** Ejecuta la acción solo con cuenta; si no la hay, abre el alta. */
export function useRequireAccount() {
  const { user } = useApp()
  const { openModal } = useUi()
  return useCallback(
    (action: () => void) => {
      if (user) action()
      else openModal({ type: 'auth' })
    },
    [user, openModal],
  )
}

/** Devuelve un filtro por barrio según la zona elegida (isla, municipio o barrio). */
export function useInScope() {
  const { byId } = useApp()
  const { scope } = useUi()
  return useCallback(
    (barrioId: string) => {
      if (scope.barrioId) return barrioId === scope.barrioId
      if (scope.municipioId) return byId.get(barrioId)?.municipioId === scope.municipioId
      return true
    },
    [byId, scope],
  )
}

export function useZoneName() {
  const { t } = useT()
  const { byId } = useApp()
  const { scope } = useUi()
  return byId.get(scope.barrioId ?? '')?.name ?? byId.get(scope.municipioId ?? '')?.name ?? t('scope.island')
}

export function useViewport() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight })
  const [size, setSize] = useState(read)
  useEffect(() => {
    const onResize = () => setSize(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return { ...size, desktop: size.width >= 768 }
}

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
