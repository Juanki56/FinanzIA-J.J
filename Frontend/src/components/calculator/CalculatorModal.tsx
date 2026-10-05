import { useState } from 'react'
import { clsx } from 'clsx'
import { Modal } from '@/components/ui/Modal'
import { numeroAToken, type Token } from '@/utils/calculadora'
import { BasicCalculator } from './BasicCalculator'
import { AccountsSum } from './AccountsSum'

type Pestana = 'normal' | 'cuentas'

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'normal', etiqueta: 'Normal' },
  { id: 'cuentas', etiqueta: 'Sumar cuentas' },
]

export function CalculatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pestana, setPestana] = useState<Pestana>('normal')
  // La expresión vive aquí (no en BasicCalculator) para que sobreviva al
  // cambiar de pestaña y para poder traer el total de "Sumar cuentas".
  const [tokens, setTokens] = useState<Token[]>([])

  return (
    <Modal open={open} onClose={onClose} title="Calculadora" maxWidth="max-w-sm">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1" role="tablist">
        {PESTANAS.map(({ id, etiqueta }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            onClick={() => setPestana(id)}
            className={clsx(
              'rounded-lg py-2 text-sm font-semibold transition',
              pestana === id ? 'bg-white/10 text-ink-100' : 'text-ink-400 hover:text-ink-200'
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'normal' ? (
        <BasicCalculator tokens={tokens} onChange={setTokens} />
      ) : (
        <AccountsSum
          onUsarTotal={(total) => {
            setTokens([numeroAToken(total)])
            setPestana('normal')
          }}
        />
      )}
    </Modal>
  )
}
