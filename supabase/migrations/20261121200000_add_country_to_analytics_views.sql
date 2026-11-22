-- Migracion: Soporte de Pais de Origen y Zona Horaria en analytics_views
-- Fecha: 2026-11-21

ALTER TABLE public.analytics_views ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.analytics_views ADD COLUMN IF NOT EXISTS timezone TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_views_country_code ON public.analytics_views(country_code);

CREATE OR REPLACE FUNCTION public.infer_country_from_timezone(p_tz TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_tz TEXT := TRIM(COALESCE(p_tz, ''));
BEGIN
    IF v_tz = '' THEN
        RETURN NULL;
    END IF;

    CASE
        WHEN v_tz = 'America/Havana' THEN RETURN 'CU';
        WHEN v_tz IN ('America/Mexico_City', 'America/Cancun', 'America/Monterrey', 'America/Tijuana', 'America/Merida', 'America/Chihuahua', 'America/Mazatlan', 'America/Hermosillo') THEN RETURN 'MX';
        WHEN v_tz IN ('Europe/Madrid', 'Atlantic/Canary') THEN RETURN 'ES';
        WHEN v_tz = 'America/Bogota' THEN RETURN 'CO';
        WHEN v_tz = 'America/Lima' THEN RETURN 'PE';
        WHEN v_tz IN ('America/Santiago', 'Pacific/Easter') THEN RETURN 'CL';
        WHEN v_tz = 'America/Buenos_Aires' OR v_tz LIKE 'America/Argentina/%' THEN RETURN 'AR';
        WHEN v_tz IN ('America/Guayaquil', 'Pacific/Galapagos') THEN RETURN 'EC';
        WHEN v_tz = 'America/Caracas' THEN RETURN 'VE';
        WHEN v_tz = 'America/Panama' THEN RETURN 'PA';
        WHEN v_tz = 'America/Santo_Domingo' THEN RETURN 'DO';
        WHEN v_tz = 'America/Puerto_Rico' THEN RETURN 'PR';
        WHEN v_tz = 'America/Costa_Rica' THEN RETURN 'CR';
        WHEN v_tz = 'America/Guatemala' THEN RETURN 'GT';
        WHEN v_tz = 'America/Tegucigalpa' THEN RETURN 'HN';
        WHEN v_tz = 'America/El_Salvador' THEN RETURN 'SV';
        WHEN v_tz = 'America/Managua' THEN RETURN 'NI';
        WHEN v_tz = 'America/La_Paz' THEN RETURN 'BO';
        WHEN v_tz = 'America/Asuncion' THEN RETURN 'PY';
        WHEN v_tz = 'America/Montevideo' THEN RETURN 'UY';
        WHEN v_tz IN ('America/Sao_Paulo', 'America/Manaus', 'America/Fortaleza', 'America/Recife', 'America/Belem', 'America/Cuiaba') THEN RETURN 'BR';
        WHEN v_tz IN ('America/Toronto', 'America/Vancouver', 'America/Montreal', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax') THEN RETURN 'CA';
        WHEN v_tz = 'Europe/Amsterdam' THEN RETURN 'NL';
        WHEN v_tz = 'Europe/London' THEN RETURN 'GB';
        WHEN v_tz = 'Europe/Paris' THEN RETURN 'FR';
        WHEN v_tz = 'Europe/Berlin' THEN RETURN 'DE';
        WHEN v_tz = 'Europe/Rome' THEN RETURN 'IT';
        WHEN v_tz = 'Europe/Lisbon' THEN RETURN 'PT';
        WHEN v_tz = 'Europe/Moscow' THEN RETURN 'RU';
        WHEN v_tz = 'Europe/Dublin' THEN RETURN 'IE';
        WHEN v_tz = 'Europe/Stockholm' THEN RETURN 'SE';
        WHEN v_tz IN ('America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Detroit', 'America/Anchorage', 'Pacific/Honolulu')
             OR v_tz LIKE 'America/Indiana/%'
             OR v_tz LIKE 'America/Kentucky/%' THEN RETURN 'US';
        ELSE RETURN NULL;
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_enrich_analytics_view_geo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_headers JSONB;
    v_header_country TEXT;
    v_client_country TEXT;
BEGIN
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        v_headers := NULL;
    END;

    IF v_headers IS NOT NULL THEN
        v_header_country := UPPER(TRIM(COALESCE(
            v_headers->>'cf-ipcountry',
            v_headers->>'x-vercel-ip-country',
            v_headers->>'x-country-code',
            ''
        )));
        IF v_header_country IN ('XX', 'T1', '') OR v_header_country !~ '^[A-Z]{2}$' THEN
            v_header_country := NULL;
        END IF;
    END IF;

    v_client_country := UPPER(TRIM(COALESCE(NEW.country_code, '')));
    IF v_client_country IN ('XX', 'T1', '') OR v_client_country !~ '^[A-Z]{2}$' THEN
        v_client_country := NULL;
    END IF;

    NEW.country_code := COALESCE(
        v_header_country,
        v_client_country,
        public.infer_country_from_timezone(NEW.timezone)
    );

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enrich_analytics_view_geo_trigger
    BEFORE INSERT ON public.analytics_views
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enrich_analytics_view_geo();

CREATE OR REPLACE FUNCTION public.record_store_view(
    p_catalog_id UUID,
    p_product_id UUID,
    p_referral_code TEXT,
    p_visitor_id TEXT,
    p_referrer_url TEXT,
    p_country_code TEXT,
    p_timezone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    SELECT user_id INTO v_owner_id
    FROM public.catalogs
    WHERE id = p_catalog_id;

    INSERT INTO public.analytics_views (
        catalog_id,
        product_id,
        user_id,
        referral_code,
        visitor_id,
        referrer_url,
        country_code,
        timezone,
        created_at
    ) VALUES (
        p_catalog_id,
        p_product_id,
        v_owner_id,
        NULLIF(TRIM(p_referral_code), ''),
        p_visitor_id,
        p_referrer_url,
        NULLIF(UPPER(TRIM(p_country_code)), ''),
        NULLIF(TRIM(p_timezone), ''),
        NOW()
    );

    IF p_product_id IS NULL THEN
        UPDATE public.catalogs
        SET views_count = COALESCE(views_count, 0) + 1
        WHERE id = p_catalog_id;
    ELSE
        UPDATE public.products
        SET views_count = COALESCE(views_count, 0) + 1
        WHERE id = p_product_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_store_view(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.infer_country_from_timezone(TEXT) TO anon, authenticated, service_role;
