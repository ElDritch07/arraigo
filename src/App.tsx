import { MotionConfig } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { AuthScreen } from './components/Auth'
import { GrowthToast } from './components/GrowthToast'
import { Shell, type MapData } from './components/Shell'
import { Toast } from './components/Toast'
import { Button } from './components/ui'
import { I18nProvider, useT } from './i18n'
import { loadCollection, loadLabels, toTerritories } from './lib/geo'
import { AppProvider, useApp } from './state/app'
import { ThemeProvider } from './state/theme'
import { TourProvider } from './state/tour'
import { UiProvider } from './state/ui'

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          <UiProvider>
            <Loader />
          </UiProvider>
        </MotionConfig>
      </ThemeProvider>
    </I18nProvider>
  )
}

function Loader() {
  const { t } = useT()
  const [data, setData] = useState<MapData | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setError(false)
    Promise.all([
      loadCollection('municipios'),
      loadCollection('barrios'),
      loadLabels('municipios-labels'),
      loadLabels('barrios-labels'),
    ])
      .then(([municipios, barrios, muniLabels, barrioLabels]) => setData({ municipios, barrios, muniLabels, barrioLabels }))
      .catch(() => setError(true))
  }, [attempt])

  const territories = useMemo(
    () => (data ? { municipios: toTerritories(data.municipios), barrios: toTerritories(data.barrios) } : null),
    [data],
  )

  if (error) {
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base">{t('common.error')}</p>
        <Button onClick={() => setAttempt((n) => n + 1)}>{t('common.retry')}</Button>
      </div>
    )
  }
  if (!data || !territories) {
    return (
      <div role="status" className="flex h-full items-center justify-center text-base text-muted">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <AppProvider municipios={territories.municipios} barrios={territories.barrios}>
      <TourProvider>
        <Gate data={data} />
        <Toast />
        <GrowthToast />
      </TourProvider>
    </AppProvider>
  )
}

function Gate({ data }: { data: MapData }) {
  const { entered } = useApp()
  return entered ? <Shell data={data} /> : <AuthScreen />
}
