-- Supabase (lint 0011, function_search_path_mutable) marcaba estas 17
-- funciones por no fijar search_path: toman el del rol que las llama, así que
-- alguien que pudiera crear objetos en otro esquema podría hacer que usen los
-- suyos en vez de las tablas reales. Se fija a public (donde viven todas sus
-- tablas, que nombran sin esquema) + pg_temp al final. No se usa '' porque
-- los cuerpos no califican las tablas con public. y dejarían de encontrarlas.
ALTER FUNCTION public.actualizar_saldo_cuenta() SET search_path = public, pg_temp;
ALTER FUNCTION public.calcular_efecto_movimiento(public.movimientos) SET search_path = public, pg_temp;
ALTER FUNCTION public.crear_transferencia(uuid, uuid, numeric, text, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.editar_transferencia(uuid, uuid, uuid, numeric, text, timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.prevenir_cambio_estructura_transferencia() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevenir_cambio_saldo_inicial() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevenir_cambio_usuario_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.propagar_estado_transferencia() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_asignacion_objetivo_integridad() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_categoria_padre_integridad() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_conexion_integridad() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_fuente_movimiento_integridad() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_movimiento_integridad() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_presupuesto_integridad() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_regla_categorizacion_integridad() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_transaccion_recurrente_integridad() SET search_path = public, pg_temp;
ALTER FUNCTION public.validar_transferencia_integridad() SET search_path = public, pg_temp;
