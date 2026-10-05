-- Cobros que el banco descuenta sin mandar alerta por correo, configurados por
-- cuenta para que la sincronización de Gmail los registre junto con el
-- movimiento que los causa:
--   comision_retiro: lo que cobra el plan por cada retiro (Bancolombia Plan
--                    Cero: $2.990 en cajero o corresponsal). 0 = no cobra.
--   cobra_gmf:       la cuenta NO está marcada como exenta del 4x1000, así que
--                    cada salida de plata paga el 0,4%.
ALTER TABLE public.cuentas
  ADD COLUMN comision_retiro numeric NOT NULL DEFAULT 0,
  ADD COLUMN cobra_gmf boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT cuentas_comision_retiro_no_negativa CHECK (comision_retiro >= 0);
