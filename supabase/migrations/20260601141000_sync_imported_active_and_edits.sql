-- Actualizar la función de sincronización de productos importados para aplicar diferencias cuantitativas de precio y sincronizar estado activo y moneda
CREATE OR REPLACE FUNCTION sync_imported_product() RETURNS TRIGGER AS $$
DECLARE
    price_diff NUMERIC;
BEGIN
    -- Calcular la diferencia cuantitativa de precio (si cambió)
    price_diff := COALESCE(NEW.price, 0) - COALESCE(OLD.price, 0);

    UPDATE public.products
    SET 
        name = NEW.name,
        description = NEW.description,
        imagen_url = NEW.imagen_url,
        is_out_of_stock = NEW.is_out_of_stock,
        stock_status = NEW.stock_status,
        is_active = NEW.is_active, -- Sincronizar el estado de activo/inactivo
        currency = NEW.currency,   -- Sincronizar la moneda
        price = CASE 
            -- Si el precio del padre cambió y el hijo tiene un precio, aplicamos la diferencia cuantitativa
            WHEN price_diff <> 0 AND price IS NOT NULL THEN price + price_diff
            ELSE price
        END,
        base_price = NEW.price, -- El nuevo precio de origen se convierte en el base_price del hijo
        updated_at = now()
    WHERE parent_product_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger para incluir cambios en is_active y currency
DROP TRIGGER IF EXISTS trigger_sync_imported_products ON public.products;

CREATE TRIGGER trigger_sync_imported_products
AFTER UPDATE ON public.products
FOR EACH ROW
WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.imagen_url IS DISTINCT FROM NEW.imagen_url OR
    OLD.is_out_of_stock IS DISTINCT FROM NEW.is_out_of_stock OR
    OLD.stock_status IS DISTINCT FROM NEW.stock_status OR
    OLD.price IS DISTINCT FROM NEW.price OR
    OLD.is_active IS DISTINCT FROM NEW.is_active OR
    OLD.currency IS DISTINCT FROM NEW.currency
)
EXECUTE FUNCTION sync_imported_product();
