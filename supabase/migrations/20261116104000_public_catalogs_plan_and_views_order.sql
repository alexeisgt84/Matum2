-- Migración: Ordenamiento de catálogos públicos por plan del propietario (premium > pro > basic > free) y luego por vistas (views_count DESC)
-- Fecha: 2026-11-16

CREATE OR REPLACE FUNCTION public.get_public_catalogs()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  slogan TEXT,
  description TEXT,
  slug TEXT,
  logo_url TEXT,
  cover_url TEXT,
  primary_color TEXT,
  background_color TEXT,
  surface_color TEXT,
  text_color TEXT,
  title_color TEXT,
  is_active BOOLEAN,
  is_public BOOLEAN,
  enable_affiliates BOOLEAN,
  is_blocked BOOLEAN,
  catalog_type TEXT,
  views_count BIGINT,
  owner_plan TEXT,
  product_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.slogan,
    c.description,
    c.slug,
    c.logo_url,
    c.cover_url,
    c.primary_color,
    c.background_color,
    c.surface_color,
    c.text_color,
    c.title_color,
    c.is_active,
    c.is_public,
    COALESCE(c.enable_affiliates, false) AS enable_affiliates,
    COALESCE(c.is_blocked, false) AS is_blocked,
    COALESCE(c.catalog_type, 'store') AS catalog_type,
    COALESCE(c.views_count, 0)::BIGINT AS views_count,
    LOWER(COALESCE(u.plan::text, 'free')) AS owner_plan,
    (SELECT COUNT(*) FROM public.products p WHERE p.catalog_id = c.id)::BIGINT AS product_count,
    c.created_at
  FROM public.catalogs c
  LEFT JOIN public.users u ON u.id = c.user_id
  WHERE c.is_public = true
    AND c.is_active = true
    AND COALESCE(c.is_blocked, false) = false
  ORDER BY
    CASE LOWER(COALESCE(u.plan::text, 'free'))
      WHEN 'premium' THEN 4
      WHEN 'pro' THEN 3
      WHEN 'basic' THEN 2
      ELSE 1
    END DESC,
    COALESCE(c.views_count, 0) DESC,
    c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_catalogs() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
