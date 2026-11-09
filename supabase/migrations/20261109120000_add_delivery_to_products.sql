-- Migración: Costo de domicilio (CUP y USD) y tiempo de entrega (horas o días) por producto
-- Fecha: 2026-11-09

ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_currency TEXT DEFAULT 'CUP';
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time_value NUMERIC DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time_unit TEXT DEFAULT 'hours';
