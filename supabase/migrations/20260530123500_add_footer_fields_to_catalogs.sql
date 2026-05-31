-- Agregar columnas para el pie de página de la tienda a la tabla catalogs
ALTER TABLE public.catalogs
ADD COLUMN IF NOT EXISTS footer_address TEXT,
ADD COLUMN IF NOT EXISTS footer_phone TEXT,
ADD COLUMN IF NOT EXISTS footer_email TEXT,
ADD COLUMN IF NOT EXISTS footer_schedule TEXT,
ADD COLUMN IF NOT EXISTS footer_instagram TEXT,
ADD COLUMN IF NOT EXISTS footer_facebook TEXT;
