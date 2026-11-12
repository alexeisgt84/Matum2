-- Restringir la creación/edición de catálogos tipo Nazaar ('marketplace') exclusivamente al administrador de la plataforma Matum2

CREATE OR REPLACE FUNCTION public.enforce_admin_only_marketplace_catalog()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_uid UUID;
BEGIN
  v_uid := auth.uid();

  -- Permitir operaciones administrativas directas con service_role o SQL sin sesión de usuario
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Normalizar valor nulo
  IF NEW.catalog_type IS NULL OR TRIM(NEW.catalog_type) = '' THEN
    NEW.catalog_type := 'store';
  END IF;

  -- Verificar si se intenta crear o cambiar a/desde 'marketplace'
  IF TG_OP = 'INSERT' THEN
    IF NEW.catalog_type = 'marketplace' THEN
      SELECT role INTO v_role FROM public.users WHERE id = v_uid;
      IF COALESCE(v_role, 'user') <> 'admin' THEN
        RAISE EXCEPTION 'Solo el administrador de la plataforma Matum2 puede crear grupos o catálogos tipo Nazaar.';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.catalog_type IS DISTINCT FROM OLD.catalog_type)
       AND (NEW.catalog_type = 'marketplace' OR OLD.catalog_type = 'marketplace') THEN
      SELECT role INTO v_role FROM public.users WHERE id = v_uid;
      IF COALESCE(v_role, 'user') <> 'admin' THEN
        RAISE EXCEPTION 'Solo el administrador de la plataforma Matum2 puede asignar o modificar el tipo Nazaar en un catálogo.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_admin_only_marketplace_catalog ON public.catalogs;
CREATE TRIGGER trg_enforce_admin_only_marketplace_catalog
  BEFORE INSERT OR UPDATE ON public.catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_only_marketplace_catalog();

-- Política para que administradores puedan ver y gestionar catálogos tipo marketplace si es necesario
DROP POLICY IF EXISTS "Admins can view all marketplace catalogs" ON public.catalogs;
CREATE POLICY "Admins can view all marketplace catalogs"
  ON public.catalogs
  FOR SELECT
  TO authenticated
  USING (
    catalog_type = 'marketplace'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
