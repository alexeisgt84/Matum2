-- Migración: Sistema de Registro y Conteo de Vistas para Tiendas, Productos y Referidos
-- Fecha: 2026-11-09

-- 1. Agregar columna views_count en catalogs si no existe
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- 2. Asegurar columna views_count en products si no existe
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- 3. Crear tabla analytics_views para registrar cada evento de visualización
CREATE TABLE IF NOT EXISTS public.analytics_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Propietario del catálogo
    referral_code TEXT,                                         -- Código de referido si aplica
    visitor_id TEXT,                                            -- Identificador anónimo de sesión/dispositivo
    referrer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para agrupaciones y filtros rápidos
CREATE INDEX IF NOT EXISTS idx_analytics_views_catalog_id ON public.analytics_views(catalog_id);
CREATE INDEX IF NOT EXISTS idx_analytics_views_product_id ON public.analytics_views(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_views_user_id ON public.analytics_views(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_views_referral_code ON public.analytics_views(referral_code);
CREATE INDEX IF NOT EXISTS idx_analytics_views_created_at ON public.analytics_views(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_views_catalog_created ON public.analytics_views(catalog_id, created_at);

-- 4. Habilitar RLS en analytics_views
ALTER TABLE public.analytics_views ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir a visitantes (anónimos o autenticados) registrar visitas
DROP POLICY IF EXISTS "Anyone can insert views" ON public.analytics_views;
CREATE POLICY "Anyone can insert views"
    ON public.analytics_views FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Administradores pueden leer todas las visitas
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.analytics_views;
CREATE POLICY "Admins can view all analytics"
    ON public.analytics_views FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Dueños de tiendas pueden ver las visitas de sus propios catálogos
DROP POLICY IF EXISTS "Owners can view own catalog analytics" ON public.analytics_views;
CREATE POLICY "Owners can view own catalog analytics"
    ON public.analytics_views FOR SELECT
    TO authenticated
    USING (
        catalog_id IN (
            SELECT id FROM public.catalogs
            WHERE catalogs.user_id = auth.uid()
        )
    );

-- 5. Función RPC optimizada para registrar visita e incrementar contadores atómicamente
CREATE OR REPLACE FUNCTION public.record_store_view(
    p_catalog_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_referral_code TEXT DEFAULT NULL,
    p_visitor_id TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- Obtener el ID del dueño de la tienda
    SELECT user_id INTO v_owner_id
    FROM public.catalogs
    WHERE id = p_catalog_id;

    -- Insertar evento detallado
    INSERT INTO public.analytics_views (
        catalog_id,
        product_id,
        user_id,
        referral_code,
        visitor_id,
        referrer_url,
        created_at
    ) VALUES (
        p_catalog_id,
        p_product_id,
        v_owner_id,
        NULLIF(TRIM(p_referral_code), ''),
        p_visitor_id,
        p_referrer_url,
        NOW()
    );

    -- Incrementar contador agregado en catalogo si es visita a la tienda
    IF p_product_id IS NULL THEN
        UPDATE public.catalogs
        SET views_count = COALESCE(views_count, 0) + 1
        WHERE id = p_catalog_id;
    ELSE
        -- Incrementar contador agregado en producto
        UPDATE public.products
        SET views_count = COALESCE(views_count, 0) + 1
        WHERE id = p_product_id;
    END IF;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.record_store_view TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.analytics_views TO authenticated, service_role;
GRANT INSERT ON TABLE public.analytics_views TO anon;
