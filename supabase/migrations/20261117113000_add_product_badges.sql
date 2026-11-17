-- Migración: Sistema de etiquetas comerciales (product badges) en productos
-- Fecha: 2026-11-17

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS badges TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

-- Sincronizar productos existentes marcados como destacados
UPDATE public.products
SET badges = array_append(COALESCE(badges, '{}'::TEXT[]), 'featured')
WHERE is_featured = true
  AND NOT ('featured' = ANY(COALESCE(badges, '{}'::TEXT[])));
