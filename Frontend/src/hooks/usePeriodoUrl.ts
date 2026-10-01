import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { todayISO } from '@/utils/date'
import { esPeriodoValido, periodoAnterior, periodoDePreset, recortarAlCorte, type Periodo } from '@/utils/periodo'

/**
 * Periodo (`?desde=&hasta=`) y cuenta (`?cuenta=`) guardados en la URL, para
 * que sobrevivan a recargar y se conserven al navegar entre el dashboard, la
 * lista de categorías y el detalle de una categoría (ver `queryString`).
 * Sin parámetros válidos, el periodo es el mes en curso.
 */
export function usePeriodoUrl() {
  const [searchParams, setSearchParams] = useSearchParams()
  const desdeParam = searchParams.get('desde') ?? undefined
  const hastaParam = searchParams.get('hasta') ?? undefined
  const cuentaId = searchParams.get('cuenta') ?? ''

  const periodo: Periodo = useMemo(() => {
    const candidato = { desde: desdeParam, hasta: hastaParam }
    return esPeriodoValido(candidato) ? candidato : periodoDePreset('este_mes')
  }, [desdeParam, hastaParam])

  // Si el periodo está en curso, se compara contra los mismos días del anterior.
  const { anterior, dias: diasCorte } = useMemo(
    () => recortarAlCorte(periodo, periodoAnterior(periodo), todayISO()),
    [periodo]
  )

  function actualizar(cambios: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(cambios)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setSearchParams(next, { replace: true })
  }

  const qs = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta })
  if (cuentaId) qs.set('cuenta', cuentaId)

  return {
    periodo,
    anterior,
    diasCorte,
    cuentaId,
    setPeriodo: (p: Periodo) => actualizar({ desde: p.desde, hasta: p.hasta }),
    setCuentaId: (id: string) => actualizar({ cuenta: id }),
    /** "?desde=…&hasta=…[&cuenta=…]" para enlaces que deben conservar el filtro. */
    queryString: `?${qs.toString()}`,
  }
}
