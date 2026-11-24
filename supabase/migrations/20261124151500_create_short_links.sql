-- Migración: Acortador propio de enlaces (short_links + RPCs)
-- Fecha: 2026-11-24

-- 1. Tabla principal de enlaces cortos
CREATE TABLE IF NOT EXISTS public.short_links (
    code TEXT PRIMARY KEY CHECK (code ~ '^[A-Za-z0-9]{4,16}$'),
    catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
    product_id UUID NULL REFERENCES public.products(id) ON DELETE CASCADE,
    referral_code TEXT NULL CHECK (referral_code IS NULL OR char_length(referral_code) <= 64),
    clicks_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_clicked_at TIMESTAMPTZ NULL,
    CONSTRAINT short_links_target_unique UNIQUE NULLS NOT DISTINCT (catalog_id, product_id, referral_code)
);

-- Índices para claves foráneas y borrados en cascada
CREATE INDEX IF NOT EXISTS idx_short_links_catalog_id
    ON public.short_links (catalog_id);

CREATE INDEX IF NOT EXISTS idx_short_links_product_id
    ON public.short_links (product_id)
    WHERE product_id IS NOT NULL;

-- 2. RLS y privilegios mínimos
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.short_links TO anon, authenticated;
GRANT ALL ON public.short_links TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'short_links'
          AND policyname = 'Public or owner can read short_links'
    ) THEN
        CREATE POLICY "Public or owner can read short_links"
            ON public.short_links FOR SELECT
            TO anon, authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.catalogs c
                    WHERE c.id = short_links.catalog_id
                      AND (c.is_public = true OR c.user_id = (SELECT auth.uid()))
                )
            );
    END IF;
END $$;

-- 3. RPC para obtener o crear un código corto único de 6 caracteres
CREATE OR REPLACE FUNCTION public.get_or_create_short_link(
    p_catalog_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_referral_code TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_ref TEXT;
    v_uid UUID;
    v_code TEXT;
    v_candidate TEXT;
    v_bytes BYTEA;
    v_alphabet CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    v_alphabet_len CONSTANT INT := 57;
    v_attempt INT;
    v_pos INT;
BEGIN
    v_uid := auth.uid();
    v_ref := NULLIF(TRIM(p_referral_code), '');

    IF v_ref IS NOT NULL AND char_length(v_ref) > 64 THEN
        v_ref := NULL;
    END IF;

    -- Verificar que el catálogo exista y sea público no bloqueado, o accesible por su dueño/colaborador
    IF NOT EXISTS (
        SELECT 1
        FROM public.catalogs c
        WHERE c.id = p_catalog_id
          AND (
              (COALESCE(c.is_public, false) = true AND COALESCE(c.is_blocked, false) = false)
              OR (
                  v_uid IS NOT NULL AND (
                      c.user_id = v_uid
                      OR EXISTS (
                          SELECT 1
                          FROM public.catalog_members cm
                          WHERE cm.catalog_id = c.id
                            AND cm.user_id = v_uid
                            AND cm.status = 'accepted'
                      )
                  )
              )
          )
    ) THEN
        RAISE EXCEPTION 'Catálogo no disponible';
    END IF;

    -- Si se especifica producto, validar pertenencia al catálogo
    IF p_product_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = p_product_id
          AND p.catalog_id = p_catalog_id
    ) THEN
        RAISE EXCEPTION 'Producto no encontrado';
    END IF;

    -- Validar que el código de referido pertenezca a un usuario existente
    IF v_ref IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.referral_code = v_ref
    ) THEN
        v_ref := NULL;
    END IF;

    -- Buscar enlace existente para la misma combinación
    SELECT sl.code
    INTO v_code
    FROM public.short_links sl
    WHERE sl.catalog_id = p_catalog_id
      AND sl.product_id IS NOT DISTINCT FROM p_product_id
      AND sl.referral_code IS NOT DISTINCT FROM v_ref
    LIMIT 1;

    IF v_code IS NOT NULL THEN
        RETURN v_code;
    END IF;

    -- Generar código único de 6 caracteres con reintentos ante colisión o carrera
    FOR v_attempt IN 1..10 LOOP
        v_bytes := extensions.gen_random_bytes(6);
        v_candidate := '';
        FOR v_pos IN 0..5 LOOP
            v_candidate := v_candidate || substr(v_alphabet, (get_byte(v_bytes, v_pos) % v_alphabet_len) + 1, 1);
        END LOOP;

        INSERT INTO public.short_links (code, catalog_id, product_id, referral_code)
        VALUES (v_candidate, p_catalog_id, p_product_id, v_ref)
        ON CONFLICT DO NOTHING
        RETURNING code INTO v_code;

        IF v_code IS NOT NULL THEN
            RETURN v_code;
        END IF;

        -- Si otro request concurrente insertó la misma combinación, devolver ese código
        SELECT sl.code
        INTO v_code
        FROM public.short_links sl
        WHERE sl.catalog_id = p_catalog_id
          AND sl.product_id IS NOT DISTINCT FROM p_product_id
          AND sl.referral_code IS NOT DISTINCT FROM v_ref
        LIMIT 1;

        IF v_code IS NOT NULL THEN
            RETURN v_code;
        END IF;
    END LOOP;

    RAISE EXCEPTION 'No se pudo generar un código corto único';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_short_link(UUID, UUID, TEXT) TO anon, authenticated, service_role;

