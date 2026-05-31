-- Migración para seguimiento e importación de catálogos

-- 1. Función para generar códigos de seguimiento únicos
CREATE OR REPLACE FUNCTION generate_follow_code() RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    -- Generar código tipo MAT-XXXXXX en mayúsculas
    code := 'MAT-' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM catalogs WHERE follow_code = code) INTO exists_code;
    IF NOT exists_code THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Añadir columna follow_code a la tabla catalogs
ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS follow_code TEXT UNIQUE;

-- Generar código para catálogos existentes que no tengan uno
UPDATE public.catalogs 
SET follow_code = generate_follow_code() 
WHERE follow_code IS NULL;

-- Hacer el default automático para futuras inserciones
ALTER TABLE public.catalogs 
ALTER COLUMN follow_code SET DEFAULT generate_follow_code();

-- 3. Añadir columnas a la tabla products para importación
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS parent_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS base_price NUMERIC,
ADD COLUMN IF NOT EXISTS is_discontinued BOOLEAN DEFAULT false;

-- 4. Crear tabla followed_catalogs
CREATE TABLE IF NOT EXISTS public.followed_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, catalog_id)
);

-- Habilitar RLS en followed_catalogs
ALTER TABLE public.followed_catalogs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view their own followed catalogs"
    ON public.followed_catalogs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can follow catalogs"
    ON public.followed_catalogs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow catalogs"
    ON public.followed_catalogs
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Función y trigger para sincronizar información de productos importados
CREATE OR REPLACE FUNCTION sync_imported_product() RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET 
        name = NEW.name,
        description = NEW.description,
        imagen_url = NEW.imagen_url,
        is_out_of_stock = NEW.is_out_of_stock,
        stock_status = NEW.stock_status,
        base_price = NEW.price, -- El precio del padre se actualiza en base_price
        updated_at = now()
    WHERE parent_product_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_sync_imported_products
AFTER UPDATE ON public.products
FOR EACH ROW
WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.imagen_url IS DISTINCT FROM NEW.imagen_url OR
    OLD.is_out_of_stock IS DISTINCT FROM NEW.is_out_of_stock OR
    OLD.stock_status IS DISTINCT FROM NEW.stock_status OR
    OLD.price IS DISTINCT FROM NEW.price
)
EXECUTE FUNCTION sync_imported_product();

-- 6. Función y trigger para manejar la eliminación del producto de origen
CREATE OR REPLACE FUNCTION handle_deleted_parent_product() RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET 
        is_discontinued = true,
        is_active = false,
        updated_at = now()
    WHERE parent_product_id = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_handle_deleted_parent_product
BEFORE DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION handle_deleted_parent_product();
