-- Migración para soporte de Marketplace Colaborativo (Nazaar)
-- Permite que cada producto tenga su propio número de contacto de WhatsApp y gestión por el vendedor

-- 1. Campos adicionales en productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS contact_phone TEXT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sender_name TEXT NULL;

-- 2. Tipo de catálogo ('store' por defecto, 'marketplace' para catálogos colaborativos)
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS catalog_type TEXT DEFAULT 'store';

-- 3. Tabla para remitentes confiables con permiso de publicación sin moderación
CREATE TABLE IF NOT EXISTS public.trusted_senders (
  phone TEXT PRIMARY KEY,
  name TEXT NULL,
  catalog_id UUID REFERENCES public.catalogs(id) ON DELETE CASCADE NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en trusted_senders
ALTER TABLE public.trusted_senders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trusted_senders" ON public.trusted_senders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage trusted_senders" ON public.trusted_senders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Función RPC segura para alternar estado de agotado por el vendedor dueño del teléfono
CREATE OR REPLACE FUNCTION toggle_marketplace_product_stock(
  p_product_id UUID,
  p_is_out_of_stock BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_phone TEXT;
  v_clean_user_phone TEXT;
BEGIN
  SELECT phone INTO v_user_phone FROM public.users WHERE id = auth.uid();
  IF v_user_phone IS NULL OR TRIM(v_user_phone) = '' THEN
    RETURN FALSE;
  END IF;

  -- Limpiar caracteres no numéricos
  v_clean_user_phone := regexp_replace(v_user_phone, '\D', '', 'g');

  UPDATE public.products
  SET 
    is_out_of_stock = p_is_out_of_stock,
    stock_status = CASE WHEN p_is_out_of_stock THEN 'out_of_stock' ELSE 'available' END
  WHERE id = p_product_id
    AND (
      regexp_replace(COALESCE(contact_phone, ''), '\D', '', 'g') = v_clean_user_phone
      OR regexp_replace(COALESCE(contact_phone, ''), '\D', '', 'g') LIKE '%' || RIGHT(v_clean_user_phone, 8)
    );

  RETURN FOUND;
END;
$$;

-- 5. Función RPC segura para que el vendedor edite su producto en marketplace
CREATE OR REPLACE FUNCTION update_marketplace_product(
  p_product_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_price NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_delivery_cost NUMERIC DEFAULT NULL,
  p_delivery_currency TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_phone TEXT;
  v_clean_user_phone TEXT;
BEGIN
  SELECT phone INTO v_user_phone FROM public.users WHERE id = auth.uid();
  IF v_user_phone IS NULL OR TRIM(v_user_phone) = '' THEN
    RETURN FALSE;
  END IF;

  v_clean_user_phone := regexp_replace(v_user_phone, '\D', '', 'g');

  UPDATE public.products
  SET 
    name = COALESCE(NULLIF(TRIM(p_name), ''), name),
    description = COALESCE(p_description, description),
    price = COALESCE(p_price, price),
    currency = COALESCE(NULLIF(TRIM(p_currency), ''), currency),
    delivery_cost = COALESCE(p_delivery_cost, delivery_cost),
    delivery_currency = COALESCE(p_delivery_currency, delivery_currency)
  WHERE id = p_product_id
    AND (
      regexp_replace(COALESCE(contact_phone, ''), '\D', '', 'g') = v_clean_user_phone
      OR regexp_replace(COALESCE(contact_phone, ''), '\D', '', 'g') LIKE '%' || RIGHT(v_clean_user_phone, 8)
    );

  RETURN FOUND;
END;
$$;
