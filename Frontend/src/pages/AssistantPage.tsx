import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, Send, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { SuggestedQuestions } from '@/components/assistant/SuggestedQuestions'
import { SpendForm } from '@/components/assistant/SpendForm'
import { SimulationResult } from '@/components/assistant/SimulationResult'
import { ProjectionResult } from '@/components/assistant/ProjectionResult'
import { SummaryResult } from '@/components/assistant/SummaryResult'
import { AiExplanation } from '@/components/assistant/AiExplanation'
import { usePreguntarAsistente, useSimularGasto, type SimularGastoInput } from '@/hooks/useAsistente'
import { formatCurrency } from '@/utils/currency'
import { useCuentas } from '@/hooks/useCuentas'
import { ApiError } from '@/lib/apiClient'
import type { RespuestaPregunta, ResultadoAsistente } from '@/types'

interface Turno {
  id: number
  pregunta: string
  respuesta: RespuestaPregunta | null
  error: string | null
}

/** Lo que FinanzIA entendió, para que el usuario vea si interpretó bien la pregunta. */
function textoEntendido(r: RespuestaPregunta): string | null {
  const p = r.parametros
  const ahorro = p?.ahorro_mensual ? `, ahorrando ${formatCurrency(p.ahorro_mensual)} al mes` : ''
  switch (r.herramienta) {
    case 'simular_gasto': {
      // De dónde sale: mejor lo que de verdad usó el cálculo que lo que se pidió.
      const fondos = r.resultado?.tipo === 'gasto' ? r.resultado.fondos : null
      const de = fondos
        ? fondos.origen === 'todas'
          ? 'todo tu dinero'
          : fondos.origen === 'ahorro'
            ? 'tus ahorros'
            : fondos.cuentas.map((c) => c.nombre).join(' + ')
        : p?.todas_las_cuentas
          ? 'todo tu dinero'
          : p?.cuentas?.length
            ? p.cuentas.join(' + ')
            : 'tus ahorros'
      return `simular gastar ${p?.monto ? formatCurrency(p.monto) : 'dinero'} de ${de}${p?.plazo_meses ? ` y recuperarlo en ${p.plazo_meses} meses` : ''}${ahorro}`
    }
    case 'proyeccion_objetivos':
      return `proyectar cuándo alcanzas tus objetivos${ahorro}`
    case 'resumen_financiero':
      return 'resumir tus finanzas: saldos, meses y categorías'
    default:
      return null
  }
}

function Resultado({ r }: { r: ResultadoAsistente }) {
  if (r.tipo === 'gasto') return <SimulationResult s={r} />
  if (r.tipo === 'proyeccion_objetivos') return <ProjectionResult r={r} />
  return <SummaryResult r={r} />
}

/**
 * Asistente / Simulador financiero. Preguntas libres: la IA entiende la
 * pregunta y elige el cálculo, FinanzIA lo hace con tus datos reales y la IA
 * lo explica. Nada de esto registra gastos ni cambia saldos.
 */
