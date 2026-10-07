import { Bot } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface AiExplanationProps {
  texto: string | null
  error: string | null
}

/** La explicación de la IA va siempre DEBAJO de los números: los números son la fuente de verdad. */
export function AiExplanation({ texto, error }: AiExplanationProps) {
  return (
    <Card className="ring-1 ring-violet-500/30">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-300">
        <Bot className="size-4" />
        FinanzIA te explica
      </p>
      {texto ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-200">{texto}</p>
      ) : (
        <p className="text-sm text-ink-400">{error ?? 'La explicación no está disponible en este momento.'}</p>
      )}
      <p className="mt-3 text-[11px] text-ink-500">
        Las cifras las calcula FinanzIA; la IA solo las explica. Si la IA menciona una cifra que no salió del cálculo, la
        explicación se descarta.
      </p>
    </Card>
  )
}
