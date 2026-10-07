interface SuggestedQuestionsProps {
  onElegir: (pregunta: string) => void
  deshabilitado?: boolean
  /** Nombre de una de tus cuentas, para mostrar que se puede simular desde cualquier cuenta. */
  cuentaEjemplo?: string
}

/** Preguntas de ejemplo: al tocar una se pregunta tal cual. */
export function SuggestedQuestions({ onElegir, deshabilitado, cuentaEjemplo }: SuggestedQuestionsProps) {
  const ejemplos = [
    '¿Qué pasa si gasto 400 mil de mis ahorros?',
    ...(cuentaEjemplo ? [`¿Qué pasa si gasto 200 mil de ${cuentaEjemplo}?`] : []),
    'Si gasto 400 mil, ¿cuánto debo ahorrar para recuperarlo en 3 meses?',
    '¿Cuándo alcanzo mi objetivo si ahorro 300 mil al mes?',
    '¿En qué estoy gastando más este mes?',
    '¿Cómo voy este mes comparado con el anterior?',
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {ejemplos.map((texto) => (
        <button
          key={texto}
          type="button"
          disabled={deshabilitado}
          onClick={() => onElegir(texto)}
          className="rounded-full bg-white/[0.04] px-3.5 py-2 text-left text-sm text-ink-300 ring-1 ring-white/10 transition hover:text-ink-100 hover:ring-violet-500/40 disabled:opacity-50"
        >
          {texto}
        </button>
      ))}
    </div>
  )
}