export function AssistantPage() {
  const preguntar = usePreguntarAsistente()
  const { data: cuentas } = useCuentas()
  // Una cuenta que no sea de ahorro, para el ejemplo "¿qué pasa si gasto de X?".
  const cuentaEjemplo = cuentas?.find((c) => c.activa && !c.es_pasivo && !c.es_ahorro)?.nombre
  const simular = useSimularGasto()
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [texto, setTexto] = useState('')
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)
  const ocupado = preguntar.isPending || simular.isPending

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turnos])

  function agregarTurno(pregunta: string): number {
    const id = Date.now()
    setTurnos((t) => [...t, { id, pregunta, respuesta: null, error: null }])
    return id
  }

  function completarTurno(id: number, cambios: Partial<Turno>) {
    setTurnos((t) => t.map((turno) => (turno.id === id ? { ...turno, ...cambios } : turno)))
  }

  function enviar(pregunta: string) {
    const limpia = pregunta.trim()
    if (!limpia || ocupado) return
    // Contexto para preguntas de seguimiento: lo que se preguntó y respondió.
    const historial = turnos
      .filter((t) => t.respuesta)
      .slice(-3)
      .map((t) => ({
        pregunta: t.pregunta,
        respuesta: t.respuesta?.explicacion?.texto ?? t.respuesta?.aclaracion ?? textoEntendido(t.respuesta!) ?? '',
      }))
    const id = agregarTurno(limpia)
    setTexto('')
    preguntar.mutate(
      { pregunta: limpia, historial },
      {
        onSuccess: (respuesta) => completarTurno(id, { respuesta }),
        onError: (err) => completarTurno(id, { error: err instanceof ApiError ? err.message : 'No se pudo responder. Intenta de nuevo.' }),
      }
    )
  }

  function simularConFormulario(input: SimularGastoInput, nombresCuentas: string[]) {
    const de = nombresCuentas.length > 0 ? nombresCuentas.join(' + ') : 'todo lo que tengo'
    const id = agregarTurno(
      `¿Qué pasa si gasto ${formatCurrency(input.monto)} de ${de}?${input.plazo_meses ? ` (recuperarlo en ${input.plazo_meses} meses)` : ''}`
    )
    simular.mutate(input, {
      onSuccess: (r) =>
        completarTurno(id, {
          respuesta: {
            herramienta: 'simular_gasto',
            parametros: {
              monto: input.monto,
              plazo_meses: input.plazo_meses ?? null,
              ahorro_mensual: input.ahorro_mensual ?? null,
              cuentas: nombresCuentas,
              todas_las_cuentas: nombresCuentas.length === 0,
            },
            aclaracion: null,
            resultado: r.simulacion,
            explicacion: r.explicacion,
            explicacion_error: r.explicacion_error,
          },
        }),
      onError: (err) => completarTurno(id, { error: err instanceof ApiError ? err.message : 'No se pudo simular. Intenta de nuevo.' }),
    })
  }

  function alPresionarTecla(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar(texto)
    }
  }

  const ultimaSimulacion = [...turnos].reverse().find((t) => t.respuesta?.resultado?.tipo === 'gasto')?.respuesta?.resultado
  const pedirAhorroMensual = ultimaSimulacion?.tipo === 'gasto' && ultimaSimulacion.advertencias.includes('ritmo_sin_datos')

  return (
    <div>
      <PageHeader
        title="Simulador"
        description="Pregúntale a FinanzIA sobre tu plata. Los números los calcula FinanzIA con tus datos; la IA solo los explica. Nada de esto registra gastos ni cambia saldos."
      />

      <div className="flex flex-col gap-5">
        {turnos.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm text-ink-400">
              <Sparkles className="size-4 text-violet-300" />
              Prueba con una de estas, o escribe la tuya:
            </p>
            <SuggestedQuestions onElegir={enviar} deshabilitado={ocupado} cuentaEjemplo={cuentaEjemplo} />
          </div>
        )}

        {turnos.map((t) => (
          <div key={t.id} className="flex flex-col gap-3">
            <div className="self-end rounded-2xl rounded-br-md bg-violet-500/20 px-4 py-2.5 text-sm text-ink-100 ring-1 ring-violet-500/30 sm:max-w-[75%]">
              {t.pregunta}
            </div>

            {!t.respuesta && !t.error && (
              <div className="flex items-center gap-2 text-sm text-ink-400">
                <Spinner />
                Calculando con tus datos…
              </div>
            )}

            {t.error && <p className="rounded-xl bg-coral-500/10 px-4 py-3 text-sm text-coral-400">{t.error}</p>}

            {t.respuesta?.aclaracion && (
              <Card className="text-sm text-ink-200">{t.respuesta.aclaracion}</Card>
            )}

            {t.respuesta?.resultado && (
              <>
                {textoEntendido(t.respuesta) && (
                  <p className="text-xs text-ink-500">Entendí: {textoEntendido(t.respuesta)}.</p>
                )}
                <Resultado r={t.respuesta.resultado} />
                <AiExplanation texto={t.respuesta.explicacion?.texto ?? null} error={t.respuesta.explicacion_error} />
              </>
            )}
          </div>
        ))}
        <div ref={finRef} />

        <Card className="flex flex-col gap-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alPresionarTecla}
            maxLength={500}
            rows={2}
            placeholder={turnos.length > 0 ? 'Pregunta algo más (ej. "¿y si fueran 6 meses?")' : 'Ej. ¿Qué pasa si gasto 400 mil de mis ahorros? o …de Bancolombia?'}
            className="w-full resize-none rounded-xl border border-white/10 bg-bg-raised px-3.5 py-2.5 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-violet-400"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFormularioAbierto((v) => !v)}
              className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-200"
            >
              <ChevronDown className={`size-3.5 transition ${formularioAbierto ? 'rotate-180' : ''}`} />
              Usar formulario para simular un gasto
            </button>
            <Button onClick={() => enviar(texto)} disabled={!texto.trim()} loading={preguntar.isPending}>
              <Send className="size-4" />
              Preguntar
            </Button>
          </div>
          {formularioAbierto && (
            <div className="border-t border-white/10 pt-4">
              <SpendForm pedirAhorroMensual={pedirAhorroMensual} enviando={simular.isPending} onSimular={simularConFormulario} />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
