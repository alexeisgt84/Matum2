-- Agregar columnas de colores personalizados a la tabla catalogs
ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#ff782e',
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#0a0a0a',
ADD COLUMN IF NOT EXISTS surface_color TEXT DEFAULT '#1a1a1a';
