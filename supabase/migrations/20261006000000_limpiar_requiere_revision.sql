-- requiere_revision nunca se apagaba: todo movimiento creado desde un correo
-- seguía en true aunque el usuario ya lo hubiera confirmado o cancelado. Desde
-- ahora el backend lo apaga al confirmar/cancelar; esto corrige los que ya
-- estaban revisados. Solo toca esa columna: no cambia montos ni estados, así
-- que no mueve ningún saldo.
UPDATE public.movimientos
SET requiere_revision = false
WHERE requiere_revision
  AND estado <> 'pending';
