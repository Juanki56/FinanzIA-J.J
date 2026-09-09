import { motion } from 'framer-motion'

const COLORES = ['#9256ff', '#22d3ee', '#f742e0', '#2fe3a8', '#ffb703', '#fb5678']

// Offsets pseudo-aleatorios pero deterministas (sin Math.random) para que el
// render siga siendo puro: cada pieza usa funciones trigonométricas de su índice.
function piezaEnIndice(i: number, count: number) {
  const seed = (i * 137.5) % 360
  const rad = (seed * Math.PI) / 180
  return {
    id: i,
    x: Math.sin(rad) * 130,
    y: 120 + Math.abs(Math.cos(rad * 1.7)) * 70,
    rotate: seed * 2,
    delay: (i / count) * 0.25,
    color: COLORES[i % COLORES.length],
    size: 6 + ((i * 5) % 7),
  }
}

export function Confetti({ count = 24 }: { count?: number }) {
  const piezas = Array.from({ length: count }, (_, i) => piezaEnIndice(i, count))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {piezas.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/3 block rounded-sm"
          style={{ width: p.size, height: p.size * 0.4, backgroundColor: p.color }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate }}
          transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
