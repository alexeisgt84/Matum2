-- Agregar columna text_color a la tabla catalogs
ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#ffffff';
