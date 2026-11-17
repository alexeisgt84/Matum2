-- Migración: Restaurar estado activo al desbloquear un catálogo
-- Fecha: 2026-11-17

-- 1. Activar catálogos desbloqueados que quedaron inactivos tras un desbloqueo previo
UPDATE public.catalogs
SET is_active = true, updated_at = NOW()
WHERE is_blocked = false AND is_active = false;

-- 2. Actualizar la función RPC para que al desbloquear un catálogo vuelva a quedar activo (is_active = NOT p_is_blocked)
CREATE OR REPLACE FUNCTION public.admin_toggle_block_catalog(
  p_catalog_id UUID,
  p_is_blocked BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_updated RECORD;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.users
  WHERE id = auth.uid();

  IF COALESCE(v_caller_role, 'user') <> 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden bloquear o desbloquear catálogos';
  END IF;

  UPDATE public.catalogs
  SET 
    is_blocked = p_is_blocked,
    blocked_reason = CASE WHEN p_is_blocked THEN COALESCE(p_reason, 'Bloqueado por administración') ELSE NULL END,
    blocked_at = CASE WHEN p_is_blocked THEN NOW() ELSE NULL END,
    is_active = NOT p_is_blocked,
    updated_at = NOW()
  WHERE id = p_catalog_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catálogo no encontrado';
  END IF;

  RETURN to_jsonb(v_updated);
END;
$$;

NOTIFY pgrst, 'reload schema';
