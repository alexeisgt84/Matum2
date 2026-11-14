-- Migración: Control administrativo de creación de catálogos (global y por usuario)
-- Fecha: 2026-11-14

-- 1. Agregar columna can_create_catalogs a public.users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS can_create_catalogs BOOLEAN NOT NULL DEFAULT true;

-- 2. Insertar configuraciones por defecto en public.system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES
  (
    'allow_user_catalog_creation',
    'true',
    'Permitir a los usuarios crear nuevos catálogos globalmente'
  ),
  (
    'disabled_catalog_creation_users',
    '[]',
    'Lista JSON de IDs de usuarios con la creación de catálogos desactivada'
  )
ON CONFLICT (key) DO NOTHING;

-- 3. Función auxiliar SECURITY DEFINER para verificar rol de administrador
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_role TEXT;
BEGIN
  v_uid := COALESCE(auth.uid(), p_user_id);
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT role::text
  INTO v_role
  FROM public.users
  WHERE id = v_uid;

  RETURN COALESCE(v_role, 'user') = 'admin';
END;
$$;

-- 4. Políticas RLS corregidas en public.system_settings y public.users (con WITH CHECK explícito para INSERT/UPSERT/UPDATE)
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
CREATE POLICY "Anyone can read system settings"
  ON public.system_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify system settings" ON public.system_settings;
CREATE POLICY "Only admins can modify system settings"
  ON public.system_settings FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 5. Función RPC SECURITY DEFINER para actualizar system_settings desde el panel admin
CREATE OR REPLACE FUNCTION public.admin_update_system_setting(
  p_key TEXT,
  p_value TEXT,
  p_description TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  IF NOT public.is_admin_user(p_admin_id) THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden modificar la configuración del sistema';
  END IF;

  INSERT INTO public.system_settings (key, value, description, updated_at)
  VALUES (
    p_key,
    p_value,
    COALESCE(p_description, ''),
    NOW()
  )
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = COALESCE(p_description, public.system_settings.description),
    updated_at = NOW()
  RETURNING * INTO v_updated;

  RETURN to_jsonb(v_updated);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_system_setting(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

-- 6. Función RPC SECURITY DEFINER para alternar el permiso individual de un usuario
CREATE OR REPLACE FUNCTION public.admin_toggle_user_catalog_creation(
  p_user_id UUID,
  p_can_create BOOLEAN,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_raw TEXT;
  v_current_array JSONB := '[]'::jsonb;
  v_next_array JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin_user(p_admin_id) THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden modificar permisos de usuarios';
  END IF;

  -- Actualizar columna en public.users
  UPDATE public.users
  SET can_create_catalogs = p_can_create,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Sincronizar lista JSON en public.system_settings
  SELECT value INTO v_current_raw
  FROM public.system_settings
  WHERE key = 'disabled_catalog_creation_users';

  BEGIN
    IF v_current_raw IS NOT NULL AND TRIM(v_current_raw) <> '' THEN
      v_current_array := v_current_raw::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_current_array := '[]'::jsonb;
  END;

  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  INTO v_next_array
  FROM jsonb_array_elements_text(v_current_array) AS elem
  WHERE elem <> p_user_id::text;

  IF NOT p_can_create THEN
    v_next_array := v_next_array || jsonb_build_array(p_user_id::text);
  END IF;

  INSERT INTO public.system_settings (key, value, description, updated_at)
  VALUES (
    'disabled_catalog_creation_users',
    v_next_array::text,
    'Lista JSON de IDs de usuarios con la creación de catálogos desactivada',
    NOW()
  )
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'can_create_catalogs', p_can_create
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_user_catalog_creation(UUID, BOOLEAN, UUID) TO anon, authenticated;

-- 7. Función y trigger para validar permiso de creación de catálogos
CREATE OR REPLACE FUNCTION public.enforce_catalog_creation_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_role TEXT;
  v_can_create BOOLEAN;
  v_global_setting TEXT;
  v_disabled_users TEXT;
  v_is_user_disabled BOOLEAN := false;
BEGIN
  v_uid := auth.uid();

  -- Permitir operaciones administrativas directas sin sesión de usuario
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Consultar rol y permiso individual del usuario
  SELECT role::text, can_create_catalogs
  INTO v_role, v_can_create
  FROM public.users
  WHERE id = v_uid;

  -- Los administradores siempre pueden crear catálogos
  IF COALESCE(v_role, 'user') = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Verificar permiso global en system_settings
  SELECT value
  INTO v_global_setting
  FROM public.system_settings
  WHERE key = 'allow_user_catalog_creation';

  IF LOWER(TRIM(COALESCE(v_global_setting, 'true'))) = 'false' THEN
    RAISE EXCEPTION 'La creación de catálogos está desactivada temporalmente por el administrador.';
  END IF;

  -- Verificar columna individual del usuario
  IF COALESCE(v_can_create, true) = false THEN
    RAISE EXCEPTION 'La creación de catálogos ha sido desactivada para tu cuenta por el administrador.';
  END IF;

  -- Verificar lista JSON de usuarios bloqueados en system_settings
  SELECT value
  INTO v_disabled_users
  FROM public.system_settings
  WHERE key = 'disabled_catalog_creation_users';

  IF v_disabled_users IS NOT NULL AND TRIM(v_disabled_users) <> '' THEN
    BEGIN
      v_is_user_disabled := (v_disabled_users::jsonb ? v_uid::text);
    EXCEPTION WHEN OTHERS THEN
      v_is_user_disabled := false;
    END;

    IF v_is_user_disabled THEN
      RAISE EXCEPTION 'La creación de catálogos ha sido desactivada para tu cuenta por el administrador.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_catalog_creation_permission ON public.catalogs;
CREATE TRIGGER trg_enforce_catalog_creation_permission
  BEFORE INSERT ON public.catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_catalog_creation_permission();

-- 8. Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
