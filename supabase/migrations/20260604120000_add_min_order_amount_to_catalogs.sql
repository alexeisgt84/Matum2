-- Migración para añadir monto mínimo de compra a los catálogos
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC DEFAULT 0.0;
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS min_order_currency TEXT DEFAULT 'CUP';
