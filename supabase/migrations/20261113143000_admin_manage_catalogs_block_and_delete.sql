-- Migración: Gestión Administrativa de Catálogos (Bloqueo y Eliminación Completa)
-- Fecha: 2026-11-13

-- 1. Agregar columnas de bloqueo en public.catalogs
ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_catalogs_is_blocked ON public.catalogs(is_blocked);

-- 2. Políticas RLS para Administradores en public.catalogs
DROP POLICY IF EXISTS "Admins can view all catalogs" ON public.catalogs;
CREATE POLICY "Admins can view all catalogs"
  ON public.catalogs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all catalogs" ON public.catalogs;
CREATE POLICY "Admins can update all catalogs"
  ON public.catalogs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete all catalogs" ON public.catalogs;
CREATE POLICY "Admins can delete all catalogs"
  ON public.catalogs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 3. Políticas RLS para Administradores en public.products
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete all products" ON public.products;
CREATE POLICY "Admins can delete all products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 4. Función RPC para bloquear / desbloquear un catálogo de forma segura (SECURITY DEFINER)
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
  -- Verificar que el usuario sea administrador
  SELECT role INTO v_caller_role
  FROM public.users
  WHERE id = auth.uid();

  IF COALESCE(v_caller_role, 'user') <> 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden bloquear o desbloquear catálogos';
  END IF;

  -- Actualizar catálogo
  UPDATE public.catalogs
  SET 
    is_blocked = p_is_blocked,
    blocked_reason = CASE WHEN p_is_blocked THEN COALESCE(p_reason, 'Bloqueado por administración') ELSE NULL END,
    blocked_at = CASE WHEN p_is_blocked THEN NOW() ELSE NULL END,
    is_active = CASE WHEN p_is_blocked THEN false ELSE is_active END,
    updated_at = NOW()
  WHERE id = p_catalog_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catálogo no encontrado';
  END IF;

  RETURN to_jsonb(v_updated);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_block_catalog(UUID, BOOLEAN, TEXT) TO authenticated;

-- 5. Función RPC para eliminar un catálogo con toda su información asociada
CREATE OR REPLACE FUNCTION public.admin_delete_catalog(
  p_catalog_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_catalog RECORD;
  v_products_deleted INT := 0;
BEGIN
  -- Verificar que el usuario sea administrador
  SELECT role INTO v_caller_role
  FROM public.users
  WHERE id = auth.uid();

  IF COALESCE(v_caller_role, 'user') <> 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden eliminar catálogos desde el panel administrativo';
  END IF;

  -- Comprobar existencia del catálogo
  SELECT id, name, user_id INTO v_catalog
  FROM public.catalogs
  WHERE id = p_catalog_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El catálogo especificado no existe';
  END IF;

  -- Eliminar en cascada garantizada y ordenada:
  -- 1. Analytics / vistas
  BEGIN
    DELETE FROM public.analytics_views WHERE catalog_id = p_catalog_id;
  EXCEPTION WHEN undefined_table THEN
    -- Ignorar si la tabla no existe en algún entorno
    NULL;
  END;

  -- 2. Comisiones y afiliados
  BEGIN
    DELETE FROM public.commissions WHERE catalog_id = p_catalog_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.catalog_affiliates WHERE catalog_id = p_catalog_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 3. Miembros y seguidores
  BEGIN
    DELETE FROM public.catalog_members WHERE catalog_id = p_catalog_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.followed_catalogs WHERE catalog_id = p_catalog_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 4. Colas de mensajería
  BEGIN
    DELETE FROM public.wa_message_queue WHERE catalog_id = p_catalog_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 5. Categorías personalizadas
  BEGIN
    DELETE FROM public.categories WHERE catalog_id = p_catalog_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 6. Productos asociados
  DELETE FROM public.products WHERE catalog_id = p_catalog_id;
  GET DIAGNOSTICS v_products_deleted = ROW_COUNT;

  -- 7. Catálogo padre
  DELETE FROM public.catalogs WHERE id = p_catalog_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Catálogo y toda su información asociada eliminados correctamente',
    'deleted_catalog_id', p_catalog_id,
    'deleted_catalog_name', v_catalog.name,
    'products_count', v_products_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_catalog(UUID) TO authenticated;

-- 6. Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
