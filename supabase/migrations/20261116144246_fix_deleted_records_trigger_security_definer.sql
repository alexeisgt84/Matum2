-- Hacer que las funciones de trigger de borrado corran con SECURITY DEFINER
-- y search_path fijado a public para que puedan registrar en public.deleted_records
-- (cuya RLS solo permite service_role) y actualizar productos hijos vinculados
-- después de que el usuario haya pasado la política RLS de DELETE en la tabla origen.

CREATE OR REPLACE FUNCTION public.log_product_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deleted_records (table_name, record_id, catalog_id)
  VALUES ('products', OLD.id::text, OLD.catalog_id);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_category_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.catalog_id IS NOT NULL THEN
    INSERT INTO public.deleted_records (table_name, record_id, catalog_id)
    VALUES ('categories', OLD.id::text, OLD.catalog_id);
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_catalog_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deleted_records (table_name, record_id, catalog_id)
  VALUES ('catalogs', OLD.id::text, OLD.id);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_deleted_parent_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET
    is_discontinued = true,
    is_active = false,
    updated_at = now()
  WHERE parent_product_id = OLD.id;

  RETURN OLD;
END;
$$;
