-- Actualizar la función de sincronización de productos importados para aplicar diferencias cuantitativas de precio
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
