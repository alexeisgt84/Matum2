-- Migración: Corrección del tipo de record_id en deleted_records para permitir borrado de categorías y catálogos
-- Fecha: 2026-11-14

-- 1. Modificar record_id a tipo TEXT en deleted_records
ALTER TABLE public.deleted_records 
ALTER COLUMN record_id TYPE TEXT USING record_id::text;

-- 2. Asegurar que las funciones de trigger conviertan a TEXT
CREATE OR REPLACE FUNCTION public.log_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.catalog_id IS NOT NULL THEN
    INSERT INTO public.deleted_records (table_name, record_id, catalog_id)
    VALUES ('categories', OLD.id::text, OLD.catalog_id);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_product_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.deleted_records (table_name, record_id, catalog_id)
  VALUES ('products', OLD.id::text, OLD.catalog_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_catalog_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.deleted_records (table_name, record_id, catalog_id)
  VALUES ('catalogs', OLD.id::text, OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Robustecer admin_delete_catalog para garantizar borrado en cascada absoluto
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

  -- 1. Analytics y vistas
  DELETE FROM public.analytics_views WHERE catalog_id = p_catalog_id;

  -- 2. Comisiones y afiliados
  DELETE FROM public.commissions WHERE catalog_id = p_catalog_id;
  DELETE FROM public.catalog_affiliates WHERE catalog_id = p_catalog_id;

  -- 3. Colaboradores y seguidores
  DELETE FROM public.catalog_members WHERE catalog_id = p_catalog_id;
  DELETE FROM public.followed_catalogs WHERE catalog_id = p_catalog_id;

  -- 4. Mensajería WhatsApp y colas
  DELETE FROM public.wa_message_queue WHERE catalog_id = p_catalog_id;
  DELETE FROM public.whatsapp_messages WHERE catalog_id = p_catalog_id;
  DELETE FROM public.messages WHERE catalog_id = p_catalog_id;
  DELETE FROM public.sequence_items WHERE catalog_id = p_catalog_id;
  DELETE FROM public.scheduled_sends WHERE catalog_id = p_catalog_id;
  DELETE FROM public.automation_sequences WHERE catalog_id = p_catalog_id;
  DELETE FROM public.whatsapp_groups WHERE catalog_id = p_catalog_id;
  DELETE FROM public.evolution_instances WHERE catalog_id = p_catalog_id;
  DELETE FROM public.sending_logs WHERE catalog_id = p_catalog_id;
  DELETE FROM public.trusted_senders WHERE catalog_id = p_catalog_id;

  -- 5. Categorías personalizadas
  DELETE FROM public.categories WHERE catalog_id = p_catalog_id;

  -- 6. Productos asociados (desvincular primero si hay productos hijos que referencian a estos)
  UPDATE public.products 
  SET parent_product_id = NULL 
  WHERE parent_product_id IN (SELECT id FROM public.products WHERE catalog_id = p_catalog_id);

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
NOTIFY pgrst, 'reload schema';
