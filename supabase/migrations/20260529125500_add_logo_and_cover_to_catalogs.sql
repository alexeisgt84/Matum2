-- Agregar columnas de logo y portada a la tabla catalogs
ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT;
