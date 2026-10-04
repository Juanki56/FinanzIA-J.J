-- Permite editar cuentas, monto, fecha y descripción de una transferencia.
--
-- La estructura (cuentas/monto) sigue siendo inmutable para cualquier UPDATE
-- directo; solo editar_transferencia() puede cambiarla, porque es la única que
-- también mueve los dos movimientos asociados y deja los saldos cuadrados.

CREATE OR REPLACE FUNCTION public.prevenir_cambio_estructura_transferencia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.usuario_id <> OLD.usuario_id THEN
        RAISE EXCEPTION 'No se puede modificar el usuario de una transferencia existente (id=%)', OLD.id;
    END IF;

    IF (NEW.cuenta_origen_id <> OLD.cuenta_origen_id
        OR NEW.cuenta_destino_id <> OLD.cuenta_destino_id
        OR NEW.monto <> OLD.monto)
       AND current_setting('finanzia.editando_transferencia', true) IS DISTINCT FROM 'on'
    THEN
        RAISE EXCEPTION 'No se puede modificar cuentas o monto de una transferencia existente (id=%). Usa editar_transferencia().', OLD.id;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.editar_transferencia(
    p_id uuid,
    p_cuenta_origen_id uuid,
    p_cuenta_destino_id uuid,
    p_monto numeric,
    p_descripcion text DEFAULT NULL::text,
    p_fecha_transferencia timestamptz DEFAULT NULL
)
 RETURNS SETOF transferencias
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_usuario_id UUID;
    v_transferencia transferencias;
    v_mov_origen_id UUID;
    v_mov_destino_id UUID;
    v_estado_movimiento VARCHAR(20);
    v_descripcion TEXT;
    v_fecha TIMESTAMPTZ;
BEGIN
    v_usuario_id := usuario_actual_id();

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo determinar el usuario autenticado';
    END IF;

    IF p_monto IS NULL OR p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0';
    END IF;

    IF p_cuenta_origen_id = p_cuenta_destino_id THEN
        RAISE EXCEPTION 'La cuenta de origen y destino deben ser diferentes';
    END IF;

    SELECT * INTO v_transferencia
    FROM transferencias
    WHERE id = p_id AND usuario_id = v_usuario_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transferencia no encontrada';
    END IF;

    IF v_transferencia.estado = 'cancelled' THEN
        RAISE EXCEPTION 'No se puede editar una transferencia cancelada';
    END IF;

    v_descripcion := COALESCE(NULLIF(btrim(p_descripcion), ''), 'Transferencia');
    v_fecha := COALESCE(p_fecha_transferencia, v_transferencia.fecha_transferencia);
    v_estado_movimiento := CASE v_transferencia.estado WHEN 'pending' THEN 'pending' ELSE 'confirmed' END;

    SELECT id INTO v_mov_origen_id FROM movimientos
    WHERE transferencia_id = p_id AND cuenta_id = v_transferencia.cuenta_origen_id;

    SELECT id INTO v_mov_destino_id FROM movimientos
    WHERE transferencia_id = p_id AND cuenta_id = v_transferencia.cuenta_destino_id;

    -- 1) Anular el efecto actual: el efecto de un movimiento transfer se calcula
    --    con las cuentas vigentes de la transferencia, así que hay que revertirlo
    --    ANTES de cambiarlas.
    UPDATE movimientos SET estado = 'cancelled' WHERE transferencia_id = p_id;

    -- 2) Cambiar la transferencia (el estado no cambia, así que no se dispara la propagación).
    PERFORM set_config('finanzia.editando_transferencia', 'on', true);

    UPDATE transferencias
    SET cuenta_origen_id = p_cuenta_origen_id,
        cuenta_destino_id = p_cuenta_destino_id,
        monto = p_monto,
        descripcion = v_descripcion,
        fecha_transferencia = v_fecha,
        updated_at = now()
    WHERE id = p_id;

    PERFORM set_config('finanzia.editando_transferencia', 'off', true);

    -- 3) Reaplicar el efecto con los datos nuevos.
    UPDATE movimientos
    SET cuenta_id = p_cuenta_origen_id, monto = p_monto, descripcion = v_descripcion,
        fecha_movimiento = v_fecha, estado = v_estado_movimiento
    WHERE id = v_mov_origen_id;

    UPDATE movimientos
    SET cuenta_id = p_cuenta_destino_id, monto = p_monto, descripcion = v_descripcion,
        fecha_movimiento = v_fecha, estado = v_estado_movimiento
    WHERE id = v_mov_destino_id;

    RETURN QUERY SELECT * FROM transferencias WHERE id = p_id;
END;
$function$;
