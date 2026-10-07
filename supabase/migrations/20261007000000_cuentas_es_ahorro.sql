-- Marca qué cuentas son "ahorros" para el simulador financiero. El tipo de
-- cuenta no sirve para eso: un "Bolsillo de gastos" también es tipo savings.
-- No destructiva y no marca nada automáticamente: el usuario la activa en la
-- cuenta que corresponda.
ALTER TABLE public.cuentas
  ADD COLUMN es_ahorro boolean NOT NULL DEFAULT false;