-- 4. RPC para resolver un código corto (redirección y metadatos OG)
CREATE OR REPLACE FUNCTION public.resolve_short_link(
    p_code TEXT,
    p_increment_click BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    code TEXT,
    catalog_id UUID,
    catalog_slug TEXT,
    catalog_name TEXT,
    catalog_slogan TEXT,
    catalog_description TEXT,
    catalog_logo_url TEXT,
    catalog_cover_url TEXT,
    catalog_is_active BOOLEAN,
    catalog_is_public BOOLEAN,
    catalog_is_blocked BOOLEAN,
    product_id UUID,
    product_name TEXT,
    product_description TEXT,
    product_price NUMERIC,
    product_currency TEXT,
    product_imagen_url TEXT,
    product_is_active BOOLEAN,
    referral_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_row_count INT := 0;
BEGIN
    v_code := TRIM(COALESCE(p_code, ''));
    IF v_code !~ '^[A-Za-z0-9]{4,16}$' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        sl.code,
        sl.catalog_id,
        c.slug AS catalog_slug,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE c.name END AS catalog_name,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE c.slogan END AS catalog_slogan,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE c.description END AS catalog_description,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE c.logo_url END AS catalog_logo_url,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE c.cover_url END AS catalog_cover_url,
        COALESCE(c.is_active, false) AS catalog_is_active,
        COALESCE(c.is_public, false) AS catalog_is_public,
        COALESCE(c.is_blocked, false) AS catalog_is_blocked,
        sl.product_id,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE p.name END AS product_name,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE p.description END AS product_description,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE p.price END AS product_price,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE p.currency END AS product_currency,
        CASE WHEN COALESCE(c.is_blocked, false) THEN NULL ELSE p.imagen_url END AS product_imagen_url,
        COALESCE(p.is_active, false) AS product_is_active,
        sl.referral_code
    FROM public.short_links sl
    JOIN public.catalogs c ON c.id = sl.catalog_id
    LEFT JOIN public.products p
        ON p.id = sl.product_id
       AND p.catalog_id = sl.catalog_id
    WHERE sl.code = v_code
      AND COALESCE(c.is_public, false) = true
      AND (sl.product_id IS NULL OR p.id IS NOT NULL)
    LIMIT 1;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    IF v_row_count > 0 AND COALESCE(p_increment_click, false) = true THEN
        UPDATE public.short_links sl_upd
        SET clicks_count = sl_upd.clicks_count + 1,
            last_clicked_at = NOW()
        WHERE sl_upd.code = v_code;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_short_link(TEXT, BOOLEAN) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
