-- Migración: Comisiones por producto (CUP y USD) y montos mínimos duales
-- Fecha: 2026-10-29

-- 1. Campos de comisión en cada producto
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_currency TEXT DEFAULT 'CUP';

-- 2. Montos mínimos de retiro en catalogs (tanto en CUP como en USD)
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS min_payout_amount_cup NUMERIC DEFAULT 0;
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS min_payout_amount_usd NUMERIC DEFAULT 0;

-- 3. Soporte dual en commissions para comisiones en CUP y USD
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS commission_cup NUMERIC DEFAULT 0;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS commission_usd NUMERIC DEFAULT 0;
