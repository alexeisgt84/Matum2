-- Agregar columnas a la tabla catalogs
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS usd_to_cup_rate NUMERIC DEFAULT 1.0;
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS cup_to_usd_rate NUMERIC DEFAULT 1.0;
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'original' CHECK (display_currency IN ('original', 'usd', 'cup', 'both'));

-- Función para recalcular los precios calculados (price_usd, price_cup) de un producto
CREATE OR REPLACE FUNCTION public.recalculate_product_prices()
RETURNS TRIGGER AS $$
DECLARE
    v_usd_to_cup NUMERIC;
    v_cup_to_usd NUMERIC;
BEGIN
    -- Obtener tasas del catálogo
    SELECT COALESCE(usd_to_cup_rate, 1.0), COALESCE(cup_to_usd_rate, 1.0)
    INTO v_usd_to_cup, v_cup_to_usd
    FROM public.catalogs
    WHERE id = NEW.catalog_id;

    -- Si no se encuentra el catálogo, usar valores por defecto
    IF NOT FOUND THEN
        v_usd_to_cup := 1.0;
        v_cup_to_usd := 1.0;
    END IF;

    -- Calcular según la moneda de entrada (USD o CUP)
    IF NEW.price IS NULL THEN
        NEW.price_usd := NULL;
        NEW.price_cup := NULL;
    ELSIF NEW.currency = 'USD' THEN
        NEW.price_usd := NEW.price;
        NEW.price_cup := NEW.price * v_usd_to_cup;
    ELSIF NEW.currency = 'CUP' THEN
        NEW.price_cup := NEW.price;
        NEW.price_usd := NEW.price * v_cup_to_usd;
    ELSE
        -- Fallback por si acaso
        NEW.price_usd := NEW.price;
        NEW.price_cup := NEW.price;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar antes de insertar o actualizar un producto
DROP TRIGGER IF EXISTS tr_recalculate_product_prices ON public.products;
CREATE TRIGGER tr_recalculate_product_prices
    BEFORE INSERT OR UPDATE OF price, currency, catalog_id
    ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_product_prices();

-- Función para recalcular los precios de todos los productos de un catálogo cuando cambian sus tasas
CREATE OR REPLACE FUNCTION public.recalculate_all_catalog_products()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo recalcular si cambiaron las tasas de cambio
    IF (OLD.usd_to_cup_rate IS DISTINCT FROM NEW.usd_to_cup_rate) OR 
       (OLD.cup_to_usd_rate IS DISTINCT FROM NEW.cup_to_usd_rate) THEN
        
        -- Esto disparará el trigger tr_recalculate_product_prices para cada producto
        UPDATE public.products
        SET price = price, updated_at = NOW()
        WHERE catalog_id = NEW.id;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar después de actualizar un catálogo
DROP TRIGGER IF EXISTS tr_recalculate_all_catalog_products ON public.catalogs;
CREATE TRIGGER tr_recalculate_all_catalog_products
    AFTER UPDATE OF usd_to_cup_rate, cup_to_usd_rate
    ON public.catalogs
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_all_catalog_products();

-- Función y trigger para forzar valores por defecto si el plan del dueño es 'free'
CREATE OR REPLACE FUNCTION public.enforce_catalog_free_plan_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_user_plan TEXT;
BEGIN
    -- Obtener el plan del dueño del catálogo
    SELECT plan INTO v_user_plan FROM public.users WHERE id = NEW.user_id;

    -- Si no tiene plan o es 'free', forzar valores base
    IF v_user_plan IS NULL OR v_user_plan = 'free' THEN
        NEW.usd_to_cup_rate := 1.0;
        NEW.cup_to_usd_rate := 1.0;
        NEW.display_currency := 'original';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar antes de insertar o actualizar un catálogo
DROP TRIGGER IF EXISTS tr_enforce_catalog_free_plan_limits ON public.catalogs;
CREATE TRIGGER tr_enforce_catalog_free_plan_limits
    BEFORE INSERT OR UPDATE OF usd_to_cup_rate, cup_to_usd_rate, display_currency, user_id
    ON public.catalogs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_catalog_free_plan_limits();

-- Forzar recálculo inicial de todos los productos actuales
UPDATE public.products SET updated_at = NOW();
