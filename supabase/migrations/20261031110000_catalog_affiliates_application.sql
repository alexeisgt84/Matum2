-- Migración: Sistema de Aprobación de Afiliados por Catálogo
-- Fecha: 2026-10-31

-- 1. Crear tabla catalog_affiliates
CREATE TABLE IF NOT EXISTS public.catalog_affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(catalog_id, user_id)
);

-- Permisos para roles de Supabase (Data API)
GRANT ALL ON TABLE public.catalog_affiliates TO authenticated;
GRANT ALL ON TABLE public.catalog_affiliates TO service_role;

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_catalog_affiliates_catalog_id ON public.catalog_affiliates(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_affiliates_user_id ON public.catalog_affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_affiliates_status ON public.catalog_affiliates(catalog_id, status);

-- Trigger de updated_at para catalog_affiliates
DROP TRIGGER IF EXISTS update_catalog_affiliates_updated_at ON public.catalog_affiliates;
CREATE TRIGGER update_catalog_affiliates_updated_at
    BEFORE UPDATE ON public.catalog_affiliates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 2. Habilitar RLS
ALTER TABLE public.catalog_affiliates ENABLE ROW LEVEL SECURITY;

-- Dueños del catálogo pueden ver todos los afiliados de su catálogo
DROP POLICY IF EXISTS "Catalog owners can view catalog affiliates" ON public.catalog_affiliates;
CREATE POLICY "Catalog owners can view catalog affiliates"
    ON public.catalog_affiliates FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_affiliates.catalog_id
            AND catalogs.user_id = auth.uid()
        )
    );

-- Usuarios pueden ver sus propias afiliaciones
DROP POLICY IF EXISTS "Users can view own affiliations" ON public.catalog_affiliates;
CREATE POLICY "Users can view own affiliations"
    ON public.catalog_affiliates FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Usuarios autenticados pueden postularse (INSERT con status pending)
DROP POLICY IF EXISTS "Users can apply for affiliation" ON public.catalog_affiliates;
CREATE POLICY "Users can apply for affiliation"
    ON public.catalog_affiliates FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND status = 'pending'
    );

-- Dueños del catálogo pueden insertar o aprobar afiliados directamente
DROP POLICY IF EXISTS "Catalog owners can insert affiliates" ON public.catalog_affiliates;
CREATE POLICY "Catalog owners can insert affiliates"
    ON public.catalog_affiliates FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_affiliates.catalog_id
            AND catalogs.user_id = auth.uid()
        )
    );

-- Dueños del catálogo pueden actualizar estado (aprobar / rechazar)
DROP POLICY IF EXISTS "Catalog owners can update affiliates status" ON public.catalog_affiliates;
CREATE POLICY "Catalog owners can update affiliates status"
    ON public.catalog_affiliates FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_affiliates.catalog_id
            AND catalogs.user_id = auth.uid()
        )
    );

-- Dueños del catálogo o el propio usuario pueden eliminar una postulación
DROP POLICY IF EXISTS "Catalog owners and users can delete affiliations" ON public.catalog_affiliates;
CREATE POLICY "Catalog owners and users can delete affiliations"
    ON public.catalog_affiliates FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_affiliates.catalog_id
            AND catalogs.user_id = auth.uid()
        )
    );

-- 3. Recargar caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';
