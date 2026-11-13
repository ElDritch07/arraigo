import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useApp } from '../state/app'
import { Field, fieldClass } from './ui'

// Dos listas encadenadas (municipio y barrio): sirve igual con teclado, lector de pantalla y táctil.
export function BarrioSelect({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (barrioId: string) => void
  error?: string | null
}) {
  const { t } = useT()
  const { municipios, barrios, byId } = useApp()
  const [muni, setMuni] = useState(byId.get(value)?.municipioId ?? '')

  const munis = useMemo(() => [...municipios].sort((a, b) => a.name.localeCompare(b.name, 'es')), [municipios])
  const options = useMemo(
    () => barrios.filter((b) => b.municipioId === muni).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [barrios, muni],
  )

  return (
    <div className="space-y-4">
      <Field label={t('common.municipio')}>
        {(p) => (
          <select
            {...p}
            className={fieldClass}
            value={muni}
            onChange={(e) => {
              setMuni(e.target.value)
              onChange('')
            }}
          >
            <option value="">{t('common.select')}</option>
            {munis.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t('common.barrio')} error={error}>
        {(p) => (
          <select
            {...p}
            className={fieldClass}
            value={value}
            disabled={!muni}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('common.select')}</option>
            {options.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  )
}
