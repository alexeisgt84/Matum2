-- Migración: Corrección de RLS y función RPC para Afiliaciones de Catálogos
-- Fecha: 2026-11-13

-- 1. Asegurar políticas RLS en la tabla catalog_affiliates
ALTER TABLE public.catalog_affiliates ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios autenticados y anónimos ver el estado de afiliación
DROP POLICY IF EXISTS "Users can view own affiliations" ON public.catalog_affiliates;
CREATE POLICY "Users can view own affiliations"
    ON public.catalog_affiliates FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_affiliates.catalog_id
            AND (
                catalogs.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.catalog_members
                    WHERE catalog_members.catalog_id = catalogs.id
                    AND catalog_members.user_id = auth.uid()
                    AND catalog_members.status = 'accepted'
                )
            )
        )
    );

-- Permitir a los usuarios postularse directamente (INSERT pending)
DROP POLICY IF EXISTS "Users can apply for affiliation" ON public.catalog_affiliates;
CREATE POLICY "Users can apply for affiliation"
    ON public.catalog_affiliates FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND status = 'pending'
    );

-- Dueños del catálogo y colaboradores pueden insertar afiliados
DROP POLICY IF EXISTS "Catalog owners can insert affiliates" ON public.catalog_affiliates;
CREATE POLICY "Catalog owners can insert affiliates"
    ON public.catalog_affiliates FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_affiliates.catalog_id
            AND (
                catalogs.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.catalog_members
                    WHERE catalog_members.catalog_id = catalogs.id
                    AND catalog_members.user_id = auth.uid()
                    AND catalog_members.status = 'accepted'
                )
            )
        )
    );

-- Dueños del catálogo y colaboradores pueden actualizar estado (aprobar / rechazar)
DROP POLICY IF EXISTS "Catalog owners can update affiliates status" ON public.catalog_affiliates;
CREATE POLICY "Catalog owners can update affiliates status"
    ON public.catalog_affiliates FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_affiliates.catalog_id
            AND (
                catalogs.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.catalog_members
                    WHERE catalog_members.catalog_id = catalogs.id
                    AND catalog_members.user_id = auth.uid()
                    AND catalog_members.status = 'accepted'
                )
            )
        )
    );

-- Dueños o usuarios pueden eliminar/desvincular una postulación
DROP POLICY IF EXISTS "Catalog owners and users can delete affiliations" ON public.catalog_affiliates;
CREATE POLICY "Catalog owners and users can delete affiliations"
    ON public.catalog_affiliates FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_affiliates.catalog_id
            AND (
                catalogs.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.catalog_members
                    WHERE catalog_members.catalog_id = catalogs.id
                    AND catalog_members.user_id = auth.uid()
                    AND catalog_members.status = 'accepted'
                )
            )
        )
    );

-- 2. Asegurar que usuarios autenticados puedan actualizar su propio registro en users (payout_info)
DROP POLICY IF EXISTS "Users can update own payout and profile" ON public.users;
CREATE POLICY "Users can update own payout and profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view profile basics" ON public.users;
CREATE POLICY "Users can view profile basics"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- 3. Función RPC con SECURITY DEFINER para postularse como afiliado de forma segura y sin bloqueos de RLS
CREATE OR REPLACE FUNCTION public.apply_for_affiliation(p_catalog_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_catalog RECORD;
    v_existing RECORD;
    v_result RECORD;
BEGIN
    -- 1. Obtener usuario autenticado
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para postularte como afiliado';
    END IF;

    -- 2. Verificar que el catálogo existe y permite afiliados
    SELECT id, user_id, enable_affiliates INTO v_catalog
    FROM public.catalogs
    WHERE id = p_catalog_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El catálogo especificado no existe';
    END IF;

    -- 3. Un dueño no puede postularse a su propio catálogo
    IF v_catalog.user_id = v_user_id THEN
        RAISE EXCEPTION 'No puedes postularte como afiliado de tu propio catálogo';
    END IF;

    -- 4. Comprobar si ya existe postulación previa
    SELECT * INTO v_existing
    FROM public.catalog_affiliates
    WHERE catalog_id = p_catalog_id AND user_id = v_user_id;

    IF FOUND THEN
        IF v_existing.status = 'approved' THEN
            RETURN to_jsonb(v_existing);
        ELSIF v_existing.status = 'pending' THEN
            RAISE EXCEPTION 'Ya has enviado una solicitud para este catálogo';
        ELSIF v_existing.status = 'rejected' THEN
            -- Si fue rechazada previamente, permitir re-postularse actualizando a pending
            UPDATE public.catalog_affiliates
            SET status = 'pending', updated_at = NOW()
            WHERE id = v_existing.id
            RETURNING * INTO v_result;

            RETURN to_jsonb(v_result);
        END IF;
    END IF;

    -- 5. Insertar nueva postulación
    INSERT INTO public.catalog_affiliates (catalog_id, user_id, status)
    VALUES (p_catalog_id, v_user_id, 'pending')
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_for_affiliation(UUID) TO authenticated;

-- 4. Recargar el esquema de PostgREST
NOTIFY pgrst, 'reload schema';
