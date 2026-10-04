-- movimientos.descripcion es NOT NULL: sin descripción la función fallaba con 23502.
CREATE OR REPLACE FUNCTION public.crear_transferencia(p_cuenta_origen_id uuid, p_cuenta_destino_id uuid, p_monto numeric, p_descripcion text DEFAULT NULL::text, p_fecha_transferencia date DEFAULT CURRENT_DATE)
 RETURNS SETOF transferencias
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_usuario_id UUID;
    v_transferencia_id UUID;
    v_descripcion TEXT;
BEGIN
    v_usuario_id := usuario_actual_id();

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo determinar el usuario autenticado';
    END IF;

    IF p_monto IS NULL OR p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0';
    END IF;

    v_descripcion := COALESCE(NULLIF(btrim(p_descripcion), ''), 'Transferencia');

    INSERT INTO transferencias (usuario_id, cuenta_origen_id, cuenta_destino_id, monto, descripcion, fecha_transferencia, estado)
    VALUES (v_usuario_id, p_cuenta_origen_id, p_cuenta_destino_id, p_monto, v_descripcion, p_fecha_transferencia, 'completed')
    RETURNING id INTO v_transferencia_id;

    INSERT INTO movimientos (usuario_id, cuenta_id, tipo, monto, transferencia_id, descripcion, estado)
    VALUES (v_usuario_id, p_cuenta_origen_id, 'transfer', p_monto, v_transferencia_id, v_descripcion, 'confirmed');

    INSERT INTO movimientos (usuario_id, cuenta_id, tipo, monto, transferencia_id, descripcion, estado)
    VALUES (v_usuario_id, p_cuenta_destino_id, 'transfer', p_monto, v_transferencia_id, v_descripcion, 'confirmed');

    RETURN QUERY SELECT * FROM transferencias WHERE id = v_transferencia_id;
END;
$function$;
