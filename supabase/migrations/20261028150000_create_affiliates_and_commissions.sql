-- Migración: Sistema de Afiliados y Comisiones para Catálogos
-- Fecha: 2026-10-28

-- 1. Agregar columnas para el código de afiliado y método de cobro en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_info JSONB DEFAULT '{}'::jsonb;

-- Asignar código de referido inicial a los usuarios existentes que no tengan uno
UPDATE users 
SET referral_code = 'ref_' || SUBSTRING(id::text FROM 1 FOR 6)
WHERE referral_code IS NULL;

-- 2. Agregar configuración de afiliados en catalogs
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS enable_affiliates BOOLEAN DEFAULT false;
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage'; -- 'percentage' | 'fixed'
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 10;       -- Ej: 10% o 10 CUP/USD
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS min_payout_amount NUMERIC DEFAULT 0;

-- 3. Crear tabla commissions
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
    affiliate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_ref TEXT,
    sale_total NUMERIC NOT NULL DEFAULT 0,
    commission_total NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CUP',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    buyer_name TEXT,
    buyer_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_commissions_catalog_id ON commissions(catalog_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Trigger de updated_at para commissions
DROP TRIGGER IF EXISTS update_commissions_updated_at ON commissions;
CREATE TRIGGER update_commissions_updated_at
    BEFORE UPDATE ON commissions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 4. Habilitar Row Level Security (RLS) en commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Dueños del catálogo pueden ver todas las comisiones de su catálogo
DROP POLICY IF EXISTS "Catalog owners can view their catalog commissions" ON commissions;
CREATE POLICY "Catalog owners can view their catalog commissions"
    ON commissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM catalogs
            WHERE catalogs.id = commissions.catalog_id
            AND catalogs.user_id = auth.uid()
        )
    );

-- Afiliados pueden ver sus propias comisiones
DROP POLICY IF EXISTS "Affiliates can view their own commissions" ON commissions;
CREATE POLICY "Affiliates can view their own commissions"
    ON commissions FOR SELECT
    USING (
        affiliate_id = auth.uid()
    );

-- Permitir registrar comisiones pendientes (desde el frontend al enviar pedido)
DROP POLICY IF EXISTS "Anyone can insert pending commissions" ON commissions;
CREATE POLICY "Anyone can insert pending commissions"
    ON commissions FOR INSERT
    WITH CHECK (
        status = 'pending'
    );

-- Dueños del catálogo pueden actualizar el estado de las comisiones (aprobar, pagar, cancelar)
DROP POLICY IF EXISTS "Catalog owners can update their catalog commissions" ON commissions;
CREATE POLICY "Catalog owners can update their catalog commissions"
    ON commissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM catalogs
            WHERE catalogs.id = commissions.catalog_id
            AND catalogs.user_id = auth.uid()
        )
    );

-- Dueños del catálogo pueden eliminar comisiones
DROP POLICY IF EXISTS "Catalog owners can delete their catalog commissions" ON commissions;
CREATE POLICY "Catalog owners can delete their catalog commissions"
    ON commissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM catalogs
            WHERE catalogs.id = commissions.catalog_id
            AND catalogs.user_id = auth.uid()
        )
    );
