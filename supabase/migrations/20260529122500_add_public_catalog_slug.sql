-- Agregar columnas a la tabla catalogs
ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Crear un índice en slug para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_catalogs_slug ON public.catalogs(slug);

-- Eliminar políticas públicas previas si existen
DROP POLICY IF EXISTS "Permitir lectura pública de catálogos activos y públicos" ON public.catalogs;
DROP POLICY IF EXISTS "Permitir lectura pública de productos de catálogos públicos" ON public.products;

-- Crear la política RLS para lectura pública de catálogos
CREATE POLICY "Permitir lectura pública de catálogos activos y públicos" 
ON public.catalogs 
FOR SELECT 
TO public 
USING (is_active = true AND is_public = true);

-- Crear la política RLS para lectura pública de productos
CREATE POLICY "Permitir lectura pública de productos de catálogos públicos" 
ON public.products 
FOR SELECT 
TO public 
USING (
  EXISTS (
    SELECT 1 
    FROM public.catalogs 
    WHERE catalogs.id = products.catalog_id 
      AND catalogs.is_active = true 
      AND catalogs.is_public = true
  )
);
