import { clsx } from 'clsx'

/** Una fila "etiqueta ……… valor" de los resultados del simulador. `fuerte` = total, con línea arriba. */
export function ResultRow({ etiqueta, valor, tono, fuerte }: { etiqueta: string; valor: string; tono?: 'coral' | 'mint'; fuerte?: boolean }) {
  return (
    <div className={clsx('flex items-baseline justify-between gap-4 py-1.5', fuerte && 'border-t border-white/10 pt-2.5')}>
      <span className={clsx('text-sm', fuerte ? 'text-ink-100' : 'text-ink-400')}>{etiqueta}</span>
      <span
        className={clsx(
          'font-tabular',
          fuerte ? 'font-display text-xl' : 'text-sm',
          tono === 'coral' ? 'text-coral-400' : tono === 'mint' ? 'text-mint-400' : 'text-ink-100'
        )}
      >
        {valor}
      </span>
    </div>
  )
}