-- Agregar columna title_color a la tabla catalogs
ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#ffffff';
